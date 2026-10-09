# STANDARD persistent state

Read this reference when creating or updating STANDARD PLAN. Create root PLAN.md before substantial implementation when absent. Use an accessible kit template, or create this equivalent structure without requiring access to the Kit:

- **Plan Metadata:** Task Mode and reason, Current Phase, execution context (ordinary, strict, or /goal), date, and last verified baseline.
- **Project Goal / Scope:** observable outcome, included work, constraints, and non-goals.
- **Acceptance Criteria:** ID, observable result, verification method, OPEN/VERIFIED status, and evidence with code baseline.
- **Current Work:** current bounded batch or milestone, its status, and next unmet criterion. This is planned intent, never proof that implementation happened.
- **Decisions and Blockers:** relevant confirmed facts and sources, labeled reversible assumptions, frozen decisions and authority, material pending decisions, and blockers. Omit empty tables.
- **Repository and Verification State:** relevant branch/diff expectations, reproducible verification and review evidence, and evidence invalidated by subsequent changes.

Keep one authoritative acceptance ledger. Store long test output or historical detail in repository evidence files and link from PLAN; preserve accepted criteria, decision IDs, and evidence when moving detail. Avoid duplicating results or writing activity logs. Record uncertain work as open or blocked, never verified. Transient mutation stages and speculative completion do not belong in PLAN.

Mode selection, statuses, legacy interpretation, change control, completion and recovery remain governed by [SKILL.md](../SKILL.md) and its conditionally loaded references. This state format does not authorize work or replace the strict journal.
