---
description: Documentation, JSDoc, inline comments, API docs, and changelog standards.
applyTo: "src/**/*.ts,functions/src/**/*.ts,test/**/*.ts"
---

# Documentation Instructions — `@fabricelements/shared-helpers`

Governs every comment and doc block in TypeScript sources. Grounded in the existing
style of `src/api-request.ts`, `src/hash-id.ts`, `src/interfaces.ts`, and
`src/firestore-helper.ts`. When this file and `copilot-instructions.md` disagree on a
documentation detail, **this file wins**.

---

## 1. File headers

Every `.ts` source file **starts with the `@license` block** and must preserve it verbatim
on edit. IDE inspection pragmas (`// noinspection …`), when present, sit **above** the
license block.

```ts
// noinspection JSUnusedGlobalSymbols

/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
```

The package entry point additionally carries an `@fileoverview` describing the module's
role (see `src/index.ts`). Add `@fileoverview` to any new barrel/aggregator file.

```ts
/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 *
 * @fileoverview Main entry point for the `@fabricelements/shared-helpers` package.
 * Re-exports all public utility helpers, Firebase/Google Cloud integrations,
 * and shared TypeScript interfaces.
 */
```

---

## 2. JSDoc for exported symbols (mandatory)

**Every exported** function, method, class, namespace, interface, type, and enum carries a
Google-style multi-line JSDoc block. Rules:

- **Multi-line `/** … */` only.** Leading `*` on every line. No triple-slash (`///`) and no
  single-line `//` docs for definitions.
- **Capitalized summary sentence** ending in a period, then a blank `*` line, then a fuller
  paragraph describing the **why** and non-trivial behaviour (side effects, defaults,
  emulator-only logging, error handling).
- **`@param {Type} name - Description`** for every parameter. The brace type must match the
  TypeScript declaration exactly. Mark optional params with brackets and document the
  default in the description: `@param {number} [length] - … Defaults to \`4\`.`
- **`@returns {Type} Description`** for the return value. ESLint `tagNamePreference` maps
  `returns` → `return`; the lint rule for JSDoc tags is not enforced as an error here, but
  **respect the preference** — the existing code uses `@returns` in prose; keep files
  internally consistent and never trigger a lint error.
- **`@throws {Error} …`** for **every** condition under which the function can throw,
  described individually (see `api-request.ts`, `validate-url.ts`).
- Use `@see {url}`, `@deprecated`, `@enum`, `@namespace`, `@property` where they already
  appear in kind (see `interfaces.ts`, `media.ts`).

### Canonical example (single-function module)

```ts
/**
 * Generates a cryptographically random alphanumeric and symbol hash string of
 * at least `length + 1` characters.
 *
 * Characters are drawn from a pool of lowercase letters, uppercase letters,
 * digits, and common symbols using `crypto.randomInt`, which produces
 * cryptographically strong random values suitable for one-time codes or tokens.
 *
 * @param {number} [length] - Minimum character count for the output string.
 *   Defaults to `4`; the returned string will have `length + 1` characters.
 * @returns {string} A randomly generated string of `length + 1` characters.
 */
export default (length?: number): string => { /* … */ };
```

### Canonical example (throws documented)

```ts
/**
 * Executes an outbound HTTP request against an external or Firebase project API.
 *
 * @param {InterfaceAPIRequest} options - Endpoint, method, headers, body, auth, and
 *   desired response format.
 * @returns {Promise<any>} Resolves to the deserialised response body; the concrete type
 *   depends on the `as` option.
 * @throws {Error} If `options.path` is falsy, if the HTTP response is not `ok`, or if the
 *   server returns a JSON error body with a `message` field.
 */
export default async (options: InterfaceAPIRequest) => { /* … */ };
```

---

## 3. Interface, type, and enum documentation

- Document the interface/type with a block summary, then **document every member** with a
  single-line `/** … */` (this is the one place single-line `/** */` is correct — for
  fields). Match `src/interfaces.ts`.

