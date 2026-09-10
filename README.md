# Codex Goal Engineering Kit

[English](README.md) | [简体中文](README.zh-CN.md)

## What

A reusable kit for verified feature iterations and product delivery, with workflow depth selected by uncertainty, impact, and recoverability. It also provides optional role-based Codex custom-agent profiles for role-based multi-agent execution. The repository stores lifecycle, durable-state, and agent-profile contracts; it does not provide an agent runtime or a business application.

## Three steps to start

1. In this Kit's PowerShell, run `.\scripts\install-skill.ps1`; use `-ConflictAction Backup` when updating an existing installation.
2. Open the real project and use [Start here](prompts/start-here.md) with a sentence or existing materials.
3. Next time, use [Resume](prompts/resume-project.md) to continue from PLAN and repository evidence.

Agents and /goal are optional. Run `.\scripts\check-installation.ps1` to inspect installation without changing files.

## Start with one sentence (recommended)

In the real project's Codex task, say:

> Use $goal-driven-engineering to help shape an idea: I want a training-center system because fees and remaining lesson credits are managed in Excel. Guide me with questions before writing application code.

The agent reads available evidence, asks one useful main question at a time, and progressively drafts a goal brief. "I don't know" and "please suggest" are valid answers. It skips known facts and stops asking once the next step is supported; there is no required form or question count.

| Entry | Use |
| --- | --- |
| [Start here](prompts/start-here.md), default | A sentence, existing materials, or a complete goal; shared by projects and features |
| [Resume](prompts/resume-project.md) | Continue from PLAN and repository evidence, including interrupted work |
| [Long-running execution](prompts/start-execution-goal.md), optional | An approved, measurable scope executed with /goal |
| [Change a requirement](prompts/change-control.md), optional | Describe a change and assess its impact |

Use the default entry for everyday starts; attach prepared information to skip unnecessary interviewing. The former material, project, and feature starters are merged. Users do not need to select a workflow mode.

Prompt templates and the Codex default starter use Simplified Chinese. This English guide does not introduce a second set of English templates. Filenames, Skill identifiers, commands, and PLAN state identifiers remain stable. Users may request another conversation language without translating protocol identifiers.

The agent progressively maintains the selected mode's PLAN and leaves unknowns explicit. Discussion-only/no-file-change requests keep the brief in the conversation without initializing PLAN. Agreeing to a brief does not approve pending business rules or automatically authorize coding; existing explicit authorization does not need redundant confirmation.

See the [training intake walkthrough](examples/training-system/INTAKE-WALKTHROUGH.md). The full PROJECT-GOAL.md is a worked result and test fixture, not an entry requirement.

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

Backups and staging live outside discovery: by default under $HOME/.agents/skill-backups/, or in skill-backups/ under the parent of a custom -DestinationRoot. Keep only the effective Skill in the scanned directory. Move old in-directory backups outside discovery; the installer does not automatically delete historical backups.

Use `-ConflictAction Overwrite` only when discarding the prior copy is intentional. `-WhatIf` previews a mutating install. The script does not modify global `AGENTS.md`, other Skills, or require administrator access. Restart Codex only if an updated Skill does not appear automatically.

## Check installation

`.\scripts\check-installation.ps1` reports source revision, actual paths, Skill equality, duplicate copies, and role status. Use `-AsJson` for structured output or `-SkillRoot`, `-LegacySkillRoot`, and `-AgentsRoot` for custom locations.

SYNCHRONIZED means identical bytes; DIFFERENT does not prove a personal edit; MISSING_OPTIONAL means an optional role is absent. Linked or unreadable paths are reported, never followed or modified. An incomplete scan cannot prove absence of duplicates. Disk equality does not prove the running Codex session reloaded its configuration.

## Choose the workflow

| Task Mode | Use | State and entry |
| --- | --- | --- |
| DIRECT | Isolated, understood local changes without material business/security decisions | Ordinary engineering; no new PLAN or journal |
| STANDARD | Default for bounded features within verified architecture | Compact [PLAN](templates/PLAN.md) and [shared starter](prompts/start-here.md) |
| FULL | New systems or material core-model, security, migration, or compatibility changes | [Full PLAN](templates/PLAN.full.md) and [shared starter](prompts/start-here.md) |

Existing PLAN files without Task Mode keep FULL semantics. Do not silently downgrade an active project. An existing execution journal is always reconciled first; an active /goal or explicitly requested strict execution retains its recorded context across sessions. A newly authorized bounded iteration after completed work may use STANDARD without rewriting historical decisions and acceptance.

The Skill entrypoint holds shared rules. It loads references/full-lifecycle.md only for FULL, and references/execution-continuity.md only for strict execution or an existing journal. Guided intake reads references/guided-intake.md as needed; all three references are installed with the Skill.

Reuse applicable architecture and gate evidence after checking scope and current code. STANDARD does not require a fresh discovery/architecture ceremony. Verify affected behavior and required repository checks; use independent review for material risk and significant milestones. Reuse matching evidence and combine milestone/final review when coverage and baseline match. Keep one acceptance ledger and link detailed logs.

## New Project

