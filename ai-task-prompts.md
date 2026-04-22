# AI Task Prompts

## 1. 使用说明

本文档用于把 [implementation-plan.md](e:\ATTI\ATTI\implementation-plan.md) 里的实施步骤，转换成可以逐条发给 AI 开发者执行的任务提示词。

使用方式：

1. 严格按顺序发送 prompt。
2. 一次只发送一条，不要合并多步。
3. 每一步完成后，先检查测试结果，再进入下一步。
4. 如果某一步改变了数据结构、消息协议、模块边界或里程碑状态，完成后必须更新 [memory-bank/@architecture.md](e:\ATTI\ATTI\memory-bank\@architecture.md)。

在发送任意一条 prompt 之前，默认前置要求始终成立：

- 先完整阅读 [memory-bank/@architecture.md](e:\ATTI\ATTI\memory-bank\@architecture.md)
- 先完整阅读 [memory-bank/@game-design-document.md](e:\ATTI\ATTI\memory-bank\@game-design-document.md)
- 先阅读 [software-design-document.md](e:\ATTI\ATTI\software-design-document.md)
- 先阅读 [tech-stack.md](e:\ATTI\ATTI\tech-stack.md)
- 保持模块化、多文件结构
- 禁止创建 monolith 巨文件
- 不要提前实现完整功能

---

## 2. Prompt 01

### 目标

建立基础项目目录结构，只做骨架，不写业务功能。

### Prompt

请先完整阅读以下文档，再开始执行：

- `memory-bank/@architecture.md`
- `memory-bank/@game-design-document.md`
- `software-design-document.md`
- `tech-stack.md`

现在请只完成“基础项目目录结构”这一步，不要实现业务逻辑，不要跳到后续步骤。

要求：

- 按架构文档创建模块化目录结构。
- 至少包括 `app`、`background`、`content`、`adapters`、`domain`、`llm`、`storage`、`shared`、`tests`。
- 保持目录职责清晰。
- 不要创建一个大而全的源文件来暂时兜底。

完成后请执行并汇报以下验证：

- 根目录结构是否符合模块化设计。
- 是否不存在单个顶层文件承载多个 runtime。
- 是否每个目录都能明确对应一个职责。

如果这一步改变了架构基线，请同步更新 `memory-bank/@architecture.md`。

---

## 3. Prompt 02

### 目标

初始化扩展工程与包管理基础。

### Prompt

请先完整阅读项目约束文档，然后只完成“扩展框架初始化和包管理基线”这一步。

要求：

- 使用 `tech-stack.md` 中推荐的扩展框架和包管理器初始化项目。
- 产出可用于 Edge 扩展开发的最小工程。
- 保持 popup、side panel、options、background、content script 的入口边界清晰。
- 暂时不要加入业务逻辑。

完成后请执行并汇报以下验证：

- 依赖是否安装成功。
- 开发构建是否能成功运行。
- 最小扩展壳子是否能被浏览器加载且无明显运行时错误。

如有工程结构变化，请更新 `memory-bank/@architecture.md`。

---

## 4. Prompt 03

### 目标

启用 TypeScript 严格模式和工程质量基线。

### Prompt

请只完成“TypeScript 严格模式与工程质量默认配置”这一步，不要进入功能开发。

要求：

- 打开 TypeScript 严格模式。
- 配置适合当前技术栈的格式化、静态检查和测试脚本基线。
- 让文件命名、导入结构和目录边界符合 `tech-stack.md`。
- 不要创建泛化的 `utils` 巨文件或临时兜底文件。

完成后请执行并汇报以下验证：

- 类型检查是否通过。
- lint 是否通过。
- 配置中是否明确启用了 strict 模式。

如果配置或架构约束需要更新，请更新 `memory-bank/@architecture.md`。

---

## 5. Prompt 04

### 目标

建立最小 runtime 壳子。

### Prompt

请只完成“最小扩展 runtime 壳子”这一步。

要求：

- 分别建立 popup、side panel、options page、background、content script 的最小入口。
- 每个入口只负责证明 runtime 已接通。
- 不要写业务流程，不要跨 runtime 堆逻辑。

完成后请执行并汇报以下验证：

- popup 是否可渲染。
- side panel 是否可渲染。
- options page 是否可渲染。
- background 是否可启动。
- content script 是否可注入到测试页面且不破坏页面。

如果 runtime 边界有调整，请更新 `memory-bank/@architecture.md`。

---

## 6. Prompt 05

### 目标

建立共享领域类型。

### Prompt

请只完成“共享领域类型定义”这一步。

要求：

- 为 settings、profile、session、question、answer plan、adapter diagnostics 建立共享类型。
- 字段必须与 `memory-bank/@architecture.md` 对齐。
- 类型定义只能放在共享契约层，不要混入业务逻辑或 runtime 逻辑。

完成后请执行并汇报以下验证：

- 类型检查是否通过。
- 是否逐项比对过 `memory-bank/@architecture.md` 中的字段。
- 共享类型目录里是否没有混入业务实现代码。

如果字段定义有任何变化，请更新 `memory-bank/@architecture.md`。

---

## 7. Prompt 06

### 目标

建立共享校验 schema。

### Prompt

请只完成“共享校验 schema”这一步。

要求：

- 为核心实体和消息载荷建立校验 schema。
- schema 必须与共享类型分层清晰。
- 只做数据形状校验，不做完整流程逻辑。

