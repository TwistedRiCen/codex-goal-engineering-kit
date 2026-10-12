# Changelog

当前开发身份由 [VERSION](VERSION) 唯一定义；尚无正式 release/tag。发布后的版本标题只作为历史记录。

## Unreleased

### Maintenance and onboarding

- 加入标准 [Apache-2.0](LICENSE) 许可证及双语说明，不增加自定义许可限制；仍未 tag/release。
- 一个 Quick/Full deterministic maintenance entry，CI 共用该入口；默认无模型，无真实安装或用户配置写入。
- Windows Full 覆盖隔离安装、恢复/receipt、诊断和无模型 runtime tests；Ubuntu Quick 为次要 metadata/Node fixture 范围，Windows PowerShell checks 不扩称跨平台覆盖。
- 仓库版本与安装内容身份分开：诊断新增 canonical KitVersion 和 package fingerprints；已有 InstalledKitVersion 保持 UNKNOWN。
- 英文/中文 README 收敛首次使用、安装/诊断/升级与高级能力入口；新增简洁 support/compatibility/CONTRIBUTING 和 PR evidence template。

### Compatibility

- 本次不改 Skill behavior/package、PLAN/journal schema、legacy recovery 或 schema 2 receipt；已有项目无需迁移，未重装真实 Skill。
- 已有 guided intake、按风险选择 DIRECT/STANDARD/FULL、按需 references 与 model-neutral role profiles 保持现状。M3 研究没有改变正式 recovery。

### Known limitations

- Phase4A/4A.1 real model acceptance 不完整，auth isolation blocked，persistence/flush 和 reviewer/R4 证据未证；历史结果不重评分。
- M3 recovery optimization INCONCLUSIVE。详见[正式限制](docs/support.md)，研究细节继续留在原 evaluation/report。
- 许可证已经用户批准为 Apache-2.0；维护验证不自动授权 merge/push/release，当前仍 Unreleased。
