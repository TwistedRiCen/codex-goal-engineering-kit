# Project Plan

> Persistent source of truth for durable project state. Keep evidence and decisions, not chat transcripts or activity logs.

## Plan Metadata

- Plan Version: 1
- Last Updated: 2026-09-09
- Task Mode: STANDARD
- Mode reason: authorized bounded workflow maintenance after completed M2
- Execution context: ordinary
- Current Phase: PROJECT COMPLETE
- Last Verified Commit: 0408010 (base of the verified intake/installation diff; delivery commit contains this updated PLAN)

Allowed phases: `GOAL DEFINITION`, `DISCOVERY`, `DISCOVERY GATE`, `ARCHITECTURE`, `ARCHITECTURE GATE`, `MILESTONE PLANNING`, `EXECUTION`, `MILESTONE ACCEPTANCE`, `SYSTEM VERIFICATION`, `FINAL ADVERSARIAL REVIEW`, `PROJECT COMPLETE`.

## Project Goal

Provide a reusable Goal-Driven Engineering Kit with economical, explicit, and verifiable role-based Codex agents plus lightweight repository-native execution continuity that can recover one safe next action after an uncontrolled interruption without relying on prior chat history.

## Scope

- Five named custom-agent TOML profiles: `explorer`, `docs_researcher`, `test_analyst`, `reviewer`, and `routine_worker`.
- A safe PowerShell installer that synchronizes only Kit-managed profiles into the user's Codex agents directory.
- Bilingual usage and routing documentation plus automated validation.
- A transient `.goal/execution-state.md` journal that exists only for an active atomic execution unit; journal absence is logical `IDLE`.
- Write-before-risk checkpoints, deterministic recovery actions, protected-baseline and verified-mutation fingerprints, and fail-closed handling of unknown state.
- Recovery contract tests and concise Skill, prompt, PLAN-template, and documentation integration.

## Constraints

- Use the current official Codex custom-agent format and supported model identifiers.
- Preserve unrelated user agents and refuse conflicting content by default.
- Do not modify global `AGENTS.md`, `~/.codex/config.toml`, YouJu, CI/CD, or remote Git state.
- Keep lifecycle semantics in the Goal-Driven Skill and `templates/PLAN.md`; model routing remains execution infrastructure.
- Keep `PLAN.md` authoritative for durable and verified project state; the execution journal must never become a second acceptance ledger.
- Preserve the approved six-state model, five-action model, journal-absence semantics, and fail-closed recovery behavior.

## Non-Goals

- Adding a separate Sol coordinator subagent or globally forcing a default subagent model.
- Supporting concurrent writers that touch overlapping code.
- Quota prediction, remaining-token detection, timed checkpoints, heartbeat, monitoring, automatic waiting, wake-up, or resume.
- Adaptive resource routing, schedulers, task queues, chat-history persistence, or generic agent runtimes.
- External side-effect reconciliation, distributed transactions, sagas, automatic retry of unknown external writes, M2-specific commit protocols, or a generic Git subject protocol.

## System Acceptance Criteria

