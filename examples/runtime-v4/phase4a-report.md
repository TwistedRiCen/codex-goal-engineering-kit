# Phase 4A — Runtime Evidence Integrity + Host Isolation Hardening

日期：2026-10-10。建议：**NOT READY**。本次交付 versioned instrumentation、测试、独立复审及无模型运行证据；**Phase 4A 的全部验收尚未完成**，不进入 M4B。真实 E1–E4 / R4 loading 与 typed reviewer 仍 NOT PROVEN。M3 保持 INCONCLUSIVE。

证据目录：`C:/Users/98053/.codex/visualizations/2026/10/09/01a11e6f-1348-74f3-a833-f9f2a4d074f1/phase4a-20261010`。该目录新建，历史 Phase 3 目录未写入。测试与控制均不调用付费模型。

## 1. Root Cause Map

[修改前根因地图](root-cause-map.md) 在实现前建立，覆盖 host → event/tool → transport → collector → observation → rubric → report 七层。

| Phase 3 缺口 | 定位与处置 |
| --- | --- |
| 当前 tool/event 漏采 | 旧 collector 忽略/简化实际事件；v2 保留安全 type、unknown domain 和 opaque I/O，未知内容不保存。 |
| reviewer 自述升格 | 原 wait/PLAN 不证明 verdict；新 schema 分开 captured execution 与 DECLARED judgment，公开 native review 接口的结构化缺口见第3节。 |
| exit -1 无根因 | 旧 normalization 只留下 status/digest；新版本用稳定结构化 code 分类，-1 单独仍 UNKNOWN。 |
| wrapper/schema 演进 | 旧限定字符串 parser 不认识 compound wrapper；新版本采用 structured parameters/registered argv/trusted receipts，保留旧 rubric。 |
| persistent trust | 原 fixture 的全局 trust 副作用已冻结为 FAIL；当前采用 process-local override + 真实文件只读锁。没有重新归因原四段的具体 writer。 |
| R4 两次读取失败 | 原始信息不足，路径/wrapper/sandbox 原因仍 UNKNOWN；已拆分场景和 successful read receipts，真实模型重验受阻。 |
| STANDARD 无 PLAN replay | 原报告未保留完整 PLAN 且 scratch 清理；新公开 control packet 从初始状态起保存完整 PLAN，不补造旧事实。 |
| path false negative | 双反斜线 spelling normalization 修复；字符串命中仅 INFERRED，不能等同成功读取。 |

另修 malformed JSON/null 非对象导致 collector crash；错误输入保留 gap。所有改进属于新的版本，不把历史 FAIL/NOT PROVEN 重评成 PASS。

## 2. Observation Schema

版本：**observation schema 2 / execution-regression-v4 / runtime rubric 3.0**。PASS 语义变化使用新 major。详细契约见 [observation schema](observation-schema.md)。

- OBSERVED：结构化 native event、可信 executor 实际 I/O、文件快照。
- DECLARED：模型文本、PLAN 状态、typed reviewer verdict/findings/配置角色。
- INFERRED：非结构化字符串的受限路径候选。
- UNKNOWN：未暴露、无法验证或不充分；不自动当 PASS/FAIL。

Session 包含 scenario/runtime/candidate/model/effort/workspace/start/end；command 包含 identity/attempt/argv/exit/code/category/digest；read/write 包含路径、操作、成功、字节及 digest；agent/reviewer 包含线程、角色来源、baseline/diff、完成、结果捕获及 severity counts；interaction 分开 question/approval/material decision。完整公开快照明确 PLAN/journal 与受保护文件。

collector 不出验收结论；grader 每项 PASS/FAIL/NOT PROVEN。check 摘要须与**全部实际 observed checks**一一匹配并保持 attempt 顺序，最终实际检查由 observation 决定，不能删失败或逆序重封包。缺 primary identity 拒绝借用 reviewer 的读取。

## 3. Reviewer Evidence

