---
applyTo: "**"
description: "Canonical Furcata cross-repository agent & security playbook: repo topology, public/private boundaries, deploy ordering, environments, security rules, evidence standards, multi-session agent conduct."
---

# Cross-Repository Instructions — Furcata Agent & Security Playbook

> ### 📌 Canonical document — replicated across the PRIVATE Furcata repositories
>
> Authored once and embedded verbatim in `furcata/functions`, `furcata/app` and `furcata/config`.
> The **public** packages carry a separate, sanitised playbook containing no reference to these
> private repositories. **Edit in coordination**: a change here must be propagated to the siblings in
> the same wave, or the copies diverge and the "canonical" claim stops being true.
>
> That is not hypothetical. All three copies had drifted — different titles, different frontmatter,
> 407 / 396 / 405 lines — while each asserted it was replicated verbatim. **A document that asserts
> its own invariant with nothing enforcing it drifts, and the assertion hides the drift**, because a
> reader who sees "authored once and embedded verbatim" trusts the claim instead of diffing the
> copies. If you find a discrepancy, raise it rather than silently reconciling in one place.

Extends [`.github/copilot-instructions.md`](../copilot-instructions.md). Read this before making any
change that crosses a repository boundary.

Derived from the 2026-08 multi-repo security audit and its remediation waves. Deliberately records
no finding counts or test totals: a pinned number is wrong at the next merge, and a document that is
visibly wrong in its cheapest detail stops being trusted in its expensive ones.

## 1. The system is SIX repositories — and THREE of them are PUBLIC

| Repo | Role | Trust level |
|---|---|---|
| `furcata/functions` | Node 22 / TS / Firebase Functions v2 + Express 5. **Runs the Admin SDK, so it bypasses all security rules.** | Trusted |
| `furcata/app` | Flutter iOS / Android / Web client. | **Untrusted** — assume a tampered build |
| `furcata/config` | `firestore.rules`, `storage.rules`, indexes, Remote Config. **The only control on direct client data access.** | Trusted (declarative) |
| `FabricElements/fabric_flutter` | **Public** Flutter package, pinned by `app` at an exact SHA. **Some client behaviour lives here, not in `app`.** | **Untrusted** (ships in the client) |
| `FabricElements/shared-helpers` | **Public** npm/TS package of Admin SDK helpers, consumed by `functions`. **Its defaults are the backend's defaults.** | Trusted, but **not ours to change unilaterally** |
| `furcata/core-node` | **PUBLIC** Node/TS package — the **backend type system**. Model namespaces (`Account`, `Block`, `EventData`, `MessagingEvent`, `Post`, `Price`) and interfaces (`BaseFirestore`, `place`, `queue`). Imported **59×** by `functions`. | Trusted as a type contract, **but public — see below** |

> ### ⚠️ THREE repositories are PUBLIC — and one of them is under the `furcata` org
>
> **Public:** `furcata/core-node`, `FabricElements/fabric_flutter`, `FabricElements/shared-helpers`.
> **Private:** `furcata/functions`, `furcata/app`, `furcata/config`.
>
> You may reference the public ones from here. **Never add a reference to a private Furcata
> repository, its infrastructure, project identifiers, service accounts, internal collection names,
> internal finding IDs, or its security findings *into* any of them.** The direction of reference is
> one-way: private → public only.
>
> **`furcata/core-node` is the trap.** It is public, but it *looks* private twice over: it sits in the
> `furcata` org alongside three private repos, and its `package.json` declares `"private": true`.
> That flag only prevents **npm registry publication** — it says nothing about GitHub visibility.
> During this engagement that exact misreading led to a private playbook nearly being copied into it
> (ORCH-92), caught before any push. **Check visibility from the authoritative source, not from an
> adjacent plausible signal:**
>
> ```bash
> gh api repos/furcata/core-node --jq '.visibility'   # -> public
> ```
>
> The leak vector is **not** just documents. A positive-controlled scan of that session's worktree
> found private markers in an *uncommitted CI comment*, written in good faith while implementing a
> correct fix. Comments, commit messages, PR titles, PR bodies, test names and fixtures are all
> public. On a public repo: **describe what is true about that package — never where else it is used,
> nor which internal finding motivated the change.**

> **These are real dependency links, not detail.** Two worked examples from this engagement:
>
> - **`fabric_flutter`** — closing a Firestore rules finding (`/user` list access) required changing
>   three call sites that live in the *package*, not in `app`. Any client-side remediation must check
>   whether the offending code is upstream before scoping the work.
> - **`shared-helpers`** — the cross-tenant privilege escalation (ORCH-06/ORCH-08) originates in
>   `src/user.ts`, where `formatUserNames` returns `{...data, …}` and `createUser` resets the
>   *scalars* `role`/`group`/`password` but not a nested authorization *map*. W0 patched the
>   **call sites** in `functions`; the **library default is the class**, and fixing it there is what
>   protects every consumer. A backend fix that leaves an upstream default unsafe is one grep away
>   from regressing.
> - **`core-node`** — it **commits its build output**. `lib/` is tracked, `exports` points at
>   `./lib/**`, and there is **no `prepare`/`prepack` script**, so a `github:` install performs no
>   build. **`functions` executes the committed `lib/`, while reviewers read `src/`.** A fix to
>   `src/` that is merged without `npm run build` being run and its output committed is approved,
>   correct-looking and **never executed**. Verified in sync today, and CI now fails on a stale
>   `lib/` — but the shape is worth internalising: *the reviewed artifact and the executed artifact
>   are different files* (ORCH-91).
>
> **Rule:** when a finding lands in `functions` or `app`, ask whether the mechanism actually lives
> upstream. If it does, the upstream fix is the real one and the local fix is a mitigation.


### Two paths reach the data, and only one runs your backend code

```
 UNTRUSTED  Flutter app ──(A) callables / HTTPS──> functions (Admin SDK) ──> Firestore/Storage
                        └──(B) client SDK, DIRECT ─────────────────────────> Firestore/Storage
                                                        governed ONLY by furcata/config rules
```

- **Path B has no application logic in it.** Whatever the rules allow, a tampered client can do.
- **`functions` bypasses rules entirely.** Rules cannot protect you from a backend bug, and backend
  checks cannot protect you from a permissive rule.
- **Therefore every sensitive field needs BOTH halves considered.** A perfect `runTransaction` is
  worthless if the same document is client-writable.

