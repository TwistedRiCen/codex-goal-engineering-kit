---
name: goal-driven-engineering
description: Plan, execute, and resume product goals or substantial feature iterations with repository-backed decisions and acceptance evidence in PLAN.md. Use to clarify an incomplete product idea, and for cross-session feature work, new systems, core domain or architecture changes, and system acceptance. Do not use for isolated fixes, small refactors, routine code explanations, or one-off reviews unless explicitly requested.
---

# Goal-Driven Engineering

Turn the requested outcome into verified software. Apply repository instructions for engineering behavior, this Skill for workflow, PLAN.md for durable state, and the current request for scope and authority. Do not duplicate global policy or treat code volume, commits, chat history, or cleared TODOs as acceptance.

## Start from what the user knows

A sentence about a problem is enough to begin. When the user has an incomplete idea, asks for guidance, or supplies materials to interpret, read [guided-intake.md](references/guided-intake.md). Read existing evidence first, ask one useful main question at a time, and progressively draft the goal. Do not require a filled template, a fixed question count, or a confidence percentage. Complete inputs and clear local tasks skip unnecessary interviewing.

This is an entry into GOAL DEFINITION/DISCOVERY, not another task mode or gate. Respect discussion-only and no-file-change requests before any PLAN initialization rule. Otherwise initialize the selected mode's PLAN early with known facts and explicit unknowns; the agent maintains it. Acknowledging a draft does not approve unresolved business semantics or authorize implementation by itself; existing explicit authorization still applies.

## Select the least sufficient workflow

Inspect the request, relevant repository evidence, and existing PLAN. Select by uncertainty, impact, and recoverability, not line count. Honor explicit scope and stop points.

| Task Mode | When | Required work |
| --- | --- | --- |
| DIRECT | Isolated fix or small local change with understood behavior and no material domain, money, ownership, authorization, migration, or public-contract decision | Understand, change, run relevant verification, report. No new PLAN, lifecycle gates, or journal. |
| STANDARD | Default for a bounded feature iteration within verified architecture that benefits from planning or cross-session state | Scope and acceptance, compact PLAN, coherent implementation batches, verification, and review when risk warrants. |
| FULL | New system, unresolved core model/workflow, material architecture/security/compatibility change, or explicit complete product lifecycle | Read [full-lifecycle.md](references/full-lifecycle.md); establish or reuse gates, vertical milestones, system verification, and final independent review. |

If core semantics are unclear, do targeted discovery before choosing a direction. Escalate affected work to FULL when it could overturn a core decision; a one-line permission change can qualify. Do not expand a bounded request into an entire product build.

Record Task Mode and its reason in PLAN for STANDARD/FULL. An existing PLAN without Task Mode retains FULL semantics. Do not rewrite legacy plans or silently downgrade active work. After a completed scope, a newly authorized bounded iteration may use STANDARD while retaining historical decisions and acceptance evidence.

## Choose recovery before changing files

- If .goal/execution-state.md exists, read [execution-continuity.md](references/execution-continuity.md) and reconcile it before any mutation, mode change, or normal work. This applies even when the request looks DIRECT or STANDARD. Never discard a journal to simplify recovery. Reconcile unknown or conflicting mode/context from repository evidence before mutation; never guess a less strict default.
- FULL execution, any /goal execution, and explicitly requested strict recovery use that reference before Writer mutation. An active /goal or explicitly requested strict execution remains strict across sessions; record /goal or strict execution context in PLAN when starting it and retain it through the authorized scope. A legacy PLAN without Task Mode also retains strict continuity.
- DIRECT and ordinary STANDARD work do not create a journal or compute execution fingerprints. Preserve existing edits, inspect the affected diff, and verify current content before recording completion. Never retry an external write whose outcome is unknown.

An atomic execution unit in strict mode is one coherent verifiable batch, including ordinary repair and revalidation; it is not each edit or tool call. The strict six states, five recovery actions, clean Allowed Paths, conflict checks, fingerprints, and external-uncertainty stops remain defined only in the reference.

## Keep STANDARD state compact

Create root PLAN.md before substantial implementation when absent. Use an accessible kit template, or create this equivalent structure without requiring access to the Kit:

- **Plan Metadata:** Task Mode and reason, Current Phase, execution context (ordinary, strict, or /goal), date, and last verified baseline.
- **Project Goal / Scope:** observable outcome, included work, constraints, and non-goals.
- **Acceptance Criteria:** ID, observable result, verification method, OPEN/VERIFIED status, and evidence with code baseline.
- **Current Work:** current bounded batch or milestone, its status, and next unmet criterion. This is planned intent, never proof that implementation happened.
- **Decisions and Blockers:** relevant confirmed facts and sources, labeled reversible assumptions, frozen decisions and authority, material pending decisions, and blockers. Omit empty tables.
- **Repository and Verification State:** relevant branch/diff expectations, reproducible verification and review evidence, and evidence invalidated by subsequent changes.