完成后请执行并汇报以下验证：

- 有效示例数据是否能通过校验。
- 无效示例数据是否会被拒绝。
- 是否不存在未校验就直接跨边界流动的外部输入。

如果消息或数据契约有变化，请更新 `memory-bank/@architecture.md`。

---

## 8. Prompt 07

### 目标

创建本地数据库壳子。

### Prompt

请只完成“本地数据库壳子与 store 定义”这一步。

要求：

- 使用推荐的本地数据库抽象建立数据库模块。
- 定义 `memory-bank/@architecture.md` 中列出的所有 store 和索引。
- 数据库定义必须独立成模块。
- 暂时不要写具体业务查询。

完成后请执行并汇报以下验证：

- 数据库是否能成功打开。
- 预期 store 是否都存在。
- schema version 是否清晰可见且稳定。

如果数据库结构与文档不一致，请更新 `memory-bank/@architecture.md`。

---

## 9. Prompt 08

### 目标

建立 Repository 边界。

### Prompt

请只完成“Repository 层边界建立”这一步。

要求：

- 为 settings、profiles、sessions、questions、answer plans、adapter diagnostics 各建立单独 repository。
- 每个 repository 只负责自己的实体。
- 不允许在 repository 中混入跨实体业务编排。
- 不允许其他模块直接访问底层数据库 API。

完成后请执行并汇报以下验证：

- 每个 repository 是否有基础读写能力测试。
- 测试是否通过 repository 接口，而不是直接访问数据库。
- 是否确认仓库中不存在 repository 之外的原始数据库访问。

如果 repo 边界有变化，请更新 `memory-bank/@architecture.md`。

---

## 10. Prompt 09

### 目标

建立 settings 持久化基础。

### Prompt

请只完成“settings 持久化基础”这一步。

要求：

- 建立最简单的轻量配置保存和读取路径。
- settings 必须与 IndexedDB 主业务数据层分离。
- 通过专门的 settings repository 或 settings service 访问。

完成后请执行并汇报以下验证：

- settings 是否能保存和读取。
- 默认值是否能在无记录时正确返回。
- 轻量配置是否没有混入主业务数据库 stores。

如果 settings 结构有变化，请更新 `memory-bank/@architecture.md`。

---

## 11. Prompt 10

### 目标

定义扩展消息协议。

### Prompt

请只完成“扩展消息协议定义”这一步。

要求：

- 建立 UI、background、content script 间的共享消息契约。
- 当前只包含基础阶段所需的最小消息类型。
- 每种消息都需要配套校验。
- 不要实现完整编排流程。

完成后请执行并汇报以下验证：

- 消息 payload 校验测试是否通过。
- 非法消息是否能被稳定拒绝。
- 消息 type 是否集中定义，而不是散落各处。

如果消息契约有变化，请更新 `memory-bank/@architecture.md`。

---

## 12. Prompt 11

### 目标

建立 background 消息路由壳子。

### Prompt

请只完成“background 消息路由壳子”这一步。

要求：

- 建立 background 侧的消息路由器。
- 当前只支持最基础的 ping、settings、占位 session 请求。
- 将“路由”和“具体 handler”分开。
- 校验失败时必须返回结构化错误，而不是崩溃。

完成后请执行并汇报以下验证：

- 消息是否能被正确分发到对应 handler。
- 不支持的消息是否能稳定返回错误。
- 非法 payload 是否能返回结构化错误。

如有消息边界调整，请更新 `memory-bank/@architecture.md`。

---

## 13. Prompt 12

### 目标

建立 background 服务模块占位边界。

### Prompt

请只完成“background 服务模块边界”这一步。

要求：

- 建立 session manager、permission guard、orchestrator 的占位模块。
- 当前目标是固定模块边界，不是实现完整功能。
- 每个模块暴露清晰且窄的职责。
- 不要把 routing、storage、provider、automation 混在一个文件里。

完成后请执行并汇报以下验证：

- 各模块是否可独立导入。
- background runtime 是否仍能启动。
- 是否不存在一个模块同时承载多类职责。

如果模块边界变化，请更新 `memory-bank/@architecture.md`。

---

## 14. Prompt 13

### 目标

建立 UI 状态基础。

### Prompt

请只完成“UI 状态基础”这一步。

要求：

- 为 popup、side panel、settings 建立小而专注的 UI 状态容器。
- UI store 只负责视图与交互状态。
- 不要把整个数据库镜像进 UI state。
- 不要创建一个全局 mega-store。

完成后请执行并汇报以下验证：

- 每个 store 的默认状态和状态切换测试是否通过。
- 是否不存在 store 直接做持久化。
- 是否不存在一个超大统一 store。

如果状态边界影响架构，请更新 `memory-bank/@architecture.md`。

---

## 15. Prompt 14

### 目标

建立 popup 壳子。

### Prompt

请只完成“popup 壳子”这一步。

要求：

- popup 只展示扩展开关状态和打开 side panel 的基础入口。
- 不要在 popup 中加入 profile 编辑、provider 调用或站点自动化逻辑。
- 保持 popup 职责狭窄。

完成后请执行并汇报以下验证：

- popup 是否稳定渲染。
- popup 是否能反映当前 settings 状态。
- popup 是否保持轻量，且未直接耦合 background 业务实现。

