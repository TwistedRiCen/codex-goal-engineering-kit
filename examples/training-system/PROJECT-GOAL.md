# Example Project Goal: Offline Training Management MVP

This is an input fixture for the Goal-Driven workflow, not a specification or implementation project. Product and architecture semantics marked as unresolved must be discovered and adjudicated before execution.

## PROJECT

面向中小型线下培训机构的教培管理系统 MVP

## GOAL

让一家线下培训机构能够在一个可审计的系统中完成从课程与班级建立、学员报名和收费，到排课、出勤、课消、剩余课时查询、退款及经营统计的日常业务闭环，减少手工表格造成的余额错误和经营数据滞后。

## CONTEXT

- 主要用户：机构管理员、前台/课程顾问、教师、财务或经营者。
- 核心对象：学员、教师、课程、班级、报名、收费、课时、排课、出勤、课消、退款、经营统计。
- 核心业务闭环：

```text
创建课程 -> 创建班级 -> 创建学员 -> 学员报名 -> 收费 -> 获得课时
-> 排课 -> 上课点名 -> 课消 -> 查询剩余课时 -> 退款 -> 查询经营数据
```

- 当前没有可信的既有系统设计；业务口径和异常流程需要 Discovery。

## CONSTRAINTS

- MVP 面向单个机构内的多个教学班；多租户和跨机构经营不在首版范围。
- 金额、支付、退款和课时变动必须可追溯，不得用直接覆盖余额的方式隐藏历史。
- 教师、前台、财务和管理员的可见数据与操作权限必须显式设计。
- 同一教师、教室或班级的排课冲突必须能够被发现。
- 经营统计必须能追溯到报名、收费、退款、出勤和课消事实；统计口径尚待确认。
- 不预设技术栈、数据库形态或部署方式，由 Discovery 和 Architecture 基于真实约束决定。

## NON-GOALS

- 在线直播、录播内容平台和作业批改。
- 面向家长或学员的完整自助 App。
- 营销获客、复杂 CRM、薪酬结算和总账会计。
- 跨机构 SaaS 多租户、加盟商结算和数据仓库平台。
- 在本 Kit 仓库中开发任何教培系统源码。

## DONE WHEN

在具有代表性的数据和权限角色下，可以观察并验证：

1. 管理员创建课程、教师和班级，并生成无资源冲突的课表。
2. 前台创建学员并完成报名；一笔收费形成可追溯的报名权益或课时。
3. 教师只对被授权的班级点名；有效出勤按已确认规则产生一次且仅一次课消。
4. 前台能查询学员的剩余课时以及每次增加、扣减和调整的来源。
5. 符合规则的退课/退款能正确反映金额、剩余权益、已消费权益和审计记录，不破坏历史。
6. 经营者能按确认口径查询报名、实收、退款、出勤、课消及未消课时等经营数据，并追溯到业务事实。
7. 未授权操作、重复点名/课消、排课冲突和无效退款被拒绝或进入明确的例外流程。
8. 系统级测试覆盖上述完整闭环及关键失败路径，最终独立审查没有未解决的阻断性发现。

## DISCOVERY DECISIONS TO RESOLVE

这些是待决问题，不是预设答案：

- 报名、合同、订单、支付和学员权益之间的所有权与关联关系。
- 课时是班级权益、课程权益、合同权益还是可跨课程账户；赠送、转课和冻结如何处理。
- 收费、退款、应收、实收和收入确认的业务口径，以及退款对已课消权益的影响。
- 请假、缺勤、补课、试听、代课、撤销点名和补录出勤的状态机。
- 教师、前台、财务、管理员的授权边界和敏感数据范围。
- 排课资源模型、冲突规则、时区和跨日课程处理。
- 经营指标定义、时间归属、冲正方式和审计保留要求。

## COPY INTO THE START PROMPT

Use this file as `CONTEXT`, keep the sections above as the initial Goal/Constraints/Non-Goals/Done When, and invoke `prompts/start-project.md`. This is a FULL-mode fixture because money, lesson-credit ownership, authorization, and workflow semantics are unresolved. Expected first behavior: initialize `PLAN.md`, enter Discovery, and avoid production coding until the required gates pass.
