# Orchestrator Session Kickoff Template

Before proceeding:

1. Load `.github/instructions/model-usage-policy.instructions.md`.
2. Analyze the requested work and break it into task groups.
3. For each group, identify complexity, suitable execution capability, ownership
   boundaries, and escalation triggers.
4. Present the complete plan to the user and wait for approval.

## Routing

- Use a capable orchestrator for planning, coordination, and complex decisions.
- Use local child sessions for deterministic work only when the scope is bounded and
  the available capability is reliable.
- Escalate when local execution is unreliable, blocked, or insufficient.

## Key rules

- Child prompts contain only the raw request and minimum necessary repository context.
- Never include MCP data, plugins, tool metadata, or large instruction dumps.
- Never add co-author trailers or AI/agent attribution.
- Track child branches, commit results, validation results, and blockers.

## Kickoff

[INSERT SPECIFIC TASK AND CONTEXT HERE]

### Done criteria

- All task groups are approved.
- Each task has clear scope, acceptance criteria, and capability assignment.
- Child sessions are ready to be spawned.
- Outputs and validation evidence are recorded.