| ID | Observable criterion | Verification method | Status (`OPEN`/`VERIFIED`) | Evidence |
| --- | --- | --- | --- | --- |
| SA-01 | Five reusable named profiles exist with explicit supported model and reasoning settings. | TOML parser and profile contract tests | VERIFIED | PowerShell profile and exact-contract validation passed for all five balanced-routing profiles. |
| SA-02 | Explorer and docs researcher use Luna/medium; routine worker uses Luna/high; test analyst and reviewer use Terra/high; role-appropriate sandbox boundaries remain unchanged. | Profile contract tests | VERIFIED | Exact model, effort, and sandbox contract checks passed after the balanced-routing update. |
| SA-03 | Routing documentation reserves complex or sensitive convergence and implementation for the main Sol thread and keeps one writer by default. | Bilingual documentation consistency review | VERIFIED | English/Chinese alignment validator and independent review passed. |
| SA-04 | Installation is safe, repeatable, conflict-aware, backup-capable, supports `-WhatIf`, and preserves unrelated agents. | Non-destructive installer scenario tests | VERIFIED | PowerShell 5.1 and 7 suites passed fresh, idempotent, mixed-conflict, backup, hard-link, reparse, WhatIf, and preservation cases. |
| SA-05 | No global Codex configuration is silently changed and lifecycle artifacts do not drift. | Source inspection, lifecycle validator, and diff review | VERIFIED | Config sentinel preserved; lifecycle validator passed; canonical lifecycle files have no diff. |
| SA-06 | Repository validation and independent review pass. | Validators, syntax checks, `git diff --check`, independent review | VERIFIED | M1 and M2 validators, syntax, Git checks, and final independent reviews passed. |
| SA-07 | A fresh session can derive exactly one safe next action from PLAN, an optional execution journal, Git, and verification evidence without prior conversation history. | Deterministic recovery decision tests covering journal absence and the four core crash windows | VERIFIED | PowerShell 7 and 5.1 passed four crash-window cases plus eighteen compatibility/fail-closed cases with exactly one approved action. |
| SA-08 | Unverified work cannot enter PLAN Verified Progress, and unknown or conflicting state fails closed. | Negative recovery tests plus FINALIZE contract validation | VERIFIED | FINALIZE requires matching durable and mutation evidence; PLAN/Git/HEAD/baseline/scope/external conflicts are checked first; delimiter-bearing fingerprint records and stale evidence have negative coverage. |
| SA-09 | Existing M1 routing, installer safety, and Many Readers -> Evidence Convergence -> One Writer -> Verification -> Independent Reviewer behavior do not regress. | Existing validators, installer scenarios, documentation review, and independent review | VERIFIED | Five profiles validated unchanged; PowerShell 7 and 5.1 installer suites, Skill validator, documentation checks, Git scope checks, and independent re-review passed. |

## Confirmed Facts

| ID | Durable fact | Evidence/source |
| --- | --- | --- |
| F-01 | Personal custom agents are standalone TOML files under `~/.codex/agents/`; required fields are `name`, `description`, and `developer_instructions`. | Official OpenAI Subagents documentation retrieved 2026-08-17 |
| F-02 | Custom-agent files can set `model`, `model_reasoning_effort`, and `sandbox_mode`; `read-only` is a supported sandbox override. | Official OpenAI Subagents documentation retrieved 2026-08-17 |
| F-03 | Current OpenAI guidance positions Luna for clear, repeatable, high-volume agents, Terra for balancing intelligence and cost, medium as a balanced effort, and high for complex review or edge-case analysis. | Official OpenAI Models and Codex Subagents documentation retrieved 2026-08-21 |
| F-04 | Repository lifecycle contracts are owned by the Skill and PLAN template; prompts remain short entry points. | `AGENTS.md` |
| F-05 | The user approved the reduced Interrupt-Resilient Execution architecture: journal absence is IDLE, active units use six states and five actions, two aggregate fingerprints protect recovery, and unknown external effects fail closed. | User Architecture Gate approval on 2026-09-02 |

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
| FD-02 | Architecture | Explorer/docs researcher use Luna/medium, routine worker uses Luna/high, and test analyst/reviewer use Terra/high; sandbox boundaries remain unchanged and the main Sol thread retains final authority. | Optimize total cost per accepted outcome: economical evidence and routine execution, stronger judgment for verification and review, and explicit escalation to the main thread. | User request and official OpenAI guidance | 2026-08-21 | Representative evals, model support, cost/quality evidence, or product routing changes |
| FD-03 | Architecture | Many readers, evidence convergence, one writer, verification, independent reviewer; at most three concurrent read-only agents by workflow default. | Avoid write conflicts and keep concurrency advisory. | User request | 2026-08-17 | Workflow policy changes |
| FD-04 | Product/Architecture | Add minimal repository-native Interrupt-Resilient Execution with an active-only journal, `IDLE` by absence, states `IDLE`/`PREPARED`/`MUTATED`/`VERIFYING`/`VERIFIED`/`BLOCKED`, actions `CONTINUE`/`RETRY_SAFE_UNIT`/`VERIFY`/`FINALIZE`/`BLOCKED`, protected-baseline and verified-mutation fingerprints, write-before-risk, and fail-closed unknown state. | PLAN remains the durable verified authority. M2 does not predict quota, auto-resume, reconcile unknown external writes, manage commits, persist chat, or introduce timed checkpoints or concurrent writers. | User-approved Revised Architecture Proposal | 2026-09-02 | Core recovery invariants cannot be satisfied without changing this model, or the user approves a later architecture milestone |

## Gate and Review Record

Use `NOT READY`, `PASSED`, or `FAILED`.

