# Project Plan

## Plan Metadata

- Plan Version: 2
- Task Mode: STANDARD
- Mode reason: user-approved Phase 2 M1 evaluation integrity, M2 semantic-equivalent simplification, and M3 isolated investigation only.
- Execution context: ordinary
- Current Phase: EXECUTION
- Last Updated: 2026-10-09
- Last Verified Commit: bb921e5f584d3e99a325733901aa28ad95268a35 (Phase 1 and Phase 2 clean baseline).

## Project Goal / Scope

Maintain a reusable goal-driven workflow with guided intake, proportionate execution, verifiable recovery, model-neutral roles, and safe optional Codex installation.
Current scope: M1 versioned, evidence-backed scoring and isolated execution regressions; then M2 instruction/validator simplification only where comparison supports equivalent semantics; finally M3 isolated recovery investigation. Earlier acceptance below remains historical evidence for its recorded baseline.
No M4 governance/CI work, model router, generic recovery runtime, Goal activation, real installation, global configuration changes, or remote changes. M3 cannot change strict applicability, states/actions, schema, receipt, fingerprints, or durable compatibility.

## Decisions and Blockers

- FD-01: Main task owns evidence convergence and final acceptance; retain bounded roles and one writer per overlapping scope.
- FD-02 (superseded): Fixed Luna/Terra assignments are historical only. Effective decision: default profiles omit model/effort; optional host configuration supplies them, with unchanged role permissions. User-approved, implemented in 8b5f025.
- FD-03: Delegation is proportional to evidence needs, not mandatory concurrency or extra coordinators.
- FD-04 (approved in the earlier reliability iteration): Preserve six states, five actions, and conflict-first recovery. New schema 2 units protect PLAN independently and allow only an exact verified receipt; active schema 1 units retain their rules.
- Historical decisions, criteria, installation and review evidence: [archived PLAN](docs/history/PLAN-through-8b5f025.md). Those records describe their baseline, not current model requirements.
- FD-05: 2026-10-09 user approved M1 -> validation/review/checkpoint -> M2 -> validation -> M3 investigation. Separate local milestone commits; no real installation or remote mutation.
- Pending decisions: any M3 formal recovery proposal requires fresh user approval; no such change is approved.

## Historical Reliability Acceptance

| ID | Observable result | Verification | Status | Evidence |
| --- | --- | --- | --- | --- |
| REL-01 | PLAN receipt crash resumes without masking unrelated PLAN, index, code, or external conflicts. | Real Git fixtures, legacy decision tests, independent review. | ACCEPTED | PS7 and Windows PowerShell 5.1: test-plan-receipt.ps1 passed, including 22 legacy decisions and real Git clean/dirty/untracked PLAN fixtures. Independent recovery review: no remaining findings. |
| REL-02 | Current PLAN identifies effective decisions and retains superseded evidence. | State/document review. | ACCEPTED | Archived PLAN preserves the complete 8b5f025 content; effective model-neutral decisions are explicit. Independent state review passed. |
| REL-03 | Installers reject linked or overlapping source/destination/backup paths before writes and recover from activation failure. | Isolated installer tests. | ACCEPTED | Both PowerShell runtimes: test-install-skill.ps1 and test-install-agents.ps1 passed, including linked roots/ancestors, overlaps and injected activation rollback. Independent installation review: no remaining findings. |
| REL-04 | Equivalent LF/CRLF and UTF-8 BOM documents validate; real missing fields still fail. | Validator fixtures. | ACCEPTED | Both runtimes: test-validator-encoding.ps1 passed for LF, CRLF and UTF-8 BOM, with missing-heading rejection. |
| REL-05 | Read-only diagnosis reports paths, content differences, duplicates, and optional role state without mutation. | Missing/synced/modified/duplicate/link fixtures. | ACCEPTED | Both runtimes: test-check-installation.ps1 passed for missing/synced/modified/duplicate, quoted frontmatter with BOM, body false positives, overlapping roots, invalid file roots and links. Independent diagnostic rerun passed. |
| REL-06 | Quick start and fixed behavioral cases guide users without extra templates or weakened gates. | Link checks and scenario review. | ACCEPTED | Local Markdown links passed; six behavioral cases statically reviewed against Skill, prompts and recovery rules. Existing four user prompts retained. |
| REL-07 | Installed Skill and managed roles match source with recoverable backups. | Manifest, no-op install and protected configuration readback. | ACCEPTED | 2026-09-10: real Skill manifest synchronized; exactly one discovered copy; five roles synchronized; repeat installation made no changes. Seven protected configuration/profile hashes unchanged; installed Skill validator passed. |

