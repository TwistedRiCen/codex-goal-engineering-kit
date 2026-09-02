---
name: goal-driven-engineering
description: Drive a product-level software goal through discovery, architecture, vertical milestone planning, implementation, verification, independent review, repair, and system acceptance, with PLAN.md as the cross-session source of truth. Use when Codex starts a new system from a high-level business goal, performs complex product or repository discovery, establishes a domain model or architecture, breaks a product into verifiable milestones, resumes a long-running project from PLAN.md, or performs system-level acceptance. Do not use for single-file edits, simple bug fixes, small refactors, routine code explanation, one-off code reviews, or other local tasks that do not require a project lifecycle.
---

# Goal-Driven Engineering

Turn a business outcome into verified software without treating chat history, code volume, or cleared TODOs as proof of completion.

## Keep the four responsibility layers separate

1. Apply global and repository `AGENTS.md` instructions as durable engineering behavior.
2. Apply this skill as the project lifecycle protocol.
3. Maintain the repository-root `PLAN.md` as persistent project state.
4. Treat the current prompt or `/goal` objective as the immediate direction.

Follow instruction precedence. Do not copy general coding, security, compatibility, validation, or Git rules from `AGENTS.md` into this skill or `PLAN.md`.

## Apply the operating principles

- **Goal first:** describe the observable outcome before technical work.
- **Facts before design:** establish product and repository evidence before broad design or implementation.
- **Architecture before implementation:** settle core models, ownership, states, money, authorization, and other irreversible semantics before large-scale production work.
- **Vertical milestones:** deliver verifiable business capabilities rather than horizontal technical layers.
- **Observable acceptance:** require evidence for every milestone and for the original system goal.
- **Human controls irreversible semantics:** reserve material product, domain, money, ownership, security, migration, and compatibility choices for the authorized human.
- **Evidence over completion theater:** never equate written code, commits, or cleared TODOs with accepted outcomes.

## Establish or recover state first

For a new project:

1. Read applicable `AGENTS.md` files and inspect available product and repository evidence.
2. Create repository-root `PLAN.md` immediately, before substantial discovery or implementation. Copy an accessible kit `templates/PLAN.md` when supplied; otherwise create the equivalent state directly from this section rather than delaying initialization.
3. Include Project Goal, Current Phase, Scope, Constraints, Non-Goals, System Acceptance Criteria, Confirmed Facts, Design Assumptions, Pending Decisions, Frozen Decisions, Gate and Review Record, Architecture Summary, Milestones, Current Milestone, Milestone Acceptance Criteria, Known Risks, Blockers, Verified Progress, Repository and Verification State, and Active Change Control.
4. Record the initial goal, scope, non-goals, constraints, system acceptance criteria, facts, assumptions, and pending decisions.
5. Set `Current Phase` to `GOAL DEFINITION`, then advance only on gate evidence.

Use exact status vocabularies so sessions interoperate: acceptance criteria `OPEN` or `VERIFIED`; milestones `NOT STARTED`, `IN PROGRESS`, `BLOCKED`, or `ACCEPTED`; gate/review records `NOT READY`, `PASSED`, or `FAILED`; active material changes `PROPOSED`, `APPROVED`, `REJECTED`, or `APPLIED`.

For an existing project, run the recovery protocol below before choosing work. Never rely on “continue yesterday” or chat memory.

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

At `DISCOVERY GATE`, verify that the core workflow, actors, system boundary, constraints, risks, and material unknowns are visible. Continue discovery if missing evidence would make the architecture speculative. Group interdependent human decisions instead of asking scattered questions. Record the gate result, evidence, authority, date, and repository baseline in `PLAN.md` before advancing.

### 3. Establish architecture

- Define the core domain model, identities, ownership boundaries, state transitions, invariants, and system boundaries.
- Address data and money semantics, authorization, security boundaries, consistency, failure recovery, concurrency, compatibility, migration, and extensibility where relevant.
- Distinguish design-time, persistence, and runtime models when their responsibilities differ.
- Compare alternatives only when they materially affect the data model, reliability, security, compatibility, or long-term cost.
- Map material product behavior to a domain concept, state, permission, rule, event, or interface.

At `ARCHITECTURE GATE`, require an internally coherent direction and explicit disposition of every material pending decision. Move accepted decisions to `Frozen Decisions` with class, rationale, constraints, deciding authority/evidence, date, and reopen conditions. Record the gate result and evidence before advancing. Do not begin large-scale production implementation while a pending decision can overturn the core model or security boundary.

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
- Use an independent reviewer for significant milestones. Resolve valid findings and rerun affected verification.

At `MILESTONE ACCEPTANCE`, require all milestone criteria to be observed, relevant tests to pass, evidence to be recorded, and critical review findings to be closed. Record the acceptance result and baseline, keep its criterion ledger intact, then mark the milestone `ACCEPTED` and select the next dependency-ready milestone.

