# Capability and Orchestration Policy

## Non-negotiable rules

- Optimize for reliable completion with the least unnecessary resource use.
- Use local execution for routine, deterministic work when it is reliable and appropriate.
- Use a stronger capable agent for orchestration, architecture, high-risk changes, or work
  that exceeds the current agent's context or reliability.
- Never add co-authored-by trailers or AI/agent attribution to commits, pull requests, or
  code comments.

## Routing

1. Analyze the task's complexity, coupling, token volume, retry risk, and local completion
   likelihood.
2. Decompose independent work into focused task groups with clear acceptance criteria.
3. Route deterministic, narrowly scoped work to a suitable local capability when reliable.
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
