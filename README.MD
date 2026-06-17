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
Subpath exports `./user` and `./media` are also exposed via `package.json`.

| Helper                 | Source                                                           | Purpose                                                        |
|------------------------|------------------------------------------------------------------|----------------------------------------------------------------|
| `apiRequest`           | [src/api-request.ts](src/api-request.ts)                         | Call a Firebase project's base API.                            |
| `backup`               | [src/backup.ts](src/backup.ts)                                   | Custom backup from Firestore to BigQuery.                      |
| `checkNumber`          | [src/check-number.ts](src/check-number.ts)                       | Validate and format phone numbers.                             |
| `cleaner`              | [src/cleaner.ts](src/cleaner.ts)                                 | BigQuery database cleanup.                                     |
| `FirestoreHelper`      | [src/firestore-helper.ts](src/firestore-helper.ts)               | Google Cloud Firestore access helpers.                         |
| `global`               | [src/global.ts](src/global.ts)                                   | Basic and reusable helpers.                                    |
| `hashId`               | [src/hash-id.ts](src/hash-id.ts)                                 | Generate a random hash id (4+ characters).                     |
| `messageQueueSpeed`    | [src/message-queue-speed.ts](src/message-queue-speed.ts)         | Compute safe message dispatch throughput (Twilio rate limits). |
| `pubSubEvent`          | [src/pubsub-event.ts](src/pubsub-event.ts)                       | Google Cloud Pub/Sub event helper.                             |
| `replaceMessageText`   | [src/replace-message-text.ts](src/replace-message-text.ts)       | Replace message text with custom keys.                         |
| `specialCharToRegular` | [src/special-char-to-regular.ts](src/special-char-to-regular.ts) | Convert special characters to regular GSM characters.          |
| `strings`              | [src/strings.ts](src/strings.ts)                                 | String transformation utilities (e.g. snake_case → camelCase). |
| `validateUrl`          | [src/validate-url.ts](src/validate-url.ts)                       | Validate URL strings and strip embedded whitespace.            |
| `regex`                | [src/regex.ts](src/regex.ts)                                     | Shared regular expressions (email, media content types, etc.). |
| `interfaces`           | [src/interfaces.ts](src/interfaces.ts)                           | Shared TypeScript interfaces and types.                        |
| `Media` (`./media`)    | [src/media.ts](src/media.ts)                                     | Image/media processing with `sharp` and Cloud Storage.         |
| `User` (`./user`)      | [src/user.ts](src/user.ts)                                       | Firebase Auth/Firestore user helpers.                          |

------

## Tech Stack & Source Architecture Map

| Area                       | Details                                                                                                                                                                                                                                          |
|----------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Language                   | **TypeScript** `^6.0.3`, compiled to **ES2020** ESM (`"type": "module"`, `module`/`moduleResolution`: `Node16`, `strict: true`, `declaration: true`).                                                                                            |
| Runtime                    | **Node.js `>=22`** (see `engines` in `package.json`).                                                                                                                                                                                            |
| Firebase                   | `firebase-admin` `^13.10.0`, `firebase-functions` `^7.2.5`.                                                                                                                                                                                      |
| Google Cloud               | `@google-cloud/bigquery` `^8.3.1`, `@google-cloud/bigquery-storage` `^5.1.1`, `@google-cloud/pubsub` `^5.3.0`.                                                                                                                                   |
| Media                      | `sharp` `^0.34.5` for image resizing/transformation.                                                                                                                                                                                             |
| Utilities                  | `libphonenumber-js` `^1.13.5`, `lodash` `^4.18.1`, `node-fetch` `^3.3.2`.                                                                                                                                                                        |
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
  `firebase-admin` sub-modules, `node-fetch`, and the `firebase-functions/v2` `logger`.
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