> #### ⚠️ There is a THIRD path that also bypasses Firestore rules
>
> **Cross-service Security Rules** — `firestore.get()` / `firestore.exists()` called from
> `storage.rules` — do **not** run under Firestore's own rules. The lookup executes as a service
> agent holding the **Firebase Rules Firestore Service Agent** IAM role and **bypasses Firestore
> Security Rules completely** (which is why enabling the feature prompts for an IAM grant, and
> revoking the role disables it).
>
> **Consequence:** a Firestore-side `allow read: if false` is **not** defence in depth for a Storage
> cross-service check. Do not reason about it that way. The lookup also **fails closed** when the
> role or wiring is absent, so a missing IAM grant looks like a denied rule rather than an error.
>
> `furcata/config`'s `storage.rules` does **not** use cross-service lookups today. This is recorded
> so that whoever adds the first one does not inherit the wrong mental model.

---

## 2. The deploy-ordering law (violating this locks out live users)

Tightening a rule is a **breaking change for every already-installed app binary**. Any change that
removes a client write path MUST land in this order:

```
0. fabric_flutter  : add/adjust the client API the app needs (only when the call site lives there)
0. shared-helpers  : fix the backend default (only when the mechanism lives there — same tier,
                     since both are upstream packages and neither blocks the other)
1. functions       : ship the Admin-SDK endpoint that performs the write server-side
                     (transactional + idempotent), deployed and callable
2. app             : migrate the call site onto that endpoint; release; wait for adoption
3. config          : tighten the rule to deny the client path
4. config          : flip App Check monitor -> enforce, once metrics are clean
```

**Upstream packages are pinned**, often by exact SHA, so a fix on their `main` is **not** a fix in
production until each consumer bumps. Budget for the bump as part of the work, not after it.

**Never combine a rules change and an App Check enforcement change in one deploy** — a lockout
could not be attributed to a cause.

**Staging first, always.** `furcata-staging` is validated before `furcata-production` at every step.

---

## 3. Environments, credentials and the traps in them

| | Staging | Production |
|---|---|---|
| Project id | `furcata-staging` | `furcata-production` |
| `.firebaserc` alias | `staging` | `production` |
| Service account | `firebase-adminsdk-cdr2i@furcata-staging` | `firebase-adminsdk-hp20n@furcata-production` |

### Rules that prevent real incidents

1. **The service account is bound to its project. Never cross them.** Exporting the staging SA and
   passing `--project production` will fail confusingly or act on the wrong project. Set both
   together and verify:
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/furcata-staging.json
   firebase use staging
   node -e "console.log(require(process.env.GOOGLE_APPLICATION_CREDENTIALS).project_id)"
   # must print furcata-staging
   ```
2. **`GOOGLE_APPLICATION_CREDENTIALS` + no emulator host = LIVE DATA.** With that variable set and
   no emulator variables, the Admin SDK talks to the real project. For local work always set:
   ```bash
   export FIRESTORE_EMULATOR_HOST=localhost:8080
   export FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
   export FIREBASE_STORAGE_EMULATOR_HOST=localhost:9199
   export PUBSUB_EMULATOR_HOST=localhost:8088
   ```
3. **Always pass `--project` explicitly. Never run a bare `firebase deploy`.**
4. **Always scope the deploy** — `--only functions:<name>`, `--only firestore:rules`, `--only hosting`.
5. **Emulator ports are shared across every checkout on the machine.** Two worktrees running
   emulators will collide, and the dangerous failure is silently connecting to *another* checkout's
   emulator and asserting against foreign data. Use a distinct port block per worktree, and check
   ownership before killing anything:
   ```bash
   lsof -nP -iTCP:8080 -sTCP:LISTEN   # pid
   lsof -a -p <pid> -d cwd -Fn        # whose worktree?
   ```

### CLI selector gotcha

```bash
firebase deploy --only firestore:rules,storage --project staging   # ✅ correct
firebase deploy --only firestore:rules,storage:rules --project staging   # ❌ fails
```
`firestore:rules` is a valid sub-resource; `storage:rules` is parsed as a deploy **target** and
errors with *"Could not find rules for the following storage targets: rules"*.

---

## 4. Security rules learned the hard way

Each of these corresponds to a real finding. They are not hypothetical.

### 4.1 Never spread client data onto a server-authored object

```ts
// ❌ the bug that produced a cross-tenant privilege escalation
await Helper.add({ ...request.data, group: undefined, role: 'user' });

