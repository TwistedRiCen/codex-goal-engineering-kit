# Codex Goal Engineering Kit

[English](README.md) | [简体中文](README.zh-CN.md)

## 是什么

这是一套可复用的工程工具包，支持普通功能迭代和完整产品交付，根据不确定性、影响范围和可恢复性选择流程深度。它还提供可选的、按角色路由模型的 Codex Custom Agent Profiles，用于按职责分工执行 Multi-Agent 工程任务。仓库保存生命周期、持久状态和 Agent Profile 契约，但不提供 Agent 运行时或具体业务应用。

## 三步开始

1. 在本 Kit 的 PowerShell 中运行 `.\scripts\install-skill.ps1`；已安装且有更新时使用 `-ConflictAction Backup`。
2. 打开真实业务项目，使用[开始梳理](prompts/start-here.md)，说出一句话或附上现有材料。
3. 下次使用[继续已有项目](prompts/resume-project.md)，从 PLAN 和仓库证据继续。

可选 Agents 和 /goal 按需使用。查看安装情况只需运行 `.\scripts\check-installation.ps1`，它不会修改文件。

## 从一句话开始（推荐）

在真实业务项目的 Codex 任务中说：

> 使用 $goal-driven-engineering 帮我梳理一个想法：我想做教培管理系统，收费和剩余课时现在靠 Excel。先通过问答引导我，暂不写业务代码。

AI 会先读可用材料，再一次问一个主要问题，逐步整理目标草案。可以回答“不知道”或“请你建议”。已有信息不重复询问；信息足够进入下一步就停止追问，无需填写完整表格或回答固定数量的问题。

| 入口 | 用途 |
| --- | --- |
| [开始梳理](prompts/start-here.md)，默认 | 一句话、已有材料或完整目标；新项目和功能迭代共用 |
| [继续已有项目](prompts/resume-project.md) | 从 PLAN 和仓库证据继续，处理被中断的工作 |
| [启动长期执行](prompts/start-execution-goal.md)，按需 | 已批准且可验收的长期目标，使用 /goal |
| [调整需求](prompts/change-control.md)，按需 | 说明需求变化及其原因，评估并处理影响 |

日常只需使用默认入口；有完整信息时直接附上，AI 会跳过不必要的问答。原“材料、完整项目、功能”入口已合并，不再要求用户先选择流程模式。

提示词模板和 Codex 默认启动提示统一使用简体中文；英文 README 仅为使用说明，不另建一套英文模板。文件名、Skill 标识、命令与 PLAN 状态标识保持稳定。可以明确要求 AI 用其他语言交流，协议标识保持不变。

AI 按模式逐步维护 PLAN；未知项明确保留。用户要求“只讨论、不改文件”时，草案只留在对话中，不初始化 PLAN。确认草案不会自动批准未决业务规则，也不会自动授权编码；已经明确授权的工作无需再走一轮确认。

查看[教培问答示例](examples/training-system/INTAKE-WALKTHROUGH.md)。完整 PROJECT-GOAL.md 是可以逐步整理出的参考成果和测试材料，无需用户一次写完。

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

备份及临时安装目录存放在扫描目录之外：默认使用 $HOME/.agents/skill-backups/，自定义 -DestinationRoot 时使用其父目录下的 skill-backups/。仅将有效 Skill 保留在扫描目录，旧备份应移出该目录。安装器不会自动删除已有历史备份。

仅在明确要丢弃旧副本时使用 `-ConflictAction Overwrite`。`-WhatIf` 可以预览会产生修改的安装操作。脚本不会修改全局 `AGENTS.md`、其他 Skill，也不需要管理员权限。只有在更新后的 Skill 没有自动出现时才需要重启 Codex。

## 检查安装

`.\scripts\check-installation.ps1` 显示源码版本、实际安装路径、Skill 是否与源码一致、重复副本及各角色的状态。使用 `-AsJson` 可获得结构化输出；`-SkillRoot`、`-LegacySkillRoot`、`-AgentsRoot` 可检查自定义位置。

SYNCHRONIZED 表示字节一致；DIFFERENT 仅表示内容不同，无法判断差异是否来自个人修改；MISSING_OPTIONAL 表示未安装可选角色。联接或不可读路径会报告问题，不会跟随或修改。扫描不完整时不能据此断言没有重复项。此命令检查磁盘内容，不证明当前运行中的 Codex 已重新加载。

## 工作流由 AI 自动选择，你可以提出要求

