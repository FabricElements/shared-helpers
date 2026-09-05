# Model Usage Policy

## Non-negotiable rule
- Never claim local models were not used due to missing specification.
- Optimize for lowest cost first, then speed, while keeping quality sufficient for acceptance.
- Start with the cheapest suitable paid model, then switch routine deterministic execution to local models when safe.
- **Never add co-authored-by trailers or any AI/agent attribution to commits.** No Copilot, no agent service, and no AI tool may appear as co-author or contributor in any commit message, PR description, or code comment.

## Instruction precedence
- This policy overrides repository-local instructions on conflict.

## Primary optimization objective
1. Lowest cost
2. Fastest completion
3. Sufficient quality to pass acceptance criteria

## Paid-model allowance (explicit)
- Paid models are the default starting point.
- Use paid models for orchestration/parent coordination, complex reasoning, and architecture decisions.
- Route child execution to local models when tasks are deterministic, scoped, and likely to finish within 2-10 minutes.
- Escalate back to paid model when local work exceeds budget or blocks.

## Mandatory pre-task routing step (required)
- Before execution, the paid orchestrator estimates complexity (small/medium/heavy), coupling, token volume, retry risk, and local completion likelihood.
- Then it: (1) decomposes work into task groups and marks local-eligible groups, (2) routes each group to the cheapest viable model.

## Default model routing
**Orchestration (default: PAID model)**
- Start with the cheapest suitable paid model (e.g., GPT-4 mini, Claude Haiku, or equivalent low-cost tier).
- Define task groups, acceptance criteria, and constraints per group.

**Execution routing (dynamic: PAID or LOCAL)**
- Route small deterministic tasks (2-4 min) to local models.
- Route standard coding tasks (5-8 min) to local models when likely to finish in budget; otherwise use paid.
- Keep unclear/high-risk/cross-cutting tasks on paid models.
- Discover available local models at runtime from the local endpoint and choose by capability, speed, and budget fit.
- If local execution fails or exceeds budget, escalate immediately to paid model.

## Local-model task coverage (when to use)
- Use only the local model ID `devstral-64k:latest` for local child sessions.
- Use local models for deterministic, well-scoped code/test/refactor/file tasks with clear acceptance criteria and expected completion in 2-10 minutes.
- Escalate to paid when time budget is exceeded, tool-calling is unreliable, cross-cutting reasoning is required, or two local attempts fail on the same blocker.

## Orchestration approval gate (required)
- Before any orchestration workflow starts, present a plan and wait for approval.
- Plan must include: task groups, child sessions per group, model-selection strategy, runtime estimates, escalation/fallback path, and outputs/acceptance criteria.
- Do not execute before approval.

## Plan adherence and anti-divergence rule
- After approval, follow the agreed plan and model allocation.
- Paid model owns high-level decisions and coordination; local models execute routine deterministic tasks.
- Escalate immediately on local overrun/failure, log reason and timing, and do not retry the same blocking local subtask more than twice.

## Task decomposition policy (cost control)
- Split heavy work into independent chunks suitable for fast local completion.
- Parallelize local child sessions when dependencies allow.
- Give child sessions execution-ready prompts to minimize reasoning overhead.
- Use sequential execution only for true dependencies.

## Time-budget and anti-blocking policy
- Local target windows: small 2-4 min, medium 5-8 min, heavy scoped chunk 8-10 min.
- If a task is predicted to exceed 10 minutes locally, either split further for parallel local execution or escalate immediately to paid model.

## Escalation policy (strict)
Escalate to paid model when any condition is true:
1. Predicted local completion exceeds 10 minutes on the critical path.
2. Two local attempts failed on the same blocking subtask.
3. Cross-repo/architecture reasoning exceeds local reliability.
4. Integration risk or failure impact is higher than paid execution cost.

When escalating, state: `Switching to [model] because [reason].`

After blocker resolution, return routine deterministic work to local models.

## Prompting requirements for local child sessions
Every child kickoff must include:
1. Exact objective and done criteria
2. Exact files/paths/scope boundaries
3. Ordered execution steps
4. Expected output format
5. Constraints (no scope creep; no broad analysis)
6. Timeout and escalation trigger

Local child session payloads must be stripped down to the raw request plus only the extremely necessary context. Do not include MCP server data, plugin details, tool schemas, or any other extra runtime metadata. The parent session is responsible for pruning the prompt aggressively so the local agent gets only what it absolutely needs for the task.

## Main-session tracking & reporting (required)
- Track per child session: commit metadata (title/SHA/repo/branch), execution timing (start/end/duration), estimated manual effort (with basis), and model cost accounting (models used, token usage if available, and actual or clearly-labeled estimated USD cost with confidence).

## Required output format after each completed task
Provide a per-task table with columns:
- Task ID
- Repo/Branch
- Commit Title
- Commit SHA
- Model(s) Used
- Start Time
- End Time
- Duration
- Est. Human Time
- Actual/Estimated Cost (USD)
- Notes

Also provide rolling totals:
- Total child tasks completed
- Total elapsed runtime
- Total estimated human time saved
- Total cost (USD), split by local vs paid

## Mandatory prompt-quality retrospective
Each task summary must include:
1. What in the original prompt caused ambiguity or rework
2. How wording could be clearer
3. A revised prompt template to reduce token/time use on local models
4. Whether stricter constraints or tighter file targeting would have avoided retries

## Cost governance rules
- Use the cheapest suitable paid model for orchestration/planning, not the most powerful by default.
- Prefer local models for routine deterministic execution within 2-10 minute windows.
- Re-evaluate model choice each phase; escalate to paid immediately when blocked.
- Prefer multiple small local executions over keeping all work on paid models.

## Orchestrator behavior
- Main session must run on a paid model for orchestration, planning, and coordination.
- The paid orchestrator defines groups, routes local-eligible execution, provides execution-ready prompts, monitors runtime, and escalates when local execution overruns or fails.

## Approved local endpoint
- Endpoint: `http://localhost:11434/v1` (or compatible OpenAI-compatible service).
- Discover available models at runtime; prioritize reliable tool-calling, fastest adequate completion, then lowest resource use.

## Local model context window management
- Local child sessions have very limited context windows; static context from MCP schema, plugins, tool data, or large instruction files can exhaust input capacity.
- For local child sessions: use only the model ID `devstral-64k:latest`; do not include MCP server data, plugins, or any other runtime metadata in the child prompt.
- The parent session must provide only the necessary context for the task and keep it as minimal as possible; when in doubt, prefer a raw request plus exact file paths over a larger summary.
- If a session reports `Static context is using >100% of available input tokens`, immediately reduce loaded MCP servers, strip nonessential context, or escalate to a paid model.
- Keep orchestrator kickoff prompts short and self-contained; reference file paths instead of re-pasting large documents.

## Daily human-effort cap (stainlessai + colchis)
- For stainlessai/colchis work, enforce a shared cap of 10 estimated human-hours per day across both orgs.
- Before starting new groups, compute completed + planned effort and remaining capacity (`10h - completed`).
- If planned work exceeds remaining capacity, prioritize critical tasks, defer non-critical work, and split large tasks to fit remaining capacity.
- Daily summary must report: estimated human-hours completed, deferred, remaining capacity, and deferred repos/tasks.

## Session lifecycle and remote trace elimination
- After task completion, delete child sessions (not only archive) to remove remote trace.
- Archive is local cleanup only.
- Delete after related PR merge or issue closure.

## Pending work tracking with issues
- After completion, if follow-up work remains, ask whether to create repository issues.
- Track all follow-up issues, reference them in PR descriptions, and link/close/update them with pending implementation details and handoff notes when work lands.
