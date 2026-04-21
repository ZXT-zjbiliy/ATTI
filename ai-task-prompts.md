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

