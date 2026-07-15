# Copilot Instructions — `@fabricelements/shared-helpers`

Global source of truth for AI agents and human contributors in this repository.
These rules are **mandatory**. Follow them exactly. They describe how this specific
Node.js / TypeScript / Firebase library is structured, built, and verified.

Deep-dive, path-scoped rules live in [`.github/instructions/`](instructions/) and are
applied automatically by their `applyTo` globs:

| File | Applies to | Topic |
| --- | --- | --- |
| [`documentation.instructions.md`](instructions/documentation.instructions.md) | `**/*.ts` | JSDoc, inline comments, API docs, changelog |
| [`readme.instructions.md`](instructions/readme.instructions.md) | `**/*.md` | Root & module README maintenance |
| [`serialized-models.instructions.md`](instructions/serialized-models.instructions.md) | interfaces, entities, DTOs | Serialization & API contracts |
| [`tests.instructions.md`](instructions/tests.instructions.md) | `test/**/*.ts` | Vitest tests & mocking |

When a modular file covers a topic in more depth, it wins on the specifics; this file
wins on global rules and conflicts.

---

## 1. Tech Stack Reality

### Versions (do not silently change; match `package.json`)
- **Runtime:** Node.js `>=22` (`engines`). Pure **ESM** — `"type": "module"`. Emit ESM
  only; never CommonJS (`require`, `module.exports`, `__dirname`).
- **Language:** TypeScript `^6`, compiled with `module`/`moduleResolution: "Node16"`,
  `target`/`lib` `ES2020`, `strict: true`, `declaration: true`.
  Because of `Node16` resolution, **relative imports inside `src/` MUST use the `.js`
  extension** (e.g. `import {emulator} from './variables.js';`), even though the source
  file is `.ts`.
- **Firebase:** `firebase-admin` `^13`, `firebase-functions` `^7`. Import from the modular
  sub-paths already used in the codebase (`firebase-admin/firestore`, `firebase-admin/auth`,
  `firebase-admin/storage`, `firebase-functions/v2`, `firebase-functions/v2/https`,
  `firebase-functions/v2/identity`).
- **Google Cloud:** `@google-cloud/bigquery` `^8`, `@google-cloud/bigquery-storage` `^5`,
  `@google-cloud/pubsub` `^5`.
- **Other key deps:** `libphonenumber-js`, `lodash`, `sharp`. **HTTP uses the native
  `fetch`** built into Node `>=22` — this repo does **not** depend on `node-fetch`.
- **Lint:** ESLint `^10` flat config (`eslint.config.js`) with `typescript-eslint`
  (`recommended` + `stylistic`).
- **Test:** Vitest `^4` (`globals` enabled, `node` environment, typecheck via
  `tsconfig.test.json`).

### Effective strictness nuance
`strict: true` is on, but `tsconfig.json` explicitly relaxes `strictNullChecks: false`
and `noImplicitAny: false`, and ESLint turns **off** `@typescript-eslint/no-explicit-any`,
`no-namespace`, and `no-unused-vars`. Write precise types anyway — the relaxations exist
for legacy interop, not as a license to reach for `any`.

---

## 2. Workspace Bounding

### Directory blueprint
| Path | Purpose | Agent may edit? |
| --- | --- | --- |
| `src/` | **All library source code.** The public API (re-exported from `src/index.ts`). | ✅ Yes |
| `test/` | Vitest unit tests, mirroring `src/` (one `*.test.ts` per module). | ✅ Yes |
| `lib/` | Auto-generated build output (`outDir`). | ❌ **NEVER** |
| `functions/` | Separate sample Firebase Functions app (consumes the lib via `file:..`). ESLint-ignored. | Only when explicitly asked |
| `.github/` | CI workflows and instruction manuals. | Only when explicitly asked |

### Execution wrappers (use these exact npm scripts)
- `npm run build` → `clear` + `lint` + `compile`. **The only sanctioned way to refresh
  `lib/`.** Runs `rm -rf ./lib`, then `eslint`, then `tsc -p ./tsconfig.json`.