| Gate or review | Status | Criteria and evidence | Authority/reviewer | Date and repository baseline |
| --- | --- | --- | --- | --- |
| DISCOVERY GATE | PASSED | Official custom-agent schema/model evidence and all repository lifecycle, prompt, documentation, example, and installer artifacts were inspected; scope and ownership boundaries are explicit with no material unknowns. | Codex; user supplied product decisions | 2026-08-17 @ 65805bb |
| ARCHITECTURE GATE | PASSED | The authorized balanced routing assigns model capacity and reasoning effort by role risk without changing ownership, sandbox boundaries, installer scope, or main-thread authority. | User request, official OpenAI guidance, and Codex review | 2026-08-21 @ 29020bb |
| ARCHITECTURE GATE: M2 | PASSED | Reduced architecture fixes journal absence as IDLE, six states, five actions, write-before-risk, two aggregate fingerprints, deterministic reconciliation, and fail-closed external uncertainty while excluding resource management and Git transaction protocols. | User-approved Revised Architecture Proposal | 2026-09-02 @ 643ba72 |
| MILESTONE ACCEPTANCE: M1 | PASSED | M1-AC-01 through M1-AC-04 remain verified after the balanced-routing update by profile, installer, lifecycle, documentation, and review evidence. | Codex | 2026-08-21 @ 29020bb |
| MILESTONE ACCEPTANCE: M2 | PASSED | M2-AC-01 through M2-AC-06 verified; full local regression passed; reviewer findings were repaired and re-review found no BLOCKER or MAJOR; journal is absent and protected user state is unchanged. | Codex with independent `reviewer` re-review | 2026-09-02 working tree based on 643ba72 |
| SYSTEM VERIFICATION | PASSED | SA-01 through SA-06 revalidated after the balanced-routing update; profile, lifecycle, installer, documentation, and Git checks passed. | Codex | 2026-08-21 @ 29020bb |
| FINAL ADVERSARIAL REVIEW | PASSED | Initial link-safety, undeclared-Python, exact-file-boundary, and PS 5.1 findings repaired; re-review reported no remaining material findings. | Independent `gpt-5.6-terra` / high reviewer | 2026-08-17 working tree based on 65805bb |
| SYSTEM VERIFICATION: M2 | PASSED | SA-07 through SA-09 and unchanged SA-01 through SA-06 verified by dual-runtime continuity and installer tests, profile/lifecycle validators, syntax, Skill installer WhatIf, Git checks, and protected-state checks. | Codex | 2026-09-02 working tree based on 643ba72 |
| FINAL ADVERSARIAL REVIEW: M2 | PASSED | Two MAJOR findings on ambiguous fingerprint framing and finalize-before-conflict ordering were repaired, fully revalidated, and confirmed resolved; no BLOCKER or MAJOR remains. | Independent `reviewer` (`gpt-5.6-terra` / high), agent `01a06160-61b4-78d0-940c-44cd5b0e1705` | 2026-09-02 working tree based on 643ba72 |

## Architecture Summary

### Domain and ownership

The repository owns canonical custom-agent profile files and the installer. Codex owns runtime agent loading. User-owned agent files and global configuration remain outside Kit ownership.

### Workflow, state, and invariants

Read-only agents gather or verify evidence; the main thread converges it; at most one writer implements; verification and independent review follow. Installation creates missing managed files, treats equal content as idempotent, and refuses different content unless an explicit backup-and-replace mode is selected.

An active atomic execution unit writes `.goal/execution-state.md` before mutation risk, records only volatile intent and recovery boundaries, and removes the journal only after verified evidence is durably finalized into PLAN. Journal absence is logical `IDLE`. Recovery reconciles PLAN, journal, Git, and verification evidence through an ordered decision table that yields exactly one of five safe actions; unknown state is `BLOCKED`.

### Security, money, and compatibility

Read-only roles set `sandbox_mode = "read-only"`. The installer never deletes unrelated files or edits global configuration. Subagents consume additional tokens, so trivial work stays on the main thread.

## Milestones

| ID | Business capability | Depends on | Status | Acceptance summary | System criteria |
| --- | --- | --- | --- | --- | --- |
| M1 | Install and use safe role-based model routing profiles. | none | ACCEPTED | Profiles, installer, docs, validation, and independent review pass together. | SA-01 through SA-06 |
| M2 | Resume an interrupted atomic execution unit from repository-native evidence with exactly one safe next action. | M1 | ACCEPTED | Core recovery, Skill, prompts, template, validator, bilingual documentation, full regression, protected-state checks, and independent review pass together. | SA-07 through SA-09 |

