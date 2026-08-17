# Codex Goal Engineering Kit

[English](README.md) | [简体中文](README.zh-CN.md)

## 是什么

这是一套小型、可复用的工程运行工具包，用于将高层产品目标逐步转化为经过发现、设计、实现、独立审查和系统验收的软件。它还提供可选的、按角色路由模型的 Codex Custom Agent Profiles，用于经济地执行 Multi-Agent 工程任务。仓库保存生命周期、持久状态和 Agent Profile 契约，但不提供 Agent 运行时或具体业务应用。

## 为什么

| 层级 | 职责 |
| --- | --- |
| 全局/项目级 `AGENTS.md` | 持久工程行为与仓库约定 |
| `goal-driven-engineering` Skill | 产品项目生命周期与门禁 |
| 项目 `PLAN.md` | 跨会话事实、决策、里程碑、验收与已验证状态 |
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
| `routine_worker` | `gpt-5.6-terra` / medium | workspace-write | 作为唯一 Writer 完成一个范围明确、已理解的常规实现 |

将且仅将这五个受管 Profile 安装或同步到 `$HOME/.codex/agents/`：

```powershell
.\scripts\install-agents.ps1
```

内容相同不会产生变化；内容不同默认拒绝。若要把冲突的受管文件保留到带时间戳的 `$HOME/.codex/agent-backups/` 目录后安装 Kit 版本，请运行：

```powershell
.\scripts\install-agents.ps1 -ConflictAction Backup
```

使用 `-WhatIf` 预览变更。安装器会保留不相关的 Agent，且不会编辑全局 `AGENTS.md` 或 `$HOME/.codex/config.toml`；尤其不会设置 `agents.default_subagent_model` 或并发参数。项目级 `AGENTS.md` 仍提供优先级更高的仓库特定约束。

路由依据是认知复杂度，而不是模型声望：Luna 负责有界、高吞吐量的只读工作；Terra 负责需要更强判断力的验证、审查和有界实现；主 Sol Thread 负责复杂推理与收敛。不要仅仅因为存在 Subagent 就选择更强模型，也不要让 Luna 承担最终架构决策或安全关键审查。

项目可以直接点名请求，例如：`Have explorer map the affected paths and test_analyst identify missing coverage; converge their evidence before implementation.` 验证完成后可要求使用 `reviewer` 审查。主 Sol Thread 继续负责目标解释、架构、证据收敛、冲突解决、规划、关键决策、复杂或敏感实现和最终验收；不要创建额外的 Sol Coordinator Subagent。琐碎任务不要生成 Subagent。工作流默认最多同时运行三个只读 Agent，且最多一个活跃 Writer；这是建议，不是 Codex 平台上限声明。Subagent 会独立执行模型与工具工作，因此消耗额外 Tokens。参见 OpenAI 官方文档：[Subagents 与 Custom Agents](https://learn.chatgpt.com/docs/agent-configuration/subagents)。

## 新项目

1. 创建或打开真正的项目工作区；不要在本 Kit 仓库内开发业务项目。
2. 确认 Skill 已安装。
3. 建议在打开 Codex 前，将 [`templates/PLAN.md`](templates/PLAN.md) 复制到新仓库根目录。如果没有复制，已安装的 Skill 也可以根据其必需状态模型创建等价的 `PLAN.md`，无需访问本 Kit。
4. 填写 [`prompts/start-project.md`](prompts/start-project.md) 中的六个字段，并将 Prompt 粘贴到普通 Codex 会话。如果 `PLAN.md` 已存在，Codex 会补充它；否则会立即创建。
5. 确认会话进入 Discovery，并在必需门禁通过前不进行生产实现。

第一句话可以简化为：

```text
Use $goal-driven-engineering to start this product goal; initialize PLAN.md and begin Discovery before implementation.
```

在其后补充产品目标、上下文、约束、非目标和可观察的完成定义。

## 架构已批准

确认 Discovery 和 Architecture 门禁记录均已基于证据并由所需权限批准，冻结决策保留了决策依据，里程碑按依赖顺序纵向拆分，当前里程碑具有可度量验收条件。然后粘贴 [`prompts/start-execution-goal.md`](prompts/start-execution-goal.md)。其中的 `/goal` 目标指向 Skill 和 `PLAN.md`，不会重复完整协议。

不要直接从模糊的业务想法启动 `/goal`。当前 Codex 文档说明，Goal 文本同时是首个 Prompt 和完成判据，且 CLI Goal 目标限制为 4,000 个字符，因此详细状态应保存在 `PLAN.md` 中。

## 恢复项目

粘贴 [`prompts/resume-project.md`](prompts/resume-project.md)。Codex 会根据适用的 `AGENTS.md`、`PLAN.md`、Git/仓库证据、当前里程碑代码和测试重建状态。如果计划已过时，以仓库证据为准。

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