- `npm run lint` → `eslint` (use `npm run lint:fix` to auto-fix).
- `npm run compile` → `tsc -p ./tsconfig.json` (`compile:watch` for watch mode).
- `npm test` → `vitest run` (`npm run test:watch` for watch mode).

### 🔴 CRITICAL — `/lib` BLACKLIST
`/lib` is an **immutable, auto-generated build target** produced by `tsc` and wiped on
every build (`npm run clear`). AI agents **MUST**:
- **NEVER read or take context from `/lib`.** Treat it as if it does not exist. Source of
  truth is always `src/`.
- **NEVER edit, create, or delete files in `/lib`.**
- Make all changes in `src/` only, and refresh compiled output **solely** via
  `npm run build`. Hand-edits to `lib/` are silently destroyed on the next build.

---

## 3. Naming Conventions

Follow the conventions already present in `src/`. Consistency is enforced by review.

| Kind | Convention | Examples |
| --- | --- | --- |
| Source files | `kebab-case.ts` | `api-request.ts`, `bigquery-stream-writer.ts` |
| Test files | mirror source + `.test.ts` | `test/pubsub-event.test.ts` |
| Namespaces | `PascalCase` | `FirestoreHelper`, `User`, `Media` |
| Classes | `PascalCase` (domain classes named `Helper` inside a namespace) | `FirestoreHelper.Helper`, `BigQueryStreamWriter` |
| Interfaces | **`Interface`-prefixed** `PascalCase` | `InterfaceAPIRequest`, `InterfaceFirestoreQuery`, `User.Interface` |
| Type aliases | `camelCase` for value-shaped unions; `PascalCase` for domain types | `fetchResponse`, `linkType`; `BigQueryRow`, `BigQueryFieldType` |
| Enums + members | `PascalCase` enum, lowercase members mirroring external strings | `Media.ImageSize`, `AvailableOutputFormats.webp` |
| Functions / consts / vars | `camelCase` | `checkNumber`, `replaceMessageText` |
| Private statics / helpers | leading underscore | `_getDocument`, `_length` |
| Exported default fn modules | file exports a single `export default` fn; the barrel names it | `import pubSubEvent from './pubsub-event.js'` |

- **Prefer `Interface`-prefixed names for public interfaces** to match the dominant
  codebase style. New option bags may follow the `SomethingOptions` shape only where a
  sibling already does (`BigQueryStreamWriterOptions`); when in doubt, use the `Interface`
  prefix.
- Do not abbreviate domain terms inconsistently; reuse existing names
  (`collection`, `collectionGroup`, `reference`, `document`).

---

## 4. Architectural Rules

This is a **utility library** for serverless Firebase/GCP backends. There are two
sanctioned module shapes — do not invent a third:

1. **Single-purpose function module** — one `export default async (…) => {…}` (or a small
   set of named `export const` functions) per file. Used by `api-request`, `pubsub-event`,
   `validate-url`, `hash-id`, `check-number`, `strings`, etc.
2. **Namespace + `Helper` class module** — an `export namespace X { export interface … ;
   export class Helper { public static … } }`. Used by `FirestoreHelper`, `User`, `Media`.
   Instance-based clients (`BigQueryStreamWriter`) are a valid variant.

Every public module is re-exported from `src/index.ts`; subpath entry points (`./user`,
`./media`) are declared in `package.json` `exports`. **Any new public helper must be added
to `src/index.ts`** (and to `exports` if it warrants its own subpath).

### Separation of concerns — triggers vs. domain logic
- Keep Firebase triggers (Pub/Sub, Firestore, HTTP/Express, Auth blocking functions)
  **thin**: parse/validate the event, delegate to a pure, independently testable domain
  `Helper`, and handle transport concerns only. See `functions/src/user/events.ts`
  (`beforeUserCreated` → `User.Helper.onCreate`) and `functions/src/media/open.ts`
  (Express route → `Media.Helper.preview`).
- **Never embed business rules directly inside a trigger handler.** Business/domain logic
  lives in `src/` helpers so it can be unit-tested without the Functions runtime.

