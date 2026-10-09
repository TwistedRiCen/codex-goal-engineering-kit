# Phase 2 M2：按需说明与结构验证

冻结基线：M1 commit `a1f4895fc81f3afb69bc59c34743e0f2e8119302`；该提交的 Skill 与 bb921e5 相同。M2 不修改冻结的 scorer 2.0、execution-regression-v3、输入、runner 或恢复 fixture。

## 迁移与保留

| 原说明 | 现在的位置 / 加载条件 | 核心边界 |
| --- | --- | --- |
| 宿主模型设置、调用语法、TOML 和可移植性解释 | [host-capabilities.md](../../skills/goal-driven-engineering/references/host-capabilities.md)，宿主调用差异或能力缺口 | 主文件仍保留 model/provider neutral、不可虚报执行、缺少 reviewer 保持 gate pending、缺少必需恢复工具不降级。 |
| STANDARD 六节字段详情和 ledger 保存说明 | [standard-state.md](../../skills/goal-driven-engineering/references/standard-state.md)，创建或更新 STANDARD PLAN | 原字段/ledger 条款逐字保留；主文件仍保留 early PLAN、六节、单一 ledger、planned intent 不等于执行、未验证不记完成。 |
| purpose/trigger、三模式、授权、必要 review、completion、evidence reuse、change control、resume、strict/legacy/unknown external | 主文件 | 核心条款保留，不因拆分说明改变门禁或权限。 |

原四个 references、receipt helper、templates、prompts、training example 和五个 profiles 与 M1 字节相同。README 两语言各只补一处按需加载说明。没有大幅重写协议或迁移高风险规则。

UTF-8、LF 规范化统计（不是 token）：主文件 **15,342 → 14,177 bytes**，108 → 101 lines；全部 Skill Markdown **43,434 → 45,344 bytes**。完整包变大，原因是按需说明的独立入口和必要边界提示；只降低选中后主文件必读内容。STANDARD 仍需读状态 reference，不宣称总上下文、工具次数、延迟或成本下降。

## Validator

- phase/state/action 按 canonical reference 中唯一的有序 fenced vocabulary 检查，不依赖前置英文句子；14 journal fields 检查其完整有序枚举。
- 删除 continuity/fingerprint 的固定英文句式、旧测试案例标签文本及历史 M2 禁词。实际 AST 中必须存在 resolver/fingerprint 函数，并独立运行行为测试；符号存在不等于语义证明。
- 删除 Agent instructions 的 160 字符下限；保留角色集合、身份、必需非空字段、read-only/workspace-write 权限边界和 host-neutral model/effort。没有引入新 TOML 配置键或用关键词代替角色语义判断。
- opening frontmatter 必须有唯一 canonical name 和非空 description；body/reference 中的同名示例不能遮蔽错误。合法成对 name quotes、BOM、LF/CRLF 兼容。
- 保留模板必需章节、Skill 内 reference containment、prompts 路由、元数据与模式一致性。prompt 长度上限仅约束入口大小，不作为协议正确证明。

37 个 positive/negative fixtures 覆盖 paraphrase、缺失/多余/错序 vocab/fields、章节、reference 缺失/越界、AST 注释冒充/语法错误、frontmatter 掩盖、每个角色的简短 instructions、身份/权限/空值/重复键/未知键；另复用四类 encoding fixtures。角色短文本正例证明 parser/权限约束，不证明任意角色 prose 足够；实际未改 profiles 的职责由独立 review 全读确认。

## 配对真实执行

| 固定 fixture | [v3 baseline](phase2-execution-v3-baseline.json) | [v3 candidate](phase2-execution-v3-candidate.json) | 实际观察 |
| --- | --- | --- | --- |
| DIRECT static typo | PASS | PASS | 两版只改 copy.txt；无 PLAN/journal；观察到的 Agent/提问为零；full-check seed=1 未增加；focused copy check 和独立验收通过。 |
| STANDARD internal batch | PASS | PASS | 两版只改 src/clamp.cjs、focused tests、紧凑 PLAN；保留 acceptance、D-1、旧 receipt；无 journal/观察到的 Agent/提问；full-check 未增加；focused test 和独立 batch assertions 通过。 |

双方 model `gpt-6.1-sol`、effort `high`、CLI `0.162.0-alpha.2`、host、权限和 rubric 相同；每例 inputDigest/promptDigest/fixture HEAD/prior receipt digest 均相同。两版各两个独立新鲜会话，各例一次，无模型纠偏重试/人工干预，观察到的 failed commands 为零。M1 前期三组采集器诊断及三次维护者修复独立保留，不放进最终配对分母或当成候选改善。

candidate Skill package digest：`86e3ab88c4367f2cb7d13a721de52b6fca9c753b8c3b6ea34aebc3e472460b89`；baseline：`1a5b0d47421d32f0d16205c75ef7deded11e433ba47564a000e1840da47f2be9`。SOURCE 唯一预期变化是已审查的 Skill 说明拆分。持久执行记录保留采集事实、摘要和固定 rubric verdict，不保存完整代码/PLAN/自由文本；要用不同执行 rubric 完全重验，需要重跑，不能从摘要恢复全部实现。

本对照支持这两个低风险 fixture 未出现回退；不证明所有模型、重大风险 DIRECT、FULL、真实外部写入或任意宿主全面等价。后者以本轮严格限制迁移范围、always-visible 核心条款保留、正式协议字节不变及独立语义 review 为依据。历史两组重评只支持其历史决定，不作为 M2 新模型行为结果。

## 验证与 review

PS7/PS5.1 最终均通过两个 validators、37 contract fixtures + encoding、两个隔离 installer；basic Skill validation、所有本地链接和 diff check 通过。M1 的 72 Node tests、continuity/receipt/persisted recovery/diagnosis evidence 对未改代码复用。两新 references 完整随隔离安装交付，真实安装仍未更新。

独立 `m1_review` 对 M2 与 a1f4895 全差异及迁移原文完成语义审查；发现的 frontmatter reference/body 掩盖风险已收紧并加负例，修复复审完成。配对执行设置及真实结果另行核对。此 M2 提交是独立 checkpoint；之后仅进入 M3 隔离调查。
