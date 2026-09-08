# Codex Goal Engineering Kit

[English](README.md) | [简体中文](README.zh-CN.md)

## 是什么

这是一套可复用的工程工具包，支持普通功能迭代和完整产品交付，根据不确定性、影响范围和可恢复性选择流程深度。它还提供可选的、按角色路由模型的 Codex Custom Agent Profiles，用于经济地执行 Multi-Agent 工程任务。仓库保存生命周期、持久状态和 Agent Profile 契约，但不提供 Agent 运行时或具体业务应用。

## 为什么

| 层级 | 职责 |
| --- | --- |
| 全局/项目级 `AGENTS.md` | 持久工程行为与仓库约定 |
| `goal-driven-engineering` Skill | 产品项目生命周期与门禁 |
| 项目 `PLAN.md` | 跨会话事实、决策、里程碑、验收与已验证状态 |
| 活跃期 `.goal/execution-state.md` | 单个原子执行单元的易失、未验证恢复状态；文件不存在即 `IDLE` |
| 命名 Custom Agent Profiles | 用于证据收集、验证、审查或常规实现的有界执行基础设施 |
| Prompt | 当前入口或变更请求 |
| `/goal` | 架构与里程碑稳定后的长周期执行 |

这种职责分离避免在每个 Prompt 中重复可复用协议，也避免让易失的聊天上下文成为项目状态。它也符合当前 Codex 的行为：Skill 可以通过显式调用或描述匹配触发，用户 Skill 从 `$HOME/.agents/skills` 中发现，而 `/goal` 用于可度量的长周期目标。参见 OpenAI 官方文档：[Skills](https://learn.chatgpt.com/docs/build-skills)、[AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md) 和[长周期工作](https://learn.chatgpt.com/docs/long-running-work)。

## 安装

在本仓库的 PowerShell 中运行：

```powershell
.\scripts\install-skill.ps1
```

脚本会输出准确的源目录和目标目录，并且只管理 `goal-driven-engineering`。首次安装可以安全地重复执行；内容相同时不会产生变化。如果目标目录内容不同，默认行为是停止且不修改目标目录。若要保留旧副本并安装新版本：

```powershell
.\scripts\install-skill.ps1 -ConflictAction Backup
```

仅在明确要丢弃旧副本时使用 `-ConflictAction Overwrite`。`-WhatIf` 可以预览会产生修改的安装操作。脚本不会修改全局 `AGENTS.md`、其他 Skill，也不需要管理员权限。只有在更新后的 Skill 没有自动出现时才需要重启 Codex。

## 可选的角色化 Agents

[`agents/`](agents/) 中的 Profiles 实现“强主协调者 + 经济型证据 Worker + 强验证”。它们使用 OpenAI 当前文档规定的独立 Custom Agent TOML 格式。

| 命名 Agent | 模型 / Reasoning | 权限 | 用途 |
| --- | --- | --- | --- |
| `explorer` | `gpt-5.6-luna` / medium | read-only | 定位文件和符号、追踪路径并收集仓库证据 |
| `docs_researcher` | `gpt-5.6-luna` / medium | read-only | 核对权威 API 和版本特定文档 |
| `test_analyst` | `gpt-5.6-terra` / high | read-only | 识别回归风险、边界路径和缺失验证 |
| `reviewer` | `gpt-5.6-terra` / high | read-only | 独立审查正确性、安全性、验收、回归和测试 |
| `routine_worker` | `gpt-5.6-luna` / high | workspace-write | 作为唯一 Writer 完成一个范围明确、已理解的常规实现 |

将且仅将这五个受管 Profile 安装或同步到 `$HOME/.codex/agents/`：

```powershell
.\scripts\install-agents.ps1
```

内容相同不会产生变化；内容不同默认拒绝。若要把冲突的受管文件保留到带时间戳的 `$HOME/.codex/agent-backups/` 目录后安装 Kit 版本，请运行：

```powershell
.\scripts\install-agents.ps1 -ConflictAction Backup
```

使用 `-WhatIf` 预览变更。安装器会保留不相关的 Agent，且不会编辑全局 `AGENTS.md` 或 `$HOME/.codex/config.toml`；尤其不会设置 `agents.default_subagent_model` 或并发参数。项目级 `AGENTS.md` 仍提供优先级更高的仓库特定约束。

路由依据是任务边界、风险与“完成一次可验收结果”的总成本：Luna/medium 负责有界、高吞吐量的证据工作，Luna/high 负责常规实现，Terra/high 负责测试分析和独立审查，因为这些角色的漏检成本可能高于模型溢价。主 Sol Thread 继续负责复杂推理、证据收敛、关键决策、敏感实现和最终验收；任何子代理都不能替代最终架构或安全决策者。

项目可以直接点名请求，例如：`Have explorer map the affected paths and test_analyst identify missing coverage; converge their evidence before implementation.` 验证完成后可要求使用 `reviewer` 审查。主 Sol Thread 继续负责目标解释、架构、证据收敛、冲突解决、规划、关键决策、复杂或敏感实现和最终验收；不要创建额外的 Sol Coordinator Subagent。琐碎任务不要生成 Subagent。工作流默认最多同时运行三个只读 Agent，且最多一个活跃 Writer；这是建议，不是 Codex 平台上限声明。Subagent 会独立执行模型与工具工作，因此消耗额外 Tokens。参见 OpenAI 官方文档：[Subagents 与 Custom Agents](https://learn.chatgpt.com/docs/agent-configuration/subagents)。

## 选择工作流程

| Task Mode | 使用场景 | 状态与入口 |
| --- | --- | --- |
| DIRECT | 行为已明确、没有重大业务或安全决策的局部修改 | 普通工程流程，无需新建 PLAN 或执行日志 |
| STANDARD | 默认用于既有可信架构内的有界功能迭代 | 精简 [PLAN](templates/PLAN.md) 和 [功能入口](prompts/start-feature.md) |
| FULL | 新系统，或核心模型、安全、迁移、兼容性发生重大变化 | [完整 PLAN](templates/PLAN.full.md) 和 [项目入口](prompts/start-project.md) |

旧 PLAN 没有 Task Mode 时保持 FULL 语义，不能静默降低活跃项目的流程要求。已有执行日志必须先恢复；活跃 /goal 或明确要求的严格执行会记录执行上下文，跨会话仍使用严格恢复。完成原范围后，新授权的有界迭代可以使用 STANDARD，同时保留历史决策与验收证据。

Skill 入口只保留公共规则；FULL 按需读取 references/full-lifecycle.md，严格执行或存在日志时读取 references/execution-continuity.md。安装时两个引用文件会随 Skill 一起同步。

检查范围与当前代码后复用有效的架构、门禁证据，STANDARD 无需重新走一轮发现和架构仪式。执行受影响的验证与仓库要求的检查；重大风险和重要里程碑使用独立审查。同一代码基线且覆盖范围充分时，可复用证据、合并里程碑和最终审查。验收结果只保存一份，详细日志通过链接引用。

## 新项目

1. 创建或打开真正的项目工作区；不要在本 Kit 仓库内开发业务项目。
2. 确认 Skill 已安装。
3. 建议在打开 Codex 前，将 [`templates/PLAN.full.md`](templates/PLAN.full.md) 复制到新仓库根目录并命名为 `PLAN.md`。如果没有复制，已安装的 Skill 也可以根据其必需状态模型创建等价的 `PLAN.md`，无需访问本 Kit。
4. 填写 [`prompts/start-project.md`](prompts/start-project.md) 中的六个字段，并将 Prompt 粘贴到普通 Codex 会话。如果 `PLAN.md` 已存在，Codex 会补充它；否则会立即创建。
5. 确认会话进入 Discovery，并在必需门禁通过前不进行生产实现。

第一句话可以简化为：

```text
Use $goal-driven-engineering to start this product goal; initialize PLAN.md and begin Discovery before implementation.
```

在其后补充产品目标、上下文、约束、非目标和可观察的完成定义。

## 架构已批准

FULL 需要已通过的 Discovery 和 Architecture 门禁、冻结决策、按依赖排序的纵向里程碑和可度量验收条件。STANDARD 需要确认既有架构适用、当前范围及验收条件明确。有效门禁证据可以复用，无需重复索取相同批准。然后粘贴 [`prompts/start-execution-goal.md`](prompts/start-execution-goal.md)。其中的 `/goal` 目标指向 Skill 和 `PLAN.md`，不会重复完整协议。

不要直接从模糊的业务想法启动 `/goal`。当前 Codex 文档说明，Goal 文本同时是首个 Prompt 和完成判据，且 CLI Goal 目标限制为 4,000 个字符，因此详细状态应保存在 `PLAN.md` 中。

## Interrupt-Resilient Execution

FULL 执行、任何 /goal 执行和明确要求的严格恢复按 `Write Before Risk` 在 Writer 修改前创建 `.goal/execution-state.md`，在验证前记录 `VERIFYING`，并只在验证成功且代码指纹仍匹配时把结果写入 `PLAN.md`。PLAN 始终只保存持久且已验证的项目状态；Journal 只在一个原子执行单元活跃时存在，文件不存在即 `IDLE`，不能作为已验收进度的第二来源。

严格恢复按仓库指令、PLAN、可选 Journal、Git 和验证证据重建状态，并只推导 `CONTINUE`、`RETRY_SAFE_UNIT`、`VERIFY`、`FINALIZE` 或 `BLOCKED`。HEAD、范围、保护基线、验证指纹或外部非幂等结果存在不确定性时会 fail closed。该能力不执行自动等待或自动 resume，也不提供 quota prediction、定时 checkpoint、后台监控或 external transaction recovery。

普通 STANDARD 工作按可验证批次推进，无需为每次修改维护日志或指纹；批次包含普通修复及受影响的复验。严格恢复继续保留 clean Allowed Paths 和全部冲突检查，不会为了开始下个批次强制提交或覆盖已有修改。目前恢复能力由指令协议与决策/指纹测试组成，未提供通用恢复 CLI。

## 恢复项目

粘贴 [`prompts/resume-project.md`](prompts/resume-project.md)。Codex 会先识别已有模式和恢复要求，再根据适用的 `AGENTS.md`、`PLAN.md`、Git/仓库证据、当前里程碑代码和测试重建状态。如果计划已过时，以仓库证据为准。

## 变更请求

填写并粘贴 [`prompts/change-control.md`](prompts/change-control.md)。可逆的实现或局部设计变更可以自主继续。架构和产品范围变更在完成必要裁决前仍是提案；只有获批变更才能更新规范化目标、范围、架构、里程碑或验收条件。

## 更新 Skill

编辑本 Kit 并通过验证后，使用保留备份的方式同步：

```powershell
.\scripts\install-skill.ps1 -ConflictAction Backup
```

检查脚本输出的备份位置，在新会话中测试新版 Skill；只有确认备份已无用时，才手动移除旧备份。

## 尝试 training-system 示例

[`examples/training-system/PROJECT-GOAL.md`](examples/training-system/PROJECT-GOAL.md) 描述了一个贴近真实场景的线下培训 MVP，但不会预先规定尚未解决的业务语义。

1. 为培训系统创建一个独立的空仓库。
2. 让该工作区能够访问示例目标，并用它填写项目启动 Prompt。
3. 验证首次会话会创建根目录 `PLAN.md`，记录事实、假设和待决事项，并停留在 Discovery，而不是直接生成应用代码。
4. 解决资金、课时、所有权、授权、退款、考勤和报表等关键决策；评审架构与里程碑。
5. 只有两个门禁均通过后，才启动执行 Prompt，并按照已记录证据验收每个里程碑和最终业务闭环。

当新的 Codex 会话仅依靠仓库文件就能确定真实阶段和下一个未满足条件时，即可认为该示例工作流验证成功。
