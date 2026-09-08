# Codex Goal Engineering Kit

[English](README.md) | [简体中文](README.zh-CN.md)

## What

A reusable kit for verified feature iterations and product delivery, with workflow depth selected by uncertainty, impact, and recoverability. It also provides optional role-based Codex custom-agent profiles for economical multi-agent execution. The repository stores lifecycle, durable-state, and agent-profile contracts; it does not provide an agent runtime or a business application.

## Why

| Layer | Responsibility |
| --- | --- |
| Global/project `AGENTS.md` | Durable engineering behavior and repository conventions |
| `goal-driven-engineering` Skill | Product-project lifecycle and gates |
| Project `PLAN.md` | Cross-session facts, decisions, milestones, acceptance, and verified state |
| Active `.goal/execution-state.md` | Volatile, unverified recovery state for one atomic execution unit; absence means `IDLE` |
| Named custom-agent profiles | Bounded execution infrastructure for evidence, verification, review, or routine implementation |
| Prompt | The current entry point or change request |
| `/goal` | Long-running execution after architecture and milestones are stable |

This separation keeps reusable protocol out of every prompt and prevents volatile chat context from becoming project state. It also matches current Codex behavior: Skills can be invoked explicitly or by description, user Skills are discovered under `$HOME/.agents/skills`, and `/goal` is intended for measurable long-running outcomes. See the official OpenAI documentation for [Skills](https://learn.chatgpt.com/docs/build-skills), [AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md), and [long-running work](https://learn.chatgpt.com/docs/long-running-work).

## Install

From this repository in PowerShell:

```powershell
.\scripts\install-skill.ps1
```

The script prints the exact source and destination and only manages `goal-driven-engineering`. The first install is safe to repeat; identical content is a no-op. If the destination differs, the default is to stop without changing it. To retain the old copy and install the new one:

```powershell
.\scripts\install-skill.ps1 -ConflictAction Backup
```

Use `-ConflictAction Overwrite` only when discarding the prior copy is intentional. `-WhatIf` previews a mutating install. The script does not modify global `AGENTS.md`, other Skills, or require administrator access. Restart Codex only if an updated Skill does not appear automatically.

## Optional role-based agents

The profiles in [`agents/`](agents/) implement a strong main coordinator, economical evidence workers, and strong verification. They use the current standalone custom-agent TOML format documented by OpenAI.

| Named agent | Model / reasoning | Access | Use |
| --- | --- | --- | --- |
| `explorer` | `gpt-5.6-luna` / medium | read-only | Locate files and symbols, trace paths, and gather repository evidence |
| `docs_researcher` | `gpt-5.6-luna` / medium | read-only | Verify authoritative APIs and version-specific documentation |
| `test_analyst` | `gpt-5.6-terra` / high | read-only | Find regression risks, edge paths, and missing verification |
| `reviewer` | `gpt-5.6-terra` / high | read-only | Independently review correctness, security, acceptance, regressions, and tests |
| `routine_worker` | `gpt-5.6-luna` / high | workspace-write | Make one bounded, well-understood implementation change as the single writer |

Install or synchronize only these five managed profiles into `$HOME/.codex/agents/`:

```powershell
.\scripts\install-agents.ps1
```

Identical files are a no-op. Different content is refused by default. To retain conflicting managed files in a timestamped `$HOME/.codex/agent-backups/` directory and install the Kit versions, use:

```powershell
.\scripts\install-agents.ps1 -ConflictAction Backup
```

Use `-WhatIf` to preview changes. The installer preserves unrelated agents and does not edit global `AGENTS.md` or `$HOME/.codex/config.toml`; in particular, it does not set `agents.default_subagent_model` or concurrency. Project `AGENTS.md` instructions still provide higher-priority repository-specific constraints.

Route by task boundary, risk, and total cost to an accepted outcome: Luna/medium handles bounded, high-volume evidence work; Luna/high handles routine implementation; Terra/high handles test analysis and independent review where missed defects cost more than the model premium. The main Sol thread retains complex reasoning, convergence, critical decisions, sensitive implementation, and final acceptance. No subagent replaces the final architecture or security decision-maker.

Ask Codex for named agents directly, for example: `Have explorer map the affected paths and test_analyst identify missing coverage; converge their evidence before implementation.` For a review, ask it to use `reviewer` after verification. The main Sol thread retains goal interpretation, architecture, evidence convergence, conflict resolution, planning, critical decisions, complex or sensitive implementation, and final acceptance; do not create a separate Sol coordinator subagent. Do not spawn subagents for trivial work. As workflow defaults, use at most three concurrent read-only agents and one active writer; these are recommendations, not platform-limit claims. Subagents perform their own model and tool work and therefore consume additional tokens. See the official OpenAI documentation for [Subagents and custom agents](https://learn.chatgpt.com/docs/agent-configuration/subagents).

## Choose the workflow

| Task Mode | Use | State and entry |
| --- | --- | --- |
| DIRECT | Isolated, understood local changes without material business/security decisions | Ordinary engineering; no new PLAN or journal |
| STANDARD | Default for bounded features within verified architecture | Compact [PLAN](templates/PLAN.md) and [start-feature](prompts/start-feature.md) |
| FULL | New systems or material core-model, security, migration, or compatibility changes | [Full PLAN](templates/PLAN.full.md) and [start-project](prompts/start-project.md) |

Existing PLAN files without Task Mode keep FULL semantics. Do not silently downgrade an active project. An existing execution journal is always reconciled first; an active /goal or explicitly requested strict execution retains its recorded context across sessions. A newly authorized bounded iteration after completed work may use STANDARD without rewriting historical decisions and acceptance.

The Skill entrypoint holds shared rules. It loads references/full-lifecycle.md only for FULL, and references/execution-continuity.md only for strict execution or an existing journal. Both references are installed with the Skill.

Reuse applicable architecture and gate evidence after checking scope and current code. STANDARD does not require a fresh discovery/architecture ceremony. Verify affected behavior and required repository checks; use independent review for material risk and significant milestones. Reuse matching evidence and combine milestone/final review when coverage and baseline match. Keep one acceptance ledger and link detailed logs.

## New Project

1. Create/open the real project workspace; do not build it inside this Kit repository.
2. Ensure the Skill is installed.
3. Prefer copying [`templates/PLAN.full.md`](templates/PLAN.full.md) to the new repository root as `PLAN.md` before opening Codex. If you do not, the installed Skill can create an equivalent `PLAN.md` from its required state model without access to this Kit.
4. Fill the six fields in [`prompts/start-project.md`](prompts/start-project.md) and paste the prompt into a normal Codex session. If `PLAN.md` already exists, Codex fills it; otherwise it creates it immediately.
5. Confirm the session enters Discovery and avoids production implementation until the required gates pass.

The first sentence can be as small as:

```text
Use $goal-driven-engineering to start this product goal; initialize PLAN.md and begin Discovery before implementation.
```

Add the product Goal, context, constraints, non-goals, and observable definition of done below it.

## Architecture Approved

For FULL, confirm passed Discovery and Architecture gates, frozen decisions, dependency-ordered vertical milestones, and measurable acceptance. For STANDARD, verify the existing architecture applies and scoped criteria are ready. Reuse valid gate evidence instead of requesting the same approval again. Then paste [`prompts/start-execution-goal.md`](prompts/start-execution-goal.md). Its `/goal` objective points to the Skill and `PLAN.md` instead of duplicating the protocol.

Do not start `/goal` directly from a vague business idea. Current Codex documentation says the goal text is both the first prompt and completion criterion and limits CLI goal objectives to 4,000 characters, so detailed state belongs in `PLAN.md`.

## Interrupt-Resilient Execution

FULL execution, any /goal execution, and explicitly requested strict recovery follow `Write Before Risk`: create `.goal/execution-state.md` before Writer mutation, record `VERIFYING` before validation, and write results to `PLAN.md` only when validation succeeds and the mutation fingerprint still matches. PLAN remains the durable verified authority; the journal exists only while one atomic unit is active, absence means `IDLE`, and it never becomes a second source of accepted progress.

Strict recovery reads repository instructions, PLAN, the optional journal, Git, and verification evidence, then derives exactly one of `CONTINUE`, `RETRY_SAFE_UNIT`, `VERIFY`, `FINALIZE`, or `BLOCKED`. Uncertainty in HEAD, scope, protected baseline, verified fingerprint, or an external non-idempotent result must fail closed. This mechanism does not automatically wait or resume and provides no quota prediction, timed checkpoints, background monitoring, or external transaction recovery.

Ordinary STANDARD work uses coherent verified batches without per-edit journals or fingerprints. A batch includes ordinary repairs and affected revalidation. Strict recovery retains clean Allowed Paths and all conflict checks; it does not force commits or overwrite dirty paths to start another batch. Recovery is an instruction contract with decision/fingerprint test fixtures, not a shipped generic recovery CLI.

## Resume

Paste [`prompts/resume-project.md`](prompts/resume-project.md). Codex selects the existing mode and continuity requirements, then rebuilds state from applicable `AGENTS.md`, `PLAN.md`, Git/repository evidence, current milestone code, and tests. Repository evidence wins if the plan is stale.

## Change Request

Fill and paste [`prompts/change-control.md`](prompts/change-control.md). Reversible implementation or local-design changes continue autonomously. Architecture and product-scope changes remain proposals until required adjudication; only approved changes update canonical goal, scope, architecture, milestones, or acceptance.

## Update Skill

After editing this Kit and passing validation, synchronize with a retained backup:

```powershell
.\scripts\install-skill.ps1 -ConflictAction Backup
```

Review the printed backup location, test the new Skill in a fresh session, then remove an obsolete backup manually only when it is no longer needed.

## Try the training-system fixture

[`examples/training-system/PROJECT-GOAL.md`](examples/training-system/PROJECT-GOAL.md) describes a realistic offline-training MVP without prescribing its unresolved business semantics.

1. Create a separate empty repository for the training system.
2. Make the example goal available to that workspace and use it to fill the start-project prompt.
3. Verify the first session creates root `PLAN.md`, records facts/assumptions/pending decisions, and remains in Discovery rather than generating the application.
4. Resolve material money, lesson-credit, ownership, authorization, refund, attendance, and reporting decisions; review the architecture and milestones.
5. Only after both gates pass, start the execution prompt and assess each milestone plus the final business loop against recorded evidence.

The fixture succeeds as a workflow test when a fresh Codex session can determine the real phase and next unmet criterion from repository files alone.
