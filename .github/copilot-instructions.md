# Copilot Instructions — `@fabricelements/shared-helpers`

System rules manual for AI agents operating in this repository. These rules are
mandatory. Follow them exactly. They describe how this specific
Node.js/TypeScript/Firebase workspace is structured, built, and verified.

---

## 1. Project Stack Reality & Workspace Bounding

### Stack & versions
- **Runtime:** Node.js `>=22` (declared in `package.json` `engines`). This package
  is pure ESM — `"type": "module"`. Always emit ESM, never CommonJS.
- **Language:** TypeScript `^6` compiled with `moduleResolution: "Node16"` /
  `module: "Node16"`, `target`/`lib` `ES2020`, `strict: true`, `declaration: true`.
  Because of `Node16` resolution, **relative imports inside `src/` must use the
  `.js` extension** (e.g. `import {emulator} from './variables.js';`), even though
  the source file is `.ts`.
- **Firebase:** `firebase-admin` `^13`, `firebase-functions` `^7`. Import from the
  modular sub-paths already used in the codebase (e.g. `firebase-admin/firestore`,
  `firebase-functions/v2`).
- **Other key deps:** `@google-cloud/bigquery`, `@google-cloud/pubsub`,
  `libphonenumber-js`, `lodash`, `node-fetch`, `sharp`.
- **Lint:** ESLint `^10` with `typescript-eslint` (`recommended` + `stylistic`).
- **Test:** `vitest` `^3` with globals enabled, `node` environment.

### Directory blueprint
| Path | Purpose | Agent may edit? |
| --- | --- | --- |
| `src/` | **All source code.** Every change you make lives here. | ✅ Yes |
| `test/` | Unit tests, one `*.test.ts` per `src/` module. | ✅ Yes |
| `lib/` | Auto-generated build output (`outDir`). | ❌ **NEVER** |
| `functions/` | Separate Firebase Functions sub-project. ESLint-ignored. | Only when explicitly asked |
| `.github/` | CI workflows and this manual. | Only when explicitly asked |

### Execution wrappers (use these exact npm scripts)
- `npm run build` → `clear` + `lint` + `compile`. **The only sanctioned way to
  refresh `lib/`.** Runs `rm -rf ./lib`, then `eslint`, then `tsc -p ./tsconfig.json`.
- `npm run lint` → `eslint` (use `npm run lint:fix` to auto-fix).
- `npm run compile` → `tsc -p ./tsconfig.json`.
- `npm test` → `vitest run` (use `npm run test:watch` for watch mode).

### CRITICAL — `/lib` BLACKLIST
`/lib` is an **immutable, auto-generated build target**. It is produced by `tsc`
and wiped on every build (`npm run clear`). Therefore, AI agents **MUST**:
- **NEVER read or take context from `/lib`.** Treat it as if it does not exist.
  Source of truth is always `src/`.
- **NEVER edit, create, or delete files in `/lib`.**
- **NEVER direct any modification, fix, or patch at `/lib`.**
- Make all changes in `src/` only, and refresh the compiled output **solely** by
  running `npm run build`. Hand-editing `lib/` will be silently destroyed on the
  next build and is strictly forbidden.

---

## 2. JSDoc Code Style Standards (Google TypeScript)

All exported functions, methods, interfaces, and namespaces in `src/` must carry
Google-style TypeScript JSDoc, consistent with the existing code and the
`typescript-eslint` stylistic plugin:

- **Multi-line block format** opening with `/**` and a leading `*` on every line.
- A concise one-line summary, followed by a blank `*` line and a fuller
  description paragraph where behaviour is non-trivial.
- **Explicit `@param {type} name - description`** for every parameter. Include the
  brace-wrapped type, mark optional params with brackets (`@param {number} [length]`),
  and document defaults in the description. Keep alignment/wrapping tidy so it
  passes the stylistic ruleset.
- **`@returns {type} description`** for the return value. Note: ESLint
  `tagNamePreference` maps `returns` → `return`; respect the project's preferred
  tag where the linter enforces it.
- **Explicit `@throws {Error} ...`** indicators wherever a function can throw,
  describing each failure condition (see `src/api-request.ts`, `src/validate-url.ts`).
- **Protect external reference URLs** inside comments — never truncate, rewrite, or
  line-wrap them. `max-len` is configured with `ignoreComments` and `ignoreUrls`,
  so leave URLs intact on a single line.
- Preserve the existing `@license`/Copyright header block at the top of each file.

---

