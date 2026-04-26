# 泛解析 fallback adapter 设计提示词

## 1. 使用方式

这份文档用于设计一个“泛解析 fallback adapter”，它不是把 `ATTI` 变成任意网站自动化工具，而是作为当前显式站点适配器之外的一个安全候选路径，用于支持结构稳定、测试型评估页面的辅助识别。

这里的目标是：

- 设计一个额外的 adapter 层，它只在已有站点适配器都不匹配时作为最后一个候选项；
- 让它只匹配“明显的测试页面候选”，而不是任意页面；
- 保持 provider / adapter / runtime / storage 边界清晰，避免把 DOM 规则塞进 `llm/`；
- 让这项设计可审计、可关闭、可逐步收口，而不是直接放开到通用网站。

使用规则：

1. 一次只发一个 prompt，不要把多个阶段合并。
2. 每完成一步，都先检查测试和文档，再进入下一步。
3. 如果某一步改动了支持站点策略、消息契约、数据结构、模块边界或里程碑状态，必须同步更新 `memory-bank/@architecture.md`。
4. 在发送任意一个 prompt 之前，先完整阅读：
   - `memory-bank/@architecture.md`
   - `memory-bank/@game-design-document.md`
   - `software-design-document.md`
   - `tech-stack.md`

当前前提：

- 当前真实稳定可运行范围仍然只有 `Truity Enneagram` + 已试验的 `16Personalities`。
- 本次设计目标不是直接把 `ATTI` 变成任意页面解析系统，而是设计一个“收口良好、限域可控”的 fallback adapter。
- 这个 fallback adapter 必须保留“测试网站类型内逐步支持”的边界，不允许扩张到通用表单、登录页、支付页、电商页等。
- 不要一上来做通用化大重构。

## 2. Prompt 01：评估泛解析 fallback 设计是否合理

目标：
先确认“泛解析 fallback adapter”在当前架构和产品约束下是否可行。

提示词：

请先完整阅读以下文档，再开始执行：

- `memory-bank/@architecture.md`
- `memory-bank/@game-design-document.md`
- `software-design-document.md`
- `tech-stack.md`

现在请只完成“评估泛解析 fallback 设计是否合理”这一步。

要求：

- 说明当前适配器 registry 模型是否允许增加一个 fallback adapter；
- 说明该 fallback adapter 必须满足哪些最小边界条件，才能不破坏“仅支持测试网站”的定位；
- 明确限制：
  - 不允许让 fallback adapter 成为“任意网站自动化”入口；
  - 不允许把 provider 变成 DOM 级解析器；
  - 不允许把 fallback 逻辑与已有 site adapter 的特定 selector 混在一起；
  - 不允许引入自动提交、登录破解、验证码绕过等非 MVP 能力；
- 明确区分 fallback adapter 的设计和当前 `16Personalities` / `Truity` adapter 的现有实现。

完成后请汇报：

- 这个设计方向是否可行；
- 需要哪些约束和 guardrail 才能避免泛解析失控。

## 3. Prompt 02：定义 fallback adapter 的边界与准入标准

目标：
定义一个 fallback adapter 只会匹配哪些页面，什么时候才进入它。

提示词：

现在请只完成“fallback adapter 的边界与准入标准”这一步。

要求：

- 至少定义以下准入项：
  - 页面是否公开可访问；
  - 是否含有稳定的评估问题文本结构；
  - 是否是重复的题干+单选/评分选择模型；
  - 是否不涉及登录、验证码、付费墙、复杂表单交互；
  - 是否具有可识别的测试网站元信息（标题、指引、meta、可见题目指示）；
- 明确写出：
  - 这个 fallback adapter 只会在所有显式注册 adapter 都不匹配时才尝试；
  - 它不会取代已注册适配器的优先级；
  - 它能否继续复用当前 question / answer-plan / session / diagnostics 归一化模型；
- 强调：不把站点特定 selector 直接写进 provider，不把 DOM 剖析直接交给 provider。

完成后请汇报：

- fallback adapter 的准入标准是什么；
- 是否仍然保持“同样的测试网站范围，而不是任意网站”的边界。

## 4. Prompt 03：设计 fallback adapter 接口与模块边界