---

## 16. Prompt 15

### 目标

建立 side panel 壳子。

### Prompt

请只完成“side panel 壳子”这一步。

要求：

- 创建 side panel 的基础布局。
- 至少包含 profile status、page detection status、session status、future recommendation preview 的占位区域。
- 当前只允许空态、加载态、错误态或占位数据。
- 必须拆成多个小组件，不要做成一个大文件。

完成后请执行并汇报以下验证：

- side panel 是否能稳定渲染空态。
- loading、empty、error 占位状态是否都能工作。
- 组件拆分是否清晰，是否不存在单个巨型组件文件。

---

## 17. Prompt 16

### 目标

建立 options page 壳子。

### Prompt

请只完成“options page 壳子”这一步。

要求：

- 提供 debug mode、provider selection placeholder、data management placeholder 等基础区域。
- 当前只接 settings 持久化。
- 不要加入破坏性数据操作。

完成后请执行并汇报以下验证：

- setting 修改后是否能跨刷新保留。
- options page 与 popup 是否读取同一 settings 来源。
- options page 是否没有越权直接处理主业务数据库实体。

如果 options 页影响架构，请更新 `memory-bank/@architecture.md`。

---

## 18. Prompt 17

### 目标

建立 content script 壳子。

### Prompt

请只完成“content script 壳子”这一步。

要求：

- content script 只负责安全注入并上报基础页面元数据。
- 当前保持被动。
- 不要实现题目提取、高亮、填写或页面修改。

完成后请执行并汇报以下验证：

- content script 是否能加载到测试页面。
- 是否能发送一个结构化消息到 background。
- 是否没有修改页面内容。

如果 content runtime 边界变化，请更新 `memory-bank/@architecture.md`。

---

## 19. Prompt 18

### 目标

建立 adapter 接口和 registry 壳子。

### Prompt

请只完成“adapter 接口与 registry 壳子”这一步。

要求：

- 定义 adapter interface。
- 建立 adapter registry。
- 只加入一个 placeholder adapter 证明形状可用。
- 暂时不要加入真实站点选择器和真实站点行为。

完成后请执行并汇报以下验证：

- registry 是否能按匹配规则解析出 placeholder adapter。
- placeholder adapter 是否没有越界承载业务编排。
- registry 是否与 content script 运行时逻辑解耦。

如有 adapter 边界变化，请更新 `memory-bank/@architecture.md`。

---

## 20. Prompt 19

### 目标

建立 provider 接口壳子。

### Prompt

请只完成“provider 接口壳子”这一步。

要求：

- 定义 profile summarization、question interpretation、answer planning 的 provider interface。
- 加入一个仅用于测试和占位的 fake provider。
- 暂时不要接真实远端或本地模型。
- 所有消费者都必须依赖接口，不依赖具体 fake 实现。

完成后请执行并汇报以下验证：

- fake provider 是否符合 provider contract。
- provider 使用方是否依赖接口而不是具体实现。
- 是否不存在 UI runtime 直接调用 provider 的情况。

如有 provider 边界变化，请更新 `memory-bank/@architecture.md`。

---

## 21. Prompt 20

### 目标

建立最小 profile draft 流程。

### Prompt

请只完成“最小 profile draft 本地流程”这一步。

要求：

- 支持采集最小本地 profile draft。
- 对 draft 做校验。
- 保存到 profiles repository。
- 从 repository 读取后展示到 side panel。
- 当前不要做结构化 trait 生成。

完成后请执行并汇报以下验证：

- profile draft 是否能成功保存和读取。
- 非法 draft 是否会在持久化前被拒绝。
- 保存的数据结构是否与 `memory-bank/@architecture.md` 保持一致。

如果 profile 数据结构有变化，请更新 `memory-bank/@architecture.md`。

---

## 22. Prompt 21

### 目标

建立最小 session record 流程。

### Prompt

请只完成“最小 session record 流程”这一步。

要求：

- 支持创建和读取最小 session 记录。
- 当前允许使用 placeholder 值。
- 目标只是验证 session 的持久化边界，而不是实现真实流程。

完成后请执行并汇报以下验证：

- session 是否能创建并读取。
- session 记录是否与 profile 记录严格隔离。
- session 状态更新是否能正确持久化。

如果 session 结构有变化，请更新 `memory-bank/@architecture.md`。

---

## 23. Prompt 22

### 目标

建立 adapter diagnostics 持久化。

### Prompt

请只完成“adapter diagnostics 持久化”这一步。

要求：

- 支持写入和查询 adapter diagnostic 记录。
- 当前保持通用，不绑定真实站点。
- 不要记录原始敏感内容。

完成后请执行并汇报以下验证：

- diagnostics 是否能按 session 查询。
- diagnostics 是否只存在于自己的 repository 中。
- diagnostics payload 是否有校验。

如果 diagnostics 结构变化，请更新 `memory-bank/@architecture.md`。

---

## 24. Prompt 23

### 目标

建立开发调试视图。

### Prompt

请只完成“开发调试视图”这一步。

要求：

- 在 side panel 或 options page 中增加基础 debug view。
- 仅展示当前 runtime 状态、active settings、profile draft 存在状态、last session 占位摘要。
- 当前保持只读。
- 不要复制业务逻辑，优先复用现有服务。

完成后请执行并汇报以下验证：

