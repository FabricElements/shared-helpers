# Agent entry point

Do not edit `.github/**` unless the task explicitly requires changes to repository
instructions or workflow configuration.

Read [`AGENTS.md`](AGENTS.md) for the required entry-point guardrails and reading
order. It is intentionally the single thin pointer for this repository.

The session-start identity gate governs authorization and escalation. §0
Changes are small and surgical, and emergency exceptions never permit test weakening,
skipping, or deletion. §0.1
Deployment, publishing, and release actions are out of scope unless explicitly
authorized; CI only builds, tests, and verifies generated output. §0.2

The `.github/` files are canonical on conflicts, except for the pointer-file-level
guardrails in `AGENTS.md` and this file.