Keep one authoritative acceptance ledger. Store long test output or historical detail in repository evidence files and link from PLAN; preserve accepted criteria, decision IDs, and evidence when moving detail. Avoid duplicating results or writing activity logs. Record uncertain work as open or blocked, never verified. Transient mutation stages and speculative completion do not belong in PLAN.

STANDARD uses existing phases as applicable: GOAL DEFINITION, DISCOVERY when needed, EXECUTION, MILESTONE ACCEPTANCE, and PROJECT COMPLETE. It need not visit unrelated phases. Completion covers only the recorded scope. FULL phases and extended PLAN sections are defined in the full-lifecycle reference.

Use consistent statuses: acceptance OPEN/VERIFIED; work or milestones NOT STARTED/IN PROGRESS/BLOCKED/ACCEPTED; applicable gates/reviews NOT READY/PASSED/FAILED; material changes PROPOSED/APPROVED/REJECTED/APPLIED.

## Reuse decisions and gate evidence

Inspect existing code, contracts, tests, and accepted decisions before designing. Reuse applicable architecture and discovery evidence after checking scope, assumptions, and current repository reality. Record the reference and why it still applies; do not rerun whole phases or seek the same authorization again.

Reopen only decisions affected by new evidence. Separate confirmed facts, reversible design assumptions, and pending material choices. Group related human decisions and prepare a reviewable recommendation before asking. Ordinary reversible engineering details proceed autonomously within the authorized scope.

| Change class | Action in STANDARD or FULL |
| --- | --- |
| IMPLEMENTATION DETAIL | Continue within approved criteria and frozen decisions. |
| LOCAL DESIGN CHANGE | Continue when reversible; record only durable decisions or changes to acceptance evidence. |
| ARCHITECTURE CHANGE | Record proposal and downstream impact, reopen affected decisions, obtain required authority, and use FULL for the affected architecture gate before implementation. |
| PRODUCT SCOPE CHANGE | Record PROPOSED goal/scope/milestone/acceptance updates. Do not replace canonical fields until APPROVED by the authorized owner. Select the workflow for the approved scope. |

Analyze relevant domain semantics, data, interfaces, security, compatibility, milestones, and tests. Preserve frozen decision ID, rationale, constraints, deciding authority/evidence, date, and reopen conditions. After approval, apply canonical updates, freeze the decision, and invalidate only evidence that no longer proves revised behavior. Rejected proposals leave canonical fields unchanged.

## Implement, verify, and review proportionately

Work from the first unmet criterion. Deliver a coherent business capability through affected layers. Repair ordinary failures within scope and run required checks plus tests justified by changed behavior and regression risk.

Reuse verification only when relevant code, dependencies, configuration, and environment still match its evidence. New changes or unresolved concerns justify affected revalidation; unchanged passing evidence does not justify repeating the same suite. System integration and required repository checks still apply.

Use an independent read-only reviewer for material authorization, money, core state/invariant, public interface, migration, or security changes, significant milestones, and FULL final acceptance. Simple changes need no automatic subagent. Delegate only a named independent evidence gap or useful review; converge evidence before one writer changes related files.

Give reviewers scope, baseline/diff, criteria, and evidence without an intended verdict. After repairs, rerun affected checks and review the repair plus its impact. Reuse applicable review evidence; one review can satisfy milestone and final review if it covers the same baseline and all system criteria. Final system coverage must still be checked. Record reviewer, baseline, coverage, findings, and disposition once; reference that record elsewhere.

STANDARD completion requires all scoped criteria verified, required checks passed, and material review findings resolved or explicitly accepted by the authorized human. Report limitations; never infer end-to-end acceptance from component tests alone.

## Resume from repository evidence

Read applicable AGENTS.md, PLAN, an optional journal, Git branch/HEAD/status/diff, and relevant verification evidence. Resolve strict continuity first when required above. Repository evidence wins over stale PLAN; preserve unexplained edits and correct durable state only from verified evidence.

For STANDARD without strict continuity, establish scope, current batch, open criteria, frozen decisions, and ownership of the current diff. Reverify affected unfinished work before promoting it. Continue if state and authority are clear; pause affected work for ambiguous ownership/state, an unknown external write result, a material human decision, unavailable required dependency, or unverifiable acceptance. Independent unaffected work may proceed. Never reset or overwrite pre-existing changes.

Do not rerun completed discovery because the conversation changed. Read supporting files only for named evidence gaps, and keep the recovery readout concise.

## Start long-running execution only when ready

Use interactive work to resolve material uncertainty. Start /goal only on explicit request, with PLAN matching repository reality, settled scope and decisions, dependency-ready work, observable criteria, and available verification. FULL requires passed Discovery and Architecture gate records with evidence and required authority; STANDARD reuses verified architecture and scoped acceptance. Record /goal execution context and apply strict continuity even for STANDARD. It never broadens permissions or scope.

Keep the objective short and refer to this Skill and PLAN. Continue ordinary repairs and authorized work; stop for a required material decision, destructive/irreversible action needing authority, unavailable dependency, or unverifiable acceptance. Do not add recurring tasks or automatic wake-up behavior.
