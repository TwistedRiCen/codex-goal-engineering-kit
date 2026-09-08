# Strict Execution Continuity

Read before mutation in FULL mode, any /goal execution, or explicitly requested strict recovery, and whenever an execution journal exists. Resolve an active journal under this contract before changing task mode.

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

An atomic execution unit is a coherent verifiable batch, including ordinary repair and affected revalidation, not one tool call or tiny edit. Keep the unit active until it is finalized; do not split repeated edits to the same files into artificial units.

Apply write before risk for every atomic execution unit:

1. Define one bounded intent, literal repository-relative Allowed Paths, safe-to-repeat verification commands, and their pass condition.
2. Refuse to start when an Allowed Path already has a Git-visible change. Do not merge pre-existing work with a new Writer mutation. If a prior finalized batch left these paths uncommitted, follow repository Git policy or isolate the next batch; never force a commit, reset changes, or downgrade recovery to bypass this condition.
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
