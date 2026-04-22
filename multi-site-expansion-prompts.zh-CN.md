# 多站点扩展逐步提示词

## 1. 使用方式

这份文档用于把当前 ATTI 从“锁定单站点 MVP”逐步演进到“AI-first 的多站点支持”。

这里说的 “AI-first” 指的是：

- 让产品路线、交互文案和后续规划优先围绕 AI 规划能力组织
- 尽量减少过重的站点特定产品逻辑和后端识别分支
- 但不等于今天就已经具备任意站点通用自动化能力

使用规则：

1. 一次只发一个 prompt，不要把多个阶段合并。
2. 每完成一步，都先检查测试和文档，再进入下一步。
3. 如果某一步改动了站点策略、消息契约、数据结构、模块边界或里程碑状态，必须同步更新 `memory-bank/@architecture.md`。
4. 在发送任意一个 prompt 之前，先完整阅读：
   - `memory-bank/@architecture.md`
   - `memory-bank/@game-design-document.md`
   - `software-design-document.md`
   - `tech-stack.md`

当前前提：

- 当前稳定可运行范围仍然只有 `Truity Enneagram`
- 不要跳过“先收口边界，再扩站点”的顺序
- 不要一上来做通用化大重构

## 2. Prompt 01：AI-first 多站点路线收口

目标：
先把“如何从单站点走向 AI-first 多站点”的产品边界、架构边界和延期项写清楚，不直接开发新站点。

提示词：

请先完整阅读以下文档，再开始执行：

- `memory-bank/@architecture.md`
- `memory-bank/@game-design-document.md`
- `software-design-document.md`
- `tech-stack.md`

现在请只完成“AI-first 多站点路线收口”这一步。

要求：

- 不新增第二站点实现，只先明确扩展原则。
- 重点说明哪些能力可以朝 AI-first 多站点演进，哪些边界仍然必须维持单站点锁定。
- 明确限制：
  - 不引入任意站点通用自动填写承诺；
  - 不把 DOM 提取和填充逻辑直接塞进 provider；
  - 不引入巨型审核台、权限中心、云同步、多 profile 协作。
- 必须在 `memory-bank/@architecture.md` 中写清：
  - AI-first 多站点只是路线，不是当前已交付现实；
  - provider / adapter / runtime / storage 边界如何继续保持清晰；
  - 什么时候才允许把“单站点锁定”改成“多站点试用”。

完成后请汇报：

- 当前仓库是否已经具备“可渐进扩站点”的边界条件；
- 哪些约束必须保留，避免多站点演进把 MVP 拉成 monolith。

## 3. Prompt 02：第二站点准入标准

目标：
先建立“什么样的第二站点才允许被接入”的准入标准。

提示词：

现在请只完成“第二站点准入标准”这一步。

要求：

- 不接入真实第二站点，只制定准入标准。
- 至少定义以下准入项：
  - 页面是否公开可访问；
  - 问题结构是否稳定；
  - 是否是重复的单题单选模型；
  - 是否不涉及登录、验证码、付费墙；
  - 是否适合当前 `profile -> recommendation -> fill` 模型。
- 把这些标准写入 `memory-bank/@architecture.md`。
- 不要在这一步扩张 provider 策略。

完成后请汇报：

- 第二站点准入是否已经有明确标准；
- 是否仍然保持“不是任意网站都支持”的边界。

## 4. Prompt 03：registry 与边界演进

目标：
让当前结构从“只够单站点”演进到“能继续容纳多个独立站点”，但不重做成通用框架怪兽。

提示词：

现在请只完成“registry 与边界演进”这一步。

要求：

- 不新增第二站点真实逻辑，重点是结构和契约演进。
- 继续保持每个站点一个独立 adapter 或独立边界单元。
- 不允许把多个站点塞进同一个 adapter 文件。
- 不允许把站点特定 selector 泄漏到 content、background 或 UI。
- 如果需要调整 interface 或 registry 结构，必须同步更新测试和 `memory-bank/@architecture.md`。

完成后请汇报：

- 当前结构是否已经能清晰承载多个站点；
- 是否仍然避免了“跨站点大杂烩 adapter”。

## 5. Prompt 04：第二站点最小接入

目标：
以最小方式接入一个第二站点，但只做 MVP 允许的窄能力。

提示词：

现在请只完成“第二站点最小接入”这一步。

要求：