```ts
/**
 * Configuration options for an outbound HTTP request made via `apiRequest`.
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods
 */
export interface InterfaceAPIRequest {
  /** The request payload to be JSON-serialised and sent as the body. */
  body?: any,
  /** @deprecated Use `as` instead to control response format. */
  raw?: boolean,
}
```

- Enums use `@enum {string}` and may document members via `@property` (see `media.ts`).

---

## 4. Type-in-brace rules (strict)

- **Never use banned wrapper types** in braces: no `Function`, no `Object`, no bare `{}`.
  Use precise shapes: `Record<string, unknown>`, an explicit interface, a concrete function
  signature (`(x: string) => number`), or `unknown`.
- Types must reflect reality — for unions, list them (`{string|null}`,
  `{Date | FieldValue | string}`).
- `any` is tolerated by the linter but discouraged; prefer a precise type or `unknown` and
  narrow.

---

## 5. Inline comments

- Comment **only where clarification adds value** — the *why*, a non-obvious constraint, a
  spec link, or a deliberate no-op (`// Response body is not valid JSON — use the generic
  message.`). Do not narrate obvious code.
- **URL & link protection.** Never clean up, rewrite, line-wrap, or remove markdown links or
  external URLs inside comments. `max-len` is configured with `ignoreComments` and
  `ignoreUrls`, so **keep each URL on a single line**.
- Preserve existing IDE pragmas (`// noinspection …`, `// @read …`) unless the referenced
  code is removed.
- Never leave commented-out code behind in a change except where the repo already parks an
  intentional placeholder (e.g. the commented `User` re-export in `src/index.ts`) — do not
  add new dead code.

---

## 6. API documentation

This is a **library**, not an HTTP service — the "API" is the exported TypeScript surface,
and JSDoc + emitted `.d.ts` declarations are the API docs. Therefore:

- Keep JSDoc accurate and complete; the compiler emits `.d.ts` (`declaration: true`), so
  wrong types/docs ship to consumers.
- Keep `src/index.ts` exports and `package.json` `exports` in sync with reality, and keep
  the **Public API surface** table in `README.MD` current (see `readme.instructions.md`).
- The `functions/` sample app documents Cloud Function entry points via JSDoc on the
  exported trigger (memory/timeout/CORS noted in prose, as in `functions/src/media/open.ts`).
  There is **no** OpenAPI/Swagger layer in this repo — do not introduce one unless asked.

---

## 7. Changelog

- This repo tracks history through Git and GitHub Releases; there is **no** `CHANGELOG.md`.
  Do **not** create one unless explicitly requested.
- Communicate change intent through **clear, conventional commit messages** and PR
  descriptions. When bumping `package.json` `version`, follow SemVer and summarise
  user-facing changes (new exports, breaking signature changes, removed fields).
- If a `CHANGELOG.md` is ever introduced, use *Keep a Changelog* sections
  (Added/Changed/Deprecated/Removed/Fixed/Security) and never rewrite prior entries.

---

## DO NOT

- ❌ Remove or alter the `@license` header block.
- ❌ Use `///` or single-line `//` blocks to document a definition (fields excepted).
- ❌ Put `Function`, `Object`, or bare `{}` inside JSDoc braces.
- ❌ Rewrite, line-wrap, or delete URLs/markdown links in comments.
- ❌ Ship a JSDoc block whose `@param`/`@returns` types disagree with the TS signature.
- ❌ Omit `@throws` on a function that can throw.
- ❌ Add narration comments for self-evident code, or leave new commented-out code.
- ❌ Introduce Swagger/OpenAPI or a `CHANGELOG.md` unless explicitly asked.
- ❌ Put real secrets, tokens, credentials, or PII in JSDoc examples or inline comments — use
  obvious placeholders (`'ca-pub-XXXX'`, `'<token>'`).
