# Phase 4B — Maintenance Engineering + Open-source Readiness

2026-10-12；baseline `5e3388343663cadb46412742570d90e0d074c222`。本阶段范围已验证，推荐 **READY WITH LIMITATIONS**。不改变 Phase4A/4A.1 的历史结论，不表示已经发布。

## 1. Maintenance Architecture

[test-all.ps1](../../scripts/test-all.ps1) 是本地与 CI 的权威入口，[maintenance-checks.json](../../scripts/maintenance-checks.json) 是显式检查清单。入口定位仓库、验证依赖/清单、执行独立子进程，任一失败立即非零退出，不把未运行项记为通过。维护工具不调用 Codex、模型或真实 installer 目标。

## 2. Verification Entry Points

- Quick（默认）：metadata、当前维护文档链接、CI 静态契约、三份核心 Node suites；Windows 加 Skill/Agent validators、contract/encoding fixtures。
- Full：Windows 全部八份 Node suites及每个可用 PowerShell runtime 的十项检查，含隔离 installer、receipt/recovery、diagnostics 与无模型 runtime controls。
- Runtime optional：高级、证据导向、依赖宿主能力；真实模型/宿主验收必须另行授权并通过原 capability gate，不进入维护入口或默认 CI。

从任意目录调用脚本均定位到仓库；不安装缺失 runtime、不调整 execution policy。

## 3. CI Coverage

[workflow](../../.github/workflows/maintenance.yml) 配置 Windows Full、Ubuntu Quick，共用唯一一条入口调用。checkout/setup-node 仅准备环境，contents read、关闭 credential persistence 和 package-manager cache，无模型 secret、用户 credential、native Goal 或真实安装命令。

| 边界 | 证据与范围 |
| --- | --- |
| CI-covered（配置范围） | Windows deterministic Full；Ubuntu metadata/local links/核心 Node Quick，Windows 专用负向 child fixture 显式 skip |
| 本机实际执行 | Windows PS7 Full、PS5.1 默认 Quick通过；Full 十项 PS checks 在两 runtime 均通过 |
| Tests not run | 远端 GitHub Actions、实际 Ubuntu runner；配置存在不等于执行 PASS |
| local-only / 另行授权 | 真实安装/升级、新会话加载、真实 config/auth/宿主检查、本机安装差异 |
| capability-blocked | E1–E4/R4、实际 typed reviewer、supported isolated model auth、完整 persistence/flush |

YAML 结构经人工审查；自动 validator 是静态安全/入口/范围契约检查，不是完整 YAML parser 或 GitHub 执行器。Markdown 只检查当前维护文档相对文件目标，不验证 URL/anchor 或全部历史机器路径。

## 4. Version Strategy

[VERSION](../../VERSION) 为唯一可写 Kit version source，当前 **0.1.0**，pre-1.0 开发身份，未 tag/release。Patch 不改变持久协议；Minor 增加兼容能力；Major 对 PLAN/journal/recovery/stable prompt/agent breaking 变更要求显式兼容性决策。Kit version 与 schema/rubric version 分离。

InstalledKitVersion 为 UNKNOWN：已有 package-only 安装没有 Kit provenance stamp。内容 fingerprint 证明字节身份，不能反推唯一安装 commit。

## 5. Changelog / Migration

[CHANGELOG](../../CHANGELOG.md) 的 Unreleased 记录用户可感知维护、诊断、兼容性和限制，不复制 Git log。正式发布标题对应当次 VERSION，研究证据继续链接原报告。

[compatibility](../../docs/compatibility.md) 明确已有 PLAN 保留、legacy journal 不转换、schema 2 receipt/recovery 不变、installed Skill 无迁移要求。本次无真实 migration，未新增空迁移文件；未来 breaking change 才写目标版本迁移说明。

## 6. Documentation

两份 README 收敛为首次使用、安装/诊断/升级、DIRECT/STANDARD/FULL、Goal 关系、可选角色和维护入口。完整协议继续由 Skill/references 掌管。

[maintenance](../../docs/maintenance.md)、[support](../../docs/support.md) 分别说明验证范围与支持边界；[CONTRIBUTING](../../CONTRIBUTING.md) 与轻量 PR template要求契约影响、兼容性、实际验证和 runtime claims。未增加价值不明确的 Issue 流程。

## 7. Known Limitations

- Phase3 **ACCEPT WITH LIMITATIONS**；R2/R3 frozen grader **FAIL**。
- Phase4A **NOT READY**；Phase4A.1 **NOT READY / AUTH ISOLATION BLOCKED / SUPPORTED HOST ISOLATION NOT SUFFICIENT**。
- E1–E4、R4 real runtime、actual typed reviewer、persistence/flush completeness 均 **NOT PROVEN**；auth isolation blocked；historical config drift **UNKNOWN**。
- M3 recovery optimization **INCONCLUSIVE**，正式 recovery defaults 不变。

