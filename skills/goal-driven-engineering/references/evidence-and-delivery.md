# Evidence and Delivery Boundaries

Read only when repository evidence appears contradictory, verification reuse needs justification, or work depends on external delivery. This is decision guidance, not a new lifecycle, journal, or required report template.

## Match evidence to the question

State the claim being decided, then align version, entry point, execution stage, inputs, and relevant environment before calling sources contradictory.

| Question | Evidence that can answer it |
| --- | --- |
| What does this version actually do? | Reachable implementation and a minimal reproduction through the relevant entry point. |
| What will this validation pipeline accept? | Its actual checkout/base, configuration, event inputs, validator chain, and observed results. |
| What behavior is intended? | Applicable owner decisions, contribution rules, design records, and published promises; current implementation may be defective. |
| What is the public contract? | Published interface/schema, compatibility commitments, authorized decisions, and affected consumers. An additive enum value is not automatically compatible. |
| Is a reported root cause correct? | Treat the report as a hypothesis; reproduce and trace the affected path before choosing the fix. |

A generator accepting a draft placeholder and a downstream parser rejecting it can both be correct. Generation, validation, and final acceptance are different claims. Comments may describe an isolated function whose behavior an earlier guard makes unreachable in the real pipeline. Neither code nor documentation has universal priority for all questions.

Use the smallest safe probe that resolves the conflict. A factual mismatch may be resolved by execution; an unresolved material contract decision still needs its authorized owner. Correct the conclusion and only the downstream work/evidence it invalidates. Do not expand a local fix into unrelated repository cleanup.

## Reuse evidence by coverage

Keep the existing evidence record: claim/coverage, baseline, command/result, relevant environment, and why it still applies. DIRECT can report this briefly or reference existing logs; it needs no new ledger or fingerprints.

- Inspect the actual delta and its consumers. A new commit alone does not invalidate all evidence; unchanged filenames do not prove unchanged dependencies or behavior.
- Rerun affected checks plus mandatory repository checks. A full suite is warranted when required or when impact/uncertainty cannot be bounded sufficiently. Cost alone is not a waiver.
- Treat runtime-loaded instructions, generators, test configuration, and dependency changes by their effects, not file extensions. Ordinary documentation edits and executable workflow text need different evidence.
- Matched baseline failures support a non-regression conclusion for those failures only; they do not turn a failing suite green or prove untested platforms. Compare the same commands and relevant environment.
- Review repair deltas together with their downstream impact and applicable prior review. Reuse the original independent reviewer when still independent of the repair author; rotation is not a requirement. Do not repeat unaffected review or verification merely because another commit exists.

Remote checks may supply missing platform/integration evidence only when they actually run against the relevant revision and context. Keep required remote coverage unverified while unavailable.

## Separate readiness, outcome, and authority

Report only dimensions relevant to the authorized goal: local verification/review readiness, external action result, remote validation, required human review, and remaining completion conditions. These are not a serial state machine or additions to PLAN/journal status vocabularies.

| Observation | Meaning and next boundary |
| --- | --- |
| Local checks and required independent review satisfied | Locally ready; separately identify any external-dependent work. |
| Request accepted, still queued/running | Pending; acceptance is not success. |
| Prerequisite or human authorization missing | Blocked, with cause/owner; not a product test failure. |
| Action/check returned a known failure | Failed; diagnose the actual failure within scope. |
| Write response lost and result unknown | Unknown outcome; do not retry the write. Read-only evidence gathering may clarify it; required strict recovery stops still apply. |

Use the service's result and reason, not a generic status word alone. For example, a completed request can still require human authorization before any tests execute. Stop dependent work, continue useful unaffected authorized work, and identify what permits resumption. This does not authorize periodic monitoring, new external messages, automatic reruns, or workflow bypasses.

Before an external mutation, refresh only changeable prerequisites whose loss would alter whether the action is authorized or still useful: target state/revision, ownership, competing work, or a relevant approval. Do this at the action boundary, not on a timer. A conflict-free merge alone does not establish semantic compatibility. Rechecking cannot eliminate races; use existing conditional-write safeguards when available.

If a final artifact needs an externally assigned ID, finish the available local preparation first, perform only the authorized external action, then complete and verify the ID-dependent delta. Never invent an ID or claim final validation early. A local-only goal does not require external delivery; a goal requiring remote verification is incomplete while that verification is pending or blocked.
