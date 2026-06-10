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

- **Test directory mapping.** Unit tests mirror `src/` inside `test/`: every
  module `src/<name>.ts` has a matching `test/<name>.test.ts`. When you add or
  change a `src/` module, add or update its corresponding `*.test.ts`. Vitest
  discovers `test/**/*.test.ts` (and `*.spec.ts`) via `vitest.config.ts`.
- **Cloud Function testing.** Use the `firebase-functions-test` utility to drive
  and track Cloud Function execution in tests. Mock external clients
  (`@google-cloud/pubsub`, `firebase-admin`, `firebase-functions/v2` logger) with
  Vitest `vi.mock`/`vi.hoisted`, following the pattern in
  `test/pubsub-event.test.ts`.
- **Verification gate.** Before considering a change complete, run `npm run lint`,
  `npm run build`, and `npm test`. All must pass. Remember `npm run build` is the
  only approved way to regenerate `lib/`.

---

## Quick Do / Don't

**Do:** edit `src/` and `test/`; use `.js` extensions on relative imports; write
full Google-style JSDoc; use async/await; keep triggers thin; validate before DB
writes; run lint + build + test.

**Don't:** read or modify `/lib`; hand-edit build output; mix business logic into
triggers; use raw Promise chains; commit DB writes without validation; rewrite or
wrap URLs in comments.