### 6. Verify the system

- Re-run the original end-to-end business workflows and every system acceptance criterion.
- Verify cross-milestone integration, authorization, failure behavior, compatibility/migration obligations, and relevant non-functional constraints.
- Test the built system rather than inferring success from component tests or completed tasks.
- Record evidence and unresolved risks in `PLAN.md`.

### 7. Run final adversarial review

Give a read-only reviewer the goal, `PLAN.md`, current repository, diff/history, and verification evidence. Ask it to seek missing scope, broken invariants, unverified claims, security or compatibility regressions, and contract drift. Do not leak the intended verdict. Record reviewer identity, reviewed baseline, outcome, and finding/repair evidence in the gate and review record.

Repair valid findings, rerun affected system verification, and repeat review when a repair materially changes behavior.

Set `PROJECT COMPLETE` only when all system acceptance criteria are verified, no unresolved blocker contradicts the goal, final review findings are resolved or explicitly accepted by the authorized human, and repository state is recorded. Code written, commits made, or TODOs cleared are never sufficient by themselves.

## Control decisions

Request human adjudication before committing to:

- core domain or money semantics;
- data ownership or the security/authorization boundary;
- product scope;
- irreversible migration or destructive data handling;
- a major compatibility or public contract.

Make ordinary reversible engineering decisions autonomously. For each frozen decision, preserve its identifier, class, decision, rationale, constraints, deciding authority/evidence, date, and explicit reopen conditions. Do not redesign frozen architecture merely because a new session starts.

## Classify changes before absorbing them

| Change class | Required action |
| --- | --- |
| `IMPLEMENTATION DETAIL` | Continue autonomously; keep within accepted criteria and frozen decisions. |
| `LOCAL DESIGN CHANGE` | Continue autonomously when reversible; record it only if it is durable or affects acceptance evidence. |
| `ARCHITECTURE CHANGE` | Record a proposed change, reopen affected decisions, perform impact analysis, and obtain required adjudication before applying the design and passing `ARCHITECTURE GATE` again. |
| `PRODUCT SCOPE CHANGE` | Record it as `PROPOSED` and prepare proposed Goal, Scope, Non-Goals, Milestone, and Acceptance changes; do not change canonical fields until the authorized product decision is approved. |

Include downstream impact on data, interfaces, security, compatibility, tests, milestones, and already accepted behavior. After approval, apply the canonical updates, move the material decision to `Frozen Decisions`, and invalidate evidence that no longer proves a revised criterion. Preserve verified progress that remains valid. If rejected, leave canonical fields unchanged and record the disposition.

## Protect active execution units

`PLAN.md` remains the authority for durable facts, decisions, gates, verified progress, and acceptance. Volatile or unverified execution state belongs in repository-root `.goal/execution-state.md`, which exists only while one atomic execution unit is active. Journal absence is the conceptual `IDLE` state; never create or retain an `IDLE` journal. The journal cannot prove accepted progress and must not store chat history, quota information, or a derived next action.

Use only these execution states:

```text
IDLE
PREPARED
MUTATED
VERIFYING
VERIFIED
BLOCKED
```

Use only these recovery actions:

```text
CONTINUE
RETRY_SAFE_UNIT
VERIFY
FINALIZE
BLOCKED
```

An active journal contains only: Schema Version, State, Atomic Unit, Intent, Prepared HEAD, Protected Baseline Fingerprint, External Non-Idempotent Risk, Allowed Paths, Verification Commands, Pass Condition, Verified Mutation Fingerprint, Evidence, and Blocker Reason.

Apply write before risk for every atomic execution unit:

1. Define one bounded intent, literal repository-relative Allowed Paths, safe-to-repeat verification commands, and their pass condition.
2. Refuse to start when an Allowed Path already has a Git-visible change. Do not merge pre-existing work with a new Writer mutation.
3. Capture Prepared HEAD. Compute one deterministic SHA-256 Protected Baseline Fingerprint from the normalized, sorted Git-visible staged, unstaged, deleted, renamed, and untracked state outside Allowed Paths, excluding the journal itself. Store only the final digest.
4. Write a complete valid `PREPARED` journal before Writer mutation. A missing, partial, malformed, or unsupported journal must fail closed.
5. After the intended mutation exists, write `MUTATED`. A crash before this update is recovered from Git rather than chat history.
6. Write `VERIFYING` before each verification invocation. Verification used for automatic recovery must be safe to repeat.
7. On success, compute a deterministic Verified Mutation Fingerprint from Prepared HEAD plus the normalized, sorted final path identity, status, and effective worktree content for every mutation inside Allowed Paths. Record the fingerprint and compact reproducible evidence, then write `VERIFIED`.
8. `FINALIZE` only when the current mutation still matches the verified fingerprint. Write Atomic Unit, fingerprint, and evidence into durable PLAN state, read back the persisted PLAN record, then delete the journal. Existing repository Git policy applies after journal deletion; this protocol does not define commits.

