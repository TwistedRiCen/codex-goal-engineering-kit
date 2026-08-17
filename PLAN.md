# Project Plan

> Persistent source of truth for durable project state. Keep evidence and decisions, not chat transcripts or activity logs.

## Plan Metadata

- Plan Version: 1
- Last Updated: 2026-08-17
- Current Phase: PROJECT COMPLETE
- Last Verified Commit: 65805bb (task working tree verified independently before local commit)

Allowed phases: `GOAL DEFINITION`, `DISCOVERY`, `DISCOVERY GATE`, `ARCHITECTURE`, `ARCHITECTURE GATE`, `MILESTONE PLANNING`, `EXECUTION`, `MILESTONE ACCEPTANCE`, `SYSTEM VERIFICATION`, `FINAL ADVERSARIAL REVIEW`, `PROJECT COMPLETE`.

## Project Goal

Provide reusable, economical, explicit, and verifiable role-based Codex custom-agent profiles for multi-agent engineering work without changing the Goal-Driven Engineering lifecycle.

## Scope

- Five named custom-agent TOML profiles: `explorer`, `docs_researcher`, `test_analyst`, `reviewer`, and `routine_worker`.
- A safe PowerShell installer that synchronizes only Kit-managed profiles into the user's Codex agents directory.
- Bilingual usage and routing documentation plus automated validation.

## Constraints

- Use the current official Codex custom-agent format and supported model identifiers.
- Preserve unrelated user agents and refuse conflicting content by default.
- Do not modify global `AGENTS.md`, `~/.codex/config.toml`, YouJu, CI/CD, or remote Git state.
- Keep lifecycle semantics in the Goal-Driven Skill and `templates/PLAN.md`; model routing remains execution infrastructure.

## Non-Goals

- Changing the Goal-Driven Engineering lifecycle or building an agent runtime.
- Adding a separate Sol coordinator subagent or globally forcing a default subagent model.
- Supporting concurrent writers that touch overlapping code.

## System Acceptance Criteria

| ID | Observable criterion | Verification method | Status (`OPEN`/`VERIFIED`) | Evidence |
| --- | --- | --- | --- | --- |
| SA-01 | Five reusable named profiles exist with explicit supported model and reasoning settings. | TOML parser and profile contract tests | VERIFIED | PowerShell profile validator and Python `tomllib` both passed for five profiles. |
| SA-02 | Explorer and docs researcher use Luna read-only; test analyst and reviewer use Terra read-only; routine worker uses Terra. | Profile contract tests | VERIFIED | Exact model, effort, and sandbox contract checks passed. |
| SA-03 | Routing documentation reserves complex or sensitive convergence and implementation for the main Sol thread and keeps one writer by default. | Bilingual documentation consistency review | VERIFIED | English/Chinese alignment validator and independent review passed. |
| SA-04 | Installation is safe, repeatable, conflict-aware, backup-capable, supports `-WhatIf`, and preserves unrelated agents. | Non-destructive installer scenario tests | VERIFIED | PowerShell 5.1 and 7 suites passed fresh, idempotent, mixed-conflict, backup, hard-link, reparse, WhatIf, and preservation cases. |
| SA-05 | No global Codex configuration is silently changed and lifecycle artifacts do not drift. | Source inspection, lifecycle validator, and diff review | VERIFIED | Config sentinel preserved; lifecycle validator passed; canonical lifecycle files have no diff. |
| SA-06 | Repository validation and independent review pass. | Validators, syntax checks, `git diff --check`, independent review | VERIFIED | All checks passed; Terra/high re-review found no BLOCKER, MAJOR, or MINOR findings. |

## Confirmed Facts

| ID | Durable fact | Evidence/source |
| --- | --- | --- |
| F-01 | Personal custom agents are standalone TOML files under `~/.codex/agents/`; required fields are `name`, `description`, and `developer_instructions`. | Official OpenAI Subagents documentation retrieved 2026-08-17 |
| F-02 | Custom-agent files can set `model`, `model_reasoning_effort`, and `sandbox_mode`; `read-only` is a supported sandbox override. | Official OpenAI Subagents documentation retrieved 2026-08-17 |
| F-03 | `gpt-5.6-luna` and `gpt-5.6-terra` are current model identifiers and both support medium and high reasoning effort. | Official OpenAI model documentation retrieved 2026-08-17 |
| F-04 | Repository lifecycle contracts are owned by the Skill and PLAN template; prompts remain short entry points. | `AGENTS.md` |

## Design Assumptions

| ID | Reversible assumption | Why needed | Validation or expiry condition |
| --- | --- | --- | --- |
| A-01 | Kit-managed profiles use filename identity plus exact-content comparison for synchronization. | Enables safe, deterministic conflict detection without a separate manifest format. | Installer scenario tests and review |
| A-02 | Backup is explicit through an installer switch and is created only for conflicting managed destinations. | Meets safe refusal and backup requirements without overwriting by default. | Installer contract and tests |

## Pending Decisions

| ID | Decision needed | Material impact | Options/recommendation | Owner | Needed by |
| --- | --- | --- | --- | --- | --- |

## Frozen Decisions

| ID | Class | Decision | Rationale/constraints | Authority and evidence | Frozen on | Reopen when |
| --- | --- | --- | --- | --- | --- | --- |
| FD-01 | Product | Strong main coordinator, economical evidence workers, strong verification; no Sol coordinator subagent. | Main thread owns convergence and critical decisions. | User request | 2026-08-17 | Product scope changes |
| FD-02 | Architecture | Luna for explorer/docs researcher; Terra for test analyst/reviewer/routine worker; explicit profile-level model selection. | Route by cognitive complexity and avoid global defaults. | User request and official model docs | 2026-08-17 | Model support or product routing changes |
| FD-03 | Architecture | Many readers, evidence convergence, one writer, verification, independent reviewer; at most three concurrent read-only agents by workflow default. | Avoid write conflicts and keep concurrency advisory. | User request | 2026-08-17 | Workflow policy changes |

