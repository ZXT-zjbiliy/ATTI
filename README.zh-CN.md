# ATTI

ATTI 是一个面向已接入性格测试网站的 `Edge` 扩展。它默认把画像、会话和推荐结果保留在本地；只有在你明确点击 `开始 AI 规划` 时，才会调用 provider 生成建议；它可以预览并填写受支持的问卷页面，但不会自动提交。

当前仓库版本：`0.5.0`

## 当前支持状态

- 最高信心路径：`Truity Enneagram`
- 已接入的附加适配器路由：`Truity DISC`、`Truity TypeFinder`
- 第二测试网站样本：`16Personalities`，已有 fixture 和浏览器级扩展覆盖，但当前环境下缺少稳定 live-site 验证，因为会受到 `Cloudflare` 限制
- 已接入公开测试路由：`SBTI / https://sbti.cc/test`，已支持它当前的单题逐步前进填写流程，并可自动推进到整套题填写完成
- 实验性兜底路径：generic fallback 只默认允许提取和预览，不默认允许页面填写，不能当成通用网站支持

## 支持的网站

- `Truity / Enneagram Personality Test`
  - `https://www.truity.com/test/enneagram-personality-test`
- `Truity / DISC Personality Test`
  - `https://www.truity.com/test/disc-personality-test`
- `Truity / TypeFinder Personality Test`
  - `https://www.truity.com/test/type-finder-personality-test-new`
- `16Personalities / Free Personality Test`
  - `https://www.16personalities.com/free-personality-test`
- `SBTI / test`
  - `https://sbti.cc/test`

## 个人信息怎么填

第一次试用时，不需要写得很长。你只要在 side panel 里填写两块：

- `画像摘要`
- `证据备注`

可以直接照这个最小格式来填。

`画像摘要`

```text
我通常更喜欢温和、合作、稳定且可执行的选择；面对问卷题目时，倾向于选择不过度极端、但能体现一致性和责任感的答案。
```

`证据备注`

```text
- 偏好清晰结构
- 愿意配合他人
- 不喜欢过于激进的表达
- 做决定时倾向稳定和可执行
- 面对陌生情境通常先观察再行动
```

更短版本见：

- [docs/guides/zh-CN/minimal-profile-draft.zh-CN.md](./docs/guides/zh-CN/minimal-profile-draft.zh-CN.md)

## 填写动作

- `开始 AI 规划` 会生成推荐并刷新 side panel 预览，不会直接填写页面。
- `应用推荐填写` 会在不重新生成推荐的前提下，把当前预览中的推荐填写到受支持页面。
- `SBTI / test` 会在显式填写步骤中沿着它的一题一页流程持续推进，直到页面进入“可提交但未提交”的状态。
- ATTI 仍然不会自动提交问卷。

## 错误恢复

side panel 会将错误分为可重试和不可重试两类：

- **可重试**错误（网络超时、provider 临时故障）会显示重试按钮，用户可以直接重试失败的操作，不需要从头开始。
- **不可重试**错误（缺少 API key、扩展已禁用、域名未批准）只显示错误消息，用户需要先修正配置。

## 数据管理

设置页提供数据导出和清理功能：

- **导出会话**：将所有会话记录下载为带时间戳的 JSON 文件。
- **导出画像**：将所有画像记录下载为带时间戳的 JSON 文件。
- **清除已完成会话**：在确认对话框后删除所有状态为 `completed` 的会话。不会删除活跃会话或画像。

## 会话状态

会话状态卡片显示当前活跃会话的结构化信息：

- `站点`：识别到的测评站点（如 `truity-enneagram`）
- 已提取题目数
- 推荐统计：已有 AI 推荐的题目数 / 总答题计划数

## 快速开始

开始做实现或架构工作前，先看这四份文档：

1. [memory-bank/@architecture.md](./memory-bank/@architecture.md)
2. [memory-bank/@game-design-document.md](./memory-bank/@game-design-document.md)
3. [software-design-document.md](./software-design-document.md)
4. [tech-stack.md](./tech-stack.md)

## 文档导航

- 架构现状权威记忆：
  [memory-bank/@architecture.md](./memory-bank/@architecture.md)
- 产品意图与范围约束：
  [memory-bank/@game-design-document.md](./memory-bank/@game-design-document.md)
- 简化实现架构：
  [software-design-document.md](./software-design-document.md)
- 工程规则与技术栈：
  [tech-stack.md](./tech-stack.md)
- 仓库结构说明：
  [docs/repository-map.md](./docs/repository-map.md)
- 文档维护规则：
  [docs/documentation-rules.md](./docs/documentation-rules.md)
- 版本规则：
  [docs/versioning.md](./docs/versioning.md)
- 发布信心门：
  [docs/release-confidence-gate.md](./docs/release-confidence-gate.md)
- 中文工作流提示词：
  [docs/prompts/zh-CN/ai-task-prompts.zh-CN.md](./docs/prompts/zh-CN/ai-task-prompts.zh-CN.md)
- 中文用户说明：
  [docs/guides/zh-CN/user-guide.zh-CN.md](./docs/guides/zh-CN/user-guide.zh-CN.md)
- 基础实施计划：
  [docs/plans/implementation-plan.md](./docs/plans/implementation-plan.md)

## 仓库结构

主要源码和测试区域：

- `src/`：实现源码
- `entrypoints/`：WXT 运行时入口
- `tests/`：unit、integration 和 e2e 验证
- `memory-bank/`：架构记忆与产品记忆
- `docs/`：仓库级导航、规则和维护文档

其中 `docs/` 下的中文 prompt、guide 和计划文档已经按用途分组，不再平铺在仓库根目录。

## 维护规则

- 保持按运行时、领域和功能拆分模块。
- 不要把逻辑揉成 monolith 巨文件。
- 架构、schema、消息契约或支持网站范围发生变化后，更新 [memory-bank/@architecture.md](./memory-bank/@architecture.md)。
- 新的导航或维护文档优先放进 `docs/`，避免根目录继续变成平铺文档架。
- 版本变更、提交规则和 Edge 构建要求以 [docs/versioning.md](./docs/versioning.md) 为准。
