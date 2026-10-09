# 评分契约 2.0

`score.cjs` 使用 `score-v2.cjs`；`score-v1.cjs` 冻结原评分器，仅用于复现旧结果，保留其已知限制。原始 2026-09-11 报告不改分。新规则对历史双方统一重评，历史决策不代表当前 Skill 的执行效果。

被测者仍只返回 request.md 中的 claim 数组。维护者从实际工具返回独立收集 evidence，再安排独立理由审查。不要让被测者填写 observed 或 rationaleReview，也不要把评分器交给被测者。

最小持久包包含：

```json
{
  "rubricVersion": "2.0",
  "run": {
    "id": "unique-run-id", "kind": "decision-evaluation",
    "sourceRef": "evaluated-commit", "model": "explicit-model",
    "effort": "explicit-effort", "attempt": 1,
    "retries": 0, "humanInterventions": 0
  },
  "observations": [
    {
      "claim": {"id": "D2", "mode": "DIRECT", "artifacts": [], "review": "none", "verification": [], "reuse": [], "delivery": "ready", "complete": true, "next": "report", "probes": [], "reason": "原始理由"},
      "observed": {"source": "captured-tool-output", "locator": "run:line:call", "traceSha256": "64 lowercase hex characters", "inputRead": true, "probes": [], "actions": []},
      "rationaleReview": {"status": "unreviewed", "reviewer": "pending", "digest": "reviewDigest(row)", "note": "待独立审查"}
    }
  ]
}
```

示例只有一行且摘要是占位，不能 PASS。完整评估必须包含所有 12 个 case，各字段严格验证，不接受额外字段、重复值、未知 case、继承属性操作或未声明 probe。probes 每项为 `{ "operation": "status", "result": <实际返回> }`；声明必须与成功观察完全匹配。inputRead 独立记录，input 不计入命名 probes。允许复用的 evidence 由固定场景的已提供证据限定；不能填一个任意非空名称。actions 记录实际后续动作；决策评估中必须为空。

输出分别报告 decisionPassed、evidencePassed、rationaleReviewed；三者同时满足才能 passed。reason 不做关键词分类。独立审查须核对原始输入、claim、实际返回与理由，标注 consistent / conflicting / unreviewed，附 reviewer、具体说明及 `reviewDigest(row)`。摘要绑定全部 claim 和 observed，修改理由或事实后旧审查失效。

**信任边界：** JSON、摘要、reviewer 名称不能认证采集者或证明审查独立；伪造整套包仍能欺骗离线评分。可信 PASS 依赖维护者控制的采集过程与独立 reviewer 登记。机器评分不是外部签名验证，也不代替源码 review。unit-test evidence 只允许 scorer-test；输出明确标记 synthetic-scorer-test，不能当成模型结果。captured-decision-only 仍只是局部决策，不是实现、恢复或外部交付证明。

历史导入器只读取显式指定的原会话 final claims、实际 exec 输出和必要错误次数；不保存思维过程、私人绝对路径或完整 trace。原始模型/effort 未捕获时记 not-captured，不推测。保留来源定位和实际输出摘要，导入后仍需独立理由审查。

运行单元测试：`node --test scripts/test-behavior-fixtures.cjs`。重评：`node examples/behavior-fixtures/score.cjs <bundle.json>`。旧版复现：`node examples/behavior-fixtures/score-v1.cjs <claims-array.json>`。

真实执行另用 `scripts/run-execution-regression.cjs` 的 execution-regression-v3；固定输入的 DIRECT / STANDARD 各一个 fresh session，外部采集实际文件、可见工具事件、独立验收和首次失败。早期 v1/v2 诊断结果保留，不能静默改分。一次比较不证明稳定性或 token/latency 改善。恢复由 `scripts/test-recovery-paths.ps1` 补足实际磁盘/Git/回执路径，但其 fixture executor 及确定性中断点不代表 Codex 执行或进程崩溃耐久性。