For both fingerprints, hash an ordered sequence of length-prefixed UTF-8 records that includes fingerprint kind and entry count; Verified Mutation also includes Prepared HEAD. Length-prefix every normalized path-bearing entry before joining records. Never hash raw newline-joined entries, because Git paths may contain delimiters.

If a fresh session sees `External Non-Idempotent Risk: POSSIBLE` without matching durable PLAN evidence, return `BLOCKED`; never retry or build automatic reconciliation. If the protected baseline, Prepared HEAD, scope, or durable state conflicts, return `BLOCKED`. If a verified fingerprint changed only through a new mutation strictly inside Allowed Paths and PLAN is not finalized, return `VERIFY`; never promote stale evidence.

## Recover across sessions

Read and reconcile, in order:

1. applicable `AGENTS.md` files and repository instructions;
2. repository-root `PLAN.md`;
3. `.goal/execution-state.md` when it exists;
4. Git branch, HEAD, status, recent relevant history, and current diff;
5. relevant tests and the latest reproducible verification evidence.

Then establish this readout before acting:

```text
PROJECT GOAL
CURRENT PHASE
CURRENT MILESTONE
FROZEN DECISIONS
DONE MILESTONES
OPEN ACCEPTANCE CRITERIA
BLOCKERS
REPOSITORY STATE
EXECUTION STATE
SAFE NEXT ACTION
```

Derive exactly one safe action using this ordered decision table:

| Repository evidence | Action |
| --- | --- |
| Journal absent and PLAN/Git are consistent | `CONTINUE` |
| Journal absent but repository state is ambiguous | `BLOCKED` |
| Journal is malformed, unsupported, unexpectedly `IDLE`, or records dirty-at-prepare Allowed Paths | `BLOCKED` |
| PLAN/Git conflict, Prepared HEAD change, protected baseline change, out-of-scope mutation, or unknown external non-idempotent result | `BLOCKED` |
| PLAN already contains the same Atomic Unit, verified fingerprint, and evidence; the current mutation still matches | `FINALIZE` to complete journal cleanup |
| PLAN already finalized the unit but the current mutation does not match | `BLOCKED` |
| `PREPARED` with no Allowed Path mutation | `RETRY_SAFE_UNIT` |
| `PREPARED` with a bounded Allowed Path mutation | `VERIFY` |
| `MUTATED` or `VERIFYING` with the bounded mutation present | `VERIFY` |
| `MUTATED` or `VERIFYING` without the expected mutation | `BLOCKED` |
| `VERIFIED` with a matching current mutation fingerprint | `FINALIZE` |
| `VERIFIED` with a changed mutation strictly inside Allowed Paths and no durable finalize | `VERIFY` |
| `BLOCKED` or any unlisted/contradictory combination | `BLOCKED` |

Follow only the derived action before selecting more work. Do not infer from prior chat, fan out readers by default, guess unknown state, or treat journal state as acceptance evidence. If one named evidence gap prevents reconciliation, use at most one read-only reader; otherwise remain `BLOCKED`.

If `PLAN.md` conflicts with repository evidence, repository evidence wins. Correct PLAN only from verified evidence. Preserve unexplained changes and do not write overlapping files. A resumed session must not bypass a discovery, architecture, decision, or acceptance gate.

When the action is `CONTINUE`, continue from the first unmet criterion allowed by the current phase. Other actions complete or block the active unit before normal milestone work resumes.

## Orchestrate multiple agents conservatively

Use this project-level pattern when independent work genuinely benefits from parallelism:

```text
Many Readers -> Evidence Convergence -> One Writer -> Verification -> Independent Reviewer
```

Delegate repository exploration, domain investigation, test analysis, security analysis, compatibility analysis, and review as read-only tasks when useful. Converge conflicting evidence before design. Assign one writer for overlapping core files, and use separate worktrees for concurrent writers. Prefer native subagent capabilities; do not build an agent runtime for this workflow.

## Start `/goal` only when execution is ready

Use normal interactive sessions for discovery, architecture, decisions, and milestone planning. Start `/goal` only when:

- `PLAN.md` exists and matches repository reality;
- discovery and architecture gate records have passed with evidence and required authority;
- frozen decisions and current milestone dependencies are explicit;
- acceptance criteria are observable and verification is available;
- no pending decision can invalidate the execution direction.

Keep the `/goal` objective short and point it to this skill and `PLAN.md`; current Codex documentation limits an objective to 4,000 characters. Let `PLAN.md` hold detailed state. Goal execution does not broaden permissions or remove human decision gates.

Pause for human input when a hard stop requires product/architecture adjudication, an irreversible or destructive action, new authority, or an unavailable external dependency. Otherwise, diagnose, repair, verify, update durable state, and continue through the next milestone toward system acceptance.