## 3. Strict Implementation Boundaries

- **Async/await only.** Mandate `async`/`await` over raw `.then()`/`.catch()`
  Promise chaining. New asynchronous code must use `async` functions and `await`,
  matching existing modules.
- **Separation of concerns — triggers vs. domain logic.** Maintain absolute
  separation between Firebase event triggers (Pub/Sub, Firestore, HTTP handlers)
  and inner core business/domain logic. Triggers stay thin: parse the event,
  delegate to a pure, independently testable domain function, and handle
  transport-level concerns only. Never embed business rules directly inside a
  trigger handler.
- **Validate before writing.** Require proper configuration tracking and explicit
  schema validation before committing any database write (Firestore/RTDB).
  Validate and shape data first; never persist unvalidated input.

---

## 4. Automation & Verification Controls

Generate comprehensive unit and integration tests with `vitest` (the project's
test runner — do not introduce Jest or Mocha/Chai). When you add or change a
`src/` module, add or update its tests in the same change.

### Source-of-truth mapping — IGNORE `/lib`
- **Map every test to raw source only.** Tests derive their context and coverage
  from `src/` (or `functions/src/` when explicitly working there). The `/lib`
  directory is a generated build artifact: **NEVER** read it, map tests to it, or
  use it for test context. See the `/lib` BLACKLIST in §1.

### File placement & naming
- All tests live in the isolated top-level `test/` directory, **mirroring the
  `src/` hierarchy precisely**. Each module `src/<path>/<name>.ts` has a matching
  `test/<path>/<name>.test.ts` (`.spec.ts` is also discovered). Vitest collects
  `test/**/*.test.ts` and `test/**/*.spec.ts` via `vitest.config.ts`.
- Import the module under test through its `.js` specifier
  (e.g. `import pubSubEvent from '../src/pubsub-event.js';`), per the `Node16`
  resolution rule in §1.

### Environment isolation — no real side-effects
- Tests must **never** perform real network requests or touch live external APIs
  or real cloud instances. All I/O must be intercepted.
- Stub external clients with Vitest `vi.mock` + `vi.hoisted` (every variable
  referenced inside a `vi.mock` factory must be declared via `vi.hoisted`). Mock
  `@google-cloud/pubsub`, `@google-cloud/bigquery`, `firebase-admin` sub-modules,
  `node-fetch`, and the `firebase-functions/v2` `logger`. Reset state with
  `vi.clearAllMocks()` in `beforeEach` and `vi.restoreAllMocks()` in `afterEach`.
  Follow the established pattern in `test/pubsub-event.test.ts`.

### Firebase & Cloud Function testing
- Drive and track Cloud Function execution with the official
  `firebase-functions-test` SDK.
- For data assertions, either run against the local Firebase Emulators (ports are
  declared in `firebase.json`) or heavily stub the `firebase-admin` SDK to
  intercept Firestore / Realtime Database reads and writes — never hit real
  Firestore/RTDB.

### Test structure
- Wrap suites in descriptive `describe()` blocks and individual cases in `it()`
  blocks, and follow the **Arrange–Act–Assert** layout within each test.
- Cover the documented behaviour: happy paths, default-parameter handling,
  thrown-error / failure branches (the conditions noted in `@throws`), and edge
  cases.

### Zero source modification
- **Do NOT modify `src/` code to make it "easier to test."** If a module is
  genuinely untestable as written, record a short breakdown log explaining why,
  then move on — do not alter the source to work around it.

### Compilation & lint cleanliness
- Every test file must be valid, strict TypeScript: correct imports, explicitly
  typed mock parameters, and zero type errors.
- Tests must pass all strict `typescript-eslint` rules **without** any
  lint-disable directives.

### Verification gate
- Before considering a change complete, run `npm run lint`, `npm run build`, and
  `npm test`. All must pass. Remember `npm run build` is the only approved way to
  regenerate `lib/`.

---

## Quick Do / Don't

**Do:** edit `src/` and `test/`; use `.js` extensions on relative imports; write
full Google-style JSDoc; use async/await; keep triggers thin; validate before DB
writes; mirror `src/` in `test/` with `vitest`; stub all external I/O; run lint +
build + test.

**Don't:** read or modify `/lib` (incl. for test context); hand-edit build output;
mix business logic into triggers; use raw Promise chains; make real network/cloud
calls in tests; modify `src/` just to ease testing; add lint-disable directives;
commit DB writes without validation; rewrite or wrap URLs in comments.
