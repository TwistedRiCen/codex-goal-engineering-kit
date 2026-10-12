# Codex Goal Engineering Kit

[English](README.md) | [简体中文](README.zh-CN.md)

这是一套可复用的 Skill，把想法或有界功能请求推进为仓库中的决策、实现与验收证据，根据任务选择足够的流程深度，并通过 PLAN.md 跨会话恢复。可选 Codex Agent Profiles 提供有界角色。

它不提供通用编排运行时、后台守护进程、模型路由器或自动外部事务恢复。开发版本见 [VERSION](VERSION)，变化见 [CHANGELOG](CHANGELOG.md)。采用 [Apache-2.0](LICENSE)；当前仍为 pre-release repository state。

## 三步开始

1. 在本 Kit 的 PowerShell 中安装 Skill：

   ```powershell
   .\scripts\install-skill.ps1
   ```

2. 打开真实项目，使用[开始梳理](prompts/start-here.md)，或直接说：

   > 使用 $goal-driven-engineering 帮我梳理想法。我想做教培管理系统，收费和剩余课时现在靠 Excel。先引导我，暂不写应用代码。

3. 下次使用[继续已有项目](prompts/resume-project.md)。AI 读取 PLAN 和仓库证据，先处理已有恢复状态，再推进下一条未满足判据。

可以只说一句话，也可以附完整材料。只讨论的请求保留为对话草案。Agents 和 `/goal` 都可选，安装不会自动启动它们。[教培问答示例](examples/training-system/INTAKE-WALKTHROUGH.md) 展示入口；示例是流程 fixture，不是在本仓库开发的业务应用。

## 安装、诊断与升级

安装器只管理 `$HOME/.agents/skills` 下的 `goal-driven-engineering`。字节相同则不操作；内容不同默认拒绝。`-WhatIf` 可预览。保留旧副本并同步有变化的 package：

```powershell
.\scripts\install-skill.ps1 -ConflictAction Backup
.\scripts\check-installation.ps1
```

备份放在 Skill 发现根之外。检查打印路径，不要把重复备份 Skill 留在发现目录。Backup 保留个人改动，但不合并；安装器不改全局 AGENTS 或其他 Skill。其他宿主和跨平台安装没有保证。

诊断只读。`-AsJson` 输出当前 Kit version/source revision、源与安装 package fingerprint、重复副本及可选 Agents 状态。SYNCHRONIZED 证明字节相同，不能证明 installed Git revision 或运行中的会话已加载。已有 package-only 安装的 InstalledKitVersion=UNKNOWN，不补造版本来源。详见[版本与兼容性](docs/compatibility.md)。

升级前读 CHANGELOG 与兼容性说明、跑 Full；只有 Skill package 字节变化才需要安装。仅 README/CI/维护工具改动不需重装。更新 Skill 后用新会话验收；未出现更新时再重新加载 Codex。

## DIRECT、STANDARD、FULL 与 Goal

| 模式 | 适用任务 | 持久状态 |
| --- | --- | --- |
| DIRECT | 已理解的局部修改，无材料性领域/安全决策 | 不新建 PLAN 或 journal |
| STANDARD | 已验证架构下的有界功能迭代 | 精简 [PLAN](templates/PLAN.md) |
| FULL | 新系统、核心模型、安全或兼容性重大变化 | [完整 PLAN](templates/PLAN.full.md) 与生命周期门禁 |

AI 选择最小充分模式，也可接受你的明确偏好；验证、review 和已有恢复要求仍适用。没有 Task Mode 的旧 PLAN 保留 FULL 语义，已有 journal 必须先恢复。

Skill 定义协议，项目 AGENTS 定义本地约束，PLAN 保存决策与已验证验收。`/goal` 是宿主的长周期执行能力，本 Kit 不实现该运行时。只有明确批准且可衡量的范围才使用[执行入口](prompts/start-execution-goal.md)；`/goal → strict` 保持原样。需求变化使用[变更入口](prompts/change-control.md)。

完整规则由 [SKILL.md](skills/goal-driven-engineering/SKILL.md) 及按需 references 维护；prompts 只提供入口。

## 可选 Custom Agents

| Profile | 权限 | 职责 |
| --- | --- | --- |
| `explorer` | read-only | 仓库证据 |
| `docs_researcher` | read-only | 权威文档 |
| `test_analyst` | read-only | 验证缺口 |
| `reviewer` | read-only | 独立审查 |
| `routine_worker` | workspace-write | 单一有界实现范围 |

```powershell
.\scripts\install-agents.ps1 -WhatIf
.\scripts\install-agents.ps1 -ConflictAction Backup
```

默认 profiles 不固定 model 或 effort，核心 Skill 不依赖这些 Agents。安装保留其他 profiles，不修改 `$HOME/.codex/config.toml`、`agents.default_subagent_model` 或并发配置。模型可用性与配置由宿主负责，详见[可选 profiles](agents/) 与[宿主能力](skills/goal-driven-engineering/references/host-capabilities.md)。

## 高级：Interrupt-Resilient Execution

严格执行遵循 Write Before Risk，使用 `.goal/execution-state.md` 保存临时未验证状态；不存在即 IDLE。新严格单元采用 schema 2，活跃 legacy journal 保留原语义。不确定性必须 fail closed；普通 STANDARD 不新增逐次编辑 journal 或 fingerprint。

它不提供 quota prediction 或 external transaction recovery，也不是通用事务引擎或自动后台恢复服务。详见[continuity contract](skills/goal-driven-engineering/references/execution-continuity.md)。

## 维护仓库

前置：PowerShell 7（Windows 同时支持 Windows PowerShell 5.1）、Node.js 24+、Git。本机与 CI 共用一个入口：

```powershell
.\scripts\test-all.ps1             # 默认 Quick：metadata、local links、validators、contracts、核心 Node fixtures
.\scripts\test-all.ps1 -Mode Full  # Windows：全部 deterministic checks；使用本机可用的两种 PowerShell
```

Full 包含隔离 installer/diagnostic/recovery fixtures 及无模型 runtime harness tests。可移植 Quick 只覆盖 metadata/links 和核心 Node fixtures；Windows PowerShell checks 只在 Windows 执行。两层均不调用 Codex/模型、不更新真实安装、不改用户配置、不启动 native Goal。CI 配置为 Windows Full 与 Ubuntu Quick；配置覆盖不等于已执行的远端 CI。详见[维护与覆盖](docs/maintenance.md)、[CONTRIBUTING](CONTRIBUTING.md)。

## 当前支持与限制

Windows 优先，PowerShell 7 与 Windows PowerShell 5.1 已有本机验证。可移植 Quick 仅覆盖契约/fixture，不承诺跨平台 installer。已有 PLAN、legacy journal 与 schema 2 保持兼容。

Runtime v4 定位为 **advanced / evidence-oriented / host-capability-dependent**。确定性控制不能证明真实 Agent 稳定性或模型验收。Phase4A 的真实 E1–E4/R4/typed reviewer 仍 NOT PROVEN；auth isolation blocked，persistence/flush completeness 未证。Phase4A/4A.1 保持 NOT READY；M3 recovery optimization 保持 INCONCLUSIVE。

这些外部宿主限制属于 deferred acceptance，不能表示 Phase4A 通过。真实 runtime 工作必须显式选择、另行授权且通过 capability gate。详见[支持矩阵与冻结限制](docs/support.md)、[Phase4A](examples/runtime-v4/phase4a-report.md)、[Phase4A.1](examples/runtime-v4/phase4a1-report.md)、[behavior evaluation](examples/behavior-evaluation.md)。
