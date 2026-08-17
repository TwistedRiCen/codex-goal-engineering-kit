# Codex Goal Engineering Kit

[English](README.md) | [简体中文](README.zh-CN.md)

## 是什么

这是一套小型、可复用的工程运行工具包，用于将高层产品目标逐步转化为经过发现、设计、实现、独立审查和系统验收的软件。仓库保存项目生命周期协议和持久状态，但不提供 Agent 运行时或具体业务应用。

## 为什么

| 层级 | 职责 |
| --- | --- |
| 全局/项目级 `AGENTS.md` | 持久工程行为与仓库约定 |
| `goal-driven-engineering` Skill | 产品项目生命周期与门禁 |
| 项目 `PLAN.md` | 跨会话事实、决策、里程碑、验收与已验证状态 |
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