目标：
确定这个 adapter 在 registry、content、background、storage 中的边界位置。

提示词：

现在请只完成“fallback adapter 接口与模块边界设计”这一步。

要求：

- 说明需要修改或新增的接口：
  - `SiteAdapter` 是否需要新增 `isSupportedAssessmentPage` 或 `locateQuestionRegions` 兼容回退场景；
  - `adapterRegistry` 是否要保证 fallback adapter 始终最后匹配；
- 说明 content runtime 是否继续只传 HTML 给 adapter，而不是把 DOM 逻辑移到 background；
- 说明 fallback adapter 如何收集“候选题目容器”并返回统一的 `ExtractedQuestionDraft`；
- 说明 fallback adapter 是否需要一个 feature flag 或试验门控；
- 说明如何在 `memory-bank/@architecture.md` 中写清这条设计：
  - fallback adapter 只是一个有限候选路径，不是新的默认全部通用路径；
  - 它的输出仍然要经过 UI review/preview；
  - 它不能绕过 `no auto-submit`。

完成后请汇报：

- 这个 adapter 的边界设计是否清晰；
- 是否避免了“泛解析变成万能框架”的风险。

## 5. Prompt 04：设计 fallback adapter 的提取与填充策略

目标：
设计具体的提取/填充策略，但不实现全部逻辑。

提示词：

现在请只完成“fallback adapter 的提取与填充策略”这一步。

要求：

- 提取策略应至少包含：
  - 问题槽/题干识别（常见 `<fieldset>`、`<article>`、`<section>`、可见标题文本）；
  - 选项识别（`input[type=radio]`、`button`、`span` 等可选项容器）；
  - 题型判断：重复单选、评分、七点量表，不扩展到复杂矩阵题；
- 填充策略应至少包含：
  - 只填充用户确认的 answer-plan 结果；
  - 识别具体 question container 并选择对应 radio/按钮；
  - 不自动提交、不触发下一页；
- 说明哪些条件下不做解析/填充：
  - 页面看起来更像登录/表单不是测试；
  - 题目结构不稳定或选项不足；
  - 页面含有复杂嵌套交互、验证码、付费入口。
- 说明这种策略如何与现有 `Truity` / `16Personalities` adapter 共存。

完成后请汇报：

- fallback adapter 的提取/填充策略是什么；
- 是否仍然保持“只支持测试型题目，不支持任意页面”。

## 6. Prompt 05：设计 fallback adapter 的可控发布与试验门

目标：
定义如何把这个 fallback adapter 作为受限试验功能上线，而不是直接放到默认路径。

提示词：

现在请只完成“fallback adapter 可控发布与试验门”这一步。

要求：

- 说明需要哪些测试覆盖：
  - 站点识别/候选匹配；
  - fallback 解析回退与显式 adapter 优先级；
  - 统一提取结果是否符合 question/answer-plan schema；
  - 填充执行是否保持 no auto-submit；
- 说明是否要增加 feature flag、实验开关或 debug-only 模式；
- 说明数据与 diagnostics 如何记录“fallback 适配器路径”与“失败原因”；
- 说明如何把这个 trial 状态写入 `memory-bank/@architecture.md`。

完成后请汇报：

- 这个 fallback adapter 是否已经有可控发布门；
- 是否保持了可审计、可关闭的设计。

## 7. Prompt 06：设计 fallback adapter 的风险与应急回退

目标：
确认这个设计不会把 `ATTI` 拉成“泛解析怪兽”，并设计回退/关闭策略。

提示词：

现在请只完成“fallback adapter 风险与应急回退”这一步。

要求：

- 识别最关键的风险点：
  - 体验上误识别非测试页面；
  - 提取结果质量不足导致推荐无效；
  - 填充误触导致用户信任下降；
- 设计两层保护：
  - 匹配层保护：只有明确测验候选页面才进入；
  - 执行层保护：只有“确认推荐后才填充”，并显示 fallback 路径信息；
- 说明应急回退机制：
  - 全局开关立即关闭 fallback adapter；
  - diagnostics 记录“回退适配器失败原因”；
  - 不把失败路径写进 session 可视化，以免用户误判可支持范围；