1. Create/open the real project workspace; do not build it inside this Kit repository.
2. Ensure the Skill is installed.
3. Templates are optional. To pre-seed a full PLAN, copy [`templates/PLAN.full.md`](templates/PLAN.full.md) to the new repository root as `PLAN.md` before opening Codex. If you do not, the installed Skill can create an equivalent `PLAN.md` from its required state model without access to this Kit.
4. Prefer [guided intake](prompts/start-here.md) with one sentence or existing materials; attach a complete goal directly when available. Authorized project work creates or extends PLAN progressively; discussion-only work does not write files.
5. Confirm the session enters Discovery and avoids production implementation until the required gates pass.

## Architecture Approved

For FULL, confirm passed Discovery and Architecture gates, frozen decisions, dependency-ordered vertical milestones, and measurable acceptance. For STANDARD, verify the existing architecture applies and scoped criteria are ready. Reuse valid gate evidence instead of requesting the same approval again. Then paste [`prompts/start-execution-goal.md`](prompts/start-execution-goal.md). Its `/goal` objective points to the Skill and `PLAN.md` instead of duplicating the protocol.

Do not start `/goal` directly from a vague business idea. Current Codex documentation says the goal text is both the first prompt and completion criterion and limits CLI goal objectives to 4,000 characters, so detailed state belongs in `PLAN.md`.

## Interrupt-Resilient Execution

New strict units use schema 2: PLAN bytes and its Git index state are protected independently, allowing only an exact verified receipt append. Recovery can finish cleanup after receipt persistence; extra goal, decision, code, or index changes still block it. Active legacy journals are not upgraded. See the [continuity contract](skills/goal-driven-engineering/references/execution-continuity.md).


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
2. Start from the walkthrough sentence, or supply the complete example goal to test the materials path; no form needs to be filled again.
3. Verify the first session creates root `PLAN.md`, records facts/assumptions/pending decisions, and remains in Discovery rather than generating the application.
4. Resolve material money, lesson-credit, ownership, authorization, refund, attendance, and reporting decisions; review the architecture and milestones.
5. Only after both gates pass, start the execution prompt and assess each milestone plus the final business loop against recorded evidence.

The fixture succeeds as a workflow test when a fresh Codex session can determine the real phase and next unmet criterion from repository files alone.

## Optional role-based agents

The profiles in [`agents/`](agents/) are optional Codex platform configuration defining responsibilities and permissions. They omit model and model_reasoning_effort by default. The core Skill does not require these profiles or a particular provider, model, or effort.

| Named agent | Access | Use |
| --- | --- | --- |
| `explorer` | read-only | Locate files and symbols, trace paths, and gather repository evidence |
| `docs_researcher` | read-only | Verify authoritative APIs and version-specific documentation |
| `test_analyst` | read-only | Find regression risks, edge paths, and missing verification |
| `reviewer` | read-only | Independently review correctness, security, acceptance, regressions, and tests |
| `routine_worker` | workspace-write | Make one bounded, well-understood implementation change as the single writer |

Install or synchronize only these five managed profiles into `$HOME/.codex/agents/`:

```powershell
.\scripts\install-agents.ps1
```

Identical files are a no-op. Different content is refused by default. To retain conflicting managed files in a timestamped `$HOME/.codex/agent-backups/` directory and install the Kit versions, use:

```powershell
.\scripts\install-agents.ps1 -ConflictAction Backup
```

Use `-WhatIf` to preview changes. The installer preserves unrelated agents and does not edit global `AGENTS.md` or `$HOME/.codex/config.toml`; in particular, it does not set `agents.default_subagent_model` or concurrency. Project `AGENTS.md` instructions still provide higher-priority repository-specific constraints.

Codex resolves model and effort from explicit spawn settings, then global agent defaults, then the parent session. Explicit model or model_reasoning_effort fields in a role file override the corresponding resolved settings. For cost tuning, choose models available in your environment and verify supported effort combinations. Omission guarantees neither minimum cost nor identical models across roles. See the [official configuration rules](https://learn.chatgpt.com/docs/agent-configuration/subagents#custom-agents).

The validator checks the role set, required fields, nonempty values, and permission boundaries. Optional model and model_reasoning_effort strings are not restricted to specific versions; availability and supported combinations are validated by the host. Installation copies the repository profiles. Local customizations cause conflict refusal by default; Backup retains the old files and installs the defaults, without merging personal model choices.

The main task retains goal interpretation, critical decisions, evidence convergence, and final acceptance. Delegate useful bounded work to explorer or test_analyst and request reviewer when needed. Avoid trivial delegation and duplicate coordination; keep one writer for overlapping files.

## Other Models and Tool Hosts

Use the core workflow according to host capabilities, not model brand. This repository currently provides a Codex installer; other hosts have not been runtime-validated and their configuration formats are not claimed to be interchangeable.

| Host capability | Behavior |
| --- | --- |
| Repository writes and command execution | Use PLAN, verification, and recovery normally |
| Subagents available | Delegate by role within actual permission boundaries |
| No subagents | Analyze sequentially; self-review is not independent review, so required review needs another reviewer or human |
| No /goal | Continue from PLAN through ordinary tasks; FULL and recorded strict context still require strict recovery |
| Chat only | Clarify goals or prepare handoff material; do not claim saved files, executed tests, or engineering acceptance |

Use native Skill invocation where available; otherwise read SKILL.md and relevant references through available file tools. Do not assume Codex $ invocation syntax, TOML, installation paths, or /goal work elsewhere. Missing tools block dependent mutation or acceptance, while unaffected authorized work can continue.


Maintainers can use the [behavior evaluation cases](examples/behavior-evaluation.md) to assess intake and recovery without adding user steps.
