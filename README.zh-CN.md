# ATTI

ATTI 是一个面向已接入性格测试网站的 `Edge` 扩展。它默认把画像、会话和推荐结果保留在本地；只有在你明确点击 `开始 AI 规划` 时，才会调用 provider 生成建议；它可以预览并填写受支持的问卷页面，但不会自动提交。

当前仓库版本：`0.4.4`

## 当前支持状态

- 最高信心路径：`Truity Enneagram`
- 已接入的附加适配器路由：`Truity DISC`、`Truity TypeFinder`
- 第二测试网站样本：`16Personalities`，已有 fixture 和浏览器级扩展覆盖，但当前环境下缺少稳定 live-site 验证，因为会受到 `Cloudflare` 限制
- 已接入公开测试路由：`SBTI / https://sbti.cc/test`，已支持它当前的单题逐步前进填写流程
- 实验性兜底路径：generic fallback 提取逻辑仍然受限，不能当成通用网站支持

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
