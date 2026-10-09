# Phase 2 M3：隔离恢复调查

日期：2026-10-09。基线：M2 `2e0b01f56262c8acb99295ad6529d1e155ea3e0c`。结论：**INCONCLUSIVE，维持现有正式默认规则，不提出本轮协议变更**。

## 事实、假设与待决事项

**Confirmed Facts**：调查仅新增实验脚本、矩阵和本报告，并更新项目验收状态。未启动原生 Goal。正式 `/goal → strict`、适用范围、六状态、五动作、schema 2、receipt、fingerprints、旧 PLAN/journal 解释均未修改。PS7 7.6.5 和 Windows PowerShell 5.1 均运行通过 36 行矩阵、126 个断言、JSON 解析和临时目录清理。独立 reviewer 复审无材料性 finding 遗留。

**Design Assumptions**：用一个 app.txt、紧凑 PLAN、带已有用户修改的 notes.txt，在真实临时 Git 仓库模拟有界批次。三策略得到相同的实验授权输入（初始 HEAD、原 notes/PLAN 文本、风险及归属事实）；该输入在仓库外持久保存，采集成本不计入比较。ordinary STANDARD 并不保证自动具备这些事实。

**Pending Decisions**：没有本轮需要批准的正式协议方案。是否值得另行调查轻量方案仍未知；当前结果不能证明 strict 的总体收益值得其全部成本，也不能否定所有 lightweight 设计。

## 实验与证据

- A：ordinary STANDARD fixture；无 journal、无 execution fingerprint 路由。恢复时重读实验授权事实及实际 HEAD、staged diff、notes/PLAN 文本。app 有修改时仅允许 `VERIFY_THEN_CONFIRM`（只读验证并确认归属），不自动 mutation/finalize。
- B：当前 strict 的 fixture；使用同一 schema-2 journal、指纹、M1 磁盘动作推导和真实 PLAN receipt helper；新 PREPARED 要求 Allowed Paths 干净。不是原生 Goal 执行或通用恢复 runtime。
- C：一个假设性 checkpoint；绑定 HEAD、allowed content、PLAN、state、external-risk，故意省略 protected/index fingerprints。仅是实验变体，不是提案或交付协议。

持久观测：[matrix JSON](phase2-recovery-matrix.json)。可复现脚本：[investigate-recovery.ps1](../../scripts/investigate-recovery.ps1)。在仓库根目录运行 `pwsh -NoProfile -File scripts/investigate-recovery.ps1 -AsJson` 或 `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/investigate-recovery.ps1 -AsJson`。临时 Git 初始化需宿主允许；不写真实安装目录。

脚本导入并实际执行 M1 setup（16 cases、85 assertions、32 File.Replace），其成本明确排除在 M3 计数之外。M3 使用确定性中断点、真实文件读写、Git 状态、File.Replace 和 receipt 回读；没有实际 process kill、断电/fsync 测试或模型会话。

## 恢复矩阵

| 条件 | A 动作 | B 动作 | C 动作 |
| --- | --- | --- | --- |
| 初次 prepare | CONTINUE | RETRY_SAFE_UNIT | CONTINUE |
| 同一 coherent batch 两次编辑，验证完成 | VERIFY_THEN_CONFIRM | FINALIZE | FINALIZE |
| 上一批完成后同路径仍 dirty，新独立批次 | VERIFY_THEN_CONFIRM | BLOCKED | VERIFY |
| mutation 后、状态写入前中断 | VERIFY_THEN_CONFIRM | VERIFY | VERIFY |
| VERIFYING 后、验证命令前中断 | VERIFY_THEN_CONFIRM | VERIFY | VERIFY |
| finalize 持久记录后、清理前中断 | VERIFY_THEN_CONFIRM | FINALIZE → 清理 → CONTINUE | CONTINUE |
| HEAD drift | BLOCKED | BLOCKED | BLOCKED |
| PLAN index drift，工作区 PLAN 恢复原文 | BLOCKED | BLOCKED | FINALIZE（漏 guard） |
| protected notes drift | BLOCKED | BLOCKED | FINALIZE（漏 guard） |
| 原有无关 dirty notes 保持不变 | VERIFY_THEN_CONFIRM | FINALIZE | FINALIZE |
| unknown external outcome | BLOCKED | BLOCKED | BLOCKED |
| unknown ownership，同时 protected notes drift | BLOCKED | BLOCKED | VERIFY（漏 guard；混合因素） |