- debug mode 开关是否可控。
- debug view 是否只在预期条件下显示。
- debug view 是否复用了现有服务，而不是新建一套平行逻辑。

---

## 25. Prompt 24

### 目标

建立基础自动化测试体系。

### Prompt

请只完成“基础自动化测试体系”这一步。

要求：

- 按 unit、integration、end-to-end 分类组织测试。
- 覆盖当前基础模块。
- 至少有一个扩展加载 smoke test。
- 至少有一个 repository 持久化 smoke test。

完成后请执行并汇报以下验证：

- unit tests 是否通过。
- integration tests 是否通过。
- end-to-end smoke tests 是否通过。
- 测试失败信息是否足够清晰，能定位到具体模块边界。

如果测试结构影响工程基线，请更新 `memory-bank/@architecture.md`。

---

## 26. Prompt 25

### 目标

完成第一次架构检查点。

### Prompt

请只完成“第一次架构检查点”这一步。

要求：

- 对照当前实现与 `software-design-document.md`、`tech-stack.md`、`memory-bank/@architecture.md` 做一次人工审计。
- 更新 `memory-bank/@architecture.md`，使其反映当前真实实现。
- 明确记录哪些基础能力已完成，哪些能力被有意延期。
- 不要开始真实功能开发。

完成后请执行并汇报以下验证：

- 当前仓库结构是否与 memory bank 一致。
- 当前数据结构与消息边界是否与 memory bank 一致。
- 延后事项是否被显式写出，而不是隐含省略。

---

## 27. Foundation 完成后的提醒

只有当以下条件全部成立，才允许进入完整功能阶段：

- 基础 runtime 壳子全部可加载
- 共享类型和 schema 已建立
- 本地存储已建立
- repository 边界已建立
- 消息协议已建立
- adapter/provider 接口已建立
- profile draft 和 session record 最小流程已打通
- 自动化测试已通过
- `memory-bank/@architecture.md` 已更新为当前真实状态

在此之前，不要开始：

- 真实 LLM 接入
- 真实题目提取
- 真实答案规划
- 真实页面填写
- 真实站点适配

---

## 28. 进入可用化阶段前的范围锁定

### 目标

锁定单站点 MVP 范围，避免功能发散。

### Prompt

请先完整阅读以下文档，再开始执行：

- `memory-bank/@architecture.md`
- `memory-bank/@game-design-document.md`
- `software-design-document.md`
- `tech-stack.md`

现在请只完成“单站点 MVP 范围锁定”这一步，不要开始实现真实功能。

要求：

- 从当前产品目标出发，明确只支持 `1` 个真实 assessment 站点作为 MVP 目标。
- 明确记录该站点的页面范围、题型范围、支持边界和不支持边界。
- 明确当前 MVP 中哪些能力会进入真实实现，哪些能力继续延期。
- 将范围锁定结果写入 `memory-bank/@architecture.md`。
- 不要开始代码实现。

完成后请执行并汇报以下验证：

- 是否只锁定了一个真实支持站点，而不是泛化到多个站点。
- MVP 支持范围与不支持范围是否都被显式写出。
- `memory-bank/@architecture.md` 是否已反映该范围决策。

---

## 29. Prompt 26

### 目标

补齐 questions 与 answer plans 的 repository 边界。

### Prompt

请只完成“questions / answer plans repository 边界补齐”这一步。

要求：

- 实现 `question-repo`。
- 实现 `answer-plan-repo`。
- repository 职责必须各自独立，不要混入 session 编排、provider 编排或 UI 逻辑。
- 继续保持所有数据库访问只通过 repository。
- 为这两个 repository 增加对应测试。
- 如果 repository 边界从“预留”变为“已实现”，请更新 `memory-bank/@architecture.md`。

完成后请执行并汇报以下验证：

- `question-repo` 是否可以通过 repository 接口完成基础读写。
- `answer-plan-repo` 是否可以通过 repository 接口完成基础读写。
- 是否不存在 repository 之外直接访问 `questions` / `answerPlans` store 的情况。
- `memory-bank/@architecture.md` 是否已反映实现状态变化。

---

## 30. Prompt 27

### 目标

建立首个真实站点 adapter 的边界与测试夹具。

### Prompt

请只完成“首个真实站点 adapter 边界与夹具”这一步。

要求：

- 只支持一个已锁定的真实 assessment 站点。
- 在 `src/adapters/sites/*` 下实现该站点的独立 adapter 模块。
- 不要把多个站点逻辑合并在一个 adapter 文件里。
- 建立该站点的 fixture / sample page / selector 测试基线。
- 当前先建立匹配、页面识别、题目区域定位边界；不要一次性完成全部流程。
- 如有 adapter 策略变化，请更新 `memory-bank/@architecture.md`。

完成后请执行并汇报以下验证：

- registry 是否能正确解析出该真实站点 adapter。
- fixture 测试是否能稳定验证站点识别与基础定位。
- 是否仍保持站点逻辑只存在于 adapter 模块中。

---

## 31. Prompt 28

### 目标

建立单站点的真实题目提取流程。

### Prompt

请只完成“真实题目提取流程”这一步。

要求：