### Async & control flow
- **`async`/`await` only.** Do not write raw `.then()`/`.catch()` Promise chains.
- Bound external calls. Outbound HTTP must set a timeout
  (`signal: AbortSignal.timeout(60000)` as in `api-request.ts`).
- Loop with `for … of` + `await` when sequencing async work (see `FirestoreHelper.getList`).

### Validate before writing
- Validate and shape data **before** any Firestore/RTDB/Storage write. Never persist
  unvalidated input. Throw early on invalid arguments (see `validate-url`, `api-request`,
  `FirestoreHelper.getListReference`).

---

## 5. Error Handling & Logging

- **Throw `Error` for programmer/argument errors and unrecoverable states.** Use clear,
  human-readable messages: `throw new Error('Invalid api call');`.
- **For fire-and-forget background work (e.g. Pub/Sub publish), log and degrade, don't
  crash.** Follow `pubsub-event.ts`: `catch` → `logger.error(...)` → set
  `process.exitCode = 1` without re-throwing, so the Cloud Function can finish cleanly.
- **For "best-effort validators", return a sentinel instead of throwing** where the
  existing contract does so (`check-number` returns `null` on invalid input). Match the
  neighbouring module's contract; document it with `@returns`/`@throws`.
- **Logging goes through `firebase-functions/v2` `logger`** (`logger.log/info/warn/error`).
  Do **not** use `console.*` in library code. Gate verbose/debug logs behind the
  `emulator` flag from `./variables.js` (see `pubsub-event.ts`).
- When catching, prefer `catch (error: any)` and read `error.message ?? error.toString()`;
  never swallow errors silently unless the contract explicitly returns a sentinel.

---

## 6. Security Guardrails

Treat every value crossing a trigger, network, or storage boundary as hostile until it is
validated. **Fail closed** — on any validation or authorization failure, throw or deny;
never proceed with unvalidated data or "best-effort" partial trust.

### Secrets & credentials
- **No secrets in source.** Never hard-code API keys, tokens, service-account JSON, or
  credentials. Read config from environment / Firebase Functions params (`defineSecret` /
  `defineString` from `firebase-functions/params`). `.env*` and key files must stay
  git-ignored.
- **Never expose secrets.** Do not log secrets or full `Authorization` headers, and never
  place tokens/credentials in Pub/Sub payloads or attributes, thrown `Error` messages,
  BigQuery rows, or Firestore documents. Redact before any `logger.*` call.

### Access control & rules
- **Least privilege & rules.** Firestore/Storage/RTDB access is governed by
  `firestore.rules`, `storage.rules`, `database.rules.json`. Do not weaken these rules to
  make code "work"; fix the code. Keep rules default-deny.
- **Authorize before privileged work.** In callable/HTTP triggers, verify the caller's
  identity and claims (`CallableRequest.auth`) before any privileged read/write; never trust
  client-supplied UIDs, roles, or ownership. Reject unauthenticated/unauthorized requests
  explicitly.
- **Scope CORS narrowly.** Only open CORS (`cors: '*'`) for genuinely public, unauthenticated
  resources (e.g. public media in `functions/src/media/open.ts`). Never wildcard CORS on
  endpoints that read or write user data.

### Input validation & injection safety
- **Validate all external input** (HTTP query/body, `request.path`, Pub/Sub payloads, Auth
  records) before use or persistence. Treat everything crossing a trigger boundary as
  untrusted.
- **Whitelist, don't blacklist.** Shape/coerce input to a known schema and drop unknown
  fields before persisting; enforce length/size/type bounds. Reuse existing validators
  (`validate-url`, `check-number`) instead of re-implementing them.
- **Guard storage & document paths.** Sanitize any user-influenced Storage/Firestore path
  against traversal (`..`, leading `/`, injected segments) before reading or writing.
- **No injection from untrusted keys.** Never build Firestore queries or field paths from raw
  untrusted keys — validate against an allow-list. Never spread untrusted objects in a way
  that can pollute `__proto__`/`constructor` (prototype pollution).
