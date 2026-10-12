# 版本、身份与兼容性

[VERSION](../VERSION) 是唯一 Kit version source，使用三段数字。目前是 pre-1.0 开发身份，未创建 release 或 tag，也不表示真实模型验收完成。PLAN、journal、rubric 和 observation 各有自己的 schema/version，不能用 Kit version 替代。

本 Kit 的版本规则：

- Patch：文档、验证或修复，不改变持久协议语义。
- Minor：兼容的新增能力、评估、可选功能或扩展。
- Major：PLAN/journal breaking、正式 recovery 语义变化、稳定 prompt/agent contract break；即使在开发期也需要显式兼容性决策与迁移说明。

不要在 README、scripts 或 agent metadata 再维护 Kit version 副本。CHANGELOG 的 Unreleased 记录未正式发布的变化；批准发布时版本标题是历史发布记录，须与当次 VERSION 一致，不是第二个可写版本源。许可证已采用 [Apache-2.0](../LICENSE)，tag/release 决策仍需独立授权。

## 当前升级适用性

| 对象 | 本次处理 |
| --- | --- |
| 已有 PLAN | 保留，不重写 Task Mode、状态或 acceptance；root PLAN 的维护工作记录不是 template schema 迁移 |
| Legacy journals | 不转换活跃 journal，不弱化恢复；先按原规则 reconcile |
| Schema 2 | PLAN receipt/index/fingerprint 规则不变 |
| Installed Skill | package 全部9文件未改，本次无 migration、无重装要求 |
| Custom agents | role/permission 文件未改，安装与冲突处理不变 |

本次没有需要执行的 migration，因此不创建空的 MIGRATION 文件或迁移脚本。未来真实 breaking change 才新增按目标版本命名的 migration 文档，记录适用 source/target、备份、验收与未迁移边界；不得静默升级活跃 journal。

## 安装身份

只读 [check-installation.ps1](../scripts/check-installation.ps1) 区分：

- KitVersion：当前仓库 VERSION。
- SourceRevision/SourceModified：当前检出 revision 与 scripts/Skill/Agents/VERSION 修改状态；不是 installed revision。
- Skill.SourceFingerprint / InstalledFingerprint：现有 manifest 的 SHA256；manifest 为按文件路径排序、相对路径保持大小写、文件 SHA256 大写，条目以 LF 连接后 UTF-8 哈希。只读计算，不写入 package。
- InstalledKitVersion：UNKNOWN。已有安装只复制 Skill package，不包含整个 Kit 的版本/provenance stamp；不能从相同字节反推唯一 Git commit。

SYNCHRONIZED 和相同 fingerprints 证明安装内容与当前源 package 一致。不同 Kit commits 可以共享同一个 Skill package。若本次只是 README/CI/tools，沿用原安装；若未来 package 变化，运行 Full 后由操作者显式使用 installer Backup 升级并在新会话检查加载。维护脚本不代替用户执行安装。
