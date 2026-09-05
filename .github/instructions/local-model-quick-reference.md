# Quick Reference: Local Model Child Sessions

## Rules (compressed)
- Use only `devstral-64k:latest` for local child sessions
- Target completion: 2–4 min (small), 5–8 min (medium), 8–10 min (heavy)
- If local task exceeds 10 min or fails twice, escalate to paid model immediately
- Local child sessions receive only the raw request and the minimum necessary repo context; never include MCP server data, plugins, tool metadata, or large instruction dumps
- Parent session should provide only the extremely necessary context needed for the task; keep prompts short and focused
- Orchestrator provides execution-ready prompts; do minimal reasoning
- **Never add co-author trailers to commits — work is attributed to the human user**

## Context window
- ~6K–8K tokens available after static context
- Keep prompts short; reference file paths, not full docs
- If "Static context is using >100%", disable more MCP servers or escalate

## Done
- Commit with clear title
- Push to your branch
- Open PR; merge when ready
- Report back: commit SHA, duration, any blockers

## Blocked?
- Escalate to paid model immediately
- State: `Switching to [model] because [reason]`

## For Paid Orchestrators
If you're a paid orchestrator (Claude/paid Copilot model), load the full Model Usage Policy:
```
cat .github/instructions/model-usage-policy.instructions.md
```
Then proceed with creating task groups and approving the orchestration plan before spawning child sessions.
