# Phase 2 M1：评分与执行证据

执行边界：ordinary interactive STANDARD；从干净 main@bb921e5f584d3e99a325733901aa28ad95268a35 创建本地分支。无原生 Goal、真实安装、全局配置或远程写入。历史报告 [原结果](2026-09-11-completion-evidence.md) 保留。

## 评分与来源

决策 rubric **2.0** 使用严格 observation envelope、场景级约束、own-property operation 白名单和成功 probe 的实际返回。明确区分 claim、observed、rationaleReview；reason 不使用关键词黑名单。独立审查摘要绑定所有 claim 和 observed，旧摘要不能覆盖新理由或新证据。详见 [契约](../behavior-fixtures/observation-contract.md)。v1 冻结用于旧结果复现。

历史两组均从显式指定的原子会话导入，保留原 claim/reason、实际 12 input 和 8 named probe。模型/effort 原记录未捕获，记 not-captured；各有一次 helper 环境失败后的只读重跑，不隐藏。未导出完整 trace、思维过程、认证或私人路径。

| 历史组 | 2.0 决策 | 2.0 证据 | 独立理由审查 | 总体 |
| --- | --- | --- | --- | --- |
| [baseline](history-v2-baseline.json) | 12/12 | 12/12 | 12/12 consistent | PASS |
| [candidate](history-v2-candidate.json) | 12/12 | 12/12 | 12/12 consistent | PASS |

独立评者 `m1_eval_analysis-2026-10-09` 未写实现或导入器，独立解析原 JSONL：24 claim、24 input、16 named probe、调用对应及 trace 摘要均一致；所有实际调用只读。D3 baseline 的 b1 full completed 未被提升为 passed；b2 affected/lint passed 来自已给输入。两组的未来 review/verification 没有被说成实际执行。

JSON、摘要和 reviewer 名称不认证独立身份；可信 PASS 依赖维护者控制采集与独立审查登记。这里 PASS 只证明固定局部决定及证据的一致性，不证明完整实现、恢复或稳定性提升。synthetic scorer-test 在输出中明确区分，不能替代模型证据。

## 执行层与首次偏差

`run-execution-regression.cjs` 使用隔离 Git 临时仓库和独立 `codex exec --ephemeral --ignore-user-config --approve-for-me --json` 会话。自动审批本身选择 workspace-write，保留 execpolicy rules 与既有认证。源码、固定输入、prompt、fixture HEAD、旧 evidence、实际 artifact 和可见事件摘要可持久复核；raw trace、stderr 与最终自由文本不落库。宿主全局指令/Skill discovery 仍可能影响评估，比较必须使用同一宿主。

- [首次启动结果](phase2-execution-baseline-first.json)：0/2，CLI 拒绝同时传 --sandbox 和 --approve-for-me；未启动模型、未修改 fixture。保持原结果。
- [参数修复后 v1 诊断](phase2-execution-baseline-retry1.json)：DIRECT 通过；STANDARD 实现、独立验收和状态通过，但无法识别其 verification wrapper，总体 1/2。raw trace 已丢弃，不能事后宣称人工确认该命令。此结果不用作 M2 等价对照。
- 独立 reviewer 发现 v1 对复合 full-check 命令/未知工具事件可能漏判，修复为 **execution-regression-v2**：实际 full-check counter 前后不变且 seed=1；未知事件/工具需要复核，不能隐式 PASS。对应负例通过。counter 是有界实验观测，不是抵御刻意还原文件的审计装置。
- [v2 基线](phase2-execution-v2-baseline.json) 同样 1/2，STANDARD 唯一缺口仍是命令包装无法识别；独立验收与 full-check counter 检查通过。随后 **execution-regression-v3** 有界识别一层字面量 PowerShell 包装，只保留 executable basename 和固定 fixture 参数，拒绝 echo/变量/复合脚本/管道/encodedCommand。独立 reviewer 复审及负例通过。无法识别的形态仍不能 PASS，旧记录不重分。
- M2 对照基线：审查后重新采集；以最终执行记录和 M1 commit 固定，禁止只给 candidate 更换 rubric。

真实执行样本每版 DIRECT 和 STANDARD 各一个；修复启动器/采集器是维护者干预，不算 Skill 改善。各文件保留局部 attempt/retries=0，跨文件的试验重跑与原因在这里明确登记。一次通过不证明成功率、稳定性、token 或 latency 改善。无外部写入；静态 typo DIRECT 不覆盖高风险代码变更所需 review 的实际调用，后者由固定 D1/D3/D4 决定用例及协议审查覆盖。

## 恢复与独立 review

PS7 和 Windows PowerShell 5.1 均通过 `test-recovery-paths.ps1`：16 case、85 assertion、32 实际 File.Replace，GUID 临时目录清理确认。实际 journal 14 字段读写、stale PREPARED mutation、VERIFYING 中断、真实 diff/content verification、VERIFIED 落盘、receipt 后中断和恢复、只写一次 receipt、protected/index/HEAD/code/PLAN/partial/duplicate conflict，以及 POSSIBLE unknown external outcome 零重试均覆盖。

这是 fixture executor、已有 test resolver 和 shipped receipt helper 的真实磁盘/Git 路径；中断是确定性 cutpoint，不是 Codex 执行、实际 kill、断电/fsync、通用 journal parser、schema1 迁移或 matching external-result branch 证明。原恢复协议、receipt helper 和旧兼容规则未改。

独立 `m1_review` 全读并对抗审查。复合 full-check/未知工具 false-PASS 材料 finding 已修复并复审关闭；未发现新的材料 finding。独立重跑两运行时恢复 fixture 通过。测试 sandbox 最初 .git/config 拒绝后，仅提高临时测试执行权限重跑；未改主仓库安装或规则。独立 review 不能代替 fresh-model 对照。

## 验证与 checkpoint

当前 72 Node 测试通过（36 scorer/importer、36 execution collector/grader）；都标记 synthetic unit observations。两 PowerShell 运行时均通过生命周期/profile validator、encoding、continuity、receipt、两个隔离 installer 与 read-only diagnosis；本地 Markdown links、basic Skill validator 与 diff check 通过。14 个真实安装/config/global instruction 文件 SHA256 比较无变化。

最终 [v3 fresh baseline](phase2-execution-v3-baseline.json) **2/2 PASS**。DIRECT 仅修改 copy.txt，无 PLAN/journal、无观察到的 Agent/提问、full-check 保持 seed=1；STANDARD 仅修改实现、focused tests 和紧凑 PLAN，保留旧 evidence 与 frozen decision，focused verification、独立 batch assertions 均通过，无 journal、观察到的 Agent/提问，full-check 同样不增加。实际单层 PowerShell invocation 已由本次 trace 识别并保存安全结构；这不能追溯证明旧诊断 wrapper。

全局试验分母：启动失败 2 task attempts（未启动模型）；v1/v2 各 2 个真实会话；最终 v3 baseline 2 个真实会话。早期三组均保留，三次维护者采集器修复不算模型效果改善。M2 只使用最终 v3 两例作为配对基线，保持同模型 gpt-6.1-sol、effort high、CLI/权限、输入与新鲜会话。scorer 2.0、execution v3、cases/request、runner 和恢复 fixture 在 M1 checkpoint 固定。

Checkpoint：全部任务代码验证和独立 review 完成；本提交即 M1 冻结点（用 `git log -1 -- examples/behavior-results/phase2-m1.md` 找到）。后续 M2 必须单独提交，不改冻结 rubric/输入/runner。静态 typo 与 internal batch 两例之外的风险不外推；核心 review/授权/strict 路由通过保持条款和独立语义审查核对。
