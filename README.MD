# FabricElements Shared Helpers

[![Node CI](https://github.com/FabricElements/shared-helpers/actions/workflows/nodejs.yml/badge.svg)](https://github.com/FabricElements/shared-helpers/actions/workflows/nodejs.yml)

`@fabricelements/shared-helpers` is a TypeScript helper library for Firebase and
Google Cloud backend projects. It packages reusable, well-tested utilities —
Firestore access helpers, media/image processing, phone-number validation,
Pub/Sub event handling, BigQuery backups, and string/regex utilities — so that
FabricElements Cloud Functions services can share a single, consistent
foundation.

The package is published as a pure **ESM** module and is consumed both from NPM
and directly from GitHub.

------

## Project Overview & Cloud Architecture

This repository is a **publishable NPM library** that targets the serverless
Google Cloud / Firebase ecosystem. The authored TypeScript in `src/` is compiled
to JavaScript + type declarations in `lib/` (the `main`, `module`, and `types`
fields, plus the `exports` map, all point at `./lib`), which is the artifact
shipped to consumers.

The helpers are designed to run inside **Firebase Cloud Functions** (Node.js
runtime) and to interact with the surrounding cloud services:

- **Cloud Firestore**, **Cloud Storage**, and the **Realtime Database** for
  application data and assets (security rules live in `firestore.rules`,
  `storage.rules`, and `database.rules.json`).
- **Cloud Pub/Sub** for event-driven messaging (`pubSubEvent`).
- **BigQuery** for analytics backups and cleanup (`backup`, `cleaner`).
- **Cloud Storage + `sharp`** for on-the-fly image resizing/transformation
  (`Media`).
- **Firebase Authentication** for user lifecycle helpers (`User`).

A companion sample Firebase Cloud Functions app lives under `functions/` and
consumes the library locally via a `file:..` dependency, demonstrating real
triggers, controllers, and media handlers (including the `media-open` HTTPS
function wired into Hosting rewrites in `firebase.json`).

- **Target runtime:** Node.js `>=22` (see `engines` in `package.json`).
- **Language:** TypeScript `^6`, emitted as ES2020 ESM.
- **Default Firebase project alias:** `fabricelements` (see `.firebaserc`).

### Public API surface

The package entry point (`src/index.ts`) re-exports the following helpers.
Subpath exports (`./user`, `./media`, `./bigquery-stream-writer`, `./firestore-helper`,
`./filter-helper`, `./bigquery-identifier`) are also exposed via `package.json`.

| Helper                 | Source                                                           | Purpose                                                        |
|------------------------|------------------------------------------------------------------|----------------------------------------------------------------|
| `apiRequest`           | [src/api-request.ts](src/api-request.ts)                         | Call a Firebase project's base API.                            |
| `backup`               | [src/backup.ts](src/backup.ts)                                   | Custom backup from Firestore to BigQuery.                      |
| `BigQueryStreamWriter` | [src/bigquery-stream-writer.ts](src/bigquery-stream-writer.ts)   | Stream rows into BigQuery via the Storage Write API.           |
| `checkNumber`          | [src/check-number.ts](src/check-number.ts)                       | Validate and format phone numbers.                             |
| `cleaner`              | [src/cleaner.ts](src/cleaner.ts)                                 | BigQuery database cleanup.                                     |
| `FilterHelper`         | [src/filter-helper.ts](src/filter-helper.ts)                     | Decode `fabric_flutter` report filters into parameterized BigQuery fragments. |
| `FirestoreHelper`      | [src/firestore-helper.ts](src/firestore-helper.ts)               | Google Cloud Firestore access helpers.                         |
| `global`               | [src/global.ts](src/global.ts)                                   | Basic and reusable helpers.                                    |
| `hashId`               | [src/hash-id.ts](src/hash-id.ts)                                 | Generate a random hash id (4+ characters).                     |
| `messageQueueSpeed`    | [src/message-queue-speed.ts](src/message-queue-speed.ts)         | Compute safe message dispatch throughput (Twilio rate limits). |
| `outboundUrl`          | [src/outbound-url.ts](src/outbound-url.ts)                       | SSRF-guarded URL validation and `fetch` for caller-supplied URLs. |
| `pubSubEvent`          | [src/pubsub-event.ts](src/pubsub-event.ts)                       | Google Cloud Pub/Sub event helper.                             |
| `replaceMessageText`   | [src/replace-message-text.ts](src/replace-message-text.ts)       | Replace message text with custom keys.                         |
| `specialCharToRegular` | [src/special-char-to-regular.ts](src/special-char-to-regular.ts) | Convert special characters to regular GSM characters.          |
| `strings`              | [src/strings.ts](src/strings.ts)                                 | String transformation utilities (e.g. snake_case → camelCase). |
| `validateBigQueryIdentifier` | [src/bigquery-identifier.ts](src/bigquery-identifier.ts)    | Anchored allow-list check for BigQuery dataset/table/column names. |
| `validateUrl`          | [src/validate-url.ts](src/validate-url.ts)                       | Validate URL *shape* and strip embedded whitespace. Not an SSRF guard. |
| `regex`                | [src/regex.ts](src/regex.ts)                                     | Shared regular expressions (email, media content types, etc.). |
| `interfaces`           | [src/interfaces.ts](src/interfaces.ts)                           | Shared TypeScript interfaces and types.                        |
| `Media` (`./media`)    | [src/media.ts](src/media.ts)                                     | Image/media processing with `sharp` and Cloud Storage.         |
| `User` (`./user`)      | [src/user.ts](src/user.ts)                                       | Firebase Auth/Firestore user helpers.                          |

### Security notes for consumers

These contracts are deliberate; relying on the opposite behaviour is unsafe.

- **`User.Helper.create` filters its input.** Only the fields in
  `User.creatableProfileFields` are persisted to the new `user/{uid}` document.
  Authorization state (`role`, `group`, `groups`), billing/provider identity (`bcId`,
  `bsId`, `bsiId`, `bst`, `but`, `buq`), the `account` tenancy pointer, credentials
  (`password`) and server-managed bookkeeping are dropped — the full excluded set is
  exported as `User.serverOnlyFields`. The new account always starts with the
  server-assigned role `'user'`. Use `User.Helper.sanitizeProfile` to apply the same
  filter at your own call sites. See the [migration note](CHANGELOG.md) if you previously
  relied on extra fields being written.
- **`User.Helper.createDocument` does *not* filter.** It is the low-level writer for
  server-authored objects, and the sanctioned way to seed a server-only field such as
  `bcId` once your server knows the correct value. Never hand it an unvalidated request
  body.
- **Role changes write Firebase Auth custom claims.** `User.Helper.updateRole` and
  `User.Helper.remove` copy the user's `groups` map into custom claims, which are embedded
  in every ID token and presented to relying parties as verified identity. **Treat write
  access to `user/{uid}` as equivalent to role assignment** and keep your security rules
  default-deny on that path.
- **De-provisioning needs `checkRevoked` on your side.** Withdrawing or replacing a role
  revokes the user's refresh tokens, but already-issued ID tokens stay valid until they
  expire (up to an hour) unless you verify with `getAuth().verifyIdToken(token, true)`.
  Treat claim removal as eventually consistent.
- **`Media.Helper.saveFromUrl` validates the URL** through
  `outboundUrl.assertSafeOutboundUrl`, re-validates every redirect hop, applies a timeout,
  and caps the response size. Private, loopback, link-local and cloud metadata addresses
  are refused.
- **`validateUrl` checks shape only.** It accepts `http://127.0.0.1`. For anything you
  intend to fetch, use `outboundUrl.assertSafeOutboundUrl` or `outboundUrl.safeFetch`.
- **`checkNumber` is a best-effort formatter**, not an authorization or anti-abuse control.
- **`FirestoreHelper` interpolates the `collection`/`document` names it is given.** Never
  pass untrusted identifiers to it.
- **`FilterHelper` resolves identifiers; it does not authorize callers.** The encoded
  payload is attacker-controlled, so every `id` must resolve through the `allowedFields`
  map you supply, and the real column name comes from *your* declaration — never from the
  payload. That makes `allowedFields` the boundary for **which identifiers are
  addressable**, not for **which filters a given caller may use**. It is static per report
  type, so it cannot express a per-caller rule such as "this column is visible only to a
  platform admin." If some fields are privileged, run your own authorization check on the
  decoded entries **after** `decode` and before building a fragment. Listing a field means
  any caller who reaches the decoder can filter and sort on it. Declared `column` values
  must satisfy `bigQueryColumnPattern` — letters, digits and underscores, **no dots** —
  because each is emitted as a single backticked identifier.
- **`FilterHelper` payloads never contain SQL or a table name.** They carry only
  declarative `{id, type, operator, value, index}` entries. Your code selects the target
  table from its own configuration, keyed by an explicit report-type parameter. A payload
  whose JSON root is not an array — including the legacy `toSQLEncoded` raw-SQL format —
  is rejected outright, with no fallback.
- **`FilterHelper` binds every value.** `toQueryFragment` returns `where` / `orderBy`
  strings containing only server-declared columns, fixed operator text, and generated
  placeholders (`@f0`, `@f1`, …), plus a `params`/`types` pair for the BigQuery client.
  Pass them through as parameters; never inline `params` into the SQL text. `contains`
  compiles to `STRPOS`, not `LIKE`, so `%` and `_` cannot widen a match.
  `where` and `orderBy` are empty strings when nothing matched — **omit the `WHERE` /
  `ORDER BY` keyword yourself** rather than emitting a bare one.
- **Placeholder names are `f` followed by digits, and that is a contract.** They come from
  the entry's position, never from payload text, so a caller cannot influence them. This
  matters if you splice the fragment into a template you then post-process with your own
  textual token substitution over the same `@` sigil: such substitution matches
  substrings rather than whole tokens, so a replacement key that prefixes a generated
  name would splice a value into the SQL text and turn a bound parameter into raw
  interpolation. Keep your own substitution keys clear of `f<digits>`. Binding protects
  values, not identifiers.
- **`FilterHelper` grammars are closed.** `operator`, `type` (the Dart `InputDataType`
  enum) and sort direction are validated against fixed member lists, and entry keys
  against an allow-list. Adding a member to the Dart enum requires adding it here too,
  or those payloads will be rejected.
- **`FilterHelper` implements the whole Dart operator grammar; your backend need not.**
  `FilterOperator` mirrors Dart's enum member for member, so any payload `fabric_flutter`
  can emit is decodable. Each field then names the operators it accepts, and `operators`
  is required with no implicit default — a field declaring
  `operators: [FilterOperator.equal]` rejects every other operator on that field, and
  there is no way to leave the question unanswered. Pass
  `Object.values(FilterOperator)` to accept all of them; an empty array accepts none.
  This matters most if you validate with `decode` but emit SQL from your own predicate
  table: nothing downstream of this module will refuse an operator you never
  implemented, so a `FilterOperator.contains` you silently treat as an equality is a
  confidently wrong result rather than an error. A field may list several — a timestamp
  column typically accepts both an open-ended `FilterOperator.greaterThanOrEqual`
  carrying a single value and a two-value `FilterOperator.between`, and listing only the
  range operator would reject the single-value form an encoder already emits.
- **`FilterHelper` lets you choose whether a `between` includes its upper bound.**
  Declare `betweenBounds` per field: the default `'closed'` emits
  `` `col` >= @f0 AND `col` <= @f1 ``, matching the Dart SQL builder and its in-memory
  matcher, while `'halfOpen'` emits `` `col` >= @f0 AND `col` < @f1 ``. Half-open is what
  you want when consecutive ranges tile a timeline — adjacent day, week or month buckets
  then meet without the boundary row being counted in both. The style is a property of
  the column, declared by you; a payload cannot change it. Declaring it does not restrict
  the field to ranges — a field may still accept a single-value operator alongside
  `between`. `decode` also rejects a
  reversed range, and rejects equal bounds under `'halfOpen'` because `[x, x)` selects
  nothing. Bounds are compared only when that is unambiguous — numeric pairs, and
  temporal pairs compared as instants so a zone offset cannot make an ordered range look
  reversed; anything else is left to your backend.
- **A dotted column is a path into a `STRUCT`, and is opt-in.** A BigQuery column name
  cannot contain a period, so a reference such as `sentiment.text` can only address a
  field inside a struct. Declare `structPath: true` on that field and the column is split
  on `.`, every segment is validated as a column name in its own right, and the reference
  is emitted with each segment quoted separately — `` `sentiment`.`text` ``. It is opt-in
  so a stray period in a field meant to name a single column stays a configuration error
  instead of silently becoming a path. This concerns only the column *you* declare:
  payload `id` values are opaque lookup keys and have always accepted dots, so a filter
  keyed on `sentiment.text` needs no renaming on the client.
- **Not every predicate belongs in `allowedFields`.** The map describes one column, one
  operator, one bound style. A predicate that spans columns, falls back for legacy rows,
  or exists to let the query engine prune partitions cannot be expressed in that shape,
  and forcing it in would change which rows match or how much the query scans. Keep such
  parameters on your own request schema, outside the allow-list, and combine them with
  the fragment this returns.
- **`decode` and `toQueryFragment` are separate steps on purpose.** `decode` is
  structural — it parses, validates the grammar, and resolves identifiers. It deliberately
  does **not** canonicalize values. If your own schema canonicalizes (uppercasing a country
  code, say), run it over the decoded entries and pass the canonicalized result to
  `toQueryFragment`. In that case do not use the `decodeToQueryFragment` convenience: it
  goes straight from payload to SQL and would skip your canonicalization, which does not
  raise an error — it silently matches nothing.
- **Owning your own SQL is a first-class integration, not a fallback.** If you already have
  a predicate table mapping each filter to a hand-written SQL fragment, `decode` is the
  whole of what you need from this module: it parses the payload, enforces the operator
  allow-list and value shapes, and hands back typed entries you feed to your own builder.
  A field declared for that purpose may omit `column` entirely, which keeps column names
  out of a declaration that never emits SQL. `toQueryFragment` throws if it is later asked
  to build a fragment for such a field, rather than dropping the predicate and quietly
  widening the result set.
- **`decode` does not parse temporal literals, so validate them yourself on that path.**
  A value bound to a `DATE`, `DATETIME` or `TIMESTAMP` field is checked for type and
  length like any other, but it is only parsed as ISO 8601 when a query fragment is
  built, because that is the point at which BigQuery's literal form actually matters.
  `decode` therefore returns a temporal value **byte for byte as it arrived**, offset and
  all, and a malformed one reaches you as an ordinary bounded string. If you build your
  own SQL, keep your own date validation — it is load bearing, not belt and braces. The
  one exception is a `between` range, whose bounds are compared as instants at decode
  time so a reversed or empty range is refused early; bounds that do not parse are left
  for your own validator rather than being guessed at.
- **`toQueryFragment` emits one predicate per entry, over one column.** That is a
  deliberate ceiling, and some predicates sit above it: one spanning several columns, one
  embedding a literal in the SQL, a disjunction rather than a comparison, or one that binds
  the *same* placeholder twice — the per-entry `@f0`, `@f1`, … scheme has no way to say
  "reuse that parameter in the other branch". Such predicates are often shaped that way for
  a reason worth preserving (keeping a bare comparison so the engine can still prune
  partitions, say), so do not flatten one to fit this builder. Use `decode` alone and emit
  it yourself.
- **`FilterHelper` payloads must be percent-encoded in URLs.** Base64 is validated
  canonically, so a `+` that a query parser turns into a space is rejected rather than
  silently repaired.
- **`FilterHelper` narrows temporal values using your `paramType`, not the payload.**
  The Dart wire format sends a full ISO 8601 timestamp for `date`, `dateTime` and
  `timestamp` alike, so the decoder narrows at bind time from the `paramType` you
  declare: `DATE` binds `YYYY-MM-DD` (converted to UTC first, so an offset timestamp can
  roll to the next day, exactly as Dart's `toUtc()` does), `DATETIME` drops the zone
  designator, and `TIMESTAMP` keeps the full instant. Declare the `paramType` that
  matches your column, or BigQuery will reject the bound parameter. A temporal value
  that is not an ISO 8601 literal is rejected rather than coerced.
- **`FilterHelper.encode` only emits entries that its own decoder accepts.** An entry
  needs both a value and an operator, so `encode` and `decode` are lossless with respect
  to one another. A null value is never meaningful, and an operator-less entry cannot
  compile to a predicate, so emitting one would produce a payload that silently shrinks
  on the next round-trip.

------

## Tech Stack & Source Architecture Map

| Area                       | Details                                                                                                                                                                                                                                          |
|----------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Language                   | **TypeScript** `^6.0.3`, compiled to **ES2020** ESM (`"type": "module"`, `module`/`moduleResolution`: `Node16`, `strict: true`, `declaration: true`).                                                                                            |
| Runtime                    | **Node.js `>=22`** (see `engines` in `package.json`).                                                                                                                                                                                            |
| Firebase                   | `firebase-admin` `^13.10.0`, `firebase-functions` `^7.2.5`.                                                                                                                                                                                      |
| Google Cloud               | `@google-cloud/bigquery` `^8.3.1`, `@google-cloud/bigquery-storage` `^5.1.1`, `@google-cloud/pubsub` `^5.3.0`.                                                                                                                                   |
| Media                      | `sharp` `^0.34.5` for image resizing/transformation.                                                                                                                                                                                             |
| Utilities                  | `libphonenumber-js` `^1.13.5`, `lodash` `^4.18.1`, native `fetch` (Node.js `>=22`).                                                                                                                                                              |
| Database / storage engines | **Cloud Firestore**, **Cloud Storage**, and **Realtime Database** (rules in `firestore.rules`, `storage.rules`, `database.rules.json`); analytics/queue via **BigQuery** and **Pub/Sub**.                                                        |
| Linting                    | **ESLint `^10.4.1`** via flat config (`eslint.config.js`) using `typescript-eslint` `recommended` + `stylistic` presets.                                                                                                                         |
| Testing                    | **Vitest `^4.1.8`** (`globals` enabled, `node` environment).                                                                                                                                                                                     |
| Configuration patterns     | Compiler settings in `tsconfig.json` (`rootDir: src`, `outDir: lib`, declarations + source maps); test compiler config in `tsconfig.test.json`; Firebase services and emulator ports in `firebase.json`; default project alias in `.firebaserc`. |

### Active source directory map

These are the directories you actually develop in. Source of truth is always
`src/` (and `functions/src/` for the sample app).

```text
shared-helpers/
├── src/                 # Authored TypeScript helpers — the public API (re-exported from src/index.ts)
├── test/                # Vitest unit tests; mirrors src/ (one *.test.ts per helper)
├── functions/
│   └── src/             # Sample/consumer Firebase Cloud Functions app
│       ├── index.ts     # Initializes the Admin SDK and re-exports the function modules
│       ├── app.ts       # Controllers — aggregate/re-export the media & user function modules
│       ├── user/        # Triggers — Firebase Auth onCreate/onDelete listeners and user actions
│       ├── media/       # Media Cloud Functions, including the `open` HTTPS resize function
│       └── helpers/     # Shared variables/config for the sample functions app
├── lib/                 # 🔴 AUTO-GENERATED BUILD OUTPUT — never edit (see notice below)
├── firebase.json        # Firebase services config + local Emulator Suite ports
├── .firebaserc          # Default Firebase project alias (fabricelements)
├── tsconfig.json        # Library compiler config (rootDir: src, outDir: lib, Node16 modules)
├── tsconfig.test.json   # Test compiler config used by Vitest
├── vitest.config.ts     # Vitest runner configuration
└── eslint.config.js     # Flat ESLint config (typescript-eslint: recommended + stylistic)
```

> [!CAUTION]
> ### 🔴 Strict Blacklist — `/lib` is generated, never edit it
>
> The `lib/` directory (and any other build-output directory) is an
> **immutable, auto-generated build target** produced by `tsc`
> (`npm run compile`). It is wiped and regenerated on every build — the `clear`
> script runs `rm -rf ./lib` first — so any manual change is silently destroyed.
>
> - **NEVER** edit, create, or delete files in `/lib`.
> - **NEVER** read `/lib` or use it as development/AI context — the source of
    > truth is always `src/`.
> - Make all changes in `src/` only, and refresh the compiled output **solely**
    > by running `npm run build`.
>
> The compiler excludes `lib` (`tsconfig.json`) and ESLint ignores it
> (`eslint.config.js`).

------

## Local Setup & Firebase Emulation

Fresh onboarding for a new developer:

### 1. Install dependencies

```shell
npm install
```

### 2. Build the library (generates the compiled `lib/` output)

`npm run build` is the **only sanctioned way** to refresh `lib/`. It clears the
previous output, lints, then compiles (`clear` → `lint` → `compile`):

```shell
npm run build
```

To keep the TypeScript compiler running and recompiling on every change, use
watch mode:

```shell
npm run build:watch
```

You can also run the individual steps directly:

```shell
npm run lint        # eslint (use `npm run lint:fix` to auto-fix)
npm run compile     # tsc -p ./tsconfig.json
```

> The build is required because consumers — and the sample `functions/` app,
> which imports the package via `file:..` — load the compiled output from `lib/`.

### 3. Start the local Firebase environment

The local Emulator Suite is configured in `firebase.json` (Auth, Functions,
Firestore, Realtime Database, Hosting, Pub/Sub, Storage, plus the Emulator UI):

```shell
firebase emulators:start
```

| Emulator          | Port |
|-------------------|------|
| Authentication    | 9099 |
| Functions         | 5001 |
| Firestore         | 8080 |
| Realtime Database | 9000 |
| Hosting           | 5000 |
| Pub/Sub           | 8085 |
| Storage           | 9199 |
| Emulator UI       | 4000 |

------

## Testing & Verification Suite (Vitest)

Unit tests are written with **Vitest** (do not introduce Jest or Mocha/Chai) and
live in `test/`, mirroring the `src/` hierarchy precisely — each module
`src/<path>/<name>.ts` has a matching `test/<path>/<name>.test.ts`. Vitest
collects `test/**/*.test.ts` and `test/**/*.spec.ts` (see `vitest.config.ts`) and
runs against the `node` environment.

### Run the test suite

Run the full suite once (CI-friendly):

```shell
npm test
```

Re-run automatically on file changes during development:

```shell
npm run test:watch
```

You can also invoke Vitest directly:

```shell
npx vitest run        # single run
npx vitest            # watch mode
```

### Safe, side-effect-free testing

Tests must **never** perform real network requests or touch live external APIs or
real cloud instances — all I/O must be intercepted:

- **Stub external clients** with `vi.mock` + `vi.hoisted` (every variable
  referenced inside a `vi.mock` factory must be declared via `vi.hoisted`). Mock
  `@google-cloud/pubsub`, `@google-cloud/bigquery`, `@google-cloud/bigquery-storage`,
  `firebase-admin` sub-modules, the global `fetch`, and the `firebase-functions/v2` `logger`.
  Reset state with `vi.clearAllMocks()` in `beforeEach` and `vi.restoreAllMocks()` in
  `afterEach`. Follow the established pattern in `test/pubsub-event.test.ts`.
- **Cloud Functions:** drive and track execution with the official
  `firebase-functions-test` SDK.
- **Data assertions:** either run against the local Firebase Emulators (ports in
  `firebase.json`) or heavily stub the `firebase-admin` SDK to intercept
  Firestore / Realtime Database reads and writes — never hit real Firestore/RTDB.
- Import the module under test through its `.js` specifier
  (e.g. `import pubSubEvent from '../src/pubsub-event.js';`), per the `Node16`
  resolution rule.

### Verification gate

Before considering a change complete, run all three — they must pass:

```shell
npm run lint
npm run build
npm test
```

------

## AI-Assisted Engineering Rules

This repository is heavily optimized for **AI-assisted workflows** with GitHub
Copilot. The authoritative rule manual for both human and AI contributors is
[`.github/copilot-instructions.md`](.github/copilot-instructions.md) — review it
before contributing.

Before submitting a Pull Request, ensure your AI chat assistant is **grounded in
that instruction file** so generated code stays consistent with our standards. In
particular:

- **Strict typing.** Code compiles under `strict: true`. Use precise type
  declarations; never use banned JSDoc type wrappers like `Function` or `Object`
  — prefer exact shapes (e.g. `Record<string, unknown>`, an explicit interface, or
  a concrete function signature).
- **Google-style TypeScript JSDoc.** All exported functions, methods, interfaces,
  and namespaces carry multi-line `/** ... */` blocks (no `///` or single-line
  `//` docs) with a capitalized summary sentence, explicit
  `@param {type} name - description` mapping, `@returns`/`@return` documentation,
  and `@throws {Error} ...` where applicable. Mark optional params with brackets
  (`@param {number} [length]`).
- **No redundant or banned native type strings**, and respect the linter's tag
  preference (`returns` → `return`).
- **Preserve URLs & links** inside comments — never rewrite, line-wrap, or remove
  markdown links or external URLs (`max-len` is configured with `ignoreComments`
  and `ignoreUrls`).
- **Architecture rules.** Use `async`/`await` (not raw `.then()`/`.catch()`
  chains); keep Firebase triggers thin and delegate to independently testable
  domain logic; validate and shape data before any database write.
- **Never read or edit `/lib`** as context (see the blacklist notice above), and
  do not modify `src/` solely to make code easier to test.

------

## Installation

From NPM:

```shell
npm i @fabricelements/shared-helpers --save
```

Or from GitHub:

```shell
npm i github:FabricElements/shared-helpers --save
```

### Peer dependencies

`firebase-admin` and `firebase-functions` are **peer dependencies**, not regular
dependencies. Your project must declare them itself:

```shell
npm i firebase-admin@^13.10.0 firebase-functions@^7.3.2 --save
```

| Peer dependency | Supported range |
| --- | --- |
| `firebase-admin` | `^13.10.0 \|\| ^14.0.0` |
| `firebase-functions` | `^7.3.2` |

Both are singletons and **must resolve to exactly one copy** in the consuming
project. `firebase-admin` keeps a module-global app registry: when the consumer
calls `initializeApp()` on its own copy while this library resolves to a second,
nested copy, that second registry stays empty and every service accessor
(`getFirestore()`, `getAuth()`, `getStorage()`) throws *"The default Firebase app
does not exist."* Similarly, an `HttpsError` thrown from a duplicate
`firebase-functions` copy fails the runtime's `instanceof` check and is
downgraded to a generic `INTERNAL` error.

Because a `github:` install copies a tarball rather than symlinking, a duplicate
would otherwise be installed whenever the ranges diverge. Declaring these as
peers makes that structurally impossible, and the deliberately wide
`firebase-admin` range lets consumers adopt v14 on their own schedule.

## Usage

Import only what you need:

```js
import {FirestoreHelper, pubSubEvent} from "@fabricelements/shared-helpers";
```

Or import everything:

```js
import * as sharedHelpers from "@fabricelements/shared-helpers";
```

Subpath modules are also available:

```js
import {User} from "@fabricelements/shared-helpers/user";
import {Media} from "@fabricelements/shared-helpers/media";
```

## Contributing

Please check [CONTRIBUTING](CONTRIBUTING.md).

## License

Released under the [BSD 3-Clause License](LICENSE.md).