// ✅ validate with a strict schema; unknown keys are REJECTED, not ignored
const data = validate(SomeSchema, request.data);   // z.object({...}).strict()
```
Resetting a few known-bad **scalars** is not enough — the escalation slipped through as a **map**
(`groups`) past two separate hand-written guards. An allow-list fails safe against the *next* field
nobody thought of; a denylist does not.

**When sweeping for this class, search the SINK, not the source.** The dangerous property is
positional — *a spread appearing after a literal key inside an object literal*. A pattern anchored
on `...data` cannot match `...parameters.metadata` and will miss real instances.

```ts
metadata: { uid: user.id, ...parameters.metadata }   // ❌ client clobbers uid
metadata: { ...parameters.metadata, uid: user.id }   // ✅ server wins
```

### 4.2 Never trust a header, claim or field the client can set

- An unsigned proxy header (`X-Apigateway-Api-Userinfo`) was base64-decoded and trusted, giving
  full identity spoofing via one `curl -H`.
- Firebase Hosting rewrites **require** `allUsers` on the target Cloud Run service, so "put it
  behind the gateway" is not available as a control. Authenticate in the handler.

### 4.3 Money fields are server-only, always

Payout destinations, prices, amounts, currencies, plan/entitlement state, credit balances,
account status, capacity arrays. Pin them in rules with:
```
request.resource.data.diff(resource.data).affectedKeys().hasOnly([...safe fields...])
```

### 4.4 Entitlement follows the money, not the claim

Never grant entitlement from client-supplied metadata echoed back by a payment provider. A webhook
signature proves the provider sent the event — **not that the metadata is honest**. Derive
entitlement from the line item / price object. Require `payment_status == 'paid'`. Handle refunds
and disputes, or a refunded buyer keeps access.

### 4.5 Make external calls replay-safe and idempotent

Pub/Sub is at-least-once; webhooks redeliver; clients double-tap. Use deterministic document ids
derived from the provider event id, and claim-as-lock inside a transaction.

**Do not "optimise" a replay-protection marker by deleting it on consumption.** The marker's
*existence* is what blocks a replay; deleting it on success makes every token infinitely
replayable. Sweep only **already-expired** markers.

### 4.6 Validate outbound URLs (SSRF)

Block `127/8`, `10/8`, `172.16/12`, `192.168/16`, `169.254/16` (incl. the GCP metadata server
`169.254.169.254`), `::1`, `fc00::/7`, `fe80::/10`, NAT64 `64:ff9b::/96`, and **IPv4-mapped IPv6**
(`::ffff:169.254.169.254`). Resolve DNS, re-check the resolved address, pin the socket to it, and
re-validate **every** redirect hop. Non-`http(s)` schemes are rejected outright.

### 4.7 Never commit a credential, and beware the tracked-file trap

`.gitignore` **does not apply to files already tracked**. A `.gitignore` rule is not evidence that
a file is safe to write secrets into — check `git ls-files`. Fix the trap with `git rm --cached`,
not only by rotating the leaked value.

---

## 5. Evidence standards for security work

> ### 🎯 The trigger: verify what is **comfortable**, not what is important
>
> Every durable correction in this engagement came from **a cheap command displacing a plausible
> inference** — and in every case the inference was *comfortable*. It flattered someone, exonerated
> someone, or restored an expected clean result:
>
> | The comfortable inference | What it bought |
> |---|---|
> | *"that dependency is private"* | made the argument for pinning stronger |
> | *"every install floats"* | made the finding sound worse, so more worth fixing |
> | *"my fix preceded their message"* | made the other party's complaint the error |
> | *"I must have misread"* | resolved a conflict at only my own expense — **and would have been accepted without challenge** |
> | *"my synthetic fixture is unrealistic"* | restored the clean sweep result I expected |
> | *"the guard is inert"* | turned a working control into a discovery |
>
> **Importance is hard to judge in the moment; comfort is not.** Knowing what matters requires
> knowing the consequence of being wrong, which is exactly what you don't have while being wrong.
> Comfort is immediately available — and it *correlates* with the failure, because a comfortable
> inference is one nobody, including you, has any motive to interrogate.
>
> **When a claim makes your argument tidier, settles a disagreement, exonerates you, blames you
> cheaply, or restores an expected result — that is the moment to spend the command.**
>
> **The most dangerous row is the one that produces a *finding*.** Five of the six above restore an
> expected clean result; *"the guard is inert"* instead makes you a discoverer — and that is
> **socially rewarded**, so it carries both the internal motive to believe it and the external motive
> to be accepted. Nobody challenges a colleague who reports a defect; they thank them.
>
> The cost profile differs too: expectation-restoring inferences make you **miss** a defect;
> finding-producing ones make you **damage something that works.** Two live instances in one wave —
> a leak guard "proved inert" by testing it on untracked files it correctly ignores, and a phantom
> duplicate-heading collision that would have meant renumbering a correct document. Acting on either
> would have broken a working control.
>
> **A probe result that would make you a discoverer needs more verification than one that confirms
> expectations, not less.**
>
> **Read the resolved artifact, not the source.** `"private": true` answers *npm publication*, not
> GitHub visibility. `"strict": true` answers *a preset name*, not whether null-checking is on — and
> it sits happily beside `strictNullChecks: false`. Both are in the right file, use the right word,
> and are literally true about something else. `gh api repos/X --jq '.visibility'` and
> `npx tsc --showConfig` are each one command away; the misleading artifact wins because it is the
> file you already have open.
>
> One caveat, stated because pretending otherwise would make this section the thing it warns about:
> **these rules are not self-executing.** Most coverage gaps below are probes that *could not see*.
> The dangerous one is a probe that **saw and got overruled** — it doesn't merely miss the signal, it
> *spends* it and leaves you more confident than before. A playbook presented as self-executing is
> itself an inert control: it will pass review, sit in three repositories, and do nothing at the
> moment it is needed.



### 5.1 The citation rule

> **A negative claim needs a citation to the artifact that would have contained the positive.**
> A `file:line`, a rules assertion, a live API read, a query result.
> *"I looked and didn't see it"* is not a citation.

At review time this is one question: *what would this have shown if the thing existed, and did you
actually look at that?*

Real failures this rule catches, all from the W0 wave:

| Claim | Source relied on | Why it was wrong |
|---|---|---|
| "`.gitignore` protects these files" | the ignore rule | doesn't apply to tracked files |
| "the claim is unset, so the rule is dead" | a grep in one repo | claims are set out-of-band; 41 users held it, 3 admins |
| "the bug-class sweep is complete" | a grep matching only top-level identifiers | couldn't match `...parameters.metadata` |
| "this file is clean" | memory of an earlier read | re-reading showed a raw spread |

### 5.2 Beware vacuous tests

A test asserting *"X is rejected"* can pass **vacuously** if a change removes the precondition that
makes X reachable. A proposed "cleanup" that deleted a replay nonce on consumption would have left
every replay test green — because with the marker gone there was no replay to detect.

**Negative-path tests need a positive control** proving the path was actually exercised.

> **This applies to investigative probes, not just committed tests.** While researching the
> cross-service rules behaviour above, an emulator probe denied in **both** the positive and the
> negative case — no positive control, therefore inconclusive, and easy to misread as confirmation.
> The correct move was to stop trusting the probe and go to the authoritative documentation, which
> settled the question *and* explained why the probe behaved that way. A probe without a positive
> control is a hypothesis, not evidence.

### 5.3 Prove before/after, don't assert it

The strongest W0 evidence was produced by:
- building the **pre-fix commit in a throwaway worktree** and running the *identical* probe
  (anonymous connect: `ACCEPTED (101)` → `REJECTED (401)`);
- a harness using **genuinely signed** provider payloads (2/11 → 11/11 assertions);
- **mutation-validating** a test suite — re-introducing the bug must turn specific assertions red.

### 5.4 Record negative results

A refuted finding is a real deliverable. Several audit findings were disproved by implementation,
and saying so prevented wasted effort and wrong fixes. Never quietly drop a claim you disproved.

### 5.4a Record no count that describes the present

A pinned number is wrong at the next merge, and a document visibly wrong in its cheapest detail
stops being trusted in its expensive ones. But **not every number is a defect** — and a sweep that
removes them all destroys the evidence that makes findings auditable.

The discriminator:

| Kind | Example | Verdict |
|---|---|---|
| **Historical measurement of a past event** — timestamped, stays true | *"2/11 → 11/11 assertions after the fix"*, *"41 users held the claim"*, *"merged as PR #78"* | **Keep** |
| **Baseline claiming a present-tense property of `main`** — rots | *"1126 tests across 76 files"*, *"canonical four-repo playbook"*, *"35 findings in this repo"* | **Remove** |

**Replace with observables, never with a fresher figure.** *"All three commands exit 0; Vitest
reports zero failed tests and zero failed files"* stays true however much the suite grows. A
description of what you will **see** cannot drift out of sync with reality, because reality produces
it — whereas a tally is only ever true of one tree at one moment.

The same test applies to **pinned line numbers into other files** (*"the ignore rule on line 121"*)
and to any restated list. If an authoritative source exists, **cite it — don't copy it.** Synchronised
copies drift; a citation cannot.

### 5.5 Order staged work so a partial landing is inert, not misleading

When a change lands in stages — or is merged before the author has finished — **sequence the
stages so that stopping halfway leaves the tree safe rather than dishonest.**

Code first, then the documentation that describes it. If the docs land first, the repository
carries instructions describing a control it does not yet have, which is the failure mode nobody
notices later: a reader trusts the documented behaviour and the behaviour is absent.

This is the same shape as the revocation caveat in §4.4 — **false confidence is worse than a
documented gap**, because a documented gap gets fixed and a false one gets relied upon.

> Learned from a real incident in this engagement: a PR was merged before its final documentation
> commit landed. It was recoverable only because the split happened to fall with `src/` in the
> merged half and docs in the tail. That was luck, not design. The reverse order would have left
> `main` describing a fix it did not contain.
---


**§5.5 is about *any* actor who can stop the sequence halfway** — the author pausing, a coordinator
merging early, CI failing between commits, a session being interrupted. The author is simply the only
one who can make it safe unilaterally, by shaping the work so each landable unit is independently
honest.

The testable form: **if your PR's tail commit is load-bearing for the truth of its head commit, the
PR is mis-shaped** — regardless of whether anyone actually merges early. Put a correction in its own
landable unit rather than trailing it on an existing one.

### 5.6 A passing control validates the probe, not the pattern

A passing positive control proves your probe **ran** — that grep executed, read the file, and can
return a hit. It proves **nothing** about whether your pattern covers the thing you are looking for.

For a **string**, mechanism and coverage coincide, so the distinction never surfaces. For a
**concept** — a directive, a hazard, an idea expressible in many words — they diverge completely, and
a passing control makes a false negative *more* convincing, because it supplies exactly the
reassurance a careful reader looks for.

Variants observed in a single wave, every one returning a clean, well-formed, wrong answer:

| Variant | What happened | Fix |
|---|---|---|
| **Pattern ≠ concept** | Searched siblings for one repo's exact phrasing, got 0 with a passing control, declared the hazard scoped to one repo. Another repo had two instances **in different words**. Markdown emphasis is the same failure at one-character scale: `a *fourth* repository` defeats a `\b` pattern. | Control with an **independent paraphrase** — one you had to *invent*, not copy. Strip `*_\`` before matching |
| **Morphology** | `four-repo\|fourth repository` cannot match `four repositories`. `[0-9]{3,} (passing\|tests)` cannot match `1126 passed`. Both controls passed, on the form the author had imagined. | Enumerate forms deliberately — hyphenated, spaced, ordinal, singular, plural, tense — and require the control to match **each** |
| **Content-based exclusion** | Swept with `grep -v '<path>'` to skip a file. It swallowed a real hit, because the offending line *contained that path*. | Exclude **by path**, or count per file. Never `grep -v` on content |
| **Suppressed stderr** | `2>/dev/null` hid a failed command, leaving a stale base ref — surfacing later as a false alarm. | Never suppress stderr in a verification pipeline |
| **Scope mismatch** | `commits?sha=<branch>` returns *full history reachable from the tip*, not the branch's commits — nearly reported pre-existing trailers as a new violation. Likewise a repo's `main` **tip** may be someone else's merge. | Scope to a **range** (`base..head`); resolve `merge_commit_sha` explicitly |
| **Over-anchored pattern** | `grep '^…(interface\|type\|enum)'` returned 0 for modules declaring 23, 9 and 4 types — they sit *inside namespaces*, so `^` could never match. The control passed, because the one file checked declared at column 0. | Test against a **known-positive of the same shape** |
| **Wrapped prose** | A multi-word phrase spanning two lines can never match, because `grep` matches per line. | Match a distinctive **token**, or normalise line breaks first |
| **Wrong change-detector** | `git log -S` reports only commits where the match *count* changes, so a number being **replaced** is invisible. | Use `-G` when asking whether something was **edited** |
| **False positive** | A guard correctly ignoring untracked files was read as "inert". Reporting it would have argued for scanning `node_modules` until someone disabled the check. | Test a control against its **actual contract**, not the most convenient input |

