# Capability and Orchestration Policy

## Non-negotiable rules

- Optimize for reliable completion with the least unnecessary resource use.
- Use local execution only for mechanical work (see "Local and free models") when it is reliable and appropriate.
- Use a stronger capable agent for orchestration, architecture, high-risk changes, or work
  that exceeds the current agent's context or reliability.
- Never add co-authored-by trailers or AI/agent attribution to commits, pull requests, or
  code comments.

## Local and free models: one rule for every repository
- Allowed only for mechanical work: status checks, fetching/crawling/scraping pages into files, listing/counting/copying/reformatting data, and running tests or builds and reporting the result.
- Never for: designing or editing code or scripts, writing or reviewing documents, data, copy or translations, deciding between conflicting sources, or anything a person will publish or rely on without a script checking it.
- A local model runs ONE child session at a time: never several in parallel, and never alongside a second local model server. Parallel children use paid or free cloud models.
- A free cloud model has the same scope. Expect rate limits or withdrawal; a script checks its output, and a task that fails twice moves to a paid model.
- Design once, execute cheap: a strong paid model may design the scripts, checks and prompts that become part of a feature; routine execution then runs on the cheapest suitable tier. If execution seems to need heavy reasoning, the design is incomplete: fix the script or prompt instead of raising the execution model.
- The role-to-model table, tiers and prices live in the furcata/marketing repository (`config/models.json`, `docs/decisions/0009-model-selection-and-cost.md`). Reviews must come from a different model family than the author. The same rule is in every repository's model usage policy; change them together.

## Routing

1. Analyze the task's complexity, coupling, token volume, retry risk, and local completion
   likelihood.
2. Decompose independent work into focused task groups with clear acceptance criteria.
3. Route only mechanical, narrowly scoped work (status checks, fetching, file operations, running tests) to a local or free capability when reliable.
4. Keep unclear, high-risk, cross-repository, and architectural work with a stronger
   capable agent.
5. Escalate when execution is unreliable, blocked, or insufficient; state the capability
   reason plainly.

## Orchestration approval gate

Before starting an orchestration workflow, present the complete plan and wait for approval.
The plan must include task groups, ownership boundaries, capability selection, escalation
and fallback conditions, and outputs or acceptance criteria.

## Child-session prompts

Every child kickoff must include the exact objective, done criteria, file boundaries,
ordered steps, expected output, constraints against scope creep, and escalation triggers.
Keep prompts short and reference paths instead of pasting large documents. Do not include
MCP data, plugin details, tool metadata, or unrelated runtime context.

## Tracking and lifecycle

Track each child session's branch, commit result, validation result, blockers, and outcome.
Keep sessions focused on one coherent unit of work. Delete child sessions after their
related work is complete and no persistent work remains.

## Context management

Use the available local endpoint only when it is configured and reliable. If static context
exceeds the available window, remove nonessential context or escalate rather than guessing.