## Current Milestone

- ID: M2
- Business outcome: A fresh Codex session can recover an interrupted atomic execution unit from repository evidence and derive exactly one safe next action without accepting unverified work.
- Included scope: active-only journal contract, six states, five actions, write-before-risk, two aggregate fingerprints, deterministic recovery tests, lifecycle/prompt/template integration, and concise bilingual documentation.
- Excluded scope: quota or token prediction, timed checkpoints, background services, automatic wait/wake/resume, external reconciliation, commit transaction management, chat persistence, schedulers, generic Git subjects, and concurrent writers.
- Dependencies satisfied: yes

## Milestone Acceptance Criteria

### M1

| ID | Observable criterion | Verification method | Status (`OPEN`/`VERIFIED`) | Evidence |
| --- | --- | --- | --- | --- |
| M1-AC-01 | Profile schema, models, reasoning, and read-only boundaries validate. | Automated profile tests | VERIFIED | PowerShell profile and exact-contract validation passed for all five balanced-routing profiles. |
| M1-AC-02 | All installer safety scenarios pass. | PowerShell installer tests | VERIFIED | Both PowerShell runtimes passed all safety scenarios including links and rollback-safe replacement. |
| M1-AC-03 | English and Chinese docs describe aligned activation, routing, costs, and precedence. | Consistency review | VERIFIED | Shared-term validator and independent review passed. |
| M1-AC-04 | Lifecycle contracts remain aligned and independent review has no unresolved material finding. | Existing validator plus reviewer | VERIFIED | Lifecycle validator passed; canonical lifecycle artifacts unchanged; final re-review clean. |

### M2

| ID | Observable criterion | Verification method | Status (`OPEN`/`VERIFIED`) | Evidence |
| --- | --- | --- | --- | --- |
| M2-AC-01 | Journal absence is logical IDLE; an active journal contains only the frozen minimum fields and uses the six approved states. | Skill/fixture contract validation | VERIFIED | Skill and validator contract checks confirm the exact six states, active-only minimum journal fields, no persistent IDLE asset, and no start-project journal initialization. |
| M2-AC-02 | Recovery reconciliation yields exactly one of the five approved actions for every supported state and fails closed for unknown or conflicting state. | Table-driven decision tests | VERIFIED | PowerShell 7 and 5.1 runs passed all 22 decision cases with exactly one approved action per input and no unverified FINALIZE. |
| M2-AC-03 | T1 PREPARED-before-mutation, T2 mutation-with-PREPARED, T3 VERIFYING, and T4 VERIFIED-before-PLAN-finalize recover to the approved action. | Execution continuity recovery tests | VERIFIED | T1 through T4 passed with `RETRY_SAFE_UNIT`, `VERIFY`, `VERIFY`, and `FINALIZE` respectively. |
| M2-AC-04 | Protected-baseline changes, out-of-scope mutation, HEAD drift, malformed journal, dirty Allowed Paths, unknown external effects, and fingerprint conflicts cannot produce unsafe progress. | Negative recovery tests | VERIFIED | Eighteen compatibility/fail-closed cases plus order, HEAD, content, and delimiter-safe fingerprint invariants passed in PowerShell 7 and 5.1. |
| M2-AC-05 | Skill, execution/resume prompts, PLAN template, and bilingual documentation express one compact continuity contract without implementing non-goals. | Lifecycle validator and documentation review | VERIFIED | Full lifecycle validator passed after U6-EN; both READMEs contain the same compact continuity terms and explicit non-goals. |
| M2-AC-06 | Existing agent routing, installer safety, Git policy, and orchestration philosophy remain unchanged; independent review has no BLOCKER or MAJOR. | Existing regression suites, diff review, and independent reviewer | VERIFIED | Agent files have zero diff; profile and dual-runtime installer regressions passed; existing Git policy remains explicit; final Terra/high reviewer re-review reports no BLOCKER or MAJOR. |

## Known Risks

| ID | Risk | Likelihood/impact | Mitigation or monitoring | Owner |
| --- | --- | --- | --- | --- |
| R-01 | Custom-agent schema may evolve. | Medium/medium | Keep profiles limited to currently documented config keys and validate TOML. | Kit maintainers |
| R-02 | Installer overwrite behavior could damage user customization. | Low/high | Exact conflict detection, default refusal, explicit backup-and-replace only, non-destructive tests. | Kit maintainers |
| R-03 | A concurrent or unexplained workspace/HEAD change during an active unit could make recovery ambiguous. | Medium/high | Aggregate protected-baseline fingerprint, clean Allowed Paths precondition, Prepared HEAD check, one writer, and fail-closed `BLOCKED`. | Kit maintainers |