- 仅针对已锁定的首个真实站点实现题目提取。
- content script 通过 adapter 提取规范化 questions。
- 提取结果通过既有消息边界交给 background，再持久化到 `question-repo`。
- 当前不要实现 provider 调用、答案规划或页面填写。
- 对提取失败写入 sanitized diagnostics，而不是写入原始敏感页面内容。
- 如有新的消息边界或数据流边界，请更新 `memory-bank/@architecture.md`。

完成后请执行并汇报以下验证：

- 是否可以从该真实站点页面提取出规范化 questions。
- 提取结果是否能成功持久化到 `question-repo`。
- diagnostics 是否避免记录原始敏感页面内容。
- 提取失败信息是否足够清晰，能定位到 adapter 边界。

---

## 32. Prompt 29

### 目标

接入一个真实 provider 的最小可用链路。

### Prompt

请只完成“真实 provider 最小接入”这一步。

要求：

- 在现有 provider interface 之下接入 `1` 个真实 provider。
- 新增最小可用的 `prompts` 与 `parsers` 模块，不要把它们混进 UI、background 或 adapter。
- provider 输入必须经过现有 schema / contract 边界。
- 当前只实现 profile + questions -> answer plan 的最小调用链路。
- 不要在 UI runtime 中直接调用 provider。
- 如有 provider 策略、prompt 边界或 parser 边界变化，请更新 `memory-bank/@architecture.md`。

完成后请执行并汇报以下验证：

- 真实 provider 是否通过统一 provider interface 被调用。
- prompts / parsers 是否位于 `llm/` 边界内，而不在其他 runtime 中散落。
- provider 失败是否返回结构化错误，而不是直接崩溃。

---

## 33. Prompt 30

### 目标

建立 answer planning 的 background 编排与持久化流程。

### Prompt

请只完成“answer planning 编排与持久化”这一步。

要求：

- background 基于已保存 profile、已提取 questions 和真实 provider 生成 answer plans。
- 持久化 answer plans 到 `answer-plan-repo`。
- session 要能记录该轮规划的基础执行状态。
- 继续保持 background 编排、provider 调用、repository 持久化分层清晰。
- 当前不要实现页面填写。
- 如有消息边界、session 状态或 answer plan 结构变化，请更新 `memory-bank/@architecture.md`。

完成后请执行并汇报以下验证：

- 是否能从 profile + questions 生成并持久化 answer plans。
- session 状态是否能反映规划阶段结果。
- 失败信息是否能清晰定位到 provider、router 或 repository 边界。

---

## 34. Prompt 31

### 目标

建立 recommendation preview 与人工确认流程。

### Prompt

请只完成“recommendation preview 与人工确认”这一步。

要求：

- 在 side panel 中展示每道题的推荐结果。
- 明确展示推荐项、置信度、理由。
- 用户必须可以确认、拒绝或修改推荐结果。
- 当前仍然不要自动提交页面。
- UI 只负责展示与交互，不直接做 provider 调用或数据库底层访问。
- 如有 side panel 边界或交互状态边界变化，请更新 `memory-bank/@architecture.md`。

完成后请执行并汇报以下验证：

- side panel 是否能稳定展示 recommendation preview。
- 用户是否可以逐题确认、拒绝或修改推荐。
- UI 是否仍然没有越权承担 provider / repository 底层逻辑。

---

## 35. Prompt 32

### 目标

建立手动确认后的页面填写流程。

### Prompt

请只完成“手动确认后的页面填写”这一步。

要求：

- content script 消费用户确认后的 answer plans。
- 仅对已锁定站点执行真实页面填写。
- 默认不得自动提交。
- 写入必要的 execution log 和 diagnostics。
- 当前不要扩展到第二个站点。
- 如有 fill 边界、消息边界或 session 结构变化，请更新 `memory-bank/@architecture.md`。

完成后请执行并汇报以下验证：

- 用户确认后是否能正确填写页面。
- 是否明确没有自动提交。
- fill 失败时是否能返回足够清晰的结构化错误。

---

## 36. Prompt 33

### 目标

完成单站点 MVP 可用性检查点。

### Prompt

请只完成“单站点 MVP 可用性检查点”这一步。

要求：

- 对照 `software-design-document.md`、`tech-stack.md`、`memory-bank/@architecture.md` 审计当前真实实现。
- 明确记录单站点 MVP 已完成能力与仍延期能力。
- 补充端到端验证，覆盖“提取 -> 规划 -> 预览 -> 确认 -> 填写”的最小真实链路。
- 更新 `memory-bank/@architecture.md`，使其反映当前可用状态。
- 不要在这一步顺手扩展第二个站点或做非 MVP 功能。

完成后请执行并汇报以下验证：

- 当前单站点 MVP 是否已达到“可提取、可规划、可预览、可确认、可填写”的可用标准。
- 当前仓库结构、数据结构、消息边界是否仍与 memory bank 一致。
- 延期事项是否继续被显式写出，而不是再次隐含省略。

---

## 37. Prompt 34

### 目标

接管单站点推荐质量，去掉 placeholder recommendation 依赖。

### Prompt

请先完整阅读以下文档，再开始执行：

- `memory-bank/@architecture.md`
- `memory-bank/@game-design-document.md`
- `software-design-document.md`
- `tech-stack.md`

现在请只完成“单站点推荐质量接管”这一步。

要求：

