---
description: Vitest unit/integration tests, mocking, AAA structure, and coverage expectations.
applyTo: "test/**/*.ts"
---

# Testing Instructions — `@fabricelements/shared-helpers`

Governs all tests. The runner is **Vitest `^4`** (`globals` enabled, `node` environment,
typechecked via `tsconfig.test.json`). The reference patterns are `test/pubsub-event.test.ts`
(single-function module) and `test/firestore-helper.test.ts` (namespace/class module). When
this file and `copilot-instructions.md` disagree on a testing detail, **this file wins**.

> **Never introduce Jest, Mocha, Chai, Sinon, or nock.** Use Vitest + `vi` only.

---

## 1. Placement, naming & imports

- Tests live in the top-level `test/` directory and **mirror `src/` exactly**: `src/<name>.ts`
  → `test/<name>.test.ts`. Vitest collects `test/**/*.test.ts` and `test/**/*.spec.ts`.
- **When you add or change a `src/` module, add/update its `test/` mirror in the same change.**
- Import the module under test through its **`.js` specifier** (Node16 resolution):

  ```ts
  import pubSubEvent from '../src/pubsub-event.js';
  import {FirestoreHelper} from '../src/firestore-helper.js';
  ```

- Import Vitest APIs explicitly even though globals are on, matching existing files:
  `import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';`
- Keep the `@license` header at the top of every test file.

---

## 2. No real side effects — mock all I/O

Tests must **never** make real network requests or touch live APIs, Firestore/RTDB, Storage,
Pub/Sub, or BigQuery. Intercept everything.

- Stub external clients with **`vi.mock` + `vi.hoisted`**. Every variable referenced inside a
  `vi.mock` factory **must** be declared via `vi.hoisted` (factories are hoisted above
  imports).
- Mock at minimum, as relevant to the module: `@google-cloud/pubsub`,
  `@google-cloud/bigquery`, `@google-cloud/bigquery-storage`, the `firebase-admin/*`
  sub-modules (`firebase-admin/firestore`, `firebase-admin/auth`, `firebase-admin/storage`),
  the global **`fetch`**, `sharp`, and the `firebase-functions/v2` `logger`.
- Mock the internal `./variables.js` to pin `emulator` deterministically
  (`vi.mock('../src/variables.js', () => ({emulator: false}))`).
- Reset between tests: `vi.clearAllMocks()` in `beforeEach`, `vi.restoreAllMocks()` in
  `afterEach`.

### Canonical mock setup (from `test/pubsub-event.test.ts`)

```ts
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

// All variables referenced inside vi.mock factories must be declared with vi.hoisted.
const {mockPublishMessage, mockTopic, mockLoggerError} = vi.hoisted(() => {
  const mockPublishMessage = vi.fn().mockResolvedValue('msg-001');
  const mockTopic = vi.fn(() => ({publishMessage: mockPublishMessage}));
  const mockLoggerError = vi.fn();
  return {mockPublishMessage, mockTopic, mockLoggerError};
});

vi.mock('@google-cloud/pubsub', () => ({
  PubSub: vi.fn(function() { return {topic: mockTopic}; }),
}));
vi.mock('firebase-functions/v2', () => ({
  logger: {info: vi.fn(), warn: vi.fn(), error: mockLoggerError, log: vi.fn()},
}));
vi.mock('../src/variables.js', () => ({emulator: false}));

import {PubSub} from '@google-cloud/pubsub';
import pubSubEvent from '../src/pubsub-event.js';
```

For chainable SDKs (Firestore query builders), return a self-referential object from the
mocks so `.where().orderBy().limit().get()` chains resolve — see the `queryRef` setup in
`test/firestore-helper.test.ts`.

---

## 3. Structure — describe / it / AAA

- One top-level `describe()` per module (nest `describe()` per method/function). One `it()`
  per behaviour, with a sentence describing the expected outcome.
- Follow **Arrange → Act → Assert** inside every test.

