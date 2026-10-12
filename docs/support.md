# 当前支持与已知限制

| 状态 | 能力与证据边界 |
| --- | --- |
| Primary | Windows、PowerShell 7、Windows PowerShell 5.1；具体本机版本/结果见当次维护 report |
| Package support | Codex Goal Skill、可选5类 Custom Agents；source/installed equality 是磁盘证据，不证明运行中加载 |
| Compatibility | 既有 PLAN、legacy journals、schema 2、strict recovery/receipt 保持原规则 |
| Secondary configured CI | Ubuntu Quick 的 Node 与 metadata/local links；Windows PS validators/encoding/installer 仅在 Windows 覆盖，未运行的远端 CI 不标 tested |
| Experimental / evidence-limited | advanced runtime-v4、native reviewer observability、host isolation；fixture 不证明真实 Agent 稳定性 |
| Not provided | 通用编排运行时、background daemon、自动事务恢复、模型路由、三平台 installer guarantee |

## 冻结验收限制

- Phase3 保持 ACCEPT WITH LIMITATIONS，R2/R3 frozen grader FAIL，不 retroactively 评分。
- Phase4A 和 Phase4A.1 保持 NOT READY；真实 E1–E4、R4、actual typed reviewer 均 NOT PROVEN。
- Auth isolation blocked；支持的 auth inheritance 与模型 persistence/flush completeness 仍未证。
- Historical config drift UNKNOWN，不恢复、强行归因或借用 Phase3 精确恢复授权。
- M3 recovery optimization INCONCLUSIVE，正式 recovery semantics unchanged。

维护工程化可以在这些限制下继续，不能把 Phase4B 通过写成 Phase4A 通过。Deferred owner=external host capability；重开条件是新的明确授权、受支持认证/持久化能力及完整可复核证据。相关源码/仪器保留，默认维护与 CI 不运行受阻 model scenarios。

证据入口：[Phase4A](../examples/runtime-v4/phase4a-report.md)、[Phase4A.1](../examples/runtime-v4/phase4a1-report.md)、[M3](../examples/behavior-results/phase2-m3.md)。历史报告含本机证据路径；它们是特定 baseline 的记录，不承诺其他机器可读取或复现所有宿主行为。

本项目采用 [Apache-2.0](../LICENSE)，版本与发布记录见 [CHANGELOG](../CHANGELOG.md)。仓库维护 readiness 不授予合并、push、tag、release 或 deploy 权限。
