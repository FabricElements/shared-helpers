---
description: Security invariants for library code, each tied to a finding from the package security audit.
applyTo: "src/**/*.ts"
---

# Security Instructions — `@fabricelements/shared-helpers`

Governs every change under `src/`. The generic engineering rules live in
[`cross-repo.instructions.md`](cross-repo.instructions.md) (the canonical, replicated
playbook). **This file is the package-specific companion:** every rule below is tied to a
real `file:line` from the audit of this repository, including the cases that were checked
and found clean. When this file and `copilot-instructions.md` disagree on a security
detail, **this file wins**.

> **This is a PUBLIC repository.** Never add a reference to a private consumer repository,
> its infrastructure, project identifiers, service accounts, internal collection names, or
> its security findings. Generic security lessons are fine; the identity of who was
> affected is not.

---

## 1. You are a library. Your defaults are somebody else's security posture.

This package is published to npm and pinned by consumers, sometimes by exact commit. A
consumer will pass a raw request body into an exported helper because that is the shortest
path and nothing stops them. **A permissive default here becomes a vulnerability there**,
and patching one consumer's call site does not fix the package.

This is not hypothetical. It is the defect this file was written from:

- `src/user.ts:596` — `formatUserNames` returns `{...data, …}`. It is a *formatter*, not a
  filter: every caller-supplied key survives it.
- Before the fix, `createUser` built `{...formatNames, role: 'user', group: undefined,
  password: undefined}` — a **denylist** that reset three known scalars.
- A nested authorization map (`groups: {tenant: 'owner'}`) is not a scalar, so it passed
  straight through into `set(…, {merge: true})` at `src/user.ts:306`.
- Worse, `src/user.ts:997` copies the document's `groups` map into Firebase Auth **custom
  claims** on the next role update. An injected map is therefore promoted from "a field in
  a document" to "a signed claim in a token".

### The rule

> **Reset or reject by allow-list, never by denylist.** When you accept a caller object and
> write it somewhere sensitive, enumerate the fields you *permit*.

The fix is `src/user.ts:177` (`creatableProfileFields`, the allow-list) applied by
`src/user.ts:769` (`Helper.sanitizeProfile`) at the sink in `src/user.ts:834`.
A denylist is only correct until someone adds a field; an allow-list fails safe against the
next field nobody thought of.

**Consequences for new code:**

### Choosing what goes in an allow-list: "who knows the correct value?"

An allow-list is only as good as its admission rule. The first version of
`creatableProfileFields` used "the declared non-authorization fields of `User.Interface`".
That rule is coherent, and it was **wrong** — it admitted `bcId`, `bsId`, `bsiId`, `bst`,
`but`, `buq` (payment-provider identity and metering) and `account` (the user's *active*
account, i.e. a tenancy pointer). None are authorization fields, so the rule let them in,
and a caller could choose their own billing identity at creation.

The rule that replaced it:

> **Admit a field only if the caller is the party who knows its correct value.**

- `ads` — the user's own ad-network placement identifiers. The user knows them; the server
  does not. **Creatable.**
- `bcId` — identifies a record inside a payment provider, produced by a server-side call to
  it. A caller supplying one is mistaken or malicious. **Server-only.**

`serverOnlyFields` (`src/user.ts:136`) enumerates the excluded set and is exported so
consumers can assert the same rule in their own validation and security rules.
`test/user.test.ts` asserts the two lists stay **disjoint**, so a future field cannot
quietly appear in both.

- Any new helper that accepts a caller object and writes it to Firestore, Storage, Auth
  claims, or BigQuery must reduce it through an allow-list first.
- `src/user.ts:293` (`Helper.createDocument`) is deliberately **unfiltered** — it is the
  low-level writer used by server-authored paths such as `onCreate`, and it is the
  sanctioned way to seed a server-only field such as `bcId` once the server knows the
  correct value. Its JSDoc says so. Do not "fix" it by filtering; do not call it with
  untrusted input either.

