# Project Plan

## Plan Metadata

- Plan Version: 2
- Task Mode: STANDARD
- Mode reason: user-approved bounded reliability and usability improvements after 8b5f025.
- Execution context: ordinary
- Current Phase: PROJECT COMPLETE
- Last Verified Commit: 8b5f025 (base); the delivery commit containing this PLAN records the verified change set. Resolve it with git log -1 -- PLAN.md.

## Project Goal / Scope

Maintain a reusable goal-driven workflow with guided intake, proportionate execution, verifiable recovery, model-neutral roles, and safe optional Codex installation.
Current scope: schema 2 PLAN receipt boundary, real Git recovery fixtures, current-state repair, shared installation path checks, LF/CRLF validation, read-only installation diagnosis, and simpler onboarding.
No model router, generic recovery runtime, background jobs, other-platform installers, or remote changes.

## Decisions and Blockers

- FD-01: Main task owns evidence convergence and final acceptance; retain bounded roles and one writer per overlapping scope.
- FD-02 (superseded): Fixed Luna/Terra assignments are historical only. Effective decision: default profiles omit model/effort; optional host configuration supplies them, with unchanged role permissions. User-approved, implemented in 8b5f025.
- FD-03: Delegation is proportional to evidence needs, not mandatory concurrency or extra coordinators.
- FD-04 (revised by current user approval): Preserve six states, five actions, and conflict-first recovery. New schema 2 units protect PLAN independently and allow only an exact verified receipt; active schema 1 units retain their rules.
- Historical decisions, criteria, installation and review evidence: [archived PLAN](docs/history/PLAN-through-8b5f025.md). Those records describe their baseline, not current model requirements.
- Pending decisions: none for the approved scope.

## Acceptance Criteria

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
- Next unmet criterion: none in the approved scope.
- Historical completed M1/M2 and later maintenance are retained in the archive; no old milestone is current.

## Repository and Verification State

- Base: 8b5f025; preserve unrelated edits.
- Checks: Skill/profile validators, continuity and real Git tests, both installers, encoding and diagnostic tests, basic Skill validation, final diff review.
- Current test/review evidence: all scoped checks passed on PowerShell 7 and Windows PowerShell 5.1; source and installed basic Skill validation passed. Recovery and installation were independently reviewed, with findings repaired and affected checks rerun.
- Installed Skill: C:/Users/98053/.agents/skills/goal-driven-engineering (physical directory).
- Previous Skill backup: C:/Users/98053/.agents/skill-backups/goal-driven-engineering.backup-20260910-004718-a4f8011f.
- Evidence boundaries: behavioral cases are static walkthroughs, not repeated model-runtime evaluations; Git recovery fixtures exercise the receipt helper and decision function, not a generic journal parser. Legacy journals retain legacy checks. Installation readback verifies disk contents, not running-app reload or resistance to malicious concurrent path substitution.
- Evidence invalidated: old fixed-model assertions and PLAN-finalize synthetic-only coverage cannot establish current acceptance.