无需手动选择工作流。AI 会根据任务和仓库证据选择满足要求的最简流程，并简要说明模式和理由。你也可以直接指定 DIRECT、STANDARD、FULL，或用自然语言要求“轻量处理”“按完整生命周期推进”，无需填写额外选项。

AI 会按你的要求选择；如指定模式与必要的验证、审查或已有恢复要求冲突，会说明原因及所需步骤，不会因模式名称而省略这些检查，也不会静默忽略你的选择。例如：“这次功能迭代使用 STANDARD”或“这个新系统按 FULL 推进”。

| Task Mode | 使用场景 | 状态与入口 |
| --- | --- | --- |
| DIRECT | 行为已明确、没有重大业务或安全决策的局部修改 | 普通工程流程，无需新建 PLAN 或执行日志 |
| STANDARD | 默认用于既有可信架构内的有界功能迭代 | 精简 [PLAN](templates/PLAN.md) 和 [统一入口](prompts/start-here.md) |
| FULL | 新系统，或核心模型、安全、迁移、兼容性发生重大变化 | [完整 PLAN](templates/PLAN.full.md) 和 [统一入口](prompts/start-here.md) |

旧 PLAN 没有 Task Mode 时保持 FULL 语义，不能静默降低活跃项目的流程要求。已有执行日志必须先恢复；活跃 /goal 或明确要求的严格执行会记录执行上下文，跨会话仍使用严格恢复。完成原范围后，新授权的有界迭代可以使用 STANDARD，同时保留历史决策与验收证据。

Skill 入口只保留公共规则；FULL 按需读取 references/full-lifecycle.md，严格执行或存在日志时读取 references/execution-continuity.md。问答引导按需读取 references/guided-intake.md；证据冲突、不明显的验证复用或外部交付按需读取 references/evidence-and-delivery.md。安装时全部引用文件随 Skill 同步。

检查范围与当前代码后复用有效的架构、门禁证据，STANDARD 无需重新走一轮发现和架构仪式。执行受影响的验证与仓库要求的检查；重大风险和重要里程碑使用独立审查。同一代码基线且覆盖范围充分时，可复用证据、合并里程碑和最终审查。验收结果只保存一份，详细日志通过链接引用。DIRECT 完成前同样核对必要审查，无需新增工作流文件。本地就绪不代表外部交付或远端验证完成；外部操作前刷新可能影响其授权或必要性的可变前置条件。

## 新项目

1. 创建或打开真正的项目工作区；不要在本 Kit 仓库内开发业务项目。
2. 确认 Skill 已安装。
3. 模板为可选项。需要预置完整 PLAN 时，将 [`templates/PLAN.full.md`](templates/PLAN.full.md) 复制到新仓库根目录并命名为 `PLAN.md`。如果没有复制，已安装的 Skill 也可以根据其必需状态模型创建等价的 `PLAN.md`，无需访问本 Kit。
4. 默认使用 [问答入口](prompts/start-here.md)，提供一句话或现有材料即可；已有完整目标可直接附上，不必另选模板。授权项目工作后，Codex 会逐步创建或补充 PLAN；仅讨论时不写文件。
5. 确认会话进入 Discovery，并在必需门禁通过前不进行生产实现。

## 架构已批准

FULL 需要已通过的 Discovery 和 Architecture 门禁、冻结决策、按依赖排序的纵向里程碑和可度量验收条件。STANDARD 需要确认既有架构适用、当前范围及验收条件明确。有效门禁证据可以复用，无需重复索取相同批准。然后粘贴 [`prompts/start-execution-goal.md`](prompts/start-execution-goal.md)。其中的 `/goal` 目标指向 Skill 和 `PLAN.md`，不会重复完整协议。

不要直接从模糊的业务想法启动 `/goal`。当前 Codex 文档说明，Goal 文本同时是首个 Prompt 和完成判据，且 CLI Goal 目标限制为 4,000 个字符，因此详细状态应保存在 `PLAN.md` 中。

## Interrupt-Resilient Execution

新的严格执行单元使用 schema 2：单独保护 PLAN 原字节与 Git 索引，只允许在验证后追加精确验收回执。回执已写入而日志未删除时可继续清理；目标、决策、代码或索引的额外变化仍会阻塞。旧日志保持旧规则，不自动升级。参见[恢复协议](skills/goal-driven-engineering/references/execution-continuity.md)。


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
2. 从问答示例的一句话开始，或直接提供完整示例目标以测试材料入口；无需重新手填启动表格。
3. 验证首次会话会创建根目录 `PLAN.md`，记录事实、假设和待决事项，并停留在 Discovery，而不是直接生成应用代码。
4. 解决资金、课时、所有权、授权、退款、考勤和报表等关键决策；评审架构与里程碑。
5. 只有两个门禁均通过后，才启动执行 Prompt，并按照已记录证据验收每个里程碑和最终业务闭环。