## 2. Spread ordering is a security property

```ts
{ role: serverValue, ...callerObject }   // ❌ caller wins
{ ...callerObject, role: serverValue }   // ✅ server wins
```

Search the **sink**, not the source: the hazard is positional — *a spread appearing after a
literal key inside an object literal*. A grep for `...data` cannot match `...opts.metadata`.
Sweep with a bare `\.\.\.` across `src/` and classify every hit.

Audited hits:

- ✅ `src/user.ts:834` — server-authored `role: 'user'` follows the spread.
- ✅ `src/user.ts:700`, `src/firestore-helper.ts:110`, `src/firestore-helper.ts:251` —
  server keys (`updated`, `backup`, `id`) all follow the spread.
- ⚠️ `src/media.ts:464` — `{contentType, resumable: false, validation: true,
  ...options.options}` spreads **after** the server keys, so a caller can set
  `validation: false` and disable upload integrity checking. This is an intentional
  escape hatch for Cloud Storage save options; it is safe **only** because `options.options`
  is developer-supplied. Never forward a request body into it.
- ⚠️ `src/user.ts:342` — `{...userDoc, ...doc.data()}` lets an existing Firestore document
  override the server default `role: 'user'`. This is intentional (a pre-provisioned invite
  should win) and the spread source is a server-side read, not caller input — but it means
  **write access to `user/{uid}` is equivalent to role assignment**. Keep `firestore.rules`
  default-deny on that path.

## 3. Validate outbound URLs (SSRF)

`src/user.ts:351` passes a Firebase Auth `photoURL` — which originates with the identity
provider or the account creator, not with you — into `Media.Helper.saveFromUrl`. Before the
fix that reached a bare `fetch(url, {redirect: 'follow'})` with no timeout, no size cap, and
no address checks.

Use `src/outbound-url.ts` for **every** fetch of a caller-influenced URL:

- `assertSafeOutboundUrl` — scheme allow-list, rejects embedded credentials, checks literal
  addresses, resolves DNS and re-checks **every** resolved address.
- `safeFetch` (`src/outbound-url.ts:211`) — validates, then handles redirects **manually**
  and re-validates each hop, because a host that passed validation can still redirect to
  `169.254.169.254`.
- Blocked ranges include IPv4 private/loopback/link-local/CGNAT/multicast/reserved, IPv6
  `::`, `::1`, `fc00::/7`, `fe80::/10`, `ff00::/8`, NAT64 `64:ff9b::/96`, and
  **IPv4-mapped IPv6** (`::ffff:169.254.169.254`) — the most commonly missed bypass.

Bound every outbound request: `AbortSignal.timeout(...)` and a response-size cap
(`src/media.ts:27`, `maxDownloadBytes`). Never buffer an unbounded body.

**Known residual gap, stated rather than hidden:** validation resolves DNS and re-checks the
addresses, but the socket is opened by `fetch` and is not pinned to the validated address,
so a precisely-timed DNS-rebinding race is out of scope. Do not claim otherwise.

`src/api-request.ts:44` also fetches `options.path`. That is by design — it is an explicit
outbound-request primitive whose whole purpose is the caller naming a target. It already
sets `redirect: 'error'` and `AbortSignal.timeout(60000)`. **Callers own the target**; do not
hand it an attacker-supplied URL.

## 4. Never build a query, path, or resource name from unvalidated input

Identifiers interpolated into SQL, resource paths, document paths, or storage object paths
cannot be parameterised, so they need an **anchored** pattern check first.

- ✅ `src/bigquery-identifier.ts` is the single canonical validator. Both
  `src/cleaner.ts` and `src/bigquery-stream-writer.ts:133` import it. Do **not** re-implement
  it — two copies of one security primitive will drift, and one will end up weaker.
