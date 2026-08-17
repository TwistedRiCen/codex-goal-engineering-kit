# Classify and Control a Change

```text
CHANGE: <new or changed requirement>
REASON: <business reason or new evidence>
CONSTRAINTS: <timing, compatibility, migration, security, or other boundaries>

Use $goal-driven-engineering and inspect PLAN.md plus affected repository evidence. Classify this as exactly one of IMPLEMENTATION DETAIL, LOCAL DESIGN CHANGE, ARCHITECTURE CHANGE, or PRODUCT SCOPE CHANGE. Explain evidence and downstream impact on domain semantics, data, interfaces, security, compatibility, milestones, tests, and existing acceptance evidence. Continue autonomously only for a reversible implementation/local-design change consistent with Frozen Decisions. For an Architecture change, record a proposal, reopen affected decisions, perform impact analysis, and obtain required adjudication before applying it and returning to ARCHITECTURE GATE. For a Product Scope change, record it as PROPOSED and show proposed updates to Goal, Scope, Non-Goals, Milestones, and Acceptance Criteria; do not change those canonical fields until the authorized product decision is APPROVED. After approval, apply the contract updates, freeze the decision with authority evidence, preserve still-valid verified progress, and explicitly invalidate evidence that no longer proves revised criteria. If rejected, leave canonical fields unchanged.
```