实测当前 binary 生成 447 个公开 JSON schemas；公开匹配 tag 用于追踪实现，不能宣称 binary 与 tag 字节完全相同。native `exitedReviewMode.review` 是 prose string，公开字段不提供 typed verdict/findings/native role/readOnly/baseline。不能通过自然语言正则补出这些事实。[官方 app-server 协议](https://learn.chatgpt.com/docs/app-server)；具体实测 schema/源码引用保留在证据目录的 `p4a-host-schema-current/findings.md`。

新 typed-output reviewer 设计要求：分别创建线程、native read-only sandbox、相同 baseline/diff、成功读取最终四文件及字节匹配、实际完成、有结构化结果与 digest。role=HARNESS_CONFIG 是声明，nativeRole=UNKNOWN；完成和捕获属于事实，判断仍是 reviewer 声明。不同线程不等于人类独立性证明。

Captured/missing/self-review/wrong baseline/stale read/material findings 控制通过；**当前宿主真实 reviewer 模型场景 Tests not run**。原 Phase3 NOT PROVEN 不变。该限制由当前接口能力证据支持，不归因 Skill。

## 4. Host Event Compatibility

Known event 安全 normalize；unknown 保留 type、unsupported、affectedDomains，不 crash、不静默抛弃、不视为成功。fileChange/webSearch/imageView 等 opaque I/O 撤销受控负向读取完整性。registered dynamic tool request 只证明调用，成功加载必须可信 read receipt。

Unknown command 只阻碍依赖该命令的 criterion；独立完整文件快照仍可判断。负向加载仅覆盖明确完整的 registered executor，排除隐藏 Skill preload / OS reads，不以“没观察到”证明“没发生”。

当前 alpha.17.2 移除 `--ignore-user-config`；真实 environment echo 位于 `thread.environments`；Windows nonstream command/exec 不支持 custom outputBytesCap。wrapper 已按当前接口适配，alpha.2 记录保留，不宣称同一宿主。[当前 Windows command 实现](https://github.com/openai/codex/blob/rust-v0.162.0-alpha.17.2/codex-rs/app-server/src/command_exec.rs#L179)。

## 5. Failure Classification

结构化 ENOENT、ETIMEDOUT、SANDBOX_DENIED、WRAPPER_ERROR、EPIPE/ECONNRESET 控制分别覆盖 process start、timeout、sandbox、wrapper、transport 分类；未知 code 和 exit -1 单独保持 UNKNOWN。实际非零 exit（除 -1）可分类 PROCESS_EXIT_NONZERO。

真实 E5 固定 `node -e process.exit(17)`，记录 exit17 和 PROCESS_EXIT_NONZERO。没有从 stderr 猜 permission 根因，没有保存不必要完整 native stderr。原 R4 exit -1 原因不被本次成功 E5 追溯“修正”。

## 6. Host Isolation

Before：Phase3 四个 fixture trust 段造成原 config drift FAIL；已另行授权精确恢复的历史结论保留。
After：process-only trust/config override；ephemeral thread；外置 sqlite_home；history none；shell snapshot off；不复制 auth/配置。当前必须加载 existing user config，明确披露这一边界。真实 config/auth/AGENTS/Skills/Agents 共66文件 readonly locks；锁后再次核 hash，检查 protected tree 集合；native process closed + request handlers drained 后才 snapshot/seal/解锁，失败不产 accepted replay。

`preflight-3-ps7` 与 `runtime-E5-2-ps51` 均66项 before/after相同；实际 environmentEcho=[]，processClosed/requestsDrained=true。**没有修改或恢复真实 config**。CAS fallback 未使用；没有新永久 trust 配置。write attempt 未计数，因此是 UNKNOWN，不声称“没有尝试写”；早期 preflight-2 的误导性字段以独立 errata 说明，原文件保留。

**初始基线差异：** quota interruption 后、首次 native launch 前，config hash 已从 `63a12ca39fa7918561130be15c2f4b432c6b43d4f424a2460c656896b88b1c83` 变为 `b62e5962ec7414370c7417aad4e747bcef572e693c88f7d595084a55e6e4325f`；其他65项一致。来源 UNKNOWN，不归因 app 更新或 harness。初始快照、差异分析与独立 execution boundary 全部留存。只证明上述运行相对 execution boundary 零漂移，**不宣称整个 Phase4 从最初配置到最终全字节一致**。精确旧 hash 恢复条件未证成，不套用 Phase3 四项恢复授权。

**宿主隐私阻断：** 当前 native SQLite log_db 默认 TRACE 独立于 RUST_LOG；notification 正文先 trace，可能包含模型内容。ephemeral/外置数据库/adapter redaction 都不证明 raw reasoning 未落盘。[log_db filter](https://github.com/openai/codex/blob/rust-v0.162.0-alpha.17.2/codex-rs/state/src/log_db.rs#L61)、[notification trace](https://github.com/openai/codex/blob/rust-v0.162.0-alpha.17.2/codex-rs/app-server/src/outgoing_message.rs#L766)。未找到支持关闭机制，因此 E1–E4 在 seed/host 前由无 override gate 拒绝。

Workspace-write 执行 actor 修改的 JS 还存在私密读取后写回公开文件的风险，未进行真实泄露测试。Windows positive Read profile 需 elevated backend，setup/ACL 可有永久影响，未尝试；Node permission 仅辅助 seatbelt。[Node 官方限制](https://nodejs.org/api/permissions.html)。当前可达无模型路径通过复审，不等于未来任意 actor 代码隔离已解决。

## 7. Runtime Regression vNext

| 场景 | 类型与结果 | 证据 / 限制 |
| --- | --- | --- |
| E1 DIRECT | **NOT PROVEN — blocked** | 真实 runCase 入口执行拒绝；seed/native/model 均未发生；结构/验收控制通过。 |
| E2 escalation/reviewer | **NOT PROVEN — blocked** | 同隐私 gate；typed reviewer 捕获只是 synthetic controls，不冒充实际 reviewer。 |
| E3 STANDARD | **NOT PROVEN — blocked** | 真实模型未运行；独立的 root-authored公开 control 具有实际 Node focused/acceptance、完整 initial/final PLAN，重评 PASS。 |
| E4 progressive loading | **NOT PROVEN — blocked** | 无真实加载观测，不制造 negative assertion。 |
| E5 safe host failure | **PASS — actual native/no-model** | PS5.1 wrapper、当前 host、退出17、完整 command tuple、protected guard/shutdown；`runtime-E5-2-ps51`。 |
| E6 unknown compatibility | **PASS — synthetic compatibility** | unknown 保留、payload丢弃、相关 command criterion NOT PROVEN、unrelated-files PASS；整个语义评分 **NOT PROVEN**。 |

R4-A/B/C/D 的真实模型结果全部 **NOT PROVEN**。A main-only、B standard-state、C evidence-and-delivery、D ordinary STANDARD 无 FULL/continuity 分别有 scorer/read-completeness controls；这些不替代真实 reference loading。模型调用数 **0**；未借额度中断作为测试失败结论。

[完整公开 STANDARD control replay](standard-control-replay.json) 是新 fixture：root 自己实现公开代码并运行真实 Node 验收、直接提供有限可信 receipt feed；明确 `synthetic-control-root-authored-no-model`。全 PLAN、保留 AC-OLD/D-1/baseline receipt、counter 与全部评分输入可确定性重评。不是旧 PLAN 重构，也不是 E3 模型成功。

## 8. Frozen Evidence Integrity

`final-integrity.json`：**64个冻结 tracked files、218个Phase3 external files、9个Skill source files**与初始 hash 全一致；实际 installed Skill 同字节。唯一允许既有 tracked 变化为当前 PLAN 和两份 README。

Phase1/Phase2报告、frozen v3/rubric2、Phase3 R1–R5、R2/R3 FAIL、reviewer/R4 NOT PROVEN、原 config drift FAIL 不改写。M3 INCONCLUSIVE；/goal→strict、六状态/五动作/schema2/receipt/fingerprints/AllowedPaths/legacy 不变。未重评旧记录。新 E5 早期packet/grades 和 preflight失败保留，新最终 grades 另存。

## 9. Verification

| 验证 | 实际结果 |
| --- | --- |
| 完整 Node tests（旧72 + 新74） | **146/146 PASS**，无模型；含malformed/null、unknown、reviewer正负、假summary/遗漏/逆序、primary缺失、独立acceptance、完整公开 replay、取消/退出屏障。 |
| PS7.6.5 / Windows PS5.1.26100.9549 guard | **各12 checks PASS**，合成临时文件only。 |
| 两PS：Skill/profile validators、encoding、check-installation fixtures | **PASS**；五profiles、LF/CRLF/BOM/missing-heading、只读diagnosis负例。 |
| 最终 PS7 wrapper native预检 | **PASS**；无 turn/start、无模型。 |
| 最终 PS5.1 wrapper E5 | **PASS**；真实固定命令，保护66项。 |
| 安装现状只读诊断 | Skill SYNCHRONIZED、1份copy、duplicate0、5 profiles SYNCHRONIZED、ScanComplete=true。 |
| 完整 replay重评分 | STANDARD control PASS重复相同；E6整体NOT PROVEN符合期望；E5 PASS。 |
| frozen/protected hash、tree、diff检查 | 见第8节及execution boundary；未误报initial config差异为一致。 |

默认sandbox早期2个Git seed测试因临时 .git/config写拒绝失败；授权隔离执行后通过，保留原记录，不放宽真实配置。installer/Skill package未变，因此未重跑无关完整 installer suite；真实E1–E4/reviewer/R4 **Tests not run**，原因是隐私边界未证成。

## 10. Independent Reviews

Instrumentation：`/root/p4a_pipeline`。v1发现 I1 check-summary矛盾/后续遗漏逆序、I2只旧scalar即可PASS、I3缺primary借reviewer读取、I4任意JS私密写回风险；I5提醒风险判断属于声明。I1以全tuple/全量顺序/latest绑定修复并独立重构负例关闭；I2固定protected acceptance + 实际回执，AC-NEW声明分开；I3必填primary/filter；I4当前 gate 阻断模型路径，未来任意JS边界仍未验收。

Host Isolation：`/root/p4a_host`。v1–v4检查真实child close、queued/active requests drain、completion回调错误、锁后hash、opaque I/O、shutdown后重取观测。相关缺口修复并复审，最终当前无模型可达路径无新增BLOCKER/MAJOR，paid路径仍NOT READY。H4曾为 reviewer JSON转义误读，已WITHDRAWN，不能当真实实现bug。正常 command stdout “必然落盘”的推测已纠正为UNKNOWN；notification trace源码证据仍成立。

两个 reviewer 未参与对应实现。v1历史记录不覆盖，修复复审独立留存。未把组件review通过等同整阶段完成。

## 11. Repository State

Branch：`codex/modernize-evaluation-and-skill`；baseline HEAD：`74ca37f5ffeb140be3ad060233282dbc4c0eb9ef`。本报告随**一个独立本地 commit**交付，无 amend/history rewrite。提交后精确 HEAD/message/status 写在外部 `delivery-state.json`，可用 `git log -1 -- examples/runtime-v4/phase4a-report.md`定位，不在自身commit内容里伪造自引用hash。

提交前完成diff/scope检查；提交后复核clean（忽略既有.idea）、无 active journal、无native Goal。没有push/PR/tag/release/deploy/main/merge。PLAN的运行验收状态保持BLOCKED而非COMPLETE。

## 12. Installed Environment

Skill package **9 files未变**，installed copy逐字节一致；不重装，五角色同步。未改global AGENTS/model/effort/auth/API/其他Skill/personalAgents。执行边界全部66protected文件与集合最终一致；初始至边界config差异按第6节明确保留，最终全阶段无漂移完成判据尚不能确认。

原host alpha.2在额度中断后不再可用；当前alpha.17.2实测。model/effort请求仍gpt-6.1-sol/high，但没有模型turn，不能称同host配对benchmark。native自身日志/临时metadata存在于host机制或新state目录，不声称整机零写；本次没有生成模型raw thoughts或复制真实秘密。

## 13. Remaining Limitations

1. 必须找到受支持且可验证的 native model日志隐私机制，之后独立复审，才能解除 gate；本阶段没有force开关。
2. 真实E1–E4/R4、typed reviewer、sandbox读写否定控制尚缺；synthetic/control PASS只验证instrumentation。
3. 初始config差异归因UNKNOWN，未满足全阶段最初hash一致；不在无精确恢复证据时修改用户配置。
4. Registered I/O completeness排除hidden preload/OS reads；negative assertions不可扩为系统全读取保证。
5. 新replay digest是内容完整性，不认证恶意harness；公开source不认证binary完全一致；命令错误未知保持UNKNOWN。

## 14. Recommendation

**NOT READY**。已交付的collector/grader/guard/无模型host路径可review与复用，但本阶段真实加载、reviewer与全阶段宿主边界验收不足。当前工作范围内安全可完成部分已验证并本地提交；真实运行阻断保留在PLAN，不能隐藏NOT PROVEN，也不能宣布Phase4A全部完成。

不自动进入M4B，不请求放宽原有隐私/配置约束。下一步需要受支持的宿主隔离能力和可验证的原始配置差异处置依据；随后继续当前阶段的真实验收。用户要求的 COMPLETE 停止标记只有在完成判据满足后才适用，本次不以该标记代替未完成事实。
