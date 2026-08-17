# Codex Goal Engineering Kit

[English](README.md) | [简体中文](README.zh-CN.md)

## What

A small, reusable operating kit for turning a high-level product goal into discovered, designed, implemented, independently reviewed, and system-accepted software. The repository stores the lifecycle and durable state; it does not provide an agent runtime or a business application.

## Why

| Layer | Responsibility |
| --- | --- |
| Global/project `AGENTS.md` | Durable engineering behavior and repository conventions |
| `goal-driven-engineering` Skill | Product-project lifecycle and gates |
| Project `PLAN.md` | Cross-session facts, decisions, milestones, acceptance, and verified state |
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

## New Project

1. Create/open the real project workspace; do not build it inside this Kit repository.
2. Ensure the Skill is installed.
3. Prefer copying [`templates/PLAN.md`](templates/PLAN.md) to the new repository root before opening Codex. If you do not, the installed Skill can create an equivalent `PLAN.md` from its required state model without access to this Kit.
4. Fill the six fields in [`prompts/start-project.md`](prompts/start-project.md) and paste the prompt into a normal Codex session. If `PLAN.md` already exists, Codex fills it; otherwise it creates it immediately.
5. Confirm the session enters Discovery and avoids production implementation until the required gates pass.

The first sentence can be as small as:

```text
Use $goal-driven-engineering to start this product goal; initialize PLAN.md and begin Discovery before implementation.
```

Add the product Goal, context, constraints, non-goals, and observable definition of done below it.

## Architecture Approved

Confirm that Discovery and Architecture gate records passed with evidence and required authority, frozen decisions preserve their decision evidence, milestones are vertical and dependency-ordered, and the current milestone has measurable acceptance. Then paste [`prompts/start-execution-goal.md`](prompts/start-execution-goal.md). Its `/goal` objective points to the Skill and `PLAN.md` instead of duplicating the protocol.

Do not start `/goal` directly from a vague business idea. Current Codex documentation says the goal text is both the first prompt and completion criterion and limits CLI goal objectives to 4,000 characters, so detailed state belongs in `PLAN.md`.

## Resume

Paste [`prompts/resume-project.md`](prompts/resume-project.md). Codex will rebuild state from applicable `AGENTS.md`, `PLAN.md`, Git/repository evidence, current milestone code, and tests. Repository evidence wins if the plan is stale.

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