- 对照当前真实实现，审计 answer planning 是否仍然依赖 placeholder recommendation。
- 将当前单站点 MVP 的 answer planning 从 placeholder recommendation 切换为真实 provider 输出。
- 保持当前已落地交互：`Run answer planning` 后自动填写网页，side panel 只展示推荐结论与分析原因，不要恢复人工确认按钮。
- provider 的 prompt 构造与返回解析必须继续留在 `llm/` 边界内，不要散落到 background、UI 或 adapter。
- 不要在这一步扩展第二个站点，不要顺手重做 UI 流程。
- 如有 provider 策略、prompt 边界、parser 边界或 answer plan 数据结构变化，请更新 `memory-bank/@architecture.md`。

完成后请执行并汇报以下验证：

- 当前单站点 planning 是否已经不再依赖 placeholder recommendation。
- 真实 provider 输出是否能够生成与题目数一致的 answer plans。
- 自动填写链路在接入真实 provider 后是否仍然可用。

---

## 38. Prompt 35

### 目标

为单站点 provider 输出补齐最小校验与失败保护。

### Prompt

请只完成“provider 输出校验与失败保护”这一步。

要求：

- 对当前单站点 provider 输出链路增加最小但明确的边界校验。
- 至少校验：
  - answer plan 数量与提取题目数一致；
  - 每条 recommendation 的 option id 必须命中对应 question 的 options；
  - rationale、confidence、provider 元数据满足既有 contract；
  - provider 返回脏数据时不能静默吞掉。
- 校验失败时必须写入结构化 diagnostics，并返回清晰的结构化错误。
- 不要把这些校验塞进 UI 或 adapter；应保持在 provider parser、background orchestration、shared schema 的清晰边界内。
- 不要在这一步扩展新功能面。
- 如有 diagnostics、message contract、answer plan 结构或执行状态变化，请更新 `memory-bank/@architecture.md`。

完成后请执行并汇报以下验证：

- 脏输出是否会被明确拒绝，而不是继续写入 repository。
- diagnostics 是否足够定位是 provider、parser、router 还是 persistence 边界出错。
- 正常 provider 输出是否仍然能通过并继续自动填写流程。

---

## 39. Prompt 36

### 目标

补齐单站点本地 session history 的最小可用读取路径。

### Prompt

请只完成“本地 session history 最小读取路径”这一步。

要求：

- 对照 `memory-bank/@architecture.md`、`software-design-document.md`、`@game-design-document.md`，补齐当前 MVP 尚缺失的 local session history 最小能力。
- 只实现最小读取与展示：
  - 最近 session 列表或最近一次 session 摘要；
  - session 的 site、时间、状态、题目数、recommendation 数等基础信息；
  - 不要扩展为完整分析中心或复杂筛选系统。
- session history 必须通过 repository + background message contract 暴露，不要让 UI 直接读 IndexedDB。
- 当前可以放在 side panel 或 options debug/read-only 区域，但必须保持模块职责清晰。
- 不要在这一步扩展多站点历史聚合或云同步。
- 如有 session 读取 contract、展示边界或 repository 能力变化，请更新 `memory-bank/@architecture.md`。

完成后请执行并汇报以下验证：

- 本地 session history 是否可以稳定读取并展示。
- UI 是否仍未越权直接访问数据库。
- 当前展示是否保持“最小可用”，而没有长成新的 monolith 页面。

---

## 40. Prompt 37

### 目标

补齐 provider 使用与本地数据边界的用户可见说明。

### Prompt

请只完成“provider / 本地数据边界说明”这一步。

要求：

- 对照 `@game-design-document.md` 中关于“用户必须理解哪些数据留在本地、哪些可能发给 provider”的要求，审计当前 UI。
- 在当前模块边界内补齐最小说明文案：
  - 哪些数据默认保存在本地；
  - 何时会调用 provider；
  - 当前不会自动 submit；
  - 当前支持范围仅限已锁定单站点 MVP。
- 说明文案应进入 popup、side panel 或 options 的合适位置，但不要把多个说明区域堆成一个大组件文件。
- 不要在这一步实现新的权限系统、云同步或复杂隐私中心。
- 如有 UX 边界或设置项变化，请更新 `memory-bank/@architecture.md`。

完成后请执行并汇报以下验证：

- 用户是否能明确理解“本地保存 / provider 调用 / 不自动提交”这三件事。
- 新说明是否保持轻量，没有引入新的业务编排逻辑。
- 当前 UI 结构是否仍保持模块化拆分。

---

## 41. Prompt 38

### 目标

完成单站点 MVP 推荐质量检查点。

### Prompt

请只完成“单站点推荐质量检查点”这一步。

要求：

- 对照 `software-design-document.md`、`tech-stack.md`、`memory-bank/@architecture.md` 审计当前真实实现。
- 明确记录哪些能力已经达到“质量可用”，哪些仍只是“流程可用”。
- 验证重点放在：
  - recommendation 是否来自真实 provider；
  - side panel 是否稳定展示推荐结论与原因；
  - `Run answer planning` 后是否仍能自动填写网页；
  - provider 异常或脏输出是否被显式处理。
- 更新 `memory-bank/@architecture.md`，使其反映当前真实状态。
- 不要在这一步扩展第二站点或做非单站点功能。

完成后请执行并汇报以下验证：

- 当前单站点 recommendation 是否已脱离 placeholder。
- 当前自动填写链路是否仍然可用且不自动 submit。
- 延期事项是否继续被显式写出，而不是再次隐含省略。