## Blockers

| ID | Blocker | Affected criteria/milestone | Required resolution | Owner |
| --- | --- | --- | --- | --- |

## Verified Progress

| Date | Accepted outcome or criterion | Verification evidence | Commit/baseline |
| --- | --- | --- | --- |
| 2026-08-17 | M1 and SA-01 through SA-06 accepted. | Profile/TOML validation, PowerShell 5.1 and 7 installer suites, lifecycle validation, Git checks, and independent Terra/high review passed. | Working tree based on 65805bb; local commit follows acceptance. |
| 2026-08-21 | Balanced model and reasoning routing accepted without changing lifecycle or sandbox boundaries. | Profile contract validator, Skill lifecycle validator, installer scenario suite, bilingual routing alignment, and `git diff --check` passed. | 29020bb |
| 2026-09-02 | M2 Architecture Gate passed and the reduced Interrupt-Resilient Execution contract was frozen for implementation. | User-approved Revised Architecture Proposal; Atomic Unit M2/U1. | Opening baseline 643ba72; implementation evidence pending. |
| 2026-09-02 | M2/U2 deterministic recovery core and fingerprint contract verified. | PowerShell 7 and 5.1: four crash cases, thirteen compatibility/fail-closed cases, exactly-one-action, no-unverified-finalize, parser, and fingerprint assertions passed. Verified Mutation Fingerprint `be773458f79122f1139f9d0c0d61c5eaf6ee009b78454eefc9fbf28ce711b8c9`. | Working tree based on 643ba72; M2 integration pending. |
| 2026-09-02 | M2/U3-U4 canonical Skill and execution/resume prompts verified against the frozen continuity contract. | Skill validator, recovery tests, exact six-state/five-action and forbidden-expansion checks, 1,447-character execution objective, protected-baseline verification, and `git diff --check` passed. Verified Mutation Fingerprint `015cac9e5336615e44001456d5806988d7b2b827a2526323b97c364908ad778c`. | Working tree based on 643ba72; template, validator, documentation, and final regressions pending. |
| 2026-09-02 | M2/U5 PLAN-template boundary and final continuity validator contract verified. | PowerShell parser, template/state/action/prompt/journal-absence/forbidden-expansion/test clauses, recovery tests, protected-baseline check, and `git diff --check` passed. Full lifecycle validation reached only the intentionally deferred bilingual documentation gate. Verified Mutation Fingerprint `3752dc937e9f8052bd38967da7207144db01e914ee14f968dc0045d2dcba8ae9`. | Working tree based on 643ba72; documentation unit and full regression remain pending. |
| 2026-09-02 | M2/U6-ZH Chinese Interrupt-Resilient Execution documentation verified independently. | Required continuity terms/non-goals, `git diff --check`, protected-baseline preservation, and unchanged user-owned README.md hash passed. Verified Mutation Fingerprint `698106b90723d29442f09e63552471ac8ffca20d15ffa7c2eb814d26c6b916a4`. | Working tree based on 643ba72; bilingual documentation acceptance remains open pending README.md ownership resolution. |
| 2026-09-02 | Pre-README regression verification completed without modifying the blocked file. | Execution continuity tests passed in PowerShell 7 and 5.1; five agent profiles validated; installer scenario suite passed; all PowerShell scripts parsed; Skill installer `-WhatIf` was non-mutating; `git diff --check` passed. Lifecycle validator stopped exactly at missing English continuity documentation. | Working tree based on 643ba72; B-01 prevents final regression, review, commit, and M2 acceptance. |
| 2026-09-02 | B-01 and B-02 were resolved under explicit user authorization without creating history. | Removed only the identified README blank line and proved its blob matched HEAD before U6-EN; deleted only untracked ignored `.idea/workspace.xml`; the original five `.idea` paths and SHA-256 hashes remained unchanged; the file did not reappear through U6-EN verification. | Working tree based on 643ba72; protected baseline for U6-EN `2404c0e88dcf36dd3275c1ffd33f50d686aa47ef7797ef31aa35a775f2435a23`. |
| 2026-09-02 | M2/U6-EN English Interrupt-Resilient Execution documentation and bilingual contract verified. | Required continuity terms/non-goals, full `validate-skill.ps1`, `git diff --check -- README.md`, protected-baseline preservation, and unchanged original `.idea` hashes passed. Verified Mutation Fingerprint `48eb45b4e1fb4abf60443163f5b01e6d131a31b4a25a47a01aaea3ddb913f356`. | Working tree based on 643ba72; full regression and M2 independent review remain. |
| 2026-09-02 | Independent Review MAJOR findings repaired within the frozen M2 architecture. | Fingerprints now use length-prefixed UTF-8 records and entry count; conflict guards precede every finalize path; five finalized-with-conflict cases and delimiter-collision coverage raised the suite to 22 decision cases. PowerShell 7 and 5.1, full validator, and all regressions passed after repair. | Working tree based on 643ba72. |
| 2026-09-02 | M2 accepted after independent re-review. | Reviewer `01a06160-cf96-7760-940c-44cd5b0e1705` confirmed both MAJOR findings resolved and no BLOCKER/MAJOR remains. Journal absent, `.idea/workspace.xml` absent, original five `.idea` hashes unchanged, and all SA-07 through SA-09 evidence verified. | M2 accepted in working tree based on 643ba72; local commit follows repository policy. |
| 2026-09-04 | Repository state reconciled after completion. | `d13f701` pushed fast-forward to origin/main under explicit user authorization; PLAN Last Verified Commit backfilled from `643ba72`; IDE-regenerated untracked `.idea/workspace.xml` (2026-09-03) recorded as a post-completion local artifact. | Remote `643ba72..d13f701`; this PLAN correction committed locally. |

