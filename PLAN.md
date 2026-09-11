# Project Plan

## Plan Metadata

- Plan Version: 2
- Task Mode: STANDARD
- Mode reason: user-approved bounded completion, evidence, and behavior-evaluation improvements after c38eaae.
- Execution context: ordinary
- Current Phase: PROJECT COMPLETE
- Last Verified Commit: c38eaae (current iteration base); the delivery commit containing this PLAN records the verified change set. Resolve it with git log -1 -- PLAN.md.

## Project Goal / Scope

Maintain a reusable goal-driven workflow with guided intake, proportionate execution, verifiable recovery, model-neutral roles, and safe optional Codex installation.
Current scope: fixed behavior fixtures and baseline/candidate evaluation, shared completion wording, and an optional evidence/delivery reference. Preserve entry prompts, mode boundaries, PLAN templates, and strict recovery. Earlier reliability acceptance below remains historical evidence for its recorded baseline.
No model router, generic recovery runtime, background jobs, other-platform installers, or remote changes.

## Decisions and Blockers

- FD-01: Main task owns evidence convergence and final acceptance; retain bounded roles and one writer per overlapping scope.
- FD-02 (superseded): Fixed Luna/Terra assignments are historical only. Effective decision: default profiles omit model/effort; optional host configuration supplies them, with unchanged role permissions. User-approved, implemented in 8b5f025.
- FD-03: Delegation is proportional to evidence needs, not mandatory concurrency or extra coordinators.
- FD-04 (approved in the earlier reliability iteration): Preserve six states, five actions, and conflict-first recovery. New schema 2 units protect PLAN independently and allow only an exact verified receipt; active schema 1 units retain their rules.
- Historical decisions, criteria, installation and review evidence: [archived PLAN](docs/history/PLAN-through-8b5f025.md). Those records describe their baseline, not current model requirements.
- Pending decisions: none for the approved scope.

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

- Status: ACCEPTED
- Next unmet criterion: none in the approved implementation scope.
- Historical completed M1/M2 and later maintenance are retained in the archive; no old milestone is current.

## Historical Installation and Verification State

- Base: 8b5f025; preserve unrelated edits.
- Checks: Skill/profile validators, continuity and real Git tests, both installers, encoding and diagnostic tests, basic Skill validation, final diff review.
- Prior reliability test/review evidence: all scoped checks passed on PowerShell 7 and Windows PowerShell 5.1; source and installed basic Skill validation passed. Recovery and installation were independently reviewed, with findings repaired and affected checks rerun.
- Installed Skill: C:/Users/98053/.agents/skills/goal-driven-engineering (physical directory).
- Previous Skill backup: C:/Users/98053/.agents/skill-backups/goal-driven-engineering.backup-20260910-004718-a4f8011f.
- Historical evidence boundaries: the prior six behavioral cases were static walkthroughs; Git recovery fixtures exercise the receipt helper and decision function, not a generic journal parser. Legacy journals retain legacy checks. Installation readback verifies disk contents, not running-app reload or resistance to malicious concurrent path substitution.
- Evidence invalidated: old fixed-model assertions and PLAN-finalize synthetic-only coverage cannot establish current acceptance.

## Current Iteration Acceptance

| ID | Observable result | Verification | Status | Evidence |
| --- | --- | --- | --- | --- |
| BEH-01 | Fixed DIRECT, evidence, and delivery cases distinguish missed review, over-processing, invalid reuse, and unsafe retries. | Deterministic fixture tests and independent baseline/candidate decision evaluations. | VERIFIED | Baseline/candidate each passed 12 fixed decision cases with real read-only probes; no repeated-runtime efficacy claim. See [evaluation report](examples/behavior-results/2026-09-11-completion-evidence.md). |
| BEH-02 | Completion and evidence wording adds no DIRECT artifacts and changes no recovery semantics. | Scope/diff checks, Skill validation, independent review. | VERIFIED | Independent final_review completed implementation and scorer-repair review on 2026-09-11; no material findings remain. Protected protocol diff and final Skill/link checks passed. |
| BEH-03 | Supporting reference ships with the Skill; installation and contract checks remain valid. | Non-destructive installer and relevant regression tests. | VERIFIED | Both runtimes passed Skill/profile validation, isolated installers, encoding and receipt/continuity tests on 2026-09-10. Source basic Skill validator passed. |
## Current Repository and Verification State

- Base: c38eaae; all current edits belong to the approved iteration. No active journal; STANDARD ordinary execution.
- Source/fixture hashes still match the evaluated candidate after the 2026-09-11 interruption recovery.
- Current evaluation and limits: [completion/evidence report](examples/behavior-results/2026-09-11-completion-evidence.md).
- Independent implementation review: final_review, baseline c38eaae plus this complete change set; both scorer findings resolved and repair/impact reviewed. Independently reran 25 fixture tests and diff check. Decision evaluations did not substitute for implementation review.
- The historical installed-copy evidence above does not establish synchronization with this candidate. No real installation is authorized by this repository-only iteration.- Final validation on 2026-09-11: 25 fixture/scorer tests, both recorded decision groups (12/12 each under the same repaired rubric), Skill lifecycle/basic validation, changed Markdown links and protected-protocol diff passed. Earlier two-runtime installer/encoding/recovery evidence remains applicable; those files and evaluated Skill/inputs are unchanged.
- Delivery: one local commit; identify this iteration with git log -1 -- examples/behavior-results/2026-09-11-completion-evidence.md. No push or real user installation performed.