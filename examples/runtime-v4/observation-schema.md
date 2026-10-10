# Runtime observation 2 / execution-regression-v4 / runtime-3.0

本版本只用于新的 instrumentation evidence；不修改、覆盖或重评 Phase 1–3、rubric 2.0 和 frozen v3。当前真实模型场景 E1–E4 **NOT PROVEN / blocked**，不是模型 benchmark。完整阶段状态见 [Phase 4A 报告](phase4a-report.md)。

## 事实与评分

`runtime-observation-v2.cjs` 只采集事实；`score-runtime-v4.cjs` 每项产生 PASS / FAIL / NOT PROVEN。

事实字段为 `{value, source}`。OBSERVED 是 host 结构化事件、受控 executor 回执或实际文件系统快照；DECLARED 是模型、PLAN 或 typed reviewer 的判断；INFERRED 是字符串路径候选或配置行为推导。UNKNOWN 是缺失，不是成功或失败。row 的 OBSERVED 不提升其 DECLARED 字段。`PLAN: review PASSED` 永远不证明 reviewer invocation 或 verdict。

## observation

| 集合 | 主要字段与边界 |
| --- | --- |
| metadata | scenarioId、runtimeVersion、candidateIdentifier、model、reasoningEffort、workspace、start/endDisposition；只留安全标识。 |
| events / unknownEvents | 安全 eventType、tool/category、thread/turn/sequence、unsupported、affectedDomains；unknown 不 crash，不静默消失。隐私可疑类型用 UNKNOWN，不保留 payload。 |
| commands | commandId、attempt、status、exitCode、stable errorCode、failureCategory、受限 argv、outputDigest；重复 started/completed 不重复计数。不存完整命令/输出/stderr。 |
| reads / writes | 受控 executor 实际路径、READ/WRITE、success、bytes、contentDigest。workspace 相对路径或 skill/前缀；外部路径只有 UNKNOWN/digest。 |
| files | created/modified/deleted/protected/intact；replay 还保存实际公开文件全文，明确 PLAN/journal 是否存在。 |
| agents / reviewers | 调用 ID、thread、role、readOnly、baseline/diff、completion、resultCaptured/digests、verdict、severity counts。host 未暴露字段为 UNKNOWN。 |
| interactions | 实际 question / approval / material-decision 回执；不按问号正则推成用户决策。 |
| declarations | 模型文本 digest 和声明的模式；不存思考内容，不当执行证明。 |
| completeness | transportComplete、controlledToolsOnly、registeredTools；只覆盖注册 executor，排除宿主隐藏 preload/OS 读取。 |

只有 trusted harness 可以调用 `record()`，模型只能请求注册工具，不能提交自己的 evidence receipt。成功 read 必须来自真实文件读取；structured commandActions 和字符串路径提及不证明加载。Windows 双反斜线、slash 和 UNC 可以规范化 spelling，但不能代替 realpath/no-link 检查。

## Reviewer gate

当前官方 app-server `exitedReviewMode.review` 是 prose string，没有公开结构化 verdict/findings；native role/readOnly/baseline 也不能从该 string 取得。schema 证据证明这一接口限制，旧 R2-risk 仍 NOT PROVEN。

新的 typed-output reviewer 设计要求分别创建 actor/reviewer thread、read-only sandbox、匹配 baseline/diff、reviewer 成功读取四个实际最终文件、真实完成、有效 JSON payload 和 digest。role 来自 HARNESS_CONFIG，属于 DECLARED；nativeRole 保持 UNKNOWN。判断/严重性计数是 reviewer 的 DECLARED judgment，捕获与线程身份是 OBSERVED。不同 thread 不证明人类独立性或判断质量。

上述路径的 captured/missing/wrong-baseline/self-review/old-file-read 控制已测试；**未进行当前宿主真实 reviewer 模型运行**。不把 synthetic gate PASS 说成真实 reviewer acceptance。

## unknown 与 failure

unknown 按证据域影响 criterion。成功的正向 read 可由直接回执判断；缺少完整 reads 范围时，禁止加载的负向结论是 NOT PROVEN。opaque fileChange/webSearch/imageView 保留 gap，不能提升受控 I/O 完整性。未知 command 不自动否定完整文件快照。