当新的 Codex 会话仅依靠仓库文件就能确定真实阶段和下一个未满足条件时，即可认为该示例工作流验证成功。

## 可选的角色化 Agents

[`agents/`](agents/) 中的 Profiles 是可选的 Codex 平台配置，只定义角色职责与权限。默认省略 model 和 model_reasoning_effort，不固定厂商、型号或推理档位；无需安装这些角色即可使用核心 Skill。

| 命名 Agent | 权限 | 用途 |
| --- | --- | --- |
| `explorer` | read-only | 定位文件和符号、追踪路径并收集仓库证据 |
| `docs_researcher` | read-only | 核对权威 API 和版本特定文档 |
| `test_analyst` | read-only | 识别回归风险、边界路径和缺失验证 |
| `reviewer` | read-only | 独立审查正确性、安全性、验收、回归和测试 |
| `routine_worker` | workspace-write | 作为唯一 Writer 完成一个范围明确、已理解的常规实现 |

将且仅将这五个受管 Profile 安装或同步到 `$HOME/.codex/agents/`：

```powershell
.\scripts\install-agents.ps1
```

内容相同不会产生变化；内容不同默认拒绝。若要把冲突的受管文件保留到带时间戳的 `$HOME/.codex/agent-backups/` 目录后安装 Kit 版本，请运行：

```powershell
.\scripts\install-agents.ps1 -ConflictAction Backup
```

使用 `-WhatIf` 预览变更。安装器会保留不相关的 Agent，且不会编辑全局 `AGENTS.md` 或 `$HOME/.codex/config.toml`；尤其不会设置 `agents.default_subagent_model` 或并发参数。项目级 `AGENTS.md` 仍提供优先级更高的仓库特定约束。

模型与推理设置由 Codex 运行环境解析：显式调用设置优先于全局 Agent 默认值，再回退到父会话。角色文件中显式填写的 model 或 model_reasoning_effort 会覆盖对应解析结果。需要控制成本时，可以在自己的配置中选择可用型号；同时确认模型支持对应推理档位。省略设置不保证最低成本，也不表示角色一定使用相同模型。参见[官方模型配置规则](https://learn.chatgpt.com/docs/agent-configuration/subagents#custom-agents)。

校验器检查角色集合、必需字段、非空值和权限边界；model、model_reasoning_effort 为可选非空字符串，不限制具体型号。账号是否可用、参数组合是否受支持由运行环境验证。安装会复制仓库版本；若已自行修改同名角色，默认拒绝冲突，Backup 会保留旧配置再安装默认版本，并不会合并个人选模设置。

主任务负责目标解释、关键决策、证据汇总和最终验收。需要时可说：“请 explorer 梳理受影响路径，test_analyst 识别缺失验证”；验证后可请 reviewer 审查。只为有独立价值的工作分派角色，避免琐碎任务和重复协调；修改相同文件时保持一个写入者。

## 其他模型与工具平台

核心工程流程按宿主能力使用；模型品牌不能决定工具是否可用。本仓库当前提供 Codex 安装适配，其他平台尚未完成运行验证，不声明配置文件可以直接通用。

| 宿主能力 | 使用方式 |
| --- | --- |
| 可读写仓库并执行命令 | 正常使用 PLAN、验证和恢复协议 |
| 支持子代理 | 按职责分工，保留实际权限限制 |
| 不支持子代理 | 顺序开展分析；自查不等于独立审查，必需审查由其他审查者或人工完成 |
| 不支持 /goal | 从 PLAN 使用普通任务继续；已有严格上下文和 FULL 恢复要求仍保留 |
| 仅支持聊天 | 梳理目标或准备交接材料；不声称保存文件、执行测试或完成工程验收 |

支持 Skill 的平台使用其原生调用方式；其他平台可以通过可用文件工具读取 SKILL.md 和相关引用。不要直接照搬 Codex 的 $ 调用语法、TOML、安装路径或 /goal。缺少必需工具时暂停依赖它的修改或验收，继续不受影响的已授权工作。


维护者可用[行为评估用例](examples/behavior-evaluation.md)检查问答和恢复边界；这些用例不增加用户必填步骤。