- 只新增一个第二站点。
- 新站点必须满足已定义的准入标准。
- 只实现：
  - 页面识别；
  - 问题提取；
  - recommendation preview 复用；
  - fill；
  - 基本错误可见性。
- 不扩展到新的题型系统。
- 不因为第二站点而重写现有 Truity adapter。
- 所有站点特定逻辑都必须继续留在独立边界内。

完成后请汇报：

- 第二站点是否已经在最小范围内接入；
- 当前实现是否仍然保持“每站点独立、共享归共享”的结构。

## 6. Prompt 05：多站点 session 与 diagnostics 审计

目标：
确保多站点之后，session 与 diagnostics 仍然可区分、可追踪、不过度耦合。

提示词：

现在请只完成“多站点 session 与 diagnostics 审计”这一步。

要求：

- 不新增大 UI，只补必要的数据边界与验证。
- 重点检查：
  - `siteId` 是否足够支持多站点区分；
  - session history 是否能清楚显示站点来源；
  - diagnostics 是否能明确定位到具体站点边界；
  - 不同站点之间的数据是否没有混淆。
- 如有必要，补最小测试。
- 如果数据结构或记录语义变化，更新 `memory-bank/@architecture.md`。

完成后请汇报：

- 多站点下 session 与 diagnostics 是否仍然清晰；
- 是否没有把历史与诊断膨胀成新的复杂系统。

## 7. Prompt 06：provider 边界审计

目标：
验证当前 provider 契约是否足够支持多个站点，而不会把站点知识混进 `llm/`。

提示词：

现在请只完成“provider 边界审计”这一步。

要求：

- 不新增新 provider。
- 重点检查：
  - provider 输入是否仍然是规范化问题，而不是站点 DOM 细节；
  - parser 是否仍然只处理 recommendation 结果，而不是站点特例；
  - AI-first 路线下 provider 是否仍然不是 adapter 的替代品。
- 如发现边界不清，只做最小修正。
- 同步更新相关测试与 `memory-bank/@architecture.md`。

完成后请汇报：

- provider 是否仍保持可替换边界；
- 是否没有因为多站点而把站点逻辑塞进 `llm/`。

## 8. Prompt 07：多站点试用发布门

目标：
把自动化验证从“单站点试用发布”扩展到“多站点试用发布”，但仍保持可维护。

提示词：

现在请只完成“多站点试用发布门”这一步。

要求：

- 不重做整套测试体系。
- 只为新增站点补齐必要的 unit / e2e 覆盖。
- 至少覆盖：
  - 站点识别；
  - extract；
  - recommendation preview；
  - fill；
  - provider failure visibility；
  - degraded recommendation fill blocking。
- 不把所有站点流程堆进一个超长 e2e 文件。
- 如测试策略变化，更新 `memory-bank/@architecture.md`。

完成后请汇报：

- 多站点 release gate 是否已经形成；
- 测试是否仍保持模块化，而不是变成 monolith。

## 9. Prompt 08：多站点试用检查点

目标：
在不追求正式全面发布的前提下，确认仓库是否达到“多站点小范围试用”标准。

提示词：

现在请只完成“多站点试用检查点”这一步。

要求：

- 不新增功能，只做审计、验证、记录和收口。
- 必须重新检查：
  - 当前支持站点范围是否已明确写出；
  - 哪些站点已达试用标准，哪些仍未达标；
  - provider / storage / adapter / UI 边界是否仍然清晰；
  - 不 auto-submit 是否仍然成立；
  - 剩余延期项是否仍然显式存在。
- 更新 `memory-bank/@architecture.md` 中的多站点试用状态。
- 明确区分：
  - 已达到小范围试用标准的部分；
  - 仍属于更广泛正式使用前延期的部分。

完成后请汇报：

- 当前是否已达到“多站点小范围试用发布标准”；
- 哪些事项仍被显式延期，没有被通过结论覆盖。

## 10. 额外提醒

扩展到多个站点时，最容易失控的地方有三个：

1. 过早把 adapter 抽象成庞大的通用框架。
2. 把站点差异一路渗透到 provider、UI、storage。
3. 因为想“一次到位”，顺手引入非 MVP 系统。

如果后续继续推进，推荐顺序仍然是：

1. 先收口 AI-first 多站点路线和准入标准。
2. 再演进 registry 和边界。
3. 再接入第二站点。
4. 最后补多站点发布门与试用检查点。
