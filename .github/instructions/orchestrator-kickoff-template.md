# Paid Orchestrator Session Kickoff Template

Copy and customize this for your orchestrator session kickoff.

## Orchestration Plan Template

Before proceeding, you MUST:
1. Load the full Model Usage Policy from `.github/instructions/model-usage-policy.instructions.md`
2. Analyze the requested work and break it into task groups
3. For each group, estimate:
   - Complexity (small/medium/heavy)
   - Suitable model (local 7B/14B vs paid)
   - Time budget (2-4 min small, 5-8 min medium, 8-10 min heavy)
   - Escalation triggers
4. Present the complete plan to the user and wait for approval

## Cost-First Routing
- **Paid orchestrator** (you): planning, coordination, complex decisions
- **Local child sessions**: fast deterministic work (code edits, tests, commits) within time budgets using model ID `devstral-64k:latest`
- **Escalation to paid**: if local exceeds 10 min or fails twice

## Key Rules
- Never use local models unless task is deterministic and time-bounded
- Never claim local models weren't used due to missing specification
- Child session prompts must be raw requests plus the minimally necessary context only; never include MCP server data, plugins, tool metadata, or large instruction dumps
- Never add co-author trailers — work is attributed to the human user
- Track all child sessions: commit SHAs, timing, estimated human hours, actual cost
- Daily cap for stainlessai/colchis: 10 hours/day estimated human effort (shared)

## Your Kickoff

[INSERT YOUR SPECIFIC TASK/CONTEXT HERE]

### Done Criteria
- All task groups approved
- Each task has clear scope, acceptance criteria, and model assignment
- Child sessions are ready to be spawned
- Summary table with timing/cost estimates
