# FabricElements Shared Helpers

`@fabricelements/shared-helpers` is a TypeScript helper library for Firebase and
Google Cloud backend projects. It packages reusable utilities — Firestore access
helpers, media/image processing, phone-number validation, Pub/Sub event handling,
BigQuery backups, string/regex utilities and more — so that FabricElements Cloud
Functions services can share a single, well-tested foundation.

The package is published as an ESM module and consumed both from NPM and directly
from GitHub.

------

## Project Architecture & Cloud Blueprint

This repository is a **publishable NPM library** (`main`/`module`/`types` all point
at `./lib`). The authored TypeScript lives in `src/` and is compiled to JavaScript +
type declarations in `lib/`, which is the artifact actually shipped to consumers
(see the `files` and `exports` fields in `package.json`). A companion sample Firebase
Cloud Functions app lives under `functions/` and consumes the library locally via a
`file:..` dependency, demonstrating real triggers, controllers and media handlers.

### Directory map

| Path | Role |
| --- | --- |
| `src/` | **Authored source.** All TypeScript helpers (the public API re-exported from `src/index.ts`). |
| `lib/` | **Generated build output — DO NOT EDIT.** Produced by the TypeScript compiler. See the rule below. |
| `test/` | Vitest unit tests (`*.test.ts`), one suite per helper in `src/`. |
| `functions/` | Sample/consumer Firebase Cloud Functions app that imports the library. |
| `functions/src/index.ts` | Initializes the Admin SDK and re-exports the function modules. |
| `functions/src/app.ts` | **Controllers** — aggregates and re-exports the `media` and `user` function modules. |
| `functions/src/user/` | **Triggers** — Firebase Auth `onCreate`/`onDelete` event listeners and user actions. |
| `functions/src/media/` | Media Cloud Functions, including the `open` HTTPS function that serves/resizes Storage media. |
| `functions/src/helpers/` | Shared variables/config for the sample functions app. |
| `firebase.json` | Firebase project config: Firestore, Functions, Hosting, Storage, Realtime Database and the local Emulator Suite ports. |
| `.firebaserc` | Default Firebase project alias (`fabricelements`). |
| `firestore.rules` / `storage.rules` / `database.rules.json` | Security rules for Firestore, Cloud Storage and Realtime Database. |
| `firestore.indexes.json` | Firestore composite index definitions. |
| `tsconfig.json` | Library compiler config (`rootDir: src`, `outDir: lib`, `Node16` modules). |
| `tsconfig.test.json` | Test compiler config used by Vitest. |
| `vitest.config.ts` | Vitest runner configuration. |
| `eslint.config.js` | Flat ESLint config (typescript-eslint, recommended + stylistic). |

> ### ⚠️ `/lib` is generated — never edit it manually
>
> The `lib/` directory is **build output** created by `tsc` (`npm run compile`).
> It is regenerated on every build (the `clear` script runs `rm -rf ./lib` first),
> so any manual change will be silently overwritten. **Never edit files in `/lib`
> by hand** and ignore it while editing — make all changes in `src/` instead. The
> compiler config explicitly excludes `lib` (`tsconfig.json`) and ESLint ignores it
> (`eslint.config.js`).

### Public API surface

The package entry point (`src/index.ts`) re-exports the following helpers. Subpath
exports `./user` and `./media` are also exposed via `package.json`.

| Helper | Source | Purpose |
| --- | --- | --- |
| `apiRequest` | [src/api-request.ts](src/api-request.ts) | Call a Firebase project's base API. |
| `backup` | [src/backup.ts](src/backup.ts) | Custom backup from Firestore to BigQuery. |
| `checkNumber` | [src/check-number.ts](src/check-number.ts) | Validate and format phone numbers. |
| `cleaner` | [src/cleaner.ts](src/cleaner.ts) | BigQuery database cleanup. |
| `FirestoreHelper` | [src/firestore-helper.ts](src/firestore-helper.ts) | Google Cloud Firestore access helpers. |
| `global` | [src/global.ts](src/global.ts) | Basic and reusable helpers. |
| `hashId` | [src/hash-id.ts](src/hash-id.ts) | Generate a random hash id (4+ characters). |
| `messageQueueSpeed` | [src/message-queue-speed.ts](src/message-queue-speed.ts) | Compute safe message dispatch throughput (Twilio rate limits). |
| `pubSubEvent` | [src/pubsub-event.ts](src/pubsub-event.ts) | Google Cloud Pub/Sub event helper. |
| `replaceMessageText` | [src/replace-message-text.ts](src/replace-message-text.ts) | Replace message text with custom keys. |
| `specialCharToRegular` | [src/special-char-to-regular.ts](src/special-char-to-regular.ts) | Convert special characters to regular GSM characters. |
| `strings` | [src/strings.ts](src/strings.ts) | String transformation utilities (e.g. snake_case → camelCase). |
| `validateUrl` | [src/validate-url.ts](src/validate-url.ts) | Validate URL strings and strip embedded whitespace. |
| `regex` | [src/regex.ts](src/regex.ts) | Shared regular expressions (email, media content types, etc.). |
| `interfaces` | [src/interfaces.ts](src/interfaces.ts) | Shared TypeScript interfaces and types. |
| `Media` (`./media`) | [src/media.ts](src/media.ts) | Image/media processing with `sharp` and Cloud Storage. |
| `User` (`./user`) | [src/user.ts](src/user.ts) | Firebase Auth/Firestore user helpers. |