- ⚠️ `src/user.ts:936` — `{[data.group]: _role}` uses a caller-supplied `group` as a
  Firestore map key. Validate `group` against an allow-list at your call site before
  invoking `updateRole`/`remove`.
- ⚠️ `src/firestore-helper.ts:133`, `:230` — `collection`, `collectionGroup` and `document`
  are interpolated into Firestore paths unvalidated. This is a generic query builder and
  the caller names the collection by design; a slash in `collection` traverses into a
  subcollection. **Never pass an untrusted identifier to `FirestoreHelper`.**
- ✅ `src/global.ts:51`, `:70` — `encodeURIComponent(filename)` before building a download
  URL. Correct; keep it.
- ✅ `src/regex.ts` — shared patterns are static literals. Never build a `RegExp` from
  untrusted input (ReDoS).

## 5. Make read-check-write atomic

Serverless runtimes scale horizontally, so any read → decide → write on a counter, quota,
capacity or balance is a race.

- ✅ `src/status.ts:47` uses `FieldValue.increment(1)` rather than reading and writing back.
  This is the pattern to copy.
- Audit result: no non-atomic counter, quota, or capacity check exists in `src/`.

## 6. Fail closed, and never leak internals

- ✅ `src/global.ts:30` — a missing `FIREBASE_CONFIG` **throws**; it does not fall back to a
  default bucket. Keep that shape for any new configuration read.
- ✅ `src/outbound-url.ts` — a DNS failure or an empty DNS answer is an error, never an
  implicit allow.
- ✅ `src/backup.ts:84` — throws a generic `Error` and preserves the original as `cause`, so
  detail reaches logs without being re-serialised into the message a caller sees. It
  previously threw `error.toString()` (a raw string carrying internal text).
- ✅ `src/api-request.ts:45-56` — surfaces only the server's `message` field, never a stack
  trace or the raw body.
- Log through `firebase-functions/v2` `logger`, never `console.*`. Gate verbose payload
  logging behind the `emulator` flag (`src/pubsub-event.ts:36`) — payloads may contain PII.

## 7. Anything that decides authorization gets extra scrutiny

Consumers will trust these. `src/user.ts` `getRole`, `updateRole`, `roleUpdateCall` and the
`groups` map are authorization surface:

- `Helper.authenticated` (`src/user.ts:212`) only proves *authentication*. It is not an
  authorization check. Callers must still verify the caller may act on the target user.
- `updateRole`/`remove` are privileged admin operations with **no built-in caller
  authorization**. The consuming callable/HTTP trigger must authorize before invoking them.
- Never trust a client-supplied uid, role, group, or ownership claim.

### 🔴 This library promotes document state into signed ID tokens

`roleUpdateCall` copies the `groups` map into Firebase Auth **custom claims** via
`setCustomUserClaims`. Consumers frequently do not realise this happens, because the call
lives *here*, in a dependency, and not in their own codebase — a system can show users
holding a `role` claim while `setCustomUserClaims` appears nowhere in its source.

The consequences are load-bearing and must not be lost:

- **Write access to `user/{uid}` is equivalent to role assignment.** Anything able to
  influence that document's `groups` field can influence a signed token that every relying
  party then treats as verified identity.
- **A claim outlives the document.** Deleting or cleaning up `user/{uid}` does not retract
  a claim already minted into a token.
- This is what turned the §1 escalation from "a stray field in a document" into "a signed
  assertion of privilege", and it is why `groups` is in `serverOnlyFields`.

Keep security rules default-deny on `user/{uid}`.

### De-provisioning is not immediate unless the consumer checks

Two distinct failure modes were found in this path, both now fixed — understand them before
touching it:

1. **Stale claims.** Claims were rebuilt from `userDoc`, the **pre-write** snapshot, so
   published claims lagged by one update: a removal left the removed group in the token
   indefinitely, and the first grant published nothing. Always derive the resulting state
   locally rather than reading back a snapshot taken before the write.