## Gate and Review Record

Use `NOT READY`, `PASSED`, or `FAILED`.

| Gate or review | Status | Criteria and evidence | Authority/reviewer | Date and repository baseline |
| --- | --- | --- | --- | --- |
| DISCOVERY GATE | PASSED | Official custom-agent schema/model evidence and all repository lifecycle, prompt, documentation, example, and installer artifacts were inspected; scope and ownership boundaries are explicit with no material unknowns. | Codex; user supplied product decisions | 2026-08-17 @ 65805bb |
| ARCHITECTURE GATE | PASSED | Five flat TOML profiles, per-file exact-content synchronization, default conflict refusal, explicit backup-and-replace, no global config mutation, and one-writer routing are coherent with FD-01 through FD-03. | User request and Codex review | 2026-08-17 @ 65805bb |
| MILESTONE ACCEPTANCE: M1 | PASSED | M1-AC-01 through M1-AC-04 verified by profile, installer, lifecycle, documentation, and review evidence. | Codex | 2026-08-17 working tree based on 65805bb |
| SYSTEM VERIFICATION | PASSED | SA-01 through SA-06 verified on PowerShell 5.1 and 7; external `tomllib` parse and Git checks passed. | Codex | 2026-08-17 working tree based on 65805bb |
| FINAL ADVERSARIAL REVIEW | PASSED | Initial link-safety, undeclared-Python, exact-file-boundary, and PS 5.1 findings repaired; re-review reported no remaining material findings. | Independent `gpt-5.6-terra` / high reviewer | 2026-08-17 working tree based on 65805bb |

## Architecture Summary

### Domain and ownership

The repository owns canonical custom-agent profile files and the installer. Codex owns runtime agent loading. User-owned agent files and global configuration remain outside Kit ownership.

### Workflow, state, and invariants

Read-only agents gather or verify evidence; the main thread converges it; at most one writer implements; verification and independent review follow. Installation creates missing managed files, treats equal content as idempotent, and refuses different content unless an explicit backup-and-replace mode is selected.

### Security, money, and compatibility

Read-only roles set `sandbox_mode = "read-only"`. The installer never deletes unrelated files or edits global configuration. Subagents consume additional tokens, so trivial work stays on the main thread.

## Milestones

| ID | Business capability | Depends on | Status | Acceptance summary | System criteria |
| --- | --- | --- | --- | --- | --- |
| M1 | Install and use safe role-based model routing profiles. | none | ACCEPTED | Profiles, installer, docs, validation, and independent review pass together. | SA-01 through SA-06 |

## Current Milestone

- ID: M1
- Business outcome: A user can safely install named profiles and request bounded multi-agent roles with explicit economics and permissions.
- Included scope: profiles, installer, tests, bilingual documentation, minimal Skill integration reference if required.
- Excluded scope: lifecycle redesign, global config mutation, YouJu changes, remote publishing.
- Dependencies satisfied: yes

## Milestone Acceptance Criteria

### M1

| ID | Observable criterion | Verification method | Status (`OPEN`/`VERIFIED`) | Evidence |
| --- | --- | --- | --- | --- |
| M1-AC-01 | Profile schema, models, reasoning, and read-only boundaries validate. | Automated profile tests | VERIFIED | PowerShell validator plus external `tomllib` parse passed. |
| M1-AC-02 | All installer safety scenarios pass. | PowerShell installer tests | VERIFIED | Both PowerShell runtimes passed all safety scenarios including links and rollback-safe replacement. |
| M1-AC-03 | English and Chinese docs describe aligned activation, routing, costs, and precedence. | Consistency review | VERIFIED | Shared-term validator and independent review passed. |
| M1-AC-04 | Lifecycle contracts remain aligned and independent review has no unresolved material finding. | Existing validator plus reviewer | VERIFIED | Lifecycle validator passed; canonical lifecycle artifacts unchanged; final re-review clean. |

## Known Risks

| ID | Risk | Likelihood/impact | Mitigation or monitoring | Owner |
| --- | --- | --- | --- | --- |
| R-01 | Custom-agent schema may evolve. | Medium/medium | Keep profiles limited to currently documented config keys and validate TOML. | Kit maintainers |
| R-02 | Installer overwrite behavior could damage user customization. | Low/high | Exact conflict detection, default refusal, explicit backup-and-replace only, non-destructive tests. | Kit maintainers |

## Blockers

| ID | Blocker | Affected criteria/milestone | Required resolution | Owner |
| --- | --- | --- | --- | --- |

## Verified Progress

| Date | Accepted outcome or criterion | Verification evidence | Commit/baseline |
| --- | --- | --- | --- |
| 2026-08-17 | M1 and SA-01 through SA-06 accepted. | Profile/TOML validation, PowerShell 5.1 and 7 installer suites, lifecycle validation, Git checks, and independent Terra/high review passed. | Working tree based on 65805bb; local commit follows acceptance. |

## Repository and Verification State

- Expected branch: `main`
- Working tree expectation: clean after the required local commit; no push
- Relevant validation commands: Skill validator; profile TOML/contract validator; PowerShell syntax; installer scenarios; `git diff --check`
- Latest independent review: `gpt-5.6-terra` / high re-review passed with no remaining BLOCKER, MAJOR, or MINOR findings
- Evidence invalidated by later changes: none

## Active Change Control

| ID | Classification | Status | Requested/proposed change | Impact and proposed contract updates | Decision authority/evidence | Required gate |
| --- | --- | --- | --- | --- | --- | --- |