- 写清这一步的结果要更新 `memory-bank/@architecture.md`。

完成后请汇报：

- fallback adapter 的风险点和保护机制是什么；
- 是否已经设计好应急回退方案。

## 8. Prompt 07：设计类泛解析 fallback adapter 的文档与团队协同

目标：
把这个 fallback adapter 的设计写成可执行的团队协同方案。

提示词：

现在请只完成“fallback adapter 设计文档与协同”这一步。

要求：

- 说明这个 adapter 的设计目标、边界、优先级、可关闭方式；
- 说明哪些现有文件必须更新：
  - `memory-bank/@architecture.md`
  - `docs/prompts/zh-CN/multi-site-expansion-prompts.zh-CN.md`
  - `src/adapters/registry/adapter-catalog.ts`
  - `src/adapters/sites/placeholder-site-adapter.ts` 或新增 `generic-fallback-site-adapter.ts`
  - tests/unit/***；
- 说明这项设计不会影响当前 `Truity` 单站点 MVP 的稳定路径；
- 说明 future-proof 条件：如果后续需要正式把 fallback 变成更多站点入口，应该先补齐准入标准和发布门。

完成后请汇报：

- fallback adapter 设计是否已经形成可执行方案；
- 是否清晰区分了“当前试验路径”和“未来正式扩展”。

## 9. Prompt 08：推送到可用

目标：
把这个 fallback adapter 的设计从“可行方案”推进到“可用候选功能”，包括实现准备、文档收口和发布门确认。

提示词：

现在请只完成“推送到可用”这一步。

要求：

- 制定一个最小可用交付列表，至少包含：
  - 适配器注册与优先级实现；
  - fallback 匹配与提取规则实现；
  - feature flag / trial 开关实现；
  - fallback diagnostics 及失败记录实现；
  - 关键 unit 测试和回归测试。
- 说明哪些具体文件和模块需要落地实现：
  - `src/adapters/registry/adapter-catalog.ts`
  - `src/adapters/sites/placeholder-site-adapter.ts` 或 `src/adapters/sites/generic-fallback-site-adapter.ts`
  - `src/content/question-extraction.ts` / `src/content/runtime.ts`（需要确认 HTML 传递边界）
  - `memory-bank/@architecture.md`
  - `tests/unit/**/*.test.ts`
- 说明要如何把这些实现结果验证成“可用”状态：
  - 最少一条 fallback adapter 通用匹配测试；
  - 一条 fallback extraction 到 `ExtractedQuestionDraft` 的完整链路测试；
  - 一条 fallback 填充不触发自动提交的测试；
  - 一条 feature flag 默认关闭、开启后生效的测试。
- 说明如何把这个可用候选路径写进 `memory-bank/@architecture.md` 和 `docs/prompts/zh-CN/multi-site-expansion-prompts.zh-CN.md`：
  - 标记当前为“试验候选功能”而非默认路径；
  - 标记 `fallback adapter` 仍需后续准入标准和发布门校验；
  - 标记当前版本为下一次 `x.y.z` patch 或 minor 试验功能，而不是正式全面开放。

完成后请汇报：

- 这个 fallback adapter 是否已经具备“可推送到可用”的实施计划；
- 是否能用最小实现把它控制在“试验性、可关闭、可审计”的范围内。

## 10. 可用候选功能实施计划

这是一个最小可用交付方案，用于把 fallback adapter 设计推进到“可试验、可关闭、可审计”的候选功能。

### 最小可用交付列表

- 适配器注册与优先级实现
  - 在 `src/adapters/registry/adapter-catalog.ts` 中新增或调整注册逻辑，确保 fallback adapter 总是最后匹配。
  - 适配器匹配流程必须先尝试显式注册的 site adapter，再在都不匹配时进入 fallback。
- fallback 匹配与提取规则实现
  - 实现 `src/adapters/sites/generic-fallback-site-adapter.ts`（或用 `placeholder-site-adapter.ts` 代替，推荐新建更明确的 `generic-fallback-site-adapter.ts`）。
  - 使用页面元信息、可见题目指示、重复题干 + 单选/评分结构等候选规则；只支持稳定的评估页面候选，不支持通用表单。
  - 返回统一的 `ExtractedQuestionDraft`，保持与现有 question/answer-plan/session/diagnostics 模型一致。
- feature flag / trial 开关实现
  - 增加一个 fallback trial 开关，默认关闭。
  - 该开关可在配置或 debug 模式中显式打开，生产默认不启用。
- fallback diagnostics 及失败记录实现
  - 在适配器选择和提取阶段记录 adapter path、match/拒绝原因、fallback 启动状态。
  - 失败时写入 diagnostics，不影响主流程，且不得把失败路径当成最终可支持范围展示给用户。
- 关键 unit 测试和回归测试
  - 测试 registry ordering 和显式 adapter优先级。
  - 测试 fallback 通用匹配候选。
  - 测试提取结果是否能转成 `ExtractedQuestionDraft`。
  - 测试填充阶段不触发自动提交。
  - 测试 feature flag 默认关闭、开启后生效。

### 需要落地实现的具体文件与模块

- `src/adapters/registry/adapter-catalog.ts`
  - 增加 fallback adapter 优先级声明；
  - 明确适配器匹配顺序；
  - 增加是否启用 fallback trial 的判断入口。
- `src/adapters/sites/placeholder-site-adapter.ts` 或 `src/adapters/sites/generic-fallback-site-adapter.ts`
  - 推荐新增 `generic-fallback-site-adapter.ts` 以避免与 placeholder 功能混淆；
  - 该适配器应提供 `isSupportedAssessmentPage` / `extractQuestions` 等有限接口。
- `src/content/question-extraction.ts` / `src/content/runtime.ts`
  - 确认内容脚本仍然传递 HTML/DOM snapshot 给 adapter；
  - 避免把 DOM 解析规则移到 background 或 llm 层；
  - 仅在 content runtime 内做页面候选判断和提取，返回标准数据给 background/UI。
- `memory-bank/@architecture.md`
  - 写入当前 fallback adapter 为试验候选路径，默认关闭；
  - 写入匹配边界、release gate、diagnostics 记录和 no auto-submit 约束；
  - 说明它不会影响 `Truity` MVP 的稳定路径。
- `tests/unit/**/*.test.ts`
  - 增加 fallback adapter 匹配、提取、填充、feature flag 等测试。

### 可用状态的验证检查点

- 一条 fallback adapter 通用匹配测试
  - 通过一个典型的“测试页面候选” HTML 片段，验证 fallback adapter 在显式 adapter 不匹配时能识别为候选。
- 一条 fallback extraction 到 `ExtractedQuestionDraft` 的完整链路测试
  - 模拟 content runtime 调用，验证从页面候选抽取到最终 draft 结构的完整输出。
- 一条 fallback 填充不触发自动提交的测试
  - 测试填充逻辑只选中 radio/button，不执行 form.submit 或 click 下一步。
- 一条 feature flag 默认关闭、开启后生效的测试
  - 默认情况下即使页面符合候选，也不进入 fallback；打开 trial flag 后才启用。

### 写入文档时的表达方式

- `memory-bank/@architecture.md`
  - 标记当前为“试验候选功能”，而不是默认路径；
  - 写明该 adapter 只在显式 site adapter 都不匹配时才尝试；
  - 说明它仍需后续准入标准与发布门校验，当前仅作为探索性路径；
  - 明确“默认关闭”“可关闭”“可审计”“无自动提交”。
- `docs/prompts/zh-CN/multi-site-expansion-prompts.zh-CN.md`
  - 在多站点扩展规划中加入 fallback trial 的说明；
  - 强调这不是正式全面开放的通用解析，而是“下一次 `x.y.z` 试验/bugfix 候选功能”；
  - 说明现阶段关键点是“试验边界”“优先级最后”“显式关闭”。

### 结论

- 这个 fallback adapter 已具备“可推送到可用”的实施计划。
- 通过最小实现可以把它控制在“试验性、可关闭、可审计”的范围内：
  - 默认关闭的 feature flag；
  - 最后匹配的 fallback 优先级；
  - 严格的候选页面准入标准；
  - Diagnostics 记录路径与失败原因；
  - 无自动提交、无登录/验证码绕过。