- **RegExp safety.** Do not construct `RegExp` from untrusted input (ReDoS risk); keep shared
  patterns bounded in `src/regex.ts`.

### Network I/O
- **Bound and fail safe on network I/O**: explicit timeouts (`AbortSignal.timeout(...)`),
  `redirect: 'error'` unless a redirect is required, and check `response.ok` before reading a
  body (see `api-request.ts`).
- **Prevent SSRF.** Validate outbound request targets; do not `fetch` attacker-controlled
  URLs without an allow-list, and do not buffer unbounded response bodies.
- **Sanitize outbound errors.** Surface only safe messages to callers (as `api-request.ts`
  extracts the server `message`); never leak stack traces, internal paths, or config to
  external responses.

### Code & dependency safety
- **No dynamic code execution** (`eval`, `new Function`, dynamic `require`).
- **Dependency hygiene.** Don't add dependencies casually; prefer built-ins (native `fetch`,
  `crypto`) over new packages, keep semver ranges aligned with `package.json`, and never
  reintroduce `node-fetch`.
- **Never disable security or lint rules** (`eslint-disable`, `// @ts-ignore`,
  `// @ts-expect-error`, or `strict`/rule relaxations) to bypass a finding; resolve the root
  cause.

---

## 7. Documentation, Tests & Serialization

These are governed in depth by the modular files — read them before editing the matching
files. Global essentials:

- **Every exported symbol carries Google-style multi-line JSDoc** with a capitalized
  summary, brace-typed `@param`/`@returns`, and `@throws {Error} …` where it can throw.
  Preserve the `@license` header and never rewrite/line-wrap URLs in comments.
  → [`documentation.instructions.md`](instructions/documentation.instructions.md)
- **When you add or change a `src/` module, add or update its `test/` mirror in the same
  change.** Tests use Vitest, stub all I/O with `vi.mock` + `vi.hoisted`, and never touch
  real network/cloud. → [`tests.instructions.md`](instructions/tests.instructions.md)
- **Interfaces/DTOs/entities** follow strict serialization and backward-compatibility
  rules (optional fields, `FieldValue | Date | string` timestamps, `@deprecated` over
  deletion). → [`serialized-models.instructions.md`](instructions/serialized-models.instructions.md)
- **README updates** must preserve deployment URLs/badges and keep the documented sections
  current. → [`readme.instructions.md`](instructions/readme.instructions.md)

---

## 8. Verification Gate

Before considering any code change complete, run all three — they must pass:

```shell
npm run lint
npm run build
npm test
```

`npm run build` is the only approved way to regenerate `lib/`. Tests must pass with **zero**
`eslint-disable` directives. Documentation-only changes (`*.md`) do not require build/test.

---

## Quick Do / Don't

**Do:** edit `src/` and `test/`; use `.js` extensions on relative imports; add new public
helpers to `src/index.ts`; write full Google-style JSDoc with precise brace-wrapped types;
use `async`/`await`; keep triggers thin and delegate to `Helper` domain logic; authorize
callers before privileged work; validate and fail closed on invalid input; sanitize
user-influenced storage/query paths; validate before DB writes; log via
`firebase-functions` `logger`; bound network I/O with timeouts; mirror `src/` in `test/` and
stub all external I/O; preserve README URLs/badges; run lint + build + test.

**Don't:** read or modify `/lib` (incl. for test context); hand-edit build output; emit
CommonJS; depend on `node-fetch` (use native `fetch`); use banned JSDoc types
(`Function`/`Object`); mix business logic into triggers; use raw Promise chains;
`console.*` in library code; hard-code secrets or log credentials/PII; wildcard CORS on
authenticated endpoints; leak stack traces or internal config to callers; `fetch`
attacker-controlled URLs (SSRF); build `RegExp` or Firestore queries/field paths from
untrusted input; make real network/cloud calls in tests; modify `src/` just to ease testing;
add `eslint-disable`/`@ts-ignore` directives; commit DB writes without validation; rewrite
or line-wrap URLs in comments.
