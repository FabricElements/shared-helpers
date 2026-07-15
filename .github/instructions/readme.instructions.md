---
description: When and how to document features, dependencies, and update the root/module READMEs.
applyTo: "**/*.md"
---

# README Instructions — `@fabricelements/shared-helpers`

Governs Markdown docs, primarily the root `README.MD`, `CONTRIBUTING.md`, and any module
docs. The root README is the public front door of a published NPM package — treat it as a
contract with consumers.

---

## 1. When to update the README

Update `README.MD` **in the same change** whenever you:

- **Add, rename, or remove a public helper** — update the **Public API surface** table and
  keep it aligned with `src/index.ts` and `package.json` `exports`.
- **Add or change a subpath export** (`./user`, `./media`, …) — reflect it in the Usage and
  API tables.
- **Change the tech stack or a pinned major version** (Node, TypeScript, `firebase-admin`,
  `firebase-functions`, Google Cloud SDKs, `sharp`, Vitest, ESLint) — update the
  **Tech Stack & Source Architecture Map**.
- **Change build/test/lint commands or scripts** — update **Local Setup** and
  **Testing & Verification**.
- **Change emulator ports or Firebase services** in `firebase.json` — update the emulator
  port table.
- **Change install/usage ergonomics** — update **Installation** / **Usage** snippets.

If a change is purely internal (refactor, private helper) with no effect on the public API,
stack, or commands, the README does not need to change.

---

## 2. Required sections (keep these current)

The root README must retain and keep accurate:

1. **Title + CI badge** — the `Node CI` badge linking to the Actions workflow.
2. **Project Overview & Cloud Architecture** — library purpose, ESM, Firebase/GCP runtime,
   the `functions/` sample app, target runtime/language.
3. **Public API surface** — table mapping each helper → `src/<file>.ts` → purpose. One row
   per export in `src/index.ts`, plus subpath modules (`User`, `Media`).
4. **Tech Stack & Source Architecture Map** — exact versions and the source directory map.
5. **The `/lib` blacklist CAUTION admonition** — never delete or soften it.
6. **Local Setup & Firebase Emulation** — `npm install`, `npm run build`
   (`build:watch`), individual `lint`/`compile` steps, `firebase emulators:start`, and the
   emulator **port table**.
7. **Testing & Verification Suite** — `npm test`, `npm run test:watch`, `npx vitest`, the
   safe/side-effect-free testing rules, and the verification gate
   (`npm run lint` → `npm run build` → `npm test`).
8. **AI-Assisted Engineering Rules** — pointer to `.github/copilot-instructions.md`.
9. **Installation / Usage / Contributing / License**.

---

## 3. Documenting a new feature

When you ship a new public helper:

1. Add its `export` to `src/index.ts` (and a subpath in `package.json` `exports` if it
   deserves one).
2. Add a row to the **Public API surface** table:

   ```markdown
   | `myHelper` | [src/my-helper.ts](src/my-helper.ts) | One-line purpose. |
   ```

3. If it introduces a new dependency or a new Google Cloud/Firebase service, add it to the
   **Tech Stack** table with its **exact** semver range from `package.json`.
4. If it needs new usage ergonomics, add a minimal, copy-pasteable snippet under **Usage**
   using the real import path:

   ```js
   import {myHelper} from "@fabricelements/shared-helpers";
   ```

---

## 4. Documenting dependencies

- Every dependency version quoted in the README must **match `package.json` exactly** (same
  semver range). When you bump a dependency, update the README in the same change.
- Do not invent or list dependencies the package does not have. In particular, HTTP uses the
  **native `fetch`** — do **not** document `node-fetch`.
- Install instructions must reflect the real distribution channels already documented (NPM
  and `github:FabricElements/shared-helpers`).

---

## 5. Link, URL & badge protection (critical)

- **Never drop, rewrite, or line-wrap** deployment URLs, reference links, badges, diagram
  links, or the Actions badge. Preserve them intact.
- Keep relative links to source files working (`src/…`, `.github/…`, `CONTRIBUTING.md`,
  `LICENSE.md`). If you move a file, update its links.
- Preserve GitHub admonition syntax (`> [!CAUTION]`, `> [!NOTE]`) — it renders specially.

---

## 6. Style

- Match the existing tone and structure; use `------` section dividers and tables already in
  use. Fenced code blocks must declare a language (` ```shell `, ` ```ts `, ` ```js `,
  ` ```markdown `).
- The root file is named **`README.MD`** (uppercase). Keep that casing; do not create a
  duplicate `README.md`.
- Module-level READMEs are not currently used; do not add per-directory READMEs unless
  explicitly requested — document modules through JSDoc and the root API table instead.

---

## DO NOT

- ❌ Remove or soften the `/lib` CAUTION admonition.
- ❌ Let README versions/commands drift from `package.json`, `firebase.json`, or the npm
  scripts.
- ❌ Document dependencies that don't exist (e.g. `node-fetch`) or omit ones that do.
- ❌ Rewrite, wrap, or delete URLs, badges, or reference/diagram links.
- ❌ Break relative links to `src/` files or config files.
- ❌ Create a second `README.md`, a `CHANGELOG.md`, or per-folder READMEs unless asked.
- ❌ Add a new public export without adding its row to the Public API surface table.
- ❌ Paste real secrets, tokens, or credentials into README snippets — use placeholders.