稳定 code ENOENT / ETIMEDOUT / SANDBOX_DENIED / WRAPPER_ERROR / EPIPE、ECONNRESET 可分别分类；实际非零 exit（除 -1）是 PROCESS_EXIT_NONZERO。单独 exit -1、非结构化 stderr 推断或未知 code 必须 UNKNOWN。E5 真实固定 `node -e process.exit(17)` 已记录 exit17 / PROCESS_EXIT_NONZERO；不需要秘密或完整 stderr。

## Replay contract

packet 保存 schema/harness/scenario/primaryThread、完整 initial/final 公开文件（包括实际 PLAN）、baseline/HEAD/full counter、normalized observation、与 commandId/threadId/exitCode/outputDigest 绑定的 checks、reviewerExpected、task/prompt/digests、Skill/harness manifests、host/effective config、shutdown 和 limits。

`sealReplay` 按递归 sorted-key canonical JSON 生成整个输入的 SHA256；`gradeReplay` 校验版本、own fields 和 digest，不接受 missing primary 身份，也不把其他 thread 的读取算 actor。digest 是完整性检测，不是签名或对恶意 harness 的独立证据。文件保护由场景允许路径和两端快照重新计算；检查摘要必须完整、一一匹配实际 checks 并保持 attempt 顺序，不能遗漏或重排失败；latest 由 OBSERVED commands 决定。E2/E3 除 actor-focused tests，还必须有固定独立 acceptance 检查，不允许仅旧测试 PASS 就宣告新功能完成。

全 PLAN 的合成 STANDARD positive/negative replay 控制是新证据，明确标 synthetic-control；它不补造缺失的旧 STANDARD PLAN，也不替代真实 E3。

## Host isolation 与调用

`invoke-runtime-v4.ps1` 先确认可信 protected snapshot，再锁住配置/auth/AGENTS/Skills/Agents，全锁取得后再次核 expected hash。在锁内执行固定 runner；确认 native process close 与 request drain 后才允许 accepted packet 和解锁。guard 从不复制 auth/配置，也不 restore。前置漂移、锁失败、transport/termination/drain 失败均不能 PASS。

进程内 trust override、ephemeral thread、外置 sqlite_home、history none、shell snapshot off，避免长期 trust 配置。当前 alpha.17.2 已移除 --ignore-user-config，因此 guarded existing user config read 与旧版忽略配置行为不同。未复制 auth，未重装 Skill，未使用临时 credential 或内部 token login。

**隐私阻断：** 当前 native SQLite log_db 强制启用独立 TRACE filter；RUST_LOG=off、ephemeral 或 harness 丢弃 reasoning 不证明 native 不落盘。没有查得官方关闭方式。runner 对 E1–E4 在 seed/启动前直接拒绝 `HOST_MODEL_PRIVACY_UNPROVEN`，没有 force/approval bypass。任何后续实际模型执行都需要新宿主机制、公开版本证据、失败路径验证与独立复审。禁止借本阶段修改核心 Skill/recovery 或关闭安全控制。

无模型预检和 E5 可以显式通过 wrapper 执行；所有结果路径必须新建，existing output 拒绝覆盖。Node tests 不会启动模型。相关验证命令：

```powershell
node --test scripts/test-runtime-observation-v2.cjs scripts/test-score-runtime-v4.cjs scripts/test-runtime-host-v4.cjs scripts/test-run-runtime-v4.cjs
pwsh -NoProfile -File scripts/test-runtime-config-guard.ps1
powershell -NoProfile -File scripts/test-runtime-config-guard.ps1
# 显式传入本次外部 EvidenceRoot、ProtectedSnapshot 与当前 Binary：
pwsh -NoProfile -File scripts/invoke-runtime-v4.ps1 -Scenario E5 -EvidenceRoot <fresh-directory> -ProtectedSnapshot <trusted-hashes.json> -Binary <codex.exe>
```

真实 Git fixture 测试需要允许在本次临时 .git 内写入；当前 sandbox 对 .git/config 拒绝的失败保留，授权的隔离运行通过不等于放宽真实配置权限。只重跑相关测试；未更改 installer/Skill package，所以不做无关完整 installer suite。
