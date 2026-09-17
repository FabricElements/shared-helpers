# Agent entry point

## Do not edit `.github/**`

Do not edit files under `.github/**` unless the task explicitly requires changes to
repository instructions or workflow configuration.

## Required reading

Read [`.github/copilot-instructions.md`](.github/copilot-instructions.md) first.
Then inspect each applicable file under [`.github/instructions/`](.github/instructions/)
and use that file's YAML frontmatter `applyTo` field to determine whether it applies
to the files in scope. Do not duplicate a path-to-file mapping here; the scoped files
are the source of truth.

## Core guardrails

The session-start identity gate determines whether the session may take on work beyond
quick fixes and narrowly scoped refactors; non-owners must use the documented escalation
path. §0

Changes must remain small and surgical, with no unrequested refactors, features, or
public API changes; emergency exceptions never justify weakening, skipping, or deleting
tests. §0.1

Deployment, publishing, and release actions are outside normal agent scope; this
repository's CI builds, tests, and verifies generated output but does not publish or
release. §0.2

## Precedence

The canonical `.github/` files win on conflicts, except that the pointer-file-level
guardrails in this file remain mandatory.