**Name the condition under which your probe is correct — then check whether anyone is tracking it.**
If nobody is, the probe's track record is evidence about *how often that condition holds*, not about
the probe. Ancestry checks are correct when no squash occurred; untimestamped state claims are correct
when nothing changed in the interval; an over-anchored pattern is correct when the author used the
phrasing you imagined. Nobody tracks any of those — so **a probe that fails only sometimes has, by
definition, a track record of succeeding**, and confidence in it is highest precisely where its errors
are concentrated.

**The rule:** before trusting a negative, ask what the probe **cannot see** — not merely whether it
works. A clean result from a probe that is structurally incapable of detecting the thing is not weak
evidence, it is **no** evidence, while looking like strong evidence.

#### Rigour below an unverified premise makes you *more* confident, not less

The most dangerous probe failure is not a sloppy one. It is a **perfectly-controlled experiment on
the wrong specimen**: isolated harness, version-checked tooling, positive and negative arms, clean
separation — and a subject that does not exist, because it was **modelled from a description instead
of read from the artifact**.

> Every check is *downstream* of the premise, so the rigour **propagates** the error rather than
> catching it. A sloppy version would have felt uncertain; a rigorous one feels conclusive.

That inverts the usual internal signal — *am I sure enough to send this?* — precisely when it matters.

**Two defences, both cheap:**

1. **Read the artifact; don't model it.** Fetch the shipped `.d.ts`, parse the lockfile, read the
   resolved config. When you are about to report something broken you always know exactly where to
   look — which is *not* true when reporting that nothing is broken. **The check that is most needed
   is also the cheapest.**
