# Project Plan

> Persistent source of truth for durable project state. Initialize this file when the project starts. Keep evidence and decisions, not chat transcripts or activity logs. Volatile or unverified execution state does not belong in PLAN; keep it in `.goal/execution-state.md` only while an atomic unit is active, with journal absence representing `IDLE`.

The agent fills this progressively from conversation and evidence; users need not complete the template. Keep unknowns explicit. For discussion-only or no-file-change requests, keep the draft in the conversation instead.

## Plan Metadata

- Plan Version: 2
- Task Mode: FULL
- Mode reason: new system or material domain/architecture change
- Execution context: ordinary (FULL uses strict continuity)
- Last Updated: YYYY-MM-DD
- Current Phase: GOAL DEFINITION
- Last Verified Commit: not established

Allowed phases: `GOAL DEFINITION`, `DISCOVERY`, `DISCOVERY GATE`, `ARCHITECTURE`, `ARCHITECTURE GATE`, `MILESTONE PLANNING`, `EXECUTION`, `MILESTONE ACCEPTANCE`, `SYSTEM VERIFICATION`, `FINAL ADVERSARIAL REVIEW`, `PROJECT COMPLETE`.

## Project Goal

<!-- State the observable business or product outcome. -->

## Scope

- In scope:

## Constraints

- Hard product, legal, security, schedule, technical, operational, or compatibility constraints:

## Non-Goals

- Out of scope:

## System Acceptance Criteria

| ID | Observable criterion | Verification method | Status (`OPEN`/`VERIFIED`) | Evidence |
| --- | --- | --- | --- | --- |
| SA-01 |  |  | OPEN |  |

## Confirmed Facts

| ID | Durable fact | Evidence/source |
| --- | --- | --- |
| F-01 |  |  |

## Design Assumptions

| ID | Reversible assumption | Why needed | Validation or expiry condition |
| --- | --- | --- | --- |
| A-01 |  |  |  |

## Pending Decisions

| ID | Decision needed | Material impact | Options/recommendation | Owner | Needed by |
| --- | --- | --- | --- | --- | --- |
| PD-01 |  |  |  | Human/Codex | DISCOVERY GATE |

## Frozen Decisions

| ID | Class | Decision | Rationale/constraints | Authority and evidence | Frozen on | Reopen when |
| --- | --- | --- | --- | --- | --- | --- |
| FD-01 | Product/Architecture/Local |  |  |  | YYYY-MM-DD |  |

## Gate and Review Record

Use `NOT READY`, `PASSED`, or `FAILED`. A phase name alone is not proof that a gate passed. Record the repository baseline and required human authority where material semantics are involved.

| Gate or review | Status | Criteria and evidence | Authority/reviewer | Date and repository baseline |
| --- | --- | --- | --- | --- |
| DISCOVERY GATE | NOT READY |  |  |  |
| ARCHITECTURE GATE | NOT READY |  |  |  |
| MILESTONE ACCEPTANCE: M1 | NOT READY |  |  |  |
| SYSTEM VERIFICATION | NOT READY |  |  |  |
| FINAL ADVERSARIAL REVIEW | NOT READY |  |  |  |

## Architecture Summary

### Domain and ownership

<!-- Core concepts, identities, data ownership, and bounded responsibilities. -->

### Workflow, state, and invariants

<!-- Core state transitions, invariants, consistency, and failure behavior. -->

### Security, money, and compatibility

<!-- Authorization/security boundaries, money semantics, migrations, and compatibility contracts where relevant. -->

## Milestones

Use `NOT STARTED`, `IN PROGRESS`, `BLOCKED`, or `ACCEPTED`. Define vertical business capabilities, not technical layers.

| ID | Business capability | Depends on | Status | Acceptance summary | System criteria |
| --- | --- | --- | --- | --- | --- |
| M1 |  | none | NOT STARTED |  | SA-01 |

## Current Milestone

- ID: not selected
- Business outcome:
- Included scope:
- Excluded scope:
- Dependencies satisfied: no

## Milestone Acceptance Criteria

Keep one subsection and criterion table per milestone. Never delete accepted criteria or evidence when `Current Milestone` changes; later system verification must be able to reconstruct what each milestone proved.

### M1

| ID | Observable criterion | Verification method | Status (`OPEN`/`VERIFIED`) | Evidence |
| --- | --- | --- | --- | --- |
| M1-AC-01 |  |  | OPEN |  |

## Known Risks

| ID | Risk | Likelihood/impact | Mitigation or monitoring | Owner |
| --- | --- | --- | --- | --- |
| R-01 |  |  |  |  |

## Blockers

| ID | Blocker | Affected criteria/milestone | Required resolution | Owner |
| --- | --- | --- | --- | --- |

## Verified Progress

Record only durable accepted outcomes or evidence changes. Mark superseded evidence explicitly; preserve still-valid criteria and evidence. Link detailed logs instead of duplicating them.

| Date | Accepted outcome or criterion | Verification evidence | Commit/baseline |
| --- | --- | --- | --- |

## Repository and Verification State

- Expected branch:
- Working tree expectation:
- Relevant validation commands:
- Latest independent review:
- Evidence invalidated by later changes: none

## Active Change Control

Unapproved proposals never replace canonical Goal, Scope, Non-Goals, Architecture, Milestones, or Acceptance Criteria. Use `PROPOSED`, `APPROVED`, `REJECTED`, or `APPLIED`. After applying an approved material decision, preserve it in Frozen Decisions and remove the transient item from this table.

| ID | Classification | Status | Requested/proposed change | Impact and proposed contract updates | Decision authority/evidence | Required gate |
| --- | --- | --- | --- | --- | --- | --- |
