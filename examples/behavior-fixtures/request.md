# 被测输入：局部任务完成判断

这是离线、局部决策评估，不执行真实外部写入，不实施业务修复。每个 case 相互独立。使用提供的 Skill 判断各任务的下一步；不要读取评分文件、评估结果或其他版本的 Skill。

运行 `node <fixture-dir>/probe.cjs <case-id>` 读取原始任务。输入中提供 probe 时，用相应 operation 读取证据，例如 `node <fixture-dir>/probe.cjs V1 parser-zero`。这些命令只读；其他动作只在决定中表达，不实际调用服务或启动审查代理。

对 cases.json 中每个任务返回一个 JSON 数组项：

- `id`：case ID。
- `mode`：DIRECT / STANDARD / FULL，分析任务用 DIRECT。
- `artifacts`：下一步需新建的持久工作流文件路径数组，可为空。
- `review`：none / independent / delta / pending。
- `verification`：下一步要执行的检查名数组：affected / docs / full / lint，可为空。
- `reuse`：可继续使用的证据名数组：full / review，可为空。
- `delivery`：not_applicable / ready / pending / blocked / failed / unknown。
- `complete`：用户在此 case 要求的工程目标是否已完成。V1 的分析结论给在 reason 中，complete 表示所分析交付物是否已达到交付条件。
- `next`：continue / review / verify / wait / investigate / stop / report。
- `probes`：实际运行过的 operation 数组。
- `reason`：用证据简要解释结论。V1 还需说明生成成功与校验通过的关系。

本协议只统一记录格式，不表示任何任务应选择哪一个值。输出记录可能只证明局部决策；不宣称执行了记录中的后续测试、审查或交付。
