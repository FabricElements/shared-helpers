# Local Execution Quick Reference

## Rules

- Use local child sessions only for bounded, mechanical work (status checks, fetching/scraping,
  file operations, running tests) that the available capability can complete reliably; never
  for code design, edits, reviews, translations or decisions.
- Run local child sessions one at a time, never in parallel and never next to a second local
  model server. Free cloud models have the same scope.
- Keep prompts short and focused; reference file paths rather than pasting full docs.
- Never include MCP data, plugins, tool metadata, or unrelated runtime context.
- Escalate when local execution is unreliable, blocked, or insufficient.
- Never add co-author trailers or AI/agent attribution.

## Done

- Validate the requested outcome.
- Report the branch, commit result, validation result, and any blockers.

## For orchestrators

Load the full policy from `.github/instructions/model-usage-policy.instructions.md`,
then obtain approval before spawning child sessions.