## Repository and Verification State

- Expected branch: `main`
- Working tree expectation: preserve the original five untracked `.idea` files exactly; `.idea/workspace.xml` reappeared as an IDE-generated untracked local file on 2026-09-03 after project completion; d13f701 was pushed to origin/main under explicit user authorization on 2026-09-04
- Relevant validation commands: execution continuity recovery tests; Skill validator; profile TOML/contract validator; PowerShell syntax; installer scenarios; `git diff --check`
- Latest independent review: M2 `reviewer` (`gpt-5.6-terra` / high) re-review passed with no BLOCKER or MAJOR after two MAJOR repairs
- Evidence invalidated by later changes: the 2026-08-20 all-Luna/xhigh assignment evidence is superseded by the 2026-08-21 balanced-routing decision; M1 routing and installer evidence remains valid, while lifecycle and documentation evidence must be revalidated after M2

## Active Change Control

| ID | Classification | Status | Requested/proposed change | Impact and proposed contract updates | Decision authority/evidence | Required gate |
| --- | --- | --- | --- | --- | --- | --- |

## Current Optimization Batch

- Task Mode: STANDARD (explicitly scoped maintenance after completed M2; historic gates and acceptance remain intact).
- Status: ACCEPTED.
- Authorization: 2026-09-08 user approved the proposed workflow simplification and synchronization to Codex.
- Scope: task tiers, reusable gates, compact PLAN, proportional review, short entry prompts, conditional references, aligned validation and backup-safe Skill synchronization.
- Preserved: strict recovery state/action model and conflict guards; model profiles, installers, global instructions/configuration, and remote Git state.
- Acceptance: see the scoped ledger below; legacy M1/M2 criteria are historical evidence, not acceptance of this iteration.
- Next work: none for implementation or installation; local delivery commit follows repository Git policy.

| ID | Observable result | Verification method | Status (OPEN/VERIFIED) | Evidence and baseline |
| --- | --- | --- | --- | --- |
| OPT-01 | DIRECT, STANDARD, and FULL choose proportionate work while preserving legacy and active strict recovery. | Independent scenario walkthrough and contract validation. | VERIFIED | Independent workflow_final_check read all artifacts and walked eight scenarios; no remaining actionable findings after repairs. Working tree based on ec06ca7. |
| OPT-02 | All entry prompts, templates, bilingual guides, fixture, and packaged references express a coherent usable contract. | Skill validator, basic Skill validation, independent artifact review. | VERIFIED | Lifecycle and basic Skill validators passed; full read-only artifact review passed. Repaired feature-entry legacy routing and documented persistent strict context. |
| OPT-03 | Strict recovery semantics, role profiles, and installer behavior remain compatible. | Exact decision-table/state/action comparison; PS7 and PS5.1 recovery/profile/installer suites. | VERIFIED | 22 continuity cases, profile validation, both installer suites passed in both runtimes; six states, five actions, and recovery decision table unchanged against ec06ca7. |
| OPT-04 | Codex receives the exact new Skill package with recoverable old copy; installation preserves configuration and agents. | Backup installation, full manifest readback, idempotence and protected-file hashes. | VERIFIED | Four installed files match source; old-package backup matches pre-install manifest; repeat install is a no-op; installed Skill validation passed. See installation record below. |
| OPT-05 | Final task diff contains only authorized workflow changes and passes checks. | Final diff/status inspection and git diff --check. | VERIFIED | Reviewed task paths only; diff checks passed. One local delivery commit follows acceptance; no remote changes authorized. |

