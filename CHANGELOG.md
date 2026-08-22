# Changelog

All notable changes to `@fabricelements/shared-helpers` are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Prior releases are tracked through Git history and GitHub Releases.

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
- `validateBigQueryIdentifier` (`src/bigquery-identifier.ts`) — the single canonical
  BigQuery identifier validator, now shared by `cleaner` and `BigQueryStreamWriter`.
- `User.Helper.sanitizeProfile` and `User.creatableProfileFields` — the allow-list used by
  `User.Helper.create`, exported so consumers can apply the same filter at their own call
  sites.
- `.github/instructions/security.instructions.md` and
  `.github/instructions/cross-repo.instructions.md`.

### Changed

- **BREAKING —** `User.Helper.create` now persists **only** the fields listed in
  `User.creatableProfileFields`. Undeclared keys and authorization fields are dropped
  instead of written.
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

`Media.Helper.saveFromUrl` — if you were passing an internal or emulator URL, fetch it
yourself and use `Media.Helper.save` with the resulting buffer.

`backup` — replace `catch (error) { logger.error(error); }` string handling with
`catch (error) { logger.error(error.message, error.cause); }`.

[2.0.0]: https://github.com/FabricElements/shared-helpers/releases/tag/v2.0.0