---

## 42. Prompt 39

### 目标

补强单站点真实 provider 的浏览器侧验证闭环。

### Prompt

请只完成“真实 provider 浏览器侧验证补强”这一步。

要求：

- 对照当前 `single-site recommendation quality checkpoint` 的延期事项，只补强“浏览器侧真实 provider 验证”这一条。
- 目标是让浏览器级验证尽可能覆盖：
  - side panel 读取真实 provider 生成的 recommendation；
  - side panel 展示 recommendation 结论与 rationale；
  - `Run answer planning` 后继续自动填写网页；
  - provider 异常时前端可见状态保持清晰。
- 优先补强现有 Playwright / built-extension / test harness，不要重做整套测试系统。
- 如果需要引入 provider mock、service worker 拦截、测试专用配置或 runtime 开关，必须保持边界清晰，不要把测试逻辑散落进产品主流程。
- 不要在这一步扩展第二站点，不要顺手改业务交互。
- 如有验证策略、测试边界或 runtime 配置边界变化，请更新 `memory-bank/@architecture.md`。

完成后请执行并汇报以下验证：

- 浏览器级验证是否已经能够覆盖真实 provider recommendation 的展示与自动填写。
- 当前 harness 是否仍然保持模块化，而不是长成一套 monolith 测试脚本。
- 之前在 architecture 中显式延期的 “live-browser OpenAI-backed rationale rendering” 是否已经被关闭或更新状态。

---

## 43. Prompt 40

### 目标

为单站点 recommendation 建立最小质量基线与回退策略。

### Prompt

请只完成“单站点 recommendation 质量基线与回退策略”这一步。

要求：

- 对照当前真实 provider 输出链路，为 recommendation 增加最小但明确的质量基线。
- 质量基线至少覆盖：
  - recommendation 不得空缺；
  - rationale 不得退化为占位文案；
  - confidence 必须满足当前 contract；
  - provider 返回内容虽然结构合法但质量明显退化时，要有明确的回退或拒绝策略。
- 回退策略必须明确区分：
  - 可继续展示但应降级标记；
  - 不应继续写入并自动填写；
  - 应写入 diagnostics 并停止当前 planning。
- 这些质量基线与回退逻辑应继续留在 `llm/`、background orchestration、shared contract 的清晰边界内，不要塞进 UI。
- 不要在这一步扩展新的 provider，不要扩展新的站点。
- 如有 diagnostics、answer plan contract 或 planning 状态变化，请更新 `memory-bank/@architecture.md`。

完成后请执行并汇报以下验证：

- recommendation 质量退化时是否不会再被当作正常结果直接自动填写。
- diagnostics 是否能区分“结构错误”和“质量退化但结构合法”。
- 正常 recommendation 是否仍然能够通过并继续当前单站点自动填写流程。

---

## 44. Prompt 41

### 目标

补齐单站点 provider 设置的最小可用性收口。

### Prompt

请只完成“provider 设置最小可用性收口”这一步。

要求：

- 对照当前 options 中的 provider 相关设置，补齐最小可用性边界。
- 至少处理：
  - OpenAI API key 的本地保存与读取状态反馈；
  - 缺失 key 时的清晰阻断与提示；
  - provider 选择与当前默认策略的一致性；
  - 不让 side panel/popup 产生误导性的“可以运行但其实一定失败”的状态。
- 设置页仍然只承担配置与说明，不要把 provider 调用编排塞回 options UI。
- 不要在这一步引入复杂账户系统、云密钥托管、权限中心或多 provider 管理台。
- 保持模块化拆分，不要把设置、说明、调试、history 混成一个巨型 options 组件。
- 如有设置项、错误提示边界或 UX 状态变化，请更新 `memory-bank/@architecture.md`。

完成后请执行并汇报以下验证：

- 缺失或无效 provider 配置时，用户是否能得到明确、轻量、可操作的提示。
- 当前 provider 设置链路是否仍然保持本地优先和模块化边界。
- options 页面是否仍保持最小可用结构，而没有膨胀成新的 monolith 页面。

---

## 45. Prompt 42

### 目标

补强 Truity 单站点 adapter 的抗页面漂移能力。

### Prompt

请只完成“Truity adapter 抗页面漂移补强”这一步。

要求：

- 仅针对当前锁定的 Truity Enneagram 站点，补强 adapter 对轻微 DOM 漂移的韧性。
- 优先处理：
  - question block / radio group 的多路径定位；
  - 题干文本大小写、空白、轻微包装层变化；
  - extraction 与 fill 共享的稳定标识策略；
  - 失败时的 sanitized diagnostics。
- 继续保持所有站点特定逻辑只存在于 Truity adapter 边界内，不要把 selector fallback 散到 content script 或 background。
- 不要在这一步泛化为跨站 selector 框架。
- 不要扩展第二站点。
- 如有 adapter 策略或 diagnostics 边界变化，请更新 `memory-bank/@architecture.md`。

完成后请执行并汇报以下验证：

- 轻微页面结构变化下，当前 Truity extraction / fill 是否仍能稳定工作。
- 失败信息是否仍然足够定位在 adapter 边界，而不是把错误模糊化。
- 当前实现是否仍然保持“单站点专用 adapter”，而没有开始泛化成多站点系统。

---

## 46. Prompt 43

### 目标

完成单站点 MVP 发布前检查点。

