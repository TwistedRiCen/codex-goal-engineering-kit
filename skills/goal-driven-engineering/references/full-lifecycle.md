# Full Product Lifecycle

Read only for FULL mode. Shared decision, verification, and review rules in SKILL.md also apply.

## Establish or recover state first

For a new FULL project when project-file work is authorized (discussion-only requests remain in the conversation):

1. Read applicable `AGENTS.md` files and inspect available product and repository evidence.
2. Create repository-root `PLAN.md` immediately, before substantial discovery or implementation. Copy an accessible kit `templates/PLAN.full.md` when supplied; otherwise create the equivalent state directly from this section rather than delaying initialization.
3. Include Project Goal, Current Phase, Scope, Constraints, Non-Goals, System Acceptance Criteria, Confirmed Facts, Design Assumptions, Pending Decisions, Frozen Decisions, Gate and Review Record, Architecture Summary, Milestones, Current Milestone, Milestone Acceptance Criteria, Known Risks, Blockers, Verified Progress, Repository and Verification State, and Active Change Control.
4. Record the initial goal, scope, non-goals, constraints, system acceptance criteria, facts, assumptions, and pending decisions.
5. Set `Current Phase` to `GOAL DEFINITION`, then advance only on gate evidence.

Use exact status vocabularies so sessions interoperate: acceptance criteria `OPEN` or `VERIFIED`; milestones `NOT STARTED`, `IN PROGRESS`, `BLOCKED`, or `ACCEPTED`; gate/review records `NOT READY`, `PASSED`, or `FAILED`; active material changes `PROPOSED`, `APPROVED`, `REJECTED`, or `APPLIED`.

For an existing project, follow the recovery routing in SKILL.md before choosing work.

## Follow the lifecycle

Use these phase names exactly:

```text
GOAL DEFINITION
DISCOVERY
DISCOVERY GATE
ARCHITECTURE
ARCHITECTURE GATE
MILESTONE PLANNING
EXECUTION
MILESTONE ACCEPTANCE
SYSTEM VERIFICATION
FINAL ADVERSARIAL REVIEW
PROJECT COMPLETE
```

### 1. Define the goal

- Describe an observable product or business outcome, not a technical task list.
- Define scope, non-goals, constraints, and measurable system acceptance criteria.
- Separate confirmed facts from reversible design assumptions and unresolved decisions.
- Keep a vague goal in normal interactive work; do not start a long-running execution goal yet.

Advance when the outcome and completion evidence are clear enough to direct discovery.

### 2. Perform discovery

- Inspect relevant requirements, source, tests, schemas, interfaces, prototypes, configuration, and operational evidence.
- Trace actors, business workflows, terminology, invariants, external systems, security/compliance constraints, and compatibility obligations.
- Treat prototypes as behavioral evidence, not authoritative specifications.
- Record durable findings in `Confirmed Facts`; label unsupported interpretations as `Design Assumptions`.
- Put material unresolved semantics in `Pending Decisions`, with impact and decision owner.

At `DISCOVERY GATE`, verify that the core workflow, actors, system boundary, constraints, risks, and material unknowns are visible. Continue discovery if missing evidence would make the architecture speculative. Group interdependent human decisions instead of asking scattered questions. Record the gate result, evidence, authority, date, and repository baseline in `PLAN.md` before advancing. Reuse existing evidence when its scope and assumptions still hold; do not repeat discovery or request the same decision again.

### 3. Establish architecture

- Define the core domain model, identities, ownership boundaries, state transitions, invariants, and system boundaries.
- Address data and money semantics, authorization, security boundaries, consistency, failure recovery, concurrency, compatibility, migration, and extensibility where relevant.
- Distinguish design-time, persistence, and runtime models when their responsibilities differ.
- Compare alternatives only when they materially affect the data model, reliability, security, compatibility, or long-term cost.
- Map material product behavior to a domain concept, state, permission, rule, event, or interface.

At `ARCHITECTURE GATE`, require an internally coherent direction and explicit disposition of every material pending decision. Move accepted decisions to `Frozen Decisions` with class, rationale, constraints, deciding authority/evidence, date, and reopen conditions. Record the gate result and evidence before advancing. Existing approved architecture can satisfy the gate after checking current scope and repository evidence; reopen only decisions affected by new evidence. Do not begin large-scale production implementation while a pending decision can overturn the core model or security boundary.

### 4. Plan vertical milestones

- Split work by observable business capability, not by database/entity/service/controller/frontend layers.
- Give each milestone dependencies, scope, acceptance criteria, verification method, and mapped system acceptance criteria.
- Keep criteria for every milestone in the `Milestone Acceptance Criteria` ledger. Never discard accepted criteria or evidence when selecting the next current milestone.
- Order milestones so each accepted slice reduces product risk and leaves the repository in a coherent state.
- Select one `Current Milestone`; keep later milestones concise until they approach execution.

Advance to `EXECUTION` only when architecture is stable enough, milestone dependencies are credible, and the current milestone has observable acceptance criteria.

### 5. Execute and accept milestones

- Work from the first unmet acceptance criterion of the current milestone.
- Make the smallest coherent implementation change, then run proportionate validation.
- Repair ordinary implementation and test failures autonomously when the repair stays within frozen decisions.
- Update `PLAN.md` only with verified progress, durable facts, decisions, blockers, and current state.
- Use the risk-based independent review rules in SKILL.md for significant milestones. Resolve valid findings and rerun affected verification.

At `MILESTONE ACCEPTANCE`, require all milestone criteria to be observed, relevant tests to pass, evidence to be recorded, and critical review findings to be closed. Record the acceptance result and baseline, keep its criterion ledger intact, then mark the milestone `ACCEPTED` and select the next dependency-ready milestone.

### 6. Verify the system

- Re-run the original end-to-end business workflows and every system acceptance criterion.
- Verify cross-milestone integration, authorization, failure behavior, compatibility/migration obligations, and relevant non-functional constraints.
- Test the built system rather than inferring success from component tests or completed tasks.
- Record evidence and unresolved risks in `PLAN.md`.

### 7. Run final adversarial review

Reuse applicable independent review evidence on the same baseline; combine milestone and final review when one review covers both the change and complete system criteria. Review remaining integration and coverage gaps. Give a read-only reviewer the goal, `PLAN.md`, current repository, diff/history, and verification evidence. Ask it to seek missing scope, broken invariants, unverified claims, security or compatibility regressions, and contract drift. Do not leak the intended verdict. Record reviewer identity, reviewed baseline, outcome, and finding/repair evidence in the gate and review record.

Repair valid findings, rerun affected system verification, and repeat review when a repair materially changes behavior.

Set `PROJECT COMPLETE` only when all system acceptance criteria are verified, no unresolved blocker contradicts the goal, final review findings are resolved or explicitly accepted by the authorized human, and repository state is recorded. Code written, commits made, or TODOs cleared are never sufficient by themselves.
