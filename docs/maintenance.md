# 维护验证

权威入口是 [test-all.ps1](../scripts/test-all.ps1)。[显式检查清单](../scripts/maintenance-checks.json) 决定两层范围；CI 不另建测试列表。需要 PowerShell、Node.js 24+、Git；从任意 cwd 调用入口均解析到仓库。Quick 为默认值，失败立即返回非零，不把未运行项记为通过。

```powershell
.\scripts\test-all.ps1
.\scripts\test-all.ps1 -Mode Full
```

| 层级 | 范围 | 适用修改 |
| --- | --- | --- |
| Quick | 仓库版本/当前文档链接/CI契约、Skill/Agent validators、contract fixtures（含 encoding）、核心 behavior/execution Node 与维护入口负向 tests | 普通文档、协议文字、fixture 小改 |
| Full | Quick 加全部 Node runtime 无模型 controls、continuity、receipt、persisted recovery、隔离两类 installers、诊断和 config guard | Skill、installer、recovery、evaluation 或维护入口改动 |

Full 为 Windows-only，使用当前 PowerShell 及另一个本机可用 runtime；缺失 runtime 会显式警告 not tested，不安装它，不更改 execution policy。每个 PS 检查在无 profile 子进程中执行，避免 fixture mock/function 污染下一检查。现有 receipt/recovery suites 自身包含 continuity 判据，这是它们的既有依赖。非 Windows Quick 仅执行 metadata/local links/CI contract 和核心 Node suites，不运行已有 Windows 路径语义的 PowerShell validators/fixtures；Windows Quick 才包含表中的完整 Quick 范围。

所有 mutating 测试只使用它们自身可审计的临时 fixture。入口不调用 installer 的真实默认目标；诊断 tests 指向临时发现根。维护入口没有 model/native 参数或授权 override。

## CI 与本机边界

[workflow](../.github/workflows/maintenance.yml) 使用 Windows Full、Ubuntu Quick 两行 matrix，共用一个 `test-all.ps1 -Mode` 调用。Node setup/checkout 是环境准备；read-only contents 权限、关闭 credential persistence/cache，不配置用户 credential 或模型 secret。

| 类别 | 范围 |
| --- | --- |
| CI configured coverage | Windows 全部 deterministic suites；Ubuntu Quick 的 metadata/local links 与核心 Node fixtures，Windows-only child test 明确 skip |
| 本机验证 | 本次真实执行结果以 [Phase4B report](../examples/maintenance/phase4b-report.md) 为准；CI配置存在不等于远端运行 PASS |
| local-only / 人工授权 | 真实安装/升级及 fresh-session加载；真实 config/auth/宿主环境检查；特定本机安装差异 |
| capability-blocked | v4 E1–E4/R4、实际 typed reviewer、支持的隔离 model auth 与完整 persistence/flush |

普通 fixture 的 PASS 不验证 live Codex、实际 reviewer typing、所有进程崩溃/文件系统 durability 或跨平台安装。Markdown检查仅覆盖当前维护文档的相对文件目标，不发网络请求、不验证远端网址和所有历史机器路径。

Runtime v4 保留为高级证据入口，见 [observation contract](../examples/runtime-v4/observation-schema.md) 与 [Phase4A.1](../examples/runtime-v4/phase4a1-report.md)。任何真实宿主/模型回归必须显式、另行授权并满足原 capability gate；不属于 Quick、Full 或默认 CI。
