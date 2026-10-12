# 贡献与维护

先读 [AGENTS.md](AGENTS.md)。权威协议是 [Skill](skills/goal-driven-engineering/SKILL.md)；[PLAN template](templates/PLAN.md) 是持久契约，references 保存按需规则，prompts 只保留入口。根 PLAN 记录本仓库工作，不是可复用 schema。

修改 workflow 时一起检查 Skill、references、PLAN templates、所有 prompts、两份 README、训练示例和 agent metadata，保持契约一致。普通维护不得顺带改变 modes、review、evidence reuse、strict applicability、journal/recovery/receipt/fingerprints。材料性变化需要明确授权与兼容性说明。

```powershell
.\scripts\test-all.ps1
.\scripts\test-all.ps1 -Mode Full
```

Quick 用于小型文档/fixture 工作；Skill、installer、recovery、evaluation、维护入口或版本诊断改动须 Full。入口使用 [显式 registry](scripts/maintenance-checks.json)；新增确定性 Node test 必须登记。不要把 paid/native 宿主工作加入该 registry。详细范围和本机/CI边界见[维护说明](docs/maintenance.md)。

提交应聚焦一个有界变化，排除临时输出、真实配置、credential、raw model reasoning 和无关编辑。报告实际检查与 Tests not run 的原因；fixture/synthetic/no-model PASS 不可夸大为真实 Agent 稳定性或 live acceptance。保留历史 FAIL、NOT PROVEN、INCONCLUSIVE 与宿主限制。

PR 描述说明 scope、contract impact、verification、PLAN/journal compatibility、runtime claims 和 docs/migration。只在实际需要迁移时新增文档，版本规则见[兼容性](docs/compatibility.md)，用户可感知变化记入 [CHANGELOG](CHANGELOG.md)。

本项目采用 [Apache-2.0](LICENSE)，贡献提交遵循该标准许可证的条款。合并、push、release/tag 不由本地维护 PASS 自动授权。
