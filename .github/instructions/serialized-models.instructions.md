---
description: DTOs, Firestore/BigQuery entities, JSON serialization, API contracts, and compatibility.
applyTo: "src/interfaces.ts,src/**/*.ts,functions/src/**/*.ts"
---

# Serialized Models Instructions — `@fabricelements/shared-helpers`

Rules for anything that crosses a serialization boundary: shared interfaces/DTOs
(`src/interfaces.ts`), namespace-scoped domain models (`User.Interface`,
`FirestoreHelper.Interface*`), Firestore documents, BigQuery rows, Pub/Sub payloads, and
the `apiRequest` HTTP contract. This package ships `.d.ts` declarations, so **these types
are a public contract** with every consumer.

---

## 1. Where models live

- **Cross-cutting shared types** → `src/interfaces.ts` (e.g. `InterfaceFormatLink`,
  `InterfaceAPIRequest`, `fetchResponse`, `linkType`).
- **Domain-owned models** → inside the owning namespace, next to its `Helper`
  (`User.Interface`, `User.InterfaceLinks`, `FirestoreHelper.InterfaceFirestoreQuery`,
  `BigQueryStreamWriterOptions`).
- **Never** duplicate a model in two places. Import and reuse.

---

## 2. Interface & DTO conventions

- **Name public interfaces with the `Interface` prefix** (`InterfaceAPIRequest`,
  `InterfaceFirestoreQuery`). The canonical per-namespace entity is named `Interface`
  (e.g. `User.Interface`). Option bags may use a `…Options` suffix only where a sibling
  already does (`BigQueryStreamWriterOptions`).
- **Fields are `optional?` by default** for stored/serialized entities. Firestore documents
  are sparse and partially populated, so model persisted shapes with `?` and document
  meaning + defaults per field (see `User.Interface`, `InterfaceFormatLink`).
- **Document every field** with a single-line `/** … */` (see `documentation.instructions.md`).
- Constrain string enumerations with **union types** and keep an open fallback only where the
  domain genuinely needs it (`linkType = 'instagram' | 'link' | … | string`).
- **No banned types** (`Function`, `Object`, bare `{}`); prefer precise shapes,
  `Record<string, unknown>`, or `unknown`.

```ts
/**
 * Ad network configuration for a user account.
 */
export interface InterfaceAds {
  adsense?: {
    /** Google AdSense publisher client ID (e.g., `'ca-pub-XXXXXXXXXXXXXXXX'`). */
    client: string;
    /** Google AdSense ad slot ID for the placement unit. */
    slot: string;
  },
}
```

---

## 3. Firestore entities

- **Timestamp fields use the `Date | FieldValue | string` union.** Reads return `Date`/
  `string`, writes use `FieldValue` (`serverTimestamp()`), and serialized transport may be a
  string. Model all three (see `created`/`updated` in `User.Interface`,
  `InterfaceFormatLink`).

  ```ts
  import type {FieldValue} from 'firebase-admin/firestore';
  /** Timestamp recording when the document was first created. */
  created?: Date | FieldValue | string;
  ```

- **The document ID is injected as an `id` field** when reading (see
  `FirestoreHelper.getDocument`). Keep an optional `id?: string` on entities; never persist a
  redundant `id` you then also key on.
- **Validate and shape before writing.** Strip/whitelist fields, coerce types, and apply
  defaults before any `set`/`update`. Never persist raw external input.
- Use `FieldValue` sentinels (`serverTimestamp`, `increment`, `arrayUnion`) rather than
  client clocks for server-authoritative fields.

---

## 4. BigQuery rows

- A row is `Record<string, unknown>` (`BigQueryRow`); values are native TS primitives coerced
  **before** protobuf serialization per a `fieldTypes` map (`BigQueryStreamWriterOptions`).
- Honor the established coercions (see `bigquery-stream-writer.ts`):
  - `TIMESTAMP` / `DATETIME` → ISO 8601 via `Date.prototype.toISOString()`.
  - `NUMERIC` / `BIGNUMERIC` → **string**, so high-precision decimals are never truncated by
    IEEE-754 floating point.
  - Unlisted columns pass through untouched (`DEFAULT`).
- When adding a column type that needs client-side coercion, extend `BigQueryFieldType` and
  document the coercion in JSDoc — do not coerce silently.

---

## 5. JSON serialization & the HTTP contract

- Outbound bodies are `JSON.stringify`-ed; responses are deserialized per the `as`
  discriminator (`fetchResponse = null | 'json' | 'text' | 'raw' | 'arrayBuffer' |
  'formData' | 'blob'`). When `as` is omitted, the response `content-type` drives detection
  (see `api-request.ts`). Preserve this contract; extend the union rather than special-casing.
- Pub/Sub payloads are `JSON.stringify`-ed into a `Buffer` (see `pubsub-event.ts`). Keep
  payloads plain-JSON-serializable — **no** `Date` objects (use ISO strings), `undefined`,
  `Map`/`Set`, `BigInt`, or class instances in transported payloads.
- Prefer `null` over `undefined` for "explicitly absent" values that must survive JSON
  round-trips (`undefined` keys are dropped by `JSON.stringify`).

---

## 6. Backward / forward compatibility

Because `.d.ts` and JSON contracts are consumed downstream and by stored documents:

- **Additive changes are safe:** add **optional** fields; readers ignore unknown fields.
- **Never remove or rename a published field or export in a non-major release.** To retire a
  field/param, keep it, mark it `@deprecated` with the replacement, and add the new field
  alongside — mirror the `raw?` → `as` migration in `InterfaceAPIRequest`.

  ```ts
  /** @deprecated Use `as` instead to control response format. */
  raw?: boolean,
  ```

- **Don't narrow existing types** (e.g. widening `string` → union is breaking for writers;
  narrowing a union is breaking for readers). Widen inputs, keep outputs stable.
- **Tolerate unknown fields** on read; do not throw on extra properties in deserialized data.
- Bump `package.json` `version` per SemVer: breaking model changes require a **major** bump.

---

## DO NOT

- ❌ Remove/rename a public field, type, or export without a major version bump + `@deprecated`
  migration path.
- ❌ Model Firestore timestamps as bare `Date` — use `Date | FieldValue | string`.
- ❌ Put `Date`, `undefined`, `BigInt`, `Map`/`Set`, or class instances into JSON/Pub/Sub
  payloads.
- ❌ Emit `NUMERIC`/`BIGNUMERIC` BigQuery values as JS numbers (precision loss) — use strings.
- ❌ Persist unvalidated/unshaped external input to Firestore/RTDB/Storage.
- ❌ Use `Function`/`Object`/bare `{}` in a model; use precise shapes or `Record<string, unknown>`.
- ❌ Duplicate a model across files instead of importing the canonical one.
- ❌ Throw on unknown/extra fields when deserializing.
- ❌ Log, serialize, or transport secret/PII fields (`password`, tokens, raw `email`/`phone`)
  without redaction — keep them out of Pub/Sub payloads, BigQuery rows, and logs.