B interrupted finalize 真实落下 receipt 后中断，再从磁盘推导 FINALIZE；重启后不重复 receipt，删除 journal，再推导 CONTINUE。所有 36 行保留已有及冲突 notes。unknown external 三策略均零 retry dispatch、零 mutation、零 verification command；没有实际外部请求。

C 的三行 `unsafeContinuation` 是自动推进权限分类，未实际派发冲突写入；其中 ownership 行同时注入 protected drift，不能作为身份绑定或 Allowed Paths 并发归属的单因素证明。A 的 `VERIFY_THEN_CONFIRM` 是只读，所以不计作 unsafe 自动推进。`humanInterventionRequired` 是推导出的需要，不是实际发生的人类纠正。

B 在新独立批次的 dirty Allowed Paths 上出现一行 `falseBlockedUnderTaskOracle`：有界任务 oracle 认为仍有授权，但正式 prepare 契约要求 clean。这是契约带来的协调成本，**不是协议实现错误**；同一 coherent batch 的两次编辑无需重复 PREPARED 或重复 MUTATED。

## 实际计数及解释

下表为各行从统一 seed 后到该行观测点的累计计数；不是完成同等最终业务结果的整体成本比较。

| 条件 / 策略 | logical fileWrites | journal / checkpoint writes | 实际 File.Replace | verification commands | receipt writes | cleanup deletes |
| --- | --- | --- | --- | --- | --- | --- |
| 初次 prepare A | 0 | 0 / 0 | 0 | 0 | 0 | 0 |
| 初次 prepare B | 1 | 1 / 0 | 0 | 0 | 0 | 0 |
| 初次 prepare C | 1 | 0 / 1 | 0 | 0 | 0 | 0 |
| 同批两次编辑至验证完成 A | 2 | 0 / 0 | 0 | 1 | 0 | 0 |
| 同批两次编辑至验证完成 B | 6 | 4 / 0 | 3 | 1 | 0 | 0 |
| 同批两次编辑至验证完成 C | 6 | 0 / 4 | 3 | 1 | 0 | 0 |
| interrupted finalize B，包含重启清理 | 6 | 4 / 0 | 4 | 1 | 1 | 1 |

B coherent batch 的 4 次 journal 写入是 PREPARED、MUTATED、VERIFYING、VERIFIED；两次 app 编辑仅在后一编辑后记录一次 MUTATED。File.Replace 是实际调用，首次建文件使用 Move。logical fileWrites 将原子临时文件写入计为一次，不把它与替换重复计数。

完整 JSON 还记录动作推导调用次数、mutation writes、external dispatches。计数排除 seed 创建、授权事实采集、冲突注入、导入 setup、Git 读取、hashing；不同临时 Git 的内容相同，commit identity 可因时间戳不同。不测模型、token、latency、整体性能；A 的零 journal 成本不能推出无需收集事实或无需人工。

## 修复、复审与结论边界

首个沙箱运行在导入 M1 setup 的临时 Git 初始化被拒，允许的隔离测试重试后通过。开发中修复 A 依赖 case/内存而非持久事实的问题、导入脚本覆盖 `-AsJson` 的问题及 PS5.1 测试包装命令的 quoting；并移除同批重复 MUTATED 的可省略写入。它们是实验/验证修复，不是模型成功率记录。最终脚本与矩阵经两运行时验证及独立只读复审。

当前严格 fixture 拦住 HEAD/index/protected 冲突并保护 interrupted receipt 清理，代价包含额外持久写入及新批次 clean-path 协调。C 缺少两类 guard，尚无证据支持采用该变体；A 借助预供应事实和只读确认，无法证明真实普通会话自动恢复等价。故结果为 **INCONCLUSIVE**：正式协议保持原样，没有 NARROW、SIMPLIFY 或 CHANGE 的实施建议，也无需进入协议变更审批。

本轮复用已通过且未变化的 M1/M2 验证；最终核对正式协议资产与 M2 commit 无差异、14 个宿主保护文件 hash 无变化、无活动 journal。M3 作为可复现的持久调查资产独立本地提交；提交定位：`git log -1 -- examples/behavior-results/phase2-m3.md`。