------

## Tech Stack Core

| Area | Details |
| --- | --- |
| Language | **TypeScript** `^6.0.3`, compiled to **ES2020** ESM (`"type": "module"`, `module`/`moduleResolution`: `Node16`). |
| Runtime | **Node.js `>=22`** (see `engines` in `package.json`). |
| Firebase | `firebase-admin` `^13.10.0`, `firebase-functions` `^7.2.5`. |
| Google Cloud | `@google-cloud/bigquery` `^8.3.1`, `@google-cloud/pubsub` `^5.3.0`. |
| Media | `sharp` `^0.34.5` for image resizing/transformation. |
| Utilities | `libphonenumber-js` `^1.13.4`, `lodash` `^4.18.1`, `node-fetch` `^3.3.2`. |
| Database / storage engines | **Cloud Firestore**, **Cloud Storage**, and **Realtime Database** (rules in `firestore.rules`, `storage.rules`, `database.rules.json`); analytics/queue via **BigQuery** and **Pub/Sub**. |
| Tooling | **ESLint `^10.4.0`** (flat config via `typescript-eslint`), **Vitest `^3.2.6`** for tests. |
| Configuration patterns | Compiler settings in `tsconfig.json` (`rootDir: src`, `outDir: lib`, declarations + source maps); Firebase services and emulator ports in `firebase.json`; default project alias in `.firebaserc`. |

------

## Local Emulation & Setup

Fresh onboarding for a new developer:

### 1. Install dependencies

```shell
npm install
```

### 2. Build the library (generates the operational `lib/` layout)

A one-off build (clears `lib/`, lints, then compiles):

```shell
npm run build
```

To keep the TypeScript compiler running and recompiling on every change, use the
watch mode:

```shell
npm run build:watch
```

> The build is required because consumers (and the sample `functions/` app, which
> imports the package via `file:..`) load the compiled output from `lib/`.

### 3. Start the local Firebase environment

The local Emulator Suite is configured in `firebase.json` (Auth, Functions,
Firestore, Realtime Database, Hosting, Pub/Sub, Storage, plus the Emulator UI):

```shell
firebase emulators:start
```

| Emulator | Port |
| --- | --- |
| Authentication | 9099 |
| Functions | 5001 |
| Firestore | 8080 |
| Realtime Database | 9000 |
| Hosting | 5000 |
| Pub/Sub | 8085 |
| Storage | 9199 |
| Emulator UI | 4000 |

------

## Testing Execution Map

Unit tests are written with **Vitest** and live in `test/` (`test/**/*.test.ts`),
using the dedicated `tsconfig.test.json` compiler config (see `vitest.config.ts`).
The tests run against the `node` environment and never touch a live project.

### Run the unit test engine

Run the full suite once (CI-friendly):

```shell
npm test
```

Re-run automatically on file changes during development:

```shell
npm run test:watch
```

### Analyze coverage safely

Vitest can generate a coverage report via its `--coverage` flag. Because tests run
in the local `node` environment and never connect to a deployed Firebase project,
coverage analysis cannot corrupt production data — always run it locally (or in CI)
against the emulator/mock layer, never against production credentials:

```shell
npx vitest run --coverage
```

> Coverage requires a Vitest coverage provider (e.g. `@vitest/coverage-v8`) to be
> installed; install it as a dev dependency if it is not already present before
> running the command above.

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
