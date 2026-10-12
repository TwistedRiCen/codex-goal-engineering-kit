# Codex Goal Engineering Kit

[English](README.md) | [简体中文](README.zh-CN.md)

A reusable Skill for turning an idea or bounded feature request into repository-backed decisions, implementation and acceptance evidence. It chooses enough workflow for the task and uses PLAN.md to resume across sessions. Optional Codex agent profiles provide bounded roles.

This is a workflow kit, not a generic orchestration runtime, background daemon, model router or automatic external transaction recovery system. Development identity: [VERSION](VERSION); changes: [CHANGELOG](CHANGELOG.md). Licensed under [Apache-2.0](LICENSE); this remains a pre-release repository state.

## Start in three steps

1. From this Kit in PowerShell, install the Skill:

   ```powershell
   .\scripts\install-skill.ps1
   ```

2. Open your real project, use [Start here](prompts/start-here.md), or say:

   > Use $goal-driven-engineering to help shape my idea. I want a training-center system because fees and remaining lesson credits are managed in Excel. Guide me before writing application code.

3. Next time use [Resume](prompts/resume-project.md). The agent reads PLAN and repository evidence, reconciles existing recovery state, and continues the next unmet criterion.

You can start with one sentence or attach complete materials. Discussion-only requests remain conversational. Agents and `/goal` are optional; installing this Kit does not start either. The [training walkthrough](examples/training-system/INTAKE-WALKTHROUGH.md) demonstrates intake; its example is a workflow fixture, not an application to build inside this repository.

## Install, diagnose and upgrade

The installer manages only `goal-driven-engineering` under `$HOME/.agents/skills`. Identical bytes are a no-op; differing content is refused by default. Preview with `-WhatIf`. To retain an old copy and synchronize a changed package:

```powershell
.\scripts\install-skill.ps1 -ConflictAction Backup
.\scripts\check-installation.ps1
```

Backups live outside Skill discovery. Review the printed paths; do not keep duplicate backup Skills inside discovery. Personal changes are preserved by Backup, not merged. The installer does not change global AGENTS or unrelated Skills. Other hosts and cross-platform installation are not guaranteed.

Diagnosis is read-only. `-AsJson` reports the current Kit version/source revision, source and installed package fingerprints, duplicates and optional agent status. SYNCHRONIZED proves byte equality, not the installed Git revision or a running-session reload. Existing package-only installations have InstalledKitVersion=UNKNOWN; no version stamp is invented. See [version and compatibility](docs/compatibility.md).

For upgrades, read CHANGELOG and compatibility notes, run Full, then install only if Skill package bytes changed. README/CI/maintenance changes alone require no reinstall. Test changed Skills in a fresh session; reload Codex if the updated Skill has not appeared.

## DIRECT, STANDARD, FULL and Goal

| Mode | Intended use | Persistent state |
| --- | --- | --- |
| DIRECT | Isolated, understood local change without material domain/security decisions | No new PLAN or journal |
| STANDARD | Bounded feature work within verified architecture | Compact [PLAN](templates/PLAN.md) |
| FULL | New systems or material core model, security or compatibility work | [Full PLAN](templates/PLAN.full.md) and lifecycle gates |

The agent selects the least sufficient mode; you can specify a preference. Verification, review and existing recovery requirements still apply. Legacy PLAN files without Task Mode retain FULL semantics. Existing journals are reconciled before mutation.

The Skill is the protocol; project AGENTS defines local constraints; PLAN stores decisions and verified acceptance. `/goal` is the host's long-running execution feature, not this Kit's runtime. Start it only for an explicitly approved measurable scope using [execution entry](prompts/start-execution-goal.md); `/goal → strict` remains unchanged. Use [change control](prompts/change-control.md) for requirement changes.

Full rules live in [SKILL.md](skills/goal-driven-engineering/SKILL.md) and its conditionally loaded references. Prompts are entry points, not duplicate lifecycle manuals.

## Optional custom agents

| Profile | Access | Responsibility |
| --- | --- | --- |
| `explorer` | read-only | Repository evidence |
| `docs_researcher` | read-only | Authoritative documentation |
| `test_analyst` | read-only | Verification gaps |
| `reviewer` | read-only | Independent review |
| `routine_worker` | workspace-write | One bounded implementation scope |

```powershell
.\scripts\install-agents.ps1 -WhatIf
.\scripts\install-agents.ps1 -ConflictAction Backup
```

Profiles omit model and effort by default. The core Skill does not require these agents. The installer preserves unrelated profiles and does not edit `$HOME/.codex/config.toml`, `agents.default_subagent_model`, or concurrency. Host model availability and configuration remain host responsibilities; see [optional profiles](agents/) and [host capabilities](skills/goal-driven-engineering/references/host-capabilities.md).

## Advanced: Interrupt-Resilient Execution

Strict execution follows Write Before Risk and uses `.goal/execution-state.md` as temporary unverified state; absence means IDLE. New strict units use schema 2; active legacy journals keep their original semantics. Uncertainty must fail closed. Ordinary STANDARD does not add per-edit journals or fingerprints.

This instruction contract provides neither quota prediction nor external transaction recovery. It is not a generic transaction engine or automatic background resume service. Details: [continuity contract](skills/goal-driven-engineering/references/execution-continuity.md).

## Maintain this repository

Prerequisites: PowerShell 7 (Windows PowerShell 5.1 also supported on Windows), Node.js 24+, and Git. One entry serves local checks and CI:

```powershell
.\scripts\test-all.ps1             # Quick: metadata, local links, validators, contracts, core Node fixtures
.\scripts\test-all.ps1 -Mode Full  # Windows: all deterministic checks; both PowerShell runtimes when available
```

Full includes isolated installer/diagnostic/recovery fixtures and no-model runtime harness tests. Portable Quick covers metadata/links and core Node fixtures; Windows PowerShell checks run only on Windows. Neither mode calls Codex/models, updates the real installed Skill, changes user config, or starts native Goal. CI is configured for Windows Full and Ubuntu Quick; configured coverage is not evidence of a completed remote CI run. See [maintenance and coverage](docs/maintenance.md) and [CONTRIBUTING](CONTRIBUTING.md).

## Current support and limits

Windows is primary. PowerShell 7 and Windows PowerShell 5.1 are locally tested; portable Quick is a secondary contract/fixture scope, not a cross-platform installer guarantee. Core PLAN preservation, legacy journals and schema 2 remain compatible.

Runtime v4 is **advanced / evidence-oriented / host-capability-dependent**. Deterministic controls are not real Agent stability or model acceptance. Phase4A real E1–E4/R4/typed reviewer remain NOT PROVEN; auth isolation is blocked and persistence/flush completeness is unproven. Phase4A/4A.1 remain NOT READY. M3 recovery optimization remains INCONCLUSIVE.

These external host limitations are deferred acceptance, not proof that Phase4A passed. Live runtime work remains explicit, separately authorized and capability-gated. See [support matrix and frozen limitations](docs/support.md), [Phase4A](examples/runtime-v4/phase4a-report.md), [Phase4A.1](examples/runtime-v4/phase4a1-report.md) and [behavior evaluation](examples/behavior-evaluation.md).