这些保留为 External Host Capability Limitation。原 criterion 未删除；owner 为 external Codex host，重新打开要求独立授权及支持的 auth/isolation/persistence/flush 证据。未继续 host workaround、credential forwarding、SQLite/native logging 或 collector 增强。

## 8. Protocol Integrity

baseline 比较：68 个冻结文件 SHA256 均未变化，包括 Skill/references、PLAN templates、prompts、agents、installers、receipt/recovery 和 runtime instrumentation/历史证据。DIRECT/STANDARD/FULL、`/goal → strict`、schema、fingerprint、receipt、review/change-control/evidence reuse 均无行为变更。

root PLAN 只更新本阶段范围、验收和 external deferred criterion，模板 schema 与历史 ledgers 保留，不写 PROJECT COMPLETE。诊断脚本仅增加只读 Kit identity/package fingerprints，不改变安装器或协议 fingerprint。

## 9. Verification

| 实际检查 | 结果 |
| --- | --- |
| 修复后 maintenance 正向/负向 fixtures | 9/9 PASS；真实 Node 执行标记、Node/PS exit7、缺项/重复/未知模式拒绝 |
| PS5.1 默认 Quick | 81/81 Node；三项 PS checks PASS |
| PS7 Full | 167/167 Node；八份 Node 文件；十项 PS checks × 两 runtime PASS |
| Runtime versions | Node24.19.0；PS7 7.6.5；Windows PowerShell5.1.26100.9549 |
| contract/encoding | 每 runtime 37 contract fixtures 加既有 encoding fixtures PASS |
| persisted recovery | 每 runtime16 cases /85 assertions /32 atomic replacements PASS；不等于 crash durability |
| config guard | 每 runtime12 synthetic checks PASS；不等于真实 config restore/auth 隔离 |
| metadata/links/CI contract | PASS；64 个当前相对目标、八份 Node 文件完整登记 |
| 最终 diff / hashes | whitespace check PASS；68冻结文件、source/install9文件、三项受保护本机配置 hash 无变化 |

日志和 hash-only metadata 在外部 `phase4b-20261012` evidence 目录；不提交临时夹具或私密宿主日志。保留先前沙箱 AuthorizationManager/Git fixture 限制、旧版本结果及修复前7/9 FAIL观察，最终通过不覆盖失败历史。

## 10. Independent Review

独立只读 reviewer 检查 maintainability、compatibility、claims，实跑 metadata、两 runtime diagnostic fixtures及维护负向测试。发现一项 MAJOR：fixture 子进程继承 Node 内部 NODE_TEST_CONTEXT，嵌套 suite 被跳过却 exit0。仅在模拟独立 CLI 的 fixture 子进程去掉该上下文，生产入口不修改环境。保留执行标记和 exit7 断言，独立复跑9/9 PASS；该 finding 已解决。

最终文档/PLAN/full日志独立复核 **PASS**，无剩余材料性 findings；结果记录于外部 review-final.json。本地 commit/clean readback 由主任务随后完成，不冒称 reviewer 已执行提交。

## 11. Repository State

branch `codex/modernize-evaluation-and-skill`；开始时 HEAD `5e338834`、87 tracked、无 untracked、clean，只有 ignored `.idea/`；无 active journal。改动形成新独立本地 commit，不 amend 历史提交。避免报告自引用，交付 HEAD/message、最终 clean status、journal readback 提交后写入外部 delivery-state.json，并在最终回复报告。

本次无 push、PR、merge main、tag、release 或 deploy。

## 12. Installed State

Skill package **零 diff**，未重装。source/install全部9文件 synchronized；只读诊断 duplicate count0、scan complete。两端 manifest fingerprint 同为 `818d713d18a5a347ec02cd021ef3c31b500a21aa347f20eb31b1bb47ce9845ce`。沿用已知74ca37f安装来源；诊断不伪造 installed Kit version/commit。

## 13. Outstanding User Decisions

**LICENSE DECISION REQUIRED BEFORE FORMAL PUBLIC DISTRIBUTION**。仍无 LICENSE，未代选。是否 merge main、push、建立正式 release/version tag 均由用户决定，本次未执行。

## 14. Recommendation

**READY WITH LIMITATIONS**：仓库可控范围内维护工程与本地验证完成，可进入最终合并/发布决策；已配置 CI 的远端/Ubuntu 执行尚未验证，LICENSE 尚待用户决定，外部宿主 runtime acceptance 仍 deferred。不会因外部限制自动否定 Phase4B，也不会因此宣布 Phase4A 通过。

PHASE 4B COMPLETE — AWAITING FINALIZATION AUTHORIZATION