## Current Work

- Current batch: Phase 2 M3 (isolated recovery investigation only).
- Status: IN PROGRESS
- Next unmet criterion: P2-M3-01.
- Historical completed work remains below and in the archive; only the Phase 2 acceptance ledger governs this iteration.

## Historical Installation and Verification State

- Base: 8b5f025; preserve unrelated edits.
- Checks: Skill/profile validators, continuity and real Git tests, both installers, encoding and diagnostic tests, basic Skill validation, final diff review.
- Prior reliability test/review evidence: all scoped checks passed on PowerShell 7 and Windows PowerShell 5.1; source and installed basic Skill validation passed. Recovery and installation were independently reviewed, with findings repaired and affected checks rerun.
- Installed Skill: C:/Users/98053/.agents/skills/goal-driven-engineering (physical directory).
- Previous Skill backup: C:/Users/98053/.agents/skill-backups/goal-driven-engineering.backup-20260910-004718-a4f8011f.
- Historical evidence boundaries: the prior six behavioral cases were static walkthroughs; Git recovery fixtures exercise the receipt helper and decision function, not a generic journal parser. Legacy journals retain legacy checks. Installation readback verifies disk contents, not running-app reload or resistance to malicious concurrent path substitution.
- Evidence invalidated: old fixed-model assertions and PLAN-finalize synthetic-only coverage cannot establish current acceptance.

## Historical Completion/Evidence Acceptance

| ID | Observable result | Verification | Status | Evidence |
| --- | --- | --- | --- | --- |
| BEH-01 | Fixed DIRECT, evidence, and delivery cases distinguish missed review, over-processing, invalid reuse, and unsafe retries. | Deterministic fixture tests and independent baseline/candidate decision evaluations. | VERIFIED | Baseline/candidate each passed 12 fixed decision cases with real read-only probes; no repeated-runtime efficacy claim. See [evaluation report](examples/behavior-results/2026-09-11-completion-evidence.md). |
| BEH-02 | Completion and evidence wording adds no DIRECT artifacts and changes no recovery semantics. | Scope/diff checks, Skill validation, independent review. | VERIFIED | Independent final_review completed implementation and scorer-repair review on 2026-09-11; no material findings remain. Protected protocol diff and final Skill/link checks passed. |
| BEH-03 | Supporting reference ships with the Skill; installation and contract checks remain valid. | Non-destructive installer and relevant regression tests. | VERIFIED | Both runtimes passed Skill/profile validation, isolated installers, encoding and receipt/continuity tests on 2026-09-10. Source basic Skill validator passed. |
## Historical Completion/Evidence Verification State

- Base: c38eaae; all current edits belong to the approved iteration. No active journal; STANDARD ordinary execution.
- Source/fixture hashes still match the evaluated candidate after the 2026-09-11 interruption recovery.
- Current evaluation and limits: [completion/evidence report](examples/behavior-results/2026-09-11-completion-evidence.md).
- Independent implementation review: final_review, baseline c38eaae plus this complete change set; both scorer findings resolved and repair/impact reviewed. Independently reran 25 fixture tests and diff check. Decision evaluations did not substitute for implementation review.
- The historical installed-copy evidence above does not establish synchronization with this candidate. No real installation is authorized by this repository-only iteration.- Final validation on 2026-09-11: 25 fixture/scorer tests, both recorded decision groups (12/12 each under the same repaired rubric), Skill lifecycle/basic validation, changed Markdown links and protected-protocol diff passed. Earlier two-runtime installer/encoding/recovery evidence remains applicable; those files and evaluated Skill/inputs are unchanged.
- Delivery: one local commit; identify this iteration with git log -1 -- examples/behavior-results/2026-09-11-completion-evidence.md. No push or real user installation performed.

