# Project Plan

> Compact STANDARD state. Keep verified facts, decisions, acceptance evidence, and planned next work; never record speculative completion or mutation stages as accepted progress. Use [PLAN.full.md](PLAN.full.md) for FULL projects. Retain legacy decisions and ledgers instead of rewriting them.

## Plan Metadata

- Plan Version: 2
- Task Mode: STANDARD
- Mode reason: bounded iteration within verified architecture
- Current Phase: GOAL DEFINITION
- Execution context: ordinary (use strict for explicitly requested strict execution, or /goal; both retain strict continuity across sessions)
- Last Updated: YYYY-MM-DD
- Last Verified Commit: not established

## Project Goal / Scope

- Observable outcome:
- In scope:
- Constraints and compatibility:
- Non-goals:

## Acceptance Criteria

| ID | Observable result | Verification method | Status (OPEN/VERIFIED) | Evidence and baseline |
| --- | --- | --- | --- | --- |
| AC-01 | | | OPEN | |

## Current Work

- Current batch / milestone:
- Status: NOT STARTED
- Next unmet criterion:

Planned work is not evidence of execution. Work statuses: NOT STARTED, IN PROGRESS, BLOCKED, ACCEPTED.

## Decisions and Blockers

Record only relevant items; omit empty tables.

- Confirmed facts and sources:
- Reversible assumptions and validation conditions:
- Existing architecture/gate evidence reused and why applicable:
- Frozen decisions: ID, decision, rationale/constraints, authority/evidence, date, reopen conditions.
- Material pending decisions / blockers:

Material changes use PROPOSED, APPROVED, REJECTED, APPLIED. Unapproved changes cannot replace canonical scope or criteria. Applicable gates/reviews use NOT READY, PASSED, FAILED.

## Repository and Verification State

- Branch and expected diff / preserved changes:
- Relevant verification commands:
- Latest verification: result, code baseline, relevant environment, evidence link.
- Independent review when required: reviewer, baseline, coverage, findings/disposition.
- Evidence invalidated by later changes: none

Keep one acceptance ledger; link long logs and historical detail while preserving decision IDs and accepted evidence. STANDARD may use GOAL DEFINITION, DISCOVERY when needed, EXECUTION, MILESTONE ACCEPTANCE, PROJECT COMPLETE. Finish only the recorded scope.

Volatile or unverified execution state does not belong in PLAN. Strict execution uses .goal/execution-state.md only while a batch is active, with journal absence representing logical IDLE. An existing journal must be reconciled under the strict protocol before mode changes. A legacy PLAN without Task Mode retains FULL semantics.