Validation scope: scenario walkthroughs evaluate instructions statically; they are not live product executions or a measured speed/Token benchmark.


### Verification and Installation Record

- Executed in PowerShell 7 and Windows PowerShell 5.1: scripts/validate-skill.ps1, scripts/validate-agent-profiles.ps1, scripts/test-execution-continuity.ps1, scripts/test-install-agents.ps1, scripts/test-install-skill.ps1. All passed; affected Skill and package checks reran after review repairs.
- Basic Skill validator passed for source and actual installed package; all PowerShell scripts parsed; git diff --check passed. Strict recovery decision table, six states, and five actions match ec06ca7 exactly. The shared Skill entry is 88 lines versus 261, with conditional references; no runtime or Token saving is claimed.
- Independent review: workflow_review provided a partial static review and identified the missing scoped ledger; workflow_final_check completed artifact review plus eight scenario walkthroughs and confirmed the feature-entry routing repair. No remaining actionable finding. These are static checks, not live product workflow executions.
- Installed: C:/Users/98053/.agents/skills/goal-driven-engineering (4 files, complete manifest equality).
- Retained backup: C:/Users/98053/.agents/skills/goal-driven-engineering.backup-20260908-053846-6896010b. Backup manifest matched the pre-install package. Repeat synchronization reported Already synchronized; no changes made.
- Global AGENTS.md and five installed agent profiles match the original task baseline. config.toml differs from the old pre-interruption hash, but its last-write time 2026-09-08T01:14:52Z predates installation at 05:38:46Z. That existing drift was preserved; configuration stayed unchanged during final readback. The unchanged installer has no global-configuration write path.
- Git delivery: local commit only, after acceptance. Obtain the delivery hash from git log -1 -- PLAN.md; no push or remote mutation performed.

## Guided Intake and Single-Version Installation Batch

- Task Mode: STANDARD; current authorized maintenance after 0408010. Historical records above remain intact.
- Authorization: user approved conversational intake implementation and keeping only the effective installed Skill.
- Scope: default conversational/material entries, progressive brief, aligned Skill/templates/examples, backups and staging outside skill discovery, relocation of two identified installed backup folders.
- Non-goals: changing business code, agent models, global configuration, strict recovery semantics, or remote Git state.

| ID | Observable result | Verification | Status | Evidence |
| --- | --- | --- | --- | --- |
| UX-01 | Vague ideas and existing materials lead to focused adaptive questions and a sourced draft without demanding a complete prompt. | Independent intake scenario review. | VERIFIED | intake_install_review walked six scenarios and found no blocking intake drift; static/simulated review, not live product execution. |
| UX-02 | Discussion-only, existing authorization, complete inputs, and active recovery retain their boundaries. | Scenario review and contract regression. | VERIFIED | Review confirms discussion-only, explicit implementation authority, and legacy recovery behavior. Skill/basic validators and 22 unchanged continuity cases passed. |
| UX-03 | Installation and backup never leave extra discoverable copies; failure restores prior state. | PS7/PS5.1 installation, failure, WhatIf, hash and single-copy tests. | VERIFIED | Both runtimes passed fresh/idempotent/conflict/backup/WhatIf/rollback/Overwrite/junction tests; agent installer regression also passed. |
| UX-04 | Exactly one effective installed Skill matches source; identified old copies remain outside discovery. | Actual file inventory, full manifests, and protected-file baseline. | VERIFIED | Exactly one discovered Skill across user .agents/skills and .codex/skills; 5 installed files match source; two migrated backup manifests preserved; 7 protected files unchanged; repeat install no-op. |


