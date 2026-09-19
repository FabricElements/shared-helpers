# Changelog

All notable changes to `@fabricelements/shared-helpers` are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Prior releases are tracked through Git history and GitHub Releases.

## [Unreleased]

### ⚠ Breaking Changes

- **`User.Helper.updateRole` / `User.Helper.remove` — refresh tokens are now
  revoked on EVERY custom-claims change, not only when authority is reduced.**

  Previously, adding a role or group (a pure grant) did not revoke the user's
  refresh tokens; the new claim took effect silently on the next token refresh.
  Removing or replacing a role or group did revoke.

  The new behaviour revokes unconditionally whenever claims are written.  This
  means clients will be signed out immediately after any role or group change —
  including a grant — and must obtain a fresh token before continuing.

  **Why:** A token minted before a grant lacks the new claim.  Any service that
  derives authorization from token claims (rather than re-checking Firestore on
  every request) would silently deny the newly-granted authority until the token
  expired naturally.  Revoking on grants ensures the token the client holds
  always reflects the current claims in both directions.

  **Migration:** Clients must handle the HTTP 401 / token-revoked error that
  follows a role or group change and prompt for re-authentication (or
  automatically call `getIdToken(/* forceRefresh */ true)` if your SDK supports
  it).  There is no server-side code change required beyond updating any client
  error-handling logic that assumed grants were transparent.

- **`User.Helper.updateRole` / `User.Helper.remove` — a custom-claims payload
  larger than 1,000 bytes (the Firebase platform limit) now throws an `Error`
  instead of forwarding the oversized payload to `setCustomUserClaims`.**

  The error message names the actual byte size and the limit, and states that
  the group set is too large to publish as claims.  `setCustomUserClaims` is
  never called when the size guard fires, so claims are left untouched.

  **Migration:** Keep each user's group count within the limit.  The practical
  ceiling depends on key and value lengths; roughly 26–30 short group entries
  is near the limit.  Callers that catch errors from `updateRole` / `remove`
  should handle the new size-exceeded case explicitly.

### Fixed

- **`BigQueryStreamWriter` — `close()` now removes the instance from the
  process-wide singleton cache (`instances` Map) in its `finally` block.**
  Previously `close()` tore down the gRPC connection but left the dead object
  in the cache, preventing garbage collection and causing `getInstance` to
  return a wedged instance after teardown.  The deletion is unconditional (in
  `finally`) so it runs even when the final flush fails.

- **`BigQueryStreamWriter.flush()` — failed batches are restored with a
  bounded retention cap instead of being silently dropped.**
  When a write fails the unwritten batch is restored to the front of the
  in-memory buffer (using `batch.concat(this.buffer)` to avoid the
  `RangeError: Maximum call stack size exceeded` that spread-based unshift
  produces on large arrays) so a subsequent flush or retry can attempt
  delivery.  To prevent unbounded memory growth during a sustained BigQuery
  outage the combined buffer is capped at `4 × maxBatchSize` rows; when the
  cap is exceeded the oldest rows are dropped first and a `logger.error` is
  emitted with the drop count and cap.

- **`BigQueryStreamWriter.ensureWriter()` — `initPromise` is cleared on
  initialisation failure, allowing retry.**
  A failing metadata or gRPC connection setup left a rejected, permanently
  memoised `initPromise`.  Every subsequent call re-rejected from the cached
  promise, making the instance unrecoverable without calling `close()`, and
  `close()` itself would re-throw before completing teardown.  The `.catch()`
  handler now clears `initPromise` before re-throwing so the next call can
  attempt re-initialisation, and `close()` can always reach its `finally`
  block.

- **`streamToBuffer` (`global.ts`) — stream is destroyed on error and
  listeners are cleaned up.**
  The previous implementation called `reject` on the `error` event but did
  not remove the registered `data` / `end` listeners or call
  `stream.destroy()`.  On streams that emit further events after an error the
  `buffers` array kept accumulating chunks in the closed-over scope, and the
  underlying stream resource was not released.  The error handler now
  removes all three listeners before destroying the stream.