### Prompt

请只完成“单站点 MVP 发布前检查点”这一步。

要求：

- 对照 `software-design-document.md`、`tech-stack.md`、`memory-bank/@architecture.md` 审计当前真实实现，判断它是否已经达到“可交付给小范围真实用户试用”的标准。
- 重点检查：
  - 当前单站点范围是否仍然清晰锁定；
  - provider 调用、本地数据边界、非自动 submit 是否仍然清晰；
  - 提取、规划、side panel 展示、自动填写、错误处理是否形成稳定闭环；
  - 当前剩余延期项是否仍然被显式写出。
- 明确区分：
  - 已达到试用发布标准的部分；
  - 仍需在正式更广泛使用前补齐的部分。
- 不要在这一步继续开发新功能；重点是审计、验证、记录和收口。
- 更新 `memory-bank/@architecture.md`，使其反映当前是否达到“单站点试用发布”状态。

完成后请执行并汇报以下验证：

- 当前单站点 MVP 是否已达到“小范围试用发布”标准。
- 当前延期事项是否仍然显式存在，而不是被检查点结论覆盖掉。
- architecture 是否已经准确反映这一发布前状态，而不是保留过时描述。
---

## 47. Final Plan

### 目标

完成“单站点 MVP 最后一版收口计划”，目标是达到“小范围试用发布标准”。

### 当前差距

基于最近一次发布前检查点，距离“小范围试用发布标准”还差最后两类事项：

- 把当前 committed 自动化发布门重新拉绿；
- 处理 `software-design-document.md` 中 `manual confirmation before fill` 与当前 side panel 自动 fill UX 的分歧。

后续提示词只围绕这两项收口工作展开，不再扩展第二站点，不再引入非 MVP 新能力。

---

## 48. Prompt 44

### 目标

修正单站点试用发布前的自动化发布门，使当前仓库重新满足绿色 release gate。

### Prompt

请先完整阅读以下文档，再开始执行：

- `memory-bank/@architecture.md`
- `memory-bank/@game-design-document.md`
- `software-design-document.md`
- `tech-stack.md`

现在请只完成“单站点试用发布前自动化发布门修正”这一步。

要求：

- 不开发新产品能力，只修正当前仓库中阻止试用发布检查点通过的自动化验证失配。
- 重点对照当前真实 UI 文案、provider 设置状态反馈、side panel 行为，与现有 `tests/e2e/*`、必要的 unit test 断言保持一致。
- 至少处理：
  - options 页面 provider 保存后的状态提示断言与当前真实文案一致；
  - popup / side panel / options 中与 provider readiness 相关的断言一致；
  - 当前 built-extension e2e 对单站点 Truity 流程的关键闭环验证仍然保留：
    - extract；
    - answer planning；
    - side panel recommendation preview；
    - answer fill；
    - provider failure visibility；
    - degraded recommendation fill blocking。
- 不要在这一步顺手重做整套测试体系。
- 不要在这一步改变产品边界、站点范围或 provider 策略。
- 如果测试策略、验证边界或 checkpoint 状态描述发生变化，请更新 `memory-bank/@architecture.md`。

完成后请执行并汇报以下验证：

- `pnpm test:unit` 是否通过；
- `pnpm test:e2e` 是否通过；
- 当前 release gate 失败是否只来自测试断言过时，而不是产品闭环本身不成立。

---

## 49. Prompt 45

### 目标

收口单站点 MVP 中“manual confirmation before fill”与当前自动填充 UX 的分歧，使试用发布标准与文档/实现重新一致。

### Prompt

请先完整阅读以下文档，再开始执行：

- `memory-bank/@architecture.md`
- `memory-bank/@game-design-document.md`
- `software-design-document.md`
- `tech-stack.md`



---

## 50. Prompt 46

### 目标

完成单站点 MVP 的最终试用发布检查点，并确认仓库已达到“小范围试用发布标准”。

### Prompt

请先完整阅读以下文档，再开始执行：

- `memory-bank/@architecture.md`
- `memory-bank/@game-design-document.md`
- `software-design-document.md`
- `tech-stack.md`

现在请只完成“单站点 MVP 最终试用发布检查点”这一步。

要求：

- 不新增功能；重点是最终审计、验证、记录和收口。
- 必须重新检查以下内容：
  - 当前单站点范围是否仍然清晰锁定在 Truity Enneagram；
  - provider 调用、本地数据边界、非自动 submit 是否仍然清晰；
  - extract -> plan -> side panel 展示 -> fill -> error handling 是否形成稳定闭环；
  - 当前剩余延期项是否仍然显式写出；
  - 当前自动化发布门是否已经恢复为绿色；
  - 当前预填充确认策略是否已经与文档和实现一致。
- 明确区分：
  - 已达到“小范围试用发布标准”的部分；
  - 仍然属于正式更广泛使用前的延期项。
- 更新 `memory-bank/@architecture.md`，把 `single-site MVP trial-release checkpoint` 的状态改成真实结论。

完成后请执行并汇报以下验证：

- 当前单站点 MVP 是否已达到“小范围试用发布标准”；
- `pnpm test:unit` 与 `pnpm test:e2e` 是否均通过；
- 当前延期事项是否仍然显式存在，而不是被最终通过结论覆盖掉；
- architecture 是否已经准确反映最终试用发布状态。