- Status: ACCEPTED; no implementation or installation work remains. Local commit follows repository policy; no remote changes.
- Effective installation: C:/Users/98053/.agents/skills/goal-driven-engineering.
- Historical backup folders ending 20260908-053846-6896010b and 20260908-054207-f5c07f60 were moved intact to C:/Users/98053/.agents/skill-backups/. Previous effective version was backed up there as goal-driven-engineering.backup-20260909-010035-746d5fec.
- New installer stores both staging and backups outside the supplied discovery root, retaining conflict refusal and explicit Backup/Overwrite behavior. Reparse/overlap checks, source/staging equality, target-drift refusal, and activation-failure rollback were verified in isolated tests.
- Independent review's only deployment item (three live copies) is resolved by actual post-migration inventory of one. Question burden and authority were evaluated with six simulated scenarios; no runtime speed, confidence percentage, or user-study claim is made.

## Prompt Consolidation and Chinese Entry Batch

- Task Mode: STANDARD; bounded usability maintenance after c4facd9.
- Authorization: user requested fewer prompt templates and a consistent Chinese or internationalized entry experience.
- Scope: merge redundant starters, use Chinese for the four retained prompts and Codex default prompt, update guides/example references and existing validation.
- Decision: maintain one Chinese template set; retain stable filenames and protocol identifiers, with optional conversation-language requests. No new localization framework.
- Status: ACCEPTED.
- Acceptance: four distinct short entries cover starting, resuming, long-running execution, and changes; no obsolete entry references in active guides; recovery and authority semantics preserved; validators and non-destructive installer tests pass; installed Skill matches source with one discoverable version.
- Verification: source and installed basic Skill validators passed; lifecycle validator passed in PS7 and PS5.1; non-destructive Skill and Agent installer suites passed in PS7. Four Chinese entries and 39 local links checked; no obsolete entry references in active guides/examples. Final prompt review preserved legacy FULL, strict recovery, explicit implementation authority, discussion-only scope, and valid acceptance evidence. Static artifact checks, not live product workflow trials.
- Installation: five installed files match source at C:/Users/98053/.agents/skills/goal-driven-engineering; exactly one discoverable Skill across user skill roots. Seven protected configuration/agent files unchanged, repeat synchronization a no-op.
- Backup: C:/Users/98053/.agents/skill-backups/goal-driven-engineering.backup-20260909-011306-eb0990e0, outside discovery.
- Delivery: one local commit after final diff checks; no push. No remaining implementation or installation work.

## Model-Neutral Roles and Host Capability Batch

- Task Mode: STANDARD; authorized maintenance after 9933c3f.
- Authorization: user approved decoupling model versions, optional Codex adaptation, validator changes, and explicit host capability boundaries.
- Scope: five model-neutral role defaults, optional model/effort validation, focused regression cases, aligned guides and Skill capability rules, safe local synchronization.
- Preserved: role responsibilities/permissions, strict recovery protocol and historical decisions. No automatic model router, other-host installer, global configuration edits, or remote changes.
- Status: ACCEPTED.
- Acceptance: default roles have no model/effort binding; custom nonempty values pass structural validation while malformed or unsafe roles fail; unavailable capabilities cannot falsely satisfy verification/review/recovery; installer regressions pass and installed artifacts match source.
- Verification: PS7 and Windows PS5.1 both passed Skill/profile validation, Agent/Skill installer suites, and all 22 continuity cases. Optional model-only, effort-only, and combined overrides passed; eight malformed/incomplete/unsafe role cases were rejected. Basic Skill validation and local-link/diff checks passed.
- Contract review: five role bodies and permission settings match the prior baseline exactly; only model/effort defaults were removed. Existing templates, prompts, example and strict recovery references were inspected. Host capability guidance preserves required independent review, unverified acceptance, and strict continuation boundaries. This was static review plus local regression, not runtime certification of other hosts or a model performance comparison.
- Installed: five profiles match source at C:/Users/98053/.codex/agents and five Skill files match source at C:/Users/98053/.agents/skills/goal-driven-engineering. Exactly one discoverable Skill; both installers report no-op on repeat. Global config.toml and AGENTS.md hashes unchanged.
- Backups: C:/Users/98053/.codex/agent-backups/codex-goal-engineering-kit-20260909-055505-96259283 and C:/Users/98053/.agents/skill-backups/goal-driven-engineering.backup-20260909-055505-5f9273bd.
- Delivery: one local commit after final diff review, no push; no remaining implementation or synchronization work.