### Added

- **`FilterHelper` — server-side decoder and parameterized query builder for the
  `fabric_flutter` report filter grammar** (`src/filter-helper.ts`, exported from the
  root barrel and as `@fabricelements/shared-helpers/filter-helper`).

  Decodes the base64 JSON payload produced by the Dart `FilterHelper` in
  [`fabric_flutter`](https://github.com/FabricElements/fabric_flutter) `3.0.1` and turns
  validated entries into a BigQuery fragment built entirely from server-declared
  columns and bind parameters.

  Public surface: `FilterOperator`, `FilterOrder` and `InputDataType` enums mirroring
  the Dart members verbatim; `InterfaceFilterData`, `InterfaceFilterField`,
  `InterfaceFilterDecodeOptions`, `InterfaceFilterQueryFragment`; and
  `FilterHelper.Helper` with `decode`, `fromJSON`, `toJSON`, `encode`, `filterById`,
  `valueFromId`, `toQueryFragment` and `decodeToQueryFragment`.

  **Security contract:**
  - The payload carries **no SQL text and no table name** — only declarative
    `{id, type, operator, value, index}` entries. The caller selects the target table
    from its own server-side configuration.
  - Every `id` must resolve through the caller-supplied `allowedFields` allow-list;
    the real column name comes from that declaration and is checked with
    `validateBigQueryColumn`. A payload identifier is never interpolated.
  - `allowedFields` decides which identifiers are **addressable**, not which filters a
    given caller may **use**. It is static per report type and cannot express a
    per-caller rule, so authorization over privileged fields belongs in the caller,
    after `decode` and before the fragment is built.
  - `allowedFields` describes one column, one operator, one bound style per entry. A
    predicate that spans columns, falls back for legacy rows, or exists so the query
    engine can prune partitions cannot be expressed in that shape and belongs on the
    caller's own request schema, outside the allow-list.
  - `decode` is structural only and never canonicalizes values. Callers that
    canonicalize (uppercasing a country code, for example) must do so between `decode`
    and `toQueryFragment`, rather than using the `decodeToQueryFragment` convenience.
  - Values are always bound as query parameters (`@f0`, `@f1`, …) and never
    concatenated into SQL. `contains` compiles to `STRPOS`, not `LIKE`, so `%` and `_`
    in user input cannot widen a match.
  - `operator`, `type` and sort direction are validated against closed enums, and
    entry keys against an allow-list, so a smuggled `table`, `dataset`, `sql`,
    `__proto__` or `constructor` key is rejected rather than stripped.
  - A payload whose JSON root is not an array — including the legacy `toSQLEncoded`
    raw-SQL format — is rejected with no fallback.
  - Caller-facing errors are generic (`Invalid filter payload`,
    `Invalid filter field configuration`); detail is attached to `Error.cause`.

  **Temporal values.** The Dart wire format carries a full ISO 8601 timestamp for
  every temporal type, because `FilterData._valueToJson` calls
  `DateTime.toIso8601String()` for `date`, `dateTime` and `timestamp` alike. The Dart
  SQL path then narrows `InputDataType.date` to `yyyy-MM-dd` after converting to UTC.
  This decoder is the SQL side, so it performs the same narrowing at bind time, keyed
  off the **server-declared** `paramType` rather than the caller-supplied `type`:
  `DATE` binds `YYYY-MM-DD`, `DATETIME` binds a local-form literal with no zone
  designator, and `TIMESTAMP` binds the full instant. A temporal parameter whose value
  is not an ISO 8601 literal is rejected rather than coerced, because `Date.parse`
  otherwise accepts loose input such as `June 15, 2024`.

  **Validate-only fields.** `InterfaceFilterField.column` is optional. A caller that
  already owns a predicate table mapping each filter to a hand-written SQL fragment can
  use `decode` purely as the untrusted-input boundary — parsing, operator allow-listing
  and value validation — and build SQL itself, without declaring a column it will never
  use. `toQueryFragment` throws `Invalid filter field configuration` if it is asked to
  build a fragment for such a field, so an incomplete declaration fails loudly instead of
  dropping the predicate and widening the result set.

  **Range bounds.** `InterfaceFilterField.betweenBounds` selects whether a `between`
  includes its upper bound. The default `'closed'` emits
  `` `col` >= @f0 AND `col` <= @f1 ``, matching the Dart SQL builder, which emits
  `>= lower and <= upper` rather than `BETWEEN`, and its in-memory matcher. `'halfOpen'`
  emits `` `col` >= @f0 AND `col` < @f1 ``, which is what lets consecutive ranges tile a
  timeline without a boundary row falling into two adjacent buckets. The style is
  declared per field by the server and cannot be influenced by the payload, and declaring
  it does not narrow the field to ranges: a field may list `greaterThanOrEqual` and
  `between` together, so an open-ended single value and a two-value range are both
  accepted on the same column. `decode`
  rejects a reversed range, and rejects equal bounds under `'halfOpen'` because
  `[x, x)` selects nothing, while leaving them valid under `'closed'`, where `[x, x]`
  selects a single point. Bounds are only compared when that is unambiguous: numeric
  pairs, and temporal pairs compared as instants so a zone offset cannot make an ordered
  range look reversed.

  **Struct path columns.** `InterfaceFilterField.structPath` declares that the field's
  `column` is a dotted path into a `STRUCT` rather than the name of a single column. A
  BigQuery column name cannot contain a period, so a dotted reference can only ever be
  such a path. When set, the declaration is split on `.`, every segment is validated as a
  column name in its own right through the same `validateBigQueryColumn` used elsewhere,
  and the reference is emitted with each segment quoted separately —
  `` `sentiment`.`text` ``. It is opt-in, so a dotted column on a field that has not
  declared it is still rejected, and a stray period stays a configuration error instead of
  silently becoming a path. The depth is bounded and an empty segment is rejected. This
  affects only the server-declared column: payload `id` values are opaque lookup keys and
  have always accepted dots, so an existing filter keyed on `sentiment.text` keeps working
  unchanged and is never rewritten.

  **Encode inclusion rule.** An entry is serialized only when it carries both a value
  and an operator. The two Dart entry points historically disagreed — `FilterData.toJson`
  gated on `value != null` while `FilterHelper.encode` gated on `operator != null` — so
  each could emit an entry the other discarded. Both sides now apply the conjunction,
  which is the only rule under which `encode` and `decode` are lossless with respect to
  one another: a null value is never meaningful, and an operator-less entry cannot compile
  to a predicate, so it would be dropped by `decode` and the payload would shrink on the
  next round-trip.

- **Subpath exports for heavy standalone modules** (`package.json`).
  Four new entries are added to the `exports` map so consumers can import
  only what they need without paying the full barrel-load cost:
  - `@fabricelements/shared-helpers/bigquery-stream-writer`
  - `@fabricelements/shared-helpers/firestore-helper`
  - `@fabricelements/shared-helpers/filter-helper`
  - `@fabricelements/shared-helpers/bigquery-identifier`

  These are **additive** — the root barrel (`"."`) is unchanged and all
  existing imports remain valid.

## [2.0.0] - 2026-08-22

### Security

- **Caller-supplied authorization fields can no longer reach a user document
  (privilege escalation).** `User.Helper.create` previously forwarded the caller's object
  into the Firestore write and reset only the scalars `role`, `group` and `password`. A
  **nested authorization map is not a scalar**, so a caller who passed an unvalidated
  request body allowed the requester to inject a field such as
  `groups: {someTenant: 'owner'}` onto the new account. Any system whose authorization
  check reads that map granted the requester privileges in a tenant they did not own —
  and because a later role update copies the document's `groups` map into Firebase Auth
  **custom claims**, the injected value could be promoted from a document field to a
  signed token claim.

  Field selection is now an **allow-list** (`User.creatableProfileFields`) applied by the
  new `User.Helper.sanitizeProfile`. A field nobody anticipated can no longer reach the
  write. **Consumers should treat this as a priority upgrade**, especially if they pin an
  exact commit: a fix on `main` is not a fix in production until the pin moves.

- **Caller-supplied billing and tenancy fields can no longer reach a user document.**
  The creation allow-list was originally derived as "the declared non-authorization
  fields of `User.Interface`". That rule is coherent but it admitted `bcId`, `bsId`,
  `bsiId`, `bst`, `but` and `buq` — **payment-provider identity and metering state** —
  along with `account`, which designates the user's *active* account and is therefore a
  tenancy pointer. A consumer passing an unvalidated request body let the requester
  choose their own billing identity at creation, e.g. pointing `bcId` at another
  tenant's customer record. All seven are now excluded and are enumerated in the new
  exported `User.serverOnlyFields`. The test for admitting a field is now **"who knows
  the correct value?"** — `ads` stays creatable because it holds the user's own
  ad-network placement identifiers; `bcId` does not, because only the payment provider
  and the server ever know it.

- **Group role removal now actually removes the claim.** `roleUpdateCall` rebuilt the
  `groups` custom claim from `userDoc`, which is the **pre-write** snapshot, so
  published claims lagged the change by one update: removing a group left the removed
  group in the user's token indefinitely, and the very first group grant published no
  claim at all. The resulting map is now derived locally, so removals and first grants
  are both reflected immediately.

- **Refresh tokens are revoked when authority is withdrawn or replaced.** The
  `revokeRefreshTokens` call following `setCustomUserClaims` was commented out, so a
  de-provisioned user kept a validly-signed token carrying the **old** claims until
  natural expiry. It is now called when a role or group is removed, or when an existing
  role is replaced with a different one. A pure grant does not revoke, since the new
  claim takes effect on the next refresh anyway and forcing re-authentication there has
  a UX cost with no security benefit.

  ⚠️ **Revocation is not instantaneous by itself.** Already-issued ID tokens remain
  cryptographically valid until they expire (up to one hour) unless the relying party
  verifies them with `getAuth().verifyIdToken(token, true)`. Consumers needing immediate
  de-provisioning **must** pass that `checkRevoked` flag and treat claim removal as
  eventually consistent.

- **Documented: this library promotes Firestore document state into signed ID tokens.**
  `roleUpdateCall` copies the `groups` map from `user/{uid}` into Firebase Auth custom
  claims via `setCustomUserClaims`. Consumers may not realise the call happens at all,
  because it lives here rather than in their own codebase. The practical consequence is
  that **write access to `user/{uid}` is equivalent to role assignment**: anything able
  to influence that document's `groups` field can influence a signed token that is then
  presented to every relying party as verified identity — and which outlives deletion of
  the document itself. This is what made the escalation above more than a stray field.
  Keep security rules default-deny on `user/{uid}`.

- **`Media.Helper.saveFromUrl` is now SSRF-guarded.** It previously issued a bare
  `fetch(url, {redirect: 'follow'})` with no timeout, no size cap, and no address checks,
  and it is reachable with a URL that originates outside the server (a Firebase Auth
  `photoURL` flows into it from the user `onCreate` path). It now validates the target,
  refuses loopback / link-local / private / carrier-grade-NAT / multicast / reserved
  addresses — including **IPv4-mapped IPv6** (`::ffff:169.254.169.254`) and **NAT64**
  (`64:ff9b::/96`), the two most commonly missed bypasses — re-validates every redirect
  hop, applies a request timeout, and caps the response body.

- **BigQuery identifiers are validated before they are interpolated into a resource
  path.** `BigQueryStreamWriter` accepted any `dataset`/`table` string and interpolated it
  into `projects/…/datasets/…/tables/…/streams/_default`. It now applies the same anchored
  allow-list pattern that `cleaner` already used.

- **`backup` no longer leaks internal error text to its caller.** It threw
  `error.toString()` — a raw string carrying the underlying BigQuery failure. It now throws
  a generic `Error` and preserves the original as `cause`, so detail reaches logs without
  being re-serialised into the message a caller sees.

### Added

- `outboundUrl` (`src/outbound-url.ts`) — `assertSafeOutboundUrl`, `safeFetch` and
  `isBlockedAddress` for any helper that fetches a caller-influenced URL.
- `User.serverOnlyFields` — the explicit list of fields that must never be accepted from
  a caller (authorization state, billing/provider identity, `account`, credentials and
  server bookkeeping), exported so consumers can assert the same rule in their own
  validation and security rules rather than re-deriving it.
- `validateBigQueryIdentifier` (`src/bigquery-identifier.ts`) — the single canonical
  BigQuery identifier validator, now shared by `cleaner` and `BigQueryStreamWriter`.
- `User.Helper.sanitizeProfile` and `User.creatableProfileFields` — the allow-list used by
  `User.Helper.create`, exported so consumers can apply the same filter at their own call
  sites.
- `.github/instructions/security.instructions.md` and
  `.github/instructions/cross-repo.instructions.md`.

### Changed

- **BREAKING —** `User.Helper.create` now persists **only** the fields listed in
  `User.creatableProfileFields`. Undeclared keys, authorization fields, billing/provider
  identity fields and the `account` tenancy pointer are dropped instead of written.
- **BREAKING —** `User.Helper.updateRole` and `User.Helper.remove` now revoke the user's
  refresh tokens when a role or group is withdrawn or replaced, forcing re-authentication
  on those paths.
- **BREAKING —** `Media.Helper.saveFromUrl` now throws for URLs that fail SSRF validation
  (non-`http(s)` schemes, embedded credentials, unresolvable hosts, or hosts resolving to a
  blocked range) and for responses larger than 25 MiB.
- **BREAKING —** `new BigQueryStreamWriter({dataset, table})` now throws when either value
  is not a valid BigQuery identifier.
- **BREAKING —** `backup` rejects with an `Error` rather than a `string`.

### Migration

`User.Helper.create` — extra fields are no longer written implicitly:

```ts
// Before 2.0.0: every key on the object was written, including `groups`.
await User.Helper.create(request.body);

// 2.0.0: only allow-listed profile fields are written; `role` is always 'user'.
await User.Helper.create(request.body);

// If you legitimately need to set privileged state, do it explicitly and only
// after authorizing the caller:
const user = await User.Helper.create(request.body);
await User.Helper.updateRole({id: user.id, group: 'tenant-a', role: 'admin'}, mainUrl);
```

If you relied on a custom field being persisted at creation time, either add it to your own
follow-up write via `User.Helper.createDocument` (which is unfiltered by design and must
only receive server-authored data), or open an issue to have the field added to
`creatableProfileFields`.

Billing identity must now be seeded explicitly from server code that already knows the
correct value, rather than arriving inside a caller's profile blob:

```ts
const user = await User.Helper.create(request.body);
// Server-side: create the provider record first, then write the id you got back.
const customer = await billingProvider.customers.create({email: user.email});
await User.Helper.createDocument({id: user.id, bcId: customer.id});
```

Role changes now revoke refresh tokens when authority is withdrawn or replaced. To act on
that immediately, verify ID tokens with the `checkRevoked` flag:

```ts
// Before: a de-provisioned user's existing token stayed valid until expiry.
const decoded = await getAuth().verifyIdToken(token);

// 2.0.0: detect revocation, and treat claim removal as eventually consistent.
const decoded = await getAuth().verifyIdToken(token, true);
```

`Media.Helper.saveFromUrl` — if you were passing an internal or emulator URL, fetch it
yourself and use `Media.Helper.save` with the resulting buffer.

`backup` — replace `catch (error) { logger.error(error); }` string handling with
`catch (error) { logger.error(error.message, error.cause); }`.

[2.0.0]: https://github.com/FabricElements/shared-helpers/releases/tag/v2.0.0