```ts
describe('pubSubEvent', () => {
  it('serialises the data payload as JSON in the message buffer', async () => {
    // Arrange
    const data = {userId: 'abc', action: 'login'};
    // Act
    await pubSubEvent(ps, 'my-topic', data);
    // Assert
    const call = mockPublishMessage.mock.calls[0][0];
    expect(JSON.parse(call.data.toString())).toEqual(data);
  });
});
```

- Assertions use Vitest `expect`. Prefer specific matchers: `toEqual`, `toBe`,
  `toHaveBeenCalledWith`, `toHaveBeenCalledOnce`, `rejects.toThrow`, `toBeDefined`.

---

## 4. What to cover

For each module, exercise:

- **Happy path** — the primary success behaviour.
- **Default parameters** — omitted optional args resolve to documented defaults (e.g.
  `pubSubEvent` defaulting `data`/`attributes`/`options` to `{}`).
- **Every `@throws` branch** — assert the thrown message:

  ```ts
  expect(() => FirestoreHelper.Helper.getListReference({})).toThrow(
    'collection or collectionGroup is required',
  );
  await expect(apiRequest({})).rejects.toThrow('Invalid api call');
  ```

- **Error-handling contracts that don't throw** — e.g. `pubSubEvent` logs via
  `logger.error` and sets `process.exitCode = 1` on failure (save and restore
  `process.exitCode`); `checkNumber` returns `null` on invalid input.
- **Edge cases** — empty/`null` inputs, whitespace stripping, boundary sizes, content-type
  branches.

---

## 5. Unit vs. integration

- **Unit (default):** the module under test with all collaborators mocked. This is the vast
  majority of the suite and the only kind that runs in CI by default.
- **Cloud Functions / integration:** drive execution with the official
  **`firebase-functions-test`** SDK, and either run against the local **Firebase Emulators**
  (ports in `firebase.json`: Auth 9099, Firestore 8080, RTDB 9000, Functions 5001, Pub/Sub
  8085, Storage 9199, Hosting 5000, UI 4000) **or** heavily stub the `firebase-admin` SDK.
  `firebase-functions-test` is not currently a dependency — **add it to `devDependencies`
  first** if you write these, and never hit real Firestore/RTDB.

---

## 6. Do not modify source to ease testing

- **Do NOT change `src/` code just to make it testable.** If a module is genuinely
  untestable as written, write a short note explaining why and move on — do not weaken the
  source. Legitimate source bugs found while testing may be fixed as part of the change.

---

## 7. Type & lint cleanliness

- Test files are strict TypeScript: correct imports, explicitly typed mock params where
  needed, zero type errors (`tsconfig.test.json` typechecks them).
- Tests must pass ESLint with **zero** `eslint-disable` directives.

---

## 8. Coverage expectations

- Aim to cover **every documented behaviour** of a module (all `@param` branches, all
  `@throws`, defaults, and edge cases) — behaviour coverage over a raw percentage target.
- No coverage provider is wired yet. If a coverage report is required, install
  `@vitest/coverage-v8` as a devDependency first, then run `npx vitest run --coverage`.
  Do not commit coverage output (it is git-ignored).

---

## 9. Verification gate

Before considering a change complete:

```shell
npm run lint
npm run build
npm test
```

All three must pass. `npm test` runs `vitest run`; use `npm run test:watch` while iterating.

---

## DO NOT

- ❌ Introduce Jest/Mocha/Chai/Sinon/nock — Vitest + `vi` only.
- ❌ Reference a variable inside a `vi.mock` factory without declaring it in `vi.hoisted`.
- ❌ Make real network/cloud/Firestore/RTDB/Storage/Pub/Sub/BigQuery calls.
- ❌ Import the module under test via its `.ts` path — use the `.js` specifier.
- ❌ Skip `vi.clearAllMocks()`/`vi.restoreAllMocks()` between tests.
- ❌ Leave a `src/` change without a matching `test/` update.
- ❌ Modify `src/` solely to make it easier to test.
- ❌ Add `eslint-disable` directives to pass lint.
- ❌ Assert only the happy path — cover defaults, `@throws`, and edge cases.
- ❌ Commit real credentials, tokens, or production data as test fixtures.
