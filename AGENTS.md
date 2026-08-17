# Repository Instructions

This repository maintains a reusable Goal-Driven Engineering Kit.

- `skills/goal-driven-engineering/SKILL.md` is the canonical project-lifecycle protocol.
- `templates/PLAN.md` is the canonical persistent-state contract and must use the same phase, decision, milestone, and acceptance semantics as the Skill.
- Files in `prompts/` are short entry points. Keep lifecycle detail in the Skill and project state in `PLAN.md`; do not duplicate the full protocol in prompts.
- `examples/training-system/PROJECT-GOAL.md` is a workflow fixture, not an implementation project. Do not add training-system source code here.
- `skills/goal-driven-engineering/agents/openai.yaml` must remain consistent with the Skill name and purpose.

When changing workflow behavior, inspect the Skill, PLAN template, all prompts, README, and example for contract drift. Run the Skill validator and non-destructive installer tests before committing. Do not copy global engineering policy into this repository.