2. **No revocation.** The `revokeRefreshTokens` call after `setCustomUserClaims` was
   commented out, so a de-provisioned user kept a validly-signed token with the **old**
   claims until natural expiry. It now fires when authority is withdrawn (`remove`) or an
   existing role is replaced. A pure grant does not revoke — the new claim applies at the
   next refresh, and forcing re-authentication there is a UX cost with no security benefit.
   Because roles are opaque strings the library cannot rank them, so any change to an
   existing value is treated as potentially a downgrade.

> ⚠️ **Revoking refresh tokens does not invalidate outstanding ID tokens.** They remain
> cryptographically valid until they expire (up to an hour) unless the relying party calls
> `getAuth().verifyIdToken(token, true)`. A fix here without that flag on the consumer side
> produces *false confidence*, not immediate de-provisioning. Document both halves, always.

## 8. Evidence standards for security changes

- **A negative claim needs a citation** to the artifact that would have contained the
  positive — a `file:line`, a test assertion, a command output. "I looked and didn't see it"
  is not a citation.
- **Negative-path tests need a positive control.** A test asserting *"the injected field is
  rejected"* passes vacuously if the write never happened. `test/user.test.ts` asserts in the
  same test that `createUser` was called and that the legitimate profile fields *did* land.
- **Prove before/after.** Run the identical probe against the pre-fix source. A measured
  `ACCEPTED → REJECTED` is evidence; an assertion that a fix works is not.
- **Record refuted findings.** Disproving a suspected vulnerability is a real deliverable.

### Refuted / clean (checked, no fix needed)

- `src/hash-id.ts:28` — uses `crypto.randomInt` with an exclusive bound: cryptographically
  strong, no modulo bias. Not a weak-PRNG finding.
- `src/status.ts:44-51` — explicit field selection, no spread. Already allow-listed.
- `src/message-queue-speed.ts` — pure arithmetic, no I/O, no state. No race.
- `src/pubsub-event.ts` — a Pub/Sub **publisher**. Replay-protection markers apply to
  *consumers*; there is no at-least-once consumer in this package.
- `src/media.ts:422-426` — `{fileName: 'default/error.jpg', …, ...imageResizeOptions}`
  spreads after a literal key, but `imageResizeOptions` is built from a closed set at
  `src/media.ts:302-334` and can never contain `fileName`. Latent, not exploitable.

### Known, deferred (documented rather than silently changed)

- `src/check-number.ts:35` — `if (!isValid && !isMobileOrOk)` should almost certainly be
  `||`: an invalid number whose type is `undefined` is returned as if valid. Tightening it
  would start rejecting input consumers currently accept, so it needs its own release.
  **Do not rely on `checkNumber` as an authorization or anti-abuse control.**
- `src/validate-url.ts:20` — a *shape* validator only. The pattern is unanchored at the end
  and permits `http://127.0.0.1`. It is **not** an SSRF guard; use
  `assertSafeOutboundUrl` for that.
- `functions/src/media/open.ts:29` — `{request, response, ...query, path: request.path}`
  spreads the request query string into a helper's options. `path` and `cacheTime` follow
  the spread and are safe, but other option fields do not. Sample code is copied by
  consumers; do not imitate this pattern.

---

## Before you merge

- [ ] Does any new function accept a caller object and write it somewhere sensitive?
      Allow-list it.
- [ ] Does any object literal spread caller data **after** a server-authored key?
- [ ] Is every read-check-write on a quota, capacity or balance atomic?
- [ ] Does any new outbound fetch go through `safeFetch` / `assertSafeOutboundUrl`?
- [ ] Is every interpolated identifier validated against an anchored pattern?
- [ ] Does missing configuration fail **closed**?
- [ ] Do the new tests have positive controls, or could they be passing vacuously?
- [ ] Is this a behaviour change consumers must know about? `CHANGELOG.md` + version.
- [ ] Have you avoided naming any private consumer repository or its infrastructure?