2. **When you derive a subtle property of someone else's design, check whether the design already
   accounts for it — before reporting a gap.** The artifact usually says so, in the comment next to
   the thing. A correct derivation aimed at a design that already absorbed it is not a finding.

**And specify a control's expected value in advance, not by comparing arms.** Two arms failing
identically for an unrelated reason reads as *"no difference"* at a glance — that happened three
times in one session with a hand-built harness, which makes it the default failure mode rather than
bad luck. Requiring *"the narrowed case must exit exactly 0"* catches it; *"the two arms should
differ"* does not.

#### The symptom tells you which way the pattern was wrong

Defective probes fail in two directions, and the direction is diagnostic:

> **Over-anchored probes fail silent. Under-modelled probes fail loud.**

| | Cause | Symptom | Cost |
|---|---|---|---|
| **Over-anchored** | too specific — `^…(interface\|type\|enum)`, `four-repo\|fourth repository` | **false negative** | **Dangerous.** Silent, self-reinforcing, and a passing control makes it *more* convincing |
| **Under-modelled** | doesn't model legitimate variety — `[0-9]*\.[0-9]*` missing a suffix, `split('\|')` ignoring escapes, a table check assuming every table has the same width | **false positive** | **Expensive.** Loud, but acting on it damages something correct |

So a hit and a zero need verifying **for different reasons**. A zero asks *"could this pattern have
seen it?"* A hit asks *"is the thing it flagged actually legitimate variety I failed to model?"*

Both are the same defective-probe root viewed from opposite ends — and in both cases **read the hit,
or interrogate the zero, before acting.** The corrective for a false positive is *model the variety*,
not *narrow until it stops complaining*: a probe tuned into silence is indistinguishable from one
that was always blind.

#### Why this class survives scrutiny when others don't

The two failure modes are **asymmetric**:

- **Mechanism failures are loud.** `rg: command not found` prints to stderr. Even swallowed, the
  control flips to 0 and the contradiction is immediately visible.
- **Coverage failures are silent and self-reinforcing.** Nothing errors. The control passes
  *honestly*. The output is a clean, well-formed negative — and the passing control is then cited as
  evidence for it.

> **A passing control is affirmative evidence for the *mechanism* and null evidence for *coverage* —
> but reads as affirmative for both. It launders one into the other.**

That asymmetry predicts the observed outcomes exactly: a missing-binary failure was recovered in
seconds, while a coverage false negative survived an explicit check *and* a direct instruction to
another agent to stop looking — caught only because that agent ignored the instruction.

**The diagnostic: ask what your control's fixture is made of.**

| Fixture | What you actually tested |
|---|---|
| the same string you're searching for | **mechanism** only |
| an independent paraphrase — one you had to *invent*, not copy | **coverage** |

> **When an invented fixture fails, the null hypothesis is that the pattern is wrong — not that the
> fixture is unfair.**
>
> This is what makes the diagnostic usable rather than decorative. The moment your synthetic case
> fails, the available and comfortable read is *"a real author would never phrase it that way"* —
> and that read is available **every time**, costs nothing, and restores the clean result you
> expected. Take it once and the check has fired correctly and been rationalised into silence, which
> is indistinguishable from never having run it.

Markdown emphasis is a **one-character paraphrase** — which is why it shares a row with
*Pattern ≠ concept* above rather than standing alone. `a *fourth* repository` defeating a
word-boundary pattern is the same failure as an independently-worded directive defeating a string
pattern: the fixture and the target were the same **concept** but not the same **bytes**.

**The recurring root is morphology, and knowing the rule does not confer immunity.** Every repeat
offence in this engagement took the same form: a pattern matched the phrasing its author had
imagined, the control passed on that same phrasing, and the undercount read as complete.

- `four-repo|fourth repository` cannot match **"four repositories"** — unhyphenated, plural.
- `[0-9]{3,} (passing|tests)` cannot match **"1126 passed"** — past tense — nor a bare number
  inside a claim like *"1126 is the number that describes `main`"*.

**So build the control to fail an incomplete pattern.** Enumerate the forms deliberately —
hyphenated, spaced, ordinal, singular, plural, past/present tense, bare number adjacent to a claim —
and assert the control matches **each one**. Then an incomplete pattern fails the control rather than
the target. Vigilance does not scale; construction does.

Corollary: **read every hit, don't trust the count.** That habit is what caught variant two, and it
is also what prevents filing legitimate matches as defects.

### 5.6a Verify a control in the context it ships into, not a stricter one

A control validated under settings stricter than production **will appear to work and be inert where
it matters.** The verification is honest, the control is real, and the result is false confidence.

Measured instance: a discriminated-union marker (`data?: undefined`) intended to stop un-narrowed
access to a parse result.

| shape | setting | result |
|---|---|---|
| the marker | `strictNullChecks: true` | **errors correctly** |
| the marker | `strictNullChecks: false` | **compiles clean** — collapses silently |
| property **omitted** | either | errors correctly |

Anyone testing that marker in a strict scratch project would have come away satisfied. It shipped
into two repositories that both set `strictNullChecks: false`, where it did nothing — while its
documentation asserted the guarantee.

**A stricter authoring context can *reduce* your ability to detect defects in what you ship.**
Verification fidelity depends on **matching** the consumer, not on being more rigorous than it. When
a package tightened its own compiler settings, it became structurally incapable of noticing that a
guarantee it publishes is inert for a consumer compiling permissively — its CI never compiles under
consumer conditions. The change that removed that coverage was an unambiguous improvement, which is
exactly why nobody looked.

**Three rules follow:**

1. **Run the check under the consumer's configuration**, not your own defaults — and confirm what
   that configuration actually is rather than assuming it matches yours.
2. **Prefer a construction that doesn't depend on the setting.** Omitting the property beats marking
   it optional, because a guarantee that survives a config change is worth more than one that is
   merely correct today. Ask of any type-level guarantee: *which compiler flag is this leaning on,
   and is that flag guaranteed on in every consumer?*
3. **Compile your published declarations under a consumer's settings, in CI.** Not `src/` — the
   emitted `.d.ts`, which is what consumers actually receive. Assert the negative cases with
   `@ts-expect-error` carrying a description, so the test fails both when the guarantee breaks *and*
   when it stops testing. Its value is that it **disagrees with the strict gate**: if it passes in
   both directions it is worthless.

### 5.7 A guard that cannot look must go red, not green

