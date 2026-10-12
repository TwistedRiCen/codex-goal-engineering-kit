# Phase 4A.1 — Native Host Privacy Gate Closure

日期：2026-10-12。结论：**NOT READY / AUTH ISOLATION BLOCKED / SUPPORTED HOST ISOLATION NOT SUFFICIENT**。本阶段调查与有界 helper 改进可以结束；Phase 4A 真实模型验收尚未完成。没有模型 turn、credential 复制、全局配置修改、恢复、重装或远端操作。

## 1. Official Host Capability Findings

当前实际 binary `codex-cli 0.162.0-alpha.17.2`，SHA256 `d13914ced6c7af174d8d638db938284231227312104b06a25e9608c632a7daec`；版本命令本身也使用临时环境。

官方公开支持 CODEX_HOME 选择配置/状态根、CODEX_SQLITE_HOME 选择 SQLite 根；配置 sqlite_home 优先于 SQLite 环境变量。本机无模型实验观察到临时 session 和数据库，未把文档等同于完整模型隔离证明。[官方环境变量](https://learn.chatgpt.com/docs/config-file/environment-variables)。

公开配置层按 CLI overrides、受信 project、所选 profile、user、managed defaults/system 等进行解析，requirements 还可约束目的地。Profile 是 CODEX_HOME 下独立 profile-name.config.toml 文件；project 配置需要 trust，不能覆盖若干认证/provider/telemetry 字段。此次只用临时 user config 和 one-shot overrides，未实际选 profile；config/CLI SQLite 优先级实验因快照缺口停止。[配置基础](https://learn.chatgpt.com/docs/config-file/config-basic)、[配置参考](https://learn.chatgpt.com/docs/config-file/config-reference)。

history.persistence=none 只关闭 history.jsonl，不能等同关闭 rollout/native SQLite 日志。log_dir 可重定向日志目的地；没有证明可以用公开参数关闭所有 native TRACE 内容。本阶段接受受控临时落盘，禁止把 raw reasoning 纳入长期证据。[高级配置](https://learn.chatgpt.com/docs/config-file/config-advanced)。

官方认证支持 file/keyring/auto/ephemeral，但没有找到独立只读 auth-root 继承参数。匹配当前版本的公开源码将 file auth、Windows encrypted payload 或 keyring 身份绑定 CODEX_HOME；空 home 不能凭此继承已有登录。此结论结合只读 account/read 的空 account，不能推广为所有 provider/操作系统认证实现均不可行。没有探测真实 keyring、解析 auth.json、导出 token 或新登录。[官方认证](https://learn.chatgpt.com/docs/auth)、[当前版本 storage](https://github.com/openai/codex/blob/rust-v0.162.0-alpha.17.2/codex-rs/login/src/auth/storage.rs)、[Windows secrets 实现](https://github.com/openai/codex/blob/rust-v0.162.0-alpha.17.2/codex-rs/secrets/src/local.rs)。

用户 Skill 根仍可从 HOME/.agents/skills 发现，临时 CODEX_HOME 不承诺隔离该只读发现根。[Skill 文档](https://learn.chatgpt.com/docs/build-skills)。`/debug-config` 和 `/status` 是公开 TUI 检查入口；本次没有启动交互 TUI，使用 app-server config/read(includeLayers:true) 作有界等价配置检查，未声称它暴露全部字段。[公开命令](https://learn.chatgpt.com/docs/developer-commands)、[app-server 接口](https://learn.chatgpt.com/docs/app-server)。

## 2. Effective Configuration Proof

有效修复运行仅完成 environment 模式。config/read 实际返回：log_dir 为临时根/logs，origin=sessionFlags；cli_auth_credentials_store=file，origin=临时 home/config.toml。实际 layers 包括 sessionFlags、临时 user file、ProgramData system file。真实 user config 不在返回的 user layer 中；系统层并未被 CODEX_HOME 隔离。

sqlite_home 的 effective value/origin 在该公开响应中 NOT EXPOSED；临时 sqlite-env 下确有六库，schema 元数据的 PRAGMA database_list 指向这些文件。这里是“native 创建文件 + 只读 inspector 打开位置”的观察，不是 OS 级 native open-handle 审计。不能据此宣称三模式 precedence 或全部配置来源已经通过。P4 保持 NOT PROVEN。

## 3. Persistence Map

| 路径/层 | 实际观察 | 边界 |
| --- | --- | --- |
| real ~/.codex/config.toml/auth.json/AGENTS/Skills/Agents | 66 文件只读共享锁及前后 SHA 相同 | 静态保护 PASS；不代表全部动态状态相同 |
| temp/home/config.toml | native user layer 实际选用 | 无真实配置复制 |
| temp/home/sessions | 创建无模型 rollout，最终 inventory 有文件 | 不能推断模型内容的所有旁路 |
| temp/home/archived_sessions | thread/archive RPC 失败 | NOT PROVEN，未制造归档 PASS |
| temp/sqlite-env | logs_2、memories_1、queue_1、state_5、thread_history_1、goals_1 六库 | 路径/schema metadata 已观察，writer flush 未证 |
| temp/logs | config 实际 log_dir 指向此处 | 不把 stderr 静默当作隐私证明 |
| temp/home/package metadata | installation_id、系统 Skill 文件等 | inventory 总计 72 文件，未清理 |
| temp/home/auth | account=null，requiresOpenaiAuth=true；没有 auth payload | 可用安全认证 FAIL |
| real user Skill roots | 官方仍可只读发现；保护集合相同 | 没有重装/改写 |

无模型事实链：app-server → thread metadata / command(exit17) → native SQLite / rollout → 临时 filesystem inventory。**model output → notification → 所有 persistence 路径尚未验证**。隔离目录均在专门 OS sandbox TEMP 下，位于仓库与真实 CODEX_HOME 之外。真实目录读权限仍存在，不能把环境变量描述为强制文件系统禁写能力。

## 4. Privacy Preflight

正式结果：PRIVACY PREFLIGHT BLOCKED，modelAuthorized=false。有效勘误为 [correction v2](C:/Users/98053/.codex/visualizations/2026/10/09/01a11e6f-1348-74f3-a833-f9f2a4d074f1/phase4a1-20261012-repair/privacy-preflight-correction-v2.json)。

| 项目 | 结果 | 依据 |
| --- | --- | --- |
| P1 protected/relevant snapshot complete | NOT PROVEN | 三个真实 lock 文件不可哈希 |
| P2 temporary CODEX_HOME active | PASS | user config layer、实际临时 rollout 文件 |
| P3 temporary SQLite active | PASS | 无模型六库文件与 schema/path metadata |
| P4 effective sources complete | NOT PROVEN | sqlite_home 未暴露；其余模式未运行 |
| P5 real config/static protection | PASS | 66 文件 guard 相同 |
| P6 all real persistence excluded | NOT PROVEN | 未证明全部模型路径和系统 requirements |
| P7 temporary output inventory | PASS | 正常退出后完整 72 文件 metadata |
| P8 usable safe auth | FAIL | account=null / requiresOpenaiAuth=true |
| P9 shutdown/drain/flush/handles | NOT PROVEN | EOF exit0 + drain 已观察；全部 flush/handles 未证 |
| P10 complete real postcomparison | NOT PROVEN | 有对照且可哈希范围未观察变化；仍有缺口 |

旧 repair grade 将不完整比较的 unchanged=false 误记 P10 FAIL；原件保留，新文件绑定其 digest 并纠正为 NOT PROVEN，没有重写历史结果。预检纯 grader 永远不授予模型 capability，原 run-runtime-v4.cjs 的 E1–E4 硬门禁保持不变。

## 5. Config Drift Investigation

历史首次 native 前 config：initial `63a12ca39fa7918561130be15c2f4b432c6b43d4f424a2460c656896b88b1c83`，runtime boundary `b62e5962ec7414370c7417aad4e747bcef572e693c88f7d595084a55e6e4325f`。本阶段只读复核既有 metadata，未取得可供 changed-bytes 归因的旧配置副本。

本次当前 config SHA256 `261c57c8d48ac5b13ebba90fc785291bd7e8bc2fa2d0942e0bac8e1a1275da39`，size 4316，LastWriteTimeUtc `2026-10-12T01:02:51.654Z`。本次 guard 前后该 hash 相同。mtime 只证明当前最后写时间，不能定位历史 changed bytes 或写入者。没有取得支持 app/CLI、用户操作、自动升级或 harness 归因的 writer 证据；旧差异和新增变化原因均 UNKNOWN。未修改或恢复真实 config，Phase3 四 trust 授权未复用。[metadata 调查](C:/Users/98053/.codex/visualizations/2026/10/09/01a11e6f-1348-74f3-a833-f9f2a4d074f1/phase4a1-20261012-repair/verification-and-drift.json)。

## 6. Real Runtime Acceptance

| 场景 | 实际 model run | completeness / result |
| --- | --- | --- |
| E1 DIRECT | 否 | NOT PROVEN / BLOCKED |
| E2 risk/reviewer | 否 | NOT PROVEN / BLOCKED |
| E3 STANDARD | 否 | NOT PROVEN / BLOCKED |
| E4 progressive loading | 否 | NOT PROVEN / BLOCKED |
| R4-A main | 否 | NOT PROVEN / BLOCKED |
| R4-B standard-state | 否 | NOT PROVEN / BLOCKED |
| R4-C evidence-and-delivery | 否 | NOT PROVEN / BLOCKED |
| R4-D FULL/continuity negative | 否 | NOT PROVEN / BLOCKED，未把未读视为负向通过 |

新的无模型 command 返回17，EOF修复运行 exit0，不是任何 model acceptance。已有 E5、synthetic E6、M3 INCONCLUSIVE 和 Phase1–4 的评分保持原状。

## 7. Reviewer Evidence

当前版本 native review schema 的 prose 限制继续适用，未运行真实 typed reviewer。未来执行/捕获应为 OBSERVED；reviewer structured judgment 为 DECLARED；harness role 为 HARNESS_CONFIG；native role 为 UNKNOWN；human-style independence 为 NOT PROVEN。

本阶段两位只读独立 implementation reviewers 不参与实现，分别审查 privacy boundary 和 runtime evidence。两者没有启动 native/model 或读取 auth 内容。这是实现审查，不能借给 E2 作为真实 runtime reviewer 证据。

## 8. Protected Environment

有效 repair before/after：437 文件集合相同，可哈希范围未观察变化，66 静态文件 guard 相同；真实 `.sqlite-maintenance.lock` 与两个 tmp/arg0 lock 有读缺口，完整用户状态保持不变未证。首轮还观察当前会话和真实 WAL/SHM 变化，归因 UNKNOWN；没有恢复。

首轮 archive RPC 失败后强停屏障未完成，进程曾仍存活；只读 CIM 核实子 PID41028、parent2024、唯一临时 root 后，精确结束该宿主。该首轮失败证据不计隔离通过。修复后 archive 失败明确记 NOT PROVEN，随后正常 EOF exit0。最终代码还保证失败关闭与诊断写失败不能绕过 actual process close/handler drain；诊断仅保留 PID/root，待关闭后才报告稳定错误。这个新增失败分支通过合成 transport tests，不宣称重新实跑该 native 异常。

两次 native 临时审计根保留，不删除，不复制 native 内容到长期证据。可定位完整根路径于各 native-draft.json 的 tempRoot。第一轮及修复轮所有长期输出只有必要 metadata / sanitized facts；不含 raw reasoning 或 auth response body。

## 9. Verification

新增 focused tests 覆盖环境 allowlist/秘密排除、路径重叠/逃逸、缺项闭门、snapshot gap、新文件变化、graceful EOF/nonzero/timeout、failed lifetime 和诊断失败必须等待两个屏障。最终 focused 30/30。

完整相关 Node suite 首次受限运行 155/157，两个原有 Git fixture 报 FIXTURE_GIT_FAILED；本机重跑 157/157。随后新增一项诊断失败负向测试，最终完整相关 suite **158/158 PASS**，外部 final-verification-v2.json 记录结果。PS7 guard12/12；PS5.1 首次 AuthorizationManager 受限，未更改执行策略，本机重跑12/12。没有重做146测试设计、历史 replay、M3 或 installers。

两位独立 reviewers 发现并促成修正：关闭失败不能继续封口；不完整 P10 不得变 FAIL；recovery diagnostic 写失败不能跳过生命周期等待。最终修复复审记录外部 reviewers-final.json；没有剩余实现发现时才提交。原模型硬门禁/collector/rubric 未修改。

## 10. Repository State

Branch `codex/modernize-evaluation-and-skill`；baseline `eede90f6032c5e18d8d4f5ef78097ec6eba67c6b`。本阶段仅 privacy helper/probe/wrapper、host 受支持环境/正常退出、相应 tests、当前 PLAN 和本报告。新本地 commit、最终 HEAD/status、无 journal 的读回记在外部 delivery-state.json；提交后生成该记录以避免自引用。未 amend/history rewrite/remote work/native Goal。

## 11. Installed Environment

只读诊断：source/installed Goal Skill 全部9文件字节一致，与74ca37f candidate保持同步；只有一个发现副本，五个 managed agents 同步。本阶段 Skill、references、prompts、PLAN template、recovery、installers 无 diff，未重装。

## 12. Remaining Limitations

临时 home/session/SQLite 正向路径有本机无模型证据，但 auth 继承、archive、模型全 persistence、完整 snapshot、SQLite writer flush 和所有句柄释放仍缺。正常 EOF 不是 flush receipt。环境 allowlist 不隔离 system/managed config，也不是 OS 禁止写入真实所有目录的能力。

当前 host+既有登录边界没有被证明能安全运行真实验收；不能用 token 导出/复制/新登录、私有开关、host patch、logger bypass 或协议改造来解锁。临时目录被平台管理，其未来保存期限未获保证；当前未主动清理，原路径与摘要已记录。

## 13. Recommendation

**NOT READY**。主要分类：auth/privacy limitation；其次 host capability/config exposure 与 evidence limitation。首次退出路径缺陷已修，不能把修复当作验收成功。当前 Kit 可以安全保持模型硬门禁、执行有界无模型探测、保留版本化证据与缺口；尚不能完成真实 E1–E4/R4。

**SUPPORTED HOST ISOLATION NOT SUFFICIENT**。缺少符合本授权的既有认证继承与完整 persistence/flush 证明；建议等待受支持宿主能力或另行审议明确边界，不自动进入M4B。继续保留 Phase4A NOT READY 和所有历史 NOT PROVEN。

**PHASE 4A.1 COMPLETE — AWAITING NEXT AUTHORIZATION**