## Phase 2 Acceptance Criteria

| ID | Observable result | Verification | Status | Evidence |
| --- | --- | --- | --- | --- |
| P2-M1-01 | Probe accepts only own declared cases/operations; malformed observations, fictional evidence and unsupported actions cannot earn PASS. | Positive/negative tests and independent adversarial review. | VERIFIED | [M1 evidence](examples/behavior-results/phase2-m1.md); 72 unit tests; material runner finding repaired and independently re-reviewed. |
| P2-M1-02 | Rubric has a version; minimally retained observations distinguish claims, observed events and reviewed rationale. Historical results remain unchanged and both groups receive the same new-rubric assessment. | Schema/provenance tests; historical evidence availability recorded without fabrication. | VERIFIED | Both original groups 12/12 under 2.0; raw claims/probes independently checked and rationale attested; frozen v1 retained. |
| P2-M1-03 | Isolated real DIRECT/STANDARD executions and actual journal/receipt path fixtures record first results, artifacts, verification, agents/questions and limits. | Fresh-session execution evidence and PS7/PS5.1 integration fixtures. | VERIFIED | Final v3 baseline 2/2; earlier failed/diagnostic attempts retained. Both PS runtimes: 16 actual persisted recovery cases, 85 assertions, 32 File.Replace; declared fixture limits. |
| P2-M1-04 | M1 checkpoint passes relevant checks and independent review; freezes M2's evaluated baseline. | Final diff, hashes, review and local milestone commit. | VERIFIED | M1 checkpoint commit containing this ledger freezes scorer/input/runner; two-runtime related checks, basic Skill, links, diff and independent review passed. |
| P2-M2-01 | Skill surface and validator coupling are reduced while authorization, acceptance/review, mode/recovery routing and legacy semantics remain equivalent. | M1 baseline/candidate regressions; semantic mapping; independent review. | VERIFIED | [M2 evidence and limits](examples/behavior-results/phase2-m2.md); v3 paired baseline/candidate each 2/2, same settings/inputs; core rules and original strict assets unchanged; independent semantic review. |
| P2-M2-02 | Skill package, links and isolated installers remain valid on PS7/PS5.1. | Repository checks and local milestone commit. | VERIFIED | Both runtimes: validators, 37 positive/negative fixtures + encoding, isolated installers; basic Skill, links and diff checks. Separate M2 checkpoint commit; no real install. |
| P2-M3-01 | Ordinary STANDARD, current strict Goal-style execution and hypothetical lightweight recovery are compared only in isolated fixtures. | Failure-mode matrix with observed costs, false BLOCKED/unsafe CONTINUE and reviewer assessment. | OPEN | |
| P2-M3-02 | Formal recovery protocol and real installation/configuration stay untouched; conclusion permits KEEP or INCONCLUSIVE. | Protected-file comparisons, final status and evidence report. | OPEN | |

## Repository and Verification State

- Branch: codex/modernize-evaluation-and-skill; clean main@bb921e5 verified before branch creation.
- Preserved state: ignored .idea files; empty .goal directory with no execution journal; no pre-existing tracked/untracked changes.
- Execution: ordinary interactive STANDARD; no Goal is active for this task.
- Phase 1 checks: 25 Node tests; both PowerShell runtimes passed validators, continuity/receipt, isolated installers, encoding and diagnosis. These are baseline evidence, not acceptance of new changes.
- Actual installed Skill and five managed profiles matched baseline source before Phase 2; real installation remains separately unauthorized.
- M1 validation/review: [evidence](examples/behavior-results/phase2-m1.md). Frozen M2 comparison: execution-regression-v3 baseline from bb921e5, Skill package digest 1a5b0d47421d32f0d16205c75ef7deded11e433ba47564a000e1840da47f2be9. 14 host protected file hashes unchanged; no real installation.
- M1 commit: a1f4895fc81f3afb69bc59c34743e0f2e8119302. M2 evidence: [semantic mapping and paired results](examples/behavior-results/phase2-m2.md). M3 investigation cannot mutate formal recovery behavior.