Any check that fetches something it does not own — a sibling repo, an API, a credentialed resource —
has two failure modes that look identical from outside: **everything agreed**, and **it never
looked**. Three requirements make them distinguishable:

1. **Fail closed on any fetch or auth error.** A guard that cannot read what it compares must go
   **red**. Anything that skips, warns, or reports "couldn't fetch, nothing to compare" produces a
   green build with zero coverage — the same degradation as a best-effort query whose failure is
   indistinguishable from *nothing to do*.
2. **Assert the arity, not just the agreement.** Confirm it compared *all* the things it was meant
   to. "2 fetched, 2 agree" must **fail** — otherwise a silently-skipped source masquerades as
   consensus, and mutual agreement degrades to agreement *among whoever answered*.
3. **Mutation-validate before trusting it.** Perturb one input, confirm red, restore. A drift guard
   is the exact artifact class where a vacuous pass is invisible.

**Credentials expire on a knowable date** — fine-grained tokens carry a mandatory expiry. That turns
"the guard might silently stop" from a hypothesis into a *scheduled event*, which is good news: a
certain failure can be designed for. Prefer a **scheduled** trigger over PR-only for the same reason
— *last successful run* is a readable timestamp, so inertness becomes observable.

**Redundancy only helps against independent failures.** Three copies of the same guard share a
credential class, an auth model, a scaffold, and — provisioned in one sitting — probably an expiry
date. They fail together. Spend the effort on detectability, not on copies.

## 6. Working as an agent across these repos

- **One session ≈ one branch ≈ one PR.** Scope a session to a single unit of work.
- **Assign file ownership explicitly** when several sessions edit one repo in parallel, and state
  which paths are off-limits. In W0 this produced zero merge conflicts across four concurrent PRs
  in the same repository.
- **A shared new module must have a single canonical author.** Two sessions independently wrote the
  same SSRF guard; the fix was to designate one author and have the other copy it byte-identically.
- **Raise a design constraint *before* implementing, not after.** If the *shape* of what you were
  asked for cannot work — no valid location, a missing credential, a dependency that would have to
  become public — stop and say so rather than building the nearest thing that compiles. Twice in one
  wave this replaced a multi-repo revert with a short exchange. The sharpest case: a guard meant to
  validate three private copies of this document against a **designated source** turned out to have
  no valid home — a public repo would publish live vulnerabilities, a private one needs cross-repo
  auth the default token doesn't grant, and a committed digest merely relocates the drift *and
  silences it*, since the guard passes against a stale pin. The decisive objection was structural:
  **a designated source cannot protect itself** — the one copy with nothing to compare against is the
  copy everything else is validated from. Assert **mutual agreement** between copies instead.
  Note why this is hard to catch late: **a bad decision reached through sound reasoning is harder to
  reject than a careless one.** Hosting a private playbook in a public repo *so CI can fetch it* is a
  good motive attached to precisely the mistake this document exists to prevent.
- **A control that has *never once passed* is not a strict control — it is furniture.**
  Fail-closed is correct, and *"I could not look"* must never produce the same result as *"everything
  agrees."* But a check whose **only** observed output is red cannot be misdiagnosed, only tuned out —
  and the tuning-out generalises to every other check beside it. Measured case: a cross-repo guard
  shipped, its credential was never provisioned, and **the very first PR after it landed was merged
  over a red run — by the people who built it**, correctly, because the red was a missing credential
  rather than drift. Day-zero tune-out.
  The resolution is a **third state**, not a softer one: a missing precondition exits **neutral with
  a loud NOT-ASSERTED annotation**, because a neutral check is *visibly not an assertion*, while a
  green would claim something false. Everything else — auth failure with a credential present, an
  unreadable participant, wrong arity, real drift — stays red.
  Note the sharpest part: the workflow **documented the credential impeccably** — scope, permissions,
  per-repo install, expiry. The precondition was *specified* and simply never *executed*. **A control
  is not live until something outside the repository has actually happened**, and nothing inside the
  repository can observe that. When you loosen such a guard, mutation-prove the loosened branch is
  reachable *only* under the intended condition — otherwise it is a guard-removal that passes every
  gate, which is the cleanup-absence trap in a new costume.
- **Same name is not same concept.** Reconciling two independently-evolved definitions is safe only
  where the identifiers genuinely collide. Measured case: of six namespaces slated for a "uniform
  swap", only three were real collisions; the rest were **name-adjacent but structurally different**
  — one was middleware plumbing rather than a persisted document, and one had **two unrelated local
  candidates** for a single upstream name. For that group the failure mode is not a rejected document
  but a **silently wrong mapping between two things that merely share a noun**, which no test will
  catch because both sides type-check. **Establish correspondence before assuming it**, and report
  non-correspondence as a finding rather than forcing the swap.
- **Know what your instrument *cannot* see, and encode it as a test rather than remember it.**
  A type-level gate resting on *property absence* (`TS2339`) is **structurally unable to fail** on any
  type carrying an index signature (`[x: string]: any`), because every property access is legal by
  construction. Measured case: a base document interface declared one deliberately — its own JSDoc
  said the point was to *"allow arbitrary extra fields to pass through without TypeScript compile
  errors"* — and 10 document types extended it. The gate was green on exactly the types carrying
  stored financial data, and that green meant **"cannot be checked"**, not *"is safe"*.
  The boundary is worth stating precisely, because the obvious phrasing is wrong: it is **not**
  *"nullable fields can't be protected"* — any nullability guarantee can be restated as a
  presence/absence union, and `TS2339` is config-independent. It is **"types that admit arbitrary
  keys can't be protected."** One is a property of the field and suggests nothing to do; the other is
  a property of the type and tells you exactly which types are in reach.
  **Write the blind spot as a paired mutation test**: the same regression on an index-signature type
  where the gate **must not** catch it, and on an index-free type where it **must**. That states the
  boundary instead of asserting a fact, and it fails loudly if someone later adds an index signature
  to a type the gate was protecting. *The failure mode of merely remembering a limitation is that the
  people who remember it leave.*
- **Introducing validation *inverts the failure mode on read paths*, and the stored data gets no vote.**
  Replacing an unchecked cast with a parse boundary is unambiguous hardening for **inbound** data —
  requests, webhooks, user input — where rejecting bad input is the entire point. On a **read of a
  document that already exists**, the same change turns a record that flowed through yesterday
  (possibly wrong, usually harmless) into a **runtime rejection**: a new outage on a path that was
  previously unconditionally safe.
  A schema can be **correct as a design and still reject production data**, because the stored
  records were written under the *old* shape and span months while the schema is days old. **No type
  checker can see this** — `tsc` describes what is declared, never what is stored, so a green build
  is silent on the most likely breakage. It is made worse by remediation itself: fields introduced by
  a recent security fix are absent from older documents **by definition**, so a schema requiring them
  rejects exactly the historical records nobody tests with.
  **Classify every validation site as inbound vs stored-read.** For stored reads, validate against
  **real exported documents weighted to the oldest**, and prefer **observe-then-enforce** — parse,
  log the failure, fall back to existing behaviour — which is safe to deploy and *measures* the true
  disagreement rate before anything is enforced. Treat each failing document as a **finding**, not a
  schema to loosen reflexively: the data may be genuinely malformed, which is itself worth knowing.
- **An assertion that *something fails* is satisfied by the *wrong* failure.**
  A negative type test spelled `@ts-expect-error` passes on **any** error at that line. So when the
  type weakens, the error can merely change identity — the directive stays *used*, the gate stays
  green, and the assertion has silently degraded to something weaker without anyone touching it.
  Measured case: asserting property-absence via the natural **deep** read (`result.data.amount`)
  kept passing after the guarantee was removed, because the error moved from *"property does not
  exist"* to *"possibly undefined"*. Only the **shallow** read (`result.data`) failed correctly.
  **When the guarantee is that something is absent, assert it shallowly** — a deeper expression
  admits substitute errors. And mutation-validate with a **2×2** (guarantee × assertion form), not
  one cell: the obvious single-cell experiment *would have been reported as a success*.
  Same family as the cleanup trap — **absences and failures are both cheap to manufacture**, so
  neither can serve as a finish condition on its own.
- **A permissive second gate's failure mode is quietly becoming a copy of the strict one it was
  meant to complement** — and that failure is invisible, because two green gates look like two
  passes. Defend with an **inert same-shape control that carries no directive and must compile
  clean**: it proves the permissive settings are genuinely permissive, and it makes the config
  *self-pinning* — restore strictness and the control **errors** instead of the gate silently
  collapsing into a duplicate. Generalises to any "second check from a different angle": give it a
  fixture that only passes *because* the angle differs.
- **A guarantee can be inert in a consumer, and the inertness can be in *narrowing itself*.**
  Beyond nullability: where `strictNullChecks` is off, **negative narrowing of a boolean discriminant
  does not fire** — every type includes `undefined`, so a falsy test cannot exclude the truthy
  branch. `if (r.ok) {…} else {…}` and `r.ok ? … : …` leave the value **un-narrowed in the failure
  arm**, while `r.ok === false`, `r.ok === true` and `in` narrow under both settings. The bare form
  compiles, lints and tests green while providing none of the discrimination the discriminated union
  exists to provide. **Where the payload is financial this is a live hazard** — `undefined` doesn't
  throw, it yields `NaN` or silently takes a branch, so a *failed* parse proceeds into a balance
  computation with the compiler's blessing. Document it **at the type**, since a consumer cannot
  discover it from the type's shape.
- **A *differential* result is only evidence if the harness is proven alive in the same run.**
  "Mutate the source, arm A goes red while arm B stays green" feels like a complete proof. It isn't:
  **a harness that doesn't work at all produces the same signature.** A type fixture that fails to
  compile for reasons unrelated to the property under test — `TS5112` (a `tsconfig.json` present
  while files are passed on the command line, which aborts *before* type analysis), or a package
  `exports` map rejecting a deep import path (`TS2307`) — makes **every arm fail identically**, which
  reads as a confirmed guarantee.
  **A differential test needs three observations, not two:** the arm that must change, the arm that
  must not, and a **control arm that must pass in both the mutated and unmutated states**. Divergence
  is attributable to the mutation only if something in the same run demonstrates the mechanism still
  works. This extends the earlier rule — *specify the control's expected value in advance* — from
  single-arm tests to differential ones: **for a differential test the control must hold in every
  state, not merely at baseline.**
- **Cleanup work is unusually dangerous, because its success criterion is an *absence*.**
  *"Remove the obsolete helper"* passes typecheck, tests, lint and build whether you do it right or
  badly — the finish condition (it's gone, gates green) is satisfied identically by both. Absences
  are cheap to manufacture. A helper removed for being redundant turned out to also carry a
  field-specific rejection message; deleting it replaced *"Expected a response body string or null"*
  with *"expected string, received number"* — which is true of the inner schema and **false of the
  field**, sending the caller to the wrong fix. Every gate stayed green.
  **Whenever "done" means something is no longer present, only an assertion about what *remains* can
  distinguish the correct removal from the cheap one.** Test the behaviour you are preserving, not
  just the absence you are creating. Same shape as satisfying a stricter compiler with an `any` cast.
- **Staging is not uniformly safer — measure the intermediate states before choosing a rollout order.**
  When two settings interact, the intermediate configurations are not points on a line between the
  endpoints; they are distinct states that can be **strictly worse than either**. Enabling
  `noImplicitAny` alone produced *seven* errors where enabling it together with `strictNullChecks`
  produced five — because without the second flag a `null` literal infers as `any`. Landing them in
  sequence would have meant fixing two errors the next step deletes. The check is cheap and almost
  nobody runs it.
- **Pin every hop to the *same* commit — pinning is a graph property, not a per-manifest one.**
  Pinning two hops to *different* commits of one package is **strictly worse than leaving one
  unpinned**: unpinned, the resolver picks one version and dedupes; pinned-differently, it is *forced*
  to install both, and the older copy drags its transitives in with it. That is how a reproducibility
  improvement produced three high-severity advisories that existed purely because two pins disagreed.
  A set of pins is coherent only if it names **one version per package across the whole graph**.
  Corollary on ordering: fix the **upstream** pin first, then have the downstream bump name the
  resulting commit — the reverse produces an unbounded chase, because each upstream fix invalidates
  the downstream target.
- **A bad decision reached through sound reasoning is harder to reject than a careless one.** When a
  shortcut has a *good engineering motive*, the motive is what gets scrutinised and the consequence
  is what gets missed. Hosting a private document in a public repo *so CI can fetch it* is correct
  reasoning attached to the exact mistake that reasoning exists to prevent.
- **Push back on instructions that are wrong.** Three of the most valuable W0 outcomes came from
  sessions refusing a coordinator instruction: one would have revoked three live production admins,
  one would have committed a signing key to a tracked file, one would have reintroduced a Critical
  vulnerability that no test would have caught.
- **Route mechanism-level suggestions to whoever owns that mechanism**, while they still have it
  loaded — and phrase anything touching a security invariant as a **question about the invariant**
  rather than an instruction. The question form is self-cancelling when wrong.
- **State-dependent claims carry an implicit timestamp.** A hash or a merge check must be
  re-measured, not re-quoted.
- **A control can exist, pass its tests, and still be inert.** Three separate instances in one
  engagement: an `Idempotency-Key` middleware that no client sends a key to; a counter-leak "fix"
  that was a comment saying *don't enable TTL*; a recovery sweep that silently returns zero without
  a composite index nobody had shipped. In each case the code was correct and the tests were honest
  — the missing piece was an **external precondition owned by someone else**. So: for any control,
  name what must be true *outside this repository* for it to actually run, and check that too.
  Beware best-effort queries that degrade to a `warn` — their failure is indistinguishable from
  "nothing to do".
- **Before using a record as a discriminator over historical data, ask whether it exists for the
  WHOLE history — not merely whether it is durable.** These are different questions and the first
  is the one that bites. A field introduced by your own recent remediation is the **highest-risk**
  case, because it looks canonical precisely because it is clean, new and well-structured. In this
  engagement a proposed discriminator turned out to have been created by our own fix the previous
  day, leaving seventeen months of records without it; the check that caught it was one `git log`
  away from the check that had been asked for. Two cheap habits beat insight here: ask questions
  that send someone **to the artifact** rather than to reason about it, and reason about
  **consequence-if-wrong** — noticing a tool would be *useless* is often easier than noticing it
  would be *unsafe*, and arrives at the same fix.
- **When two repos must change together, the PERMISSIVE side lands first.** Not "server first", not
  "client first" — whichever side *widens* what is accepted goes ahead of the side that starts
  depending on it. Widening is backward-compatible; depending on a widening that hasn't shipped is
  not. Both directions occurred in one engagement, and the slogan "server first" would have been
  catastrophic in one of them:
  - The server had to **accept** the `X-Firebase-AppCheck` header (CORS allow-list) *before* the
    client sent it — otherwise browser **preflight** rejects every request, before it reaches the
    backend, surfacing as a generic CORS error rather than an auth failure.
  - The client had to **send** `Idempotency-Key` *before* the server required it — otherwise every
    already-installed binary breaks the moment enforcement turns on.
- **A change owns the failure paths it makes more frequent, even ones it never edited.** A migration
  once inverted a pre-existing image-deletion ordering bug it had not introduced — the storage object
  was deleted *before* the document write, so a refused write destroyed a file the surviving record
  still pointed at. What made it urgent is that the **same change converted refusals from rare to
  routine**. A change that leaves a latent bug untouched while multiplying its trigger rate has made
  things worse. So when reviewing, ask not only *what does this modify* but **what does this make
  more frequent** — a standard diff-based review structurally cannot surface this, because the
  offending code is unchanged and therefore absent from the diff.
- **A security fix that removes capability is a REGRESSION, not a fix.** Remediation must preserve
  behaviour. If a control genuinely cannot be implemented without losing functionality, that is a
  **trade-off requiring an explicit owner decision** — never a silent default. A closed grammar,
  allow-list or schema must be **complete, not minimal**: the risk usually comes from accepting
  *arbitrary input* (raw SQL, unvalidated shapes), not from the *number of legitimate options*.
  Shrinking the option set is not a security control, it is a product change in disguise.
- **A green pipeline cannot see a functionality regression.** Analyzer, tests and a release build all
  passed on a change that silently removed twelve user-facing filters. Every automated gate is
  code-facing. When a change **narrows** an interface, the test that matters is the one asserting
  what must still be there — an **inventory test**. That is the capability equivalent of a positive
  control, and it belongs on both sides of a client/server contract so a narrowing at either layer
  fails loudly.
- **Parameter binding protects values, not identifiers.** A column name, table name, sort field or
  operator cannot be bound — it must come from a server-side allow-list, with the client sending a
  *key* that is mapped, never a string that reaches the SQL text. "We bind everything, so we're
  safe" is a plausible claim that is false the moment one filter names a column.
- **A green suite can be self-contradictory.** Two individually-passing tests can encode opposite
  models of the same behaviour; no per-test review and no coverage metric will show it, because
  coverage is complete. Only the test that *composes* them fails. When a comment and the code
  disagree, write the composed test before believing either.
- **Never add co-authorship attribution.** No `Co-authored-by:` trailer on any commit, pull request
  or merge, regardless of tooling defaults. A rebase, amend or squash re-creates commit messages, so
  re-check after one: `git log <base>..HEAD --format='%B' | grep -ci 'co-authored-by'` must print
  `0` — and positive-control the grep, because a zero from an untested probe is not evidence.
  **A clean message check is necessary but NOT sufficient, and this was learned the hard way.**
  GitHub's squash merge generates `Co-authored-by:` trailers **server-side, from the authorship of
  the squashed commits**. A branch whose every commit message greps clean still produces a merge
  commit carrying the trailer if any commit's *author* differs from the merging identity. A local
  `commit-msg` hook cannot intercept this — it never runs. So also assert authorship:
  `git log <base>..HEAD --format='%an|%cn'` must show only expected identities. This bites hardest
  when one agent commits work on behalf of another, e.g. recovering an interrupted session.

---

## 7. Before you deploy anything security-related

- [ ] Staged on `furcata-staging` and verified there first
- [ ] `--project` passed explicitly; deploy scoped with `--only`
- [ ] Credential and project match (verify with the `project_id` echo)
- [ ] Rules changes: does any client (including `fabric_flutter`) still use the path being denied?
- [ ] **Does the mechanism actually live upstream** in `fabric_flutter` or `shared-helpers`? If so,
      the local change is a mitigation and the upstream fix is the real one — file it.
- [ ] **If you touched a public package:** does it now reference a private repo, its infrastructure,
      project ids, service accounts, internal collection names, or a security finding? It must not.
      Private → public references are fine; public → private are not.
- [ ] New backend event handling: is the provider actually **subscribed** to those events? A correct
      handler for an unsubscribed event is inert
- [ ] New collections: is a TTL policy needed, and does the deploying SA have `roles/datastore.*`?
- [ ] New secrets: does the value exist in **both** environments, with **distinct** values?
- [ ] Rollback command written down **before** the deploy, not after
