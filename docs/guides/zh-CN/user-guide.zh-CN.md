# ATTI 用户使用说明

本说明适用于 `ATTI 0.4` 发布线。

## 1. 这是什么

ATTI 是一个 `Edge` 扩展，用来辅助你在当前已接入的性格测试问卷页面上减少重复答题。

它现在是一个 `多测试网站、小范围、适配器明确接入` 的试用版产品，不是“任意网站都能自动填写”的通用工具。

当前明确支持的公开测试页面只有以下五个路由：

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

ATTI 现在可以做这些事：

- 在扩展里保存一份本地画像草稿
- 识别当前页面是否属于受支持的测试问卷页
- 从页面中提取问题
- 根据你的画像和当前问题生成 AI 推荐
- 在 side panel 中展示推荐结果、置信度和理由
- 在你明确点击 `开始 AI 规划` 后，把可用推荐自动填写到页面
- 在已有推荐不变的前提下，通过 `再次填写` 重新执行一次自动填写

ATTI 现在不会做这些事：

- 不支持任意网站自动填写
- 不支持非测试类网站
- 不支持未明确接入的其他测试网站或其他页面路由
- 不会自动提交问卷
- 不会绕过登录、验证码、付费墙或反自动化限制

## 2. 当前支持范围怎么理解

请把当前支持范围理解成下面这样：

- `Truity Enneagram` 仍然是当前最成熟、信心最高的路径
- `Truity DISC` 和 `Truity TypeFinder` 已进入正式适配范围，但验证强度仍低于 `Truity Enneagram`
- `16Personalities` 已进入小范围试用范围，但在当前环境下仍缺少稳定的持续 live-site 验证，因为会受到 `Cloudflare` 限制
- `SBTI / test` 已完成适配，当前按适配器接入的公开测试页面处理
- generic fallback 仍然只是实验性的兜底路径，不能当成“其他网站大概率也能用”

如果你不在上面这五个明确页面里，就不应默认 ATTI 也能正常工作。

## 3. 数据与隐私

默认保留在本地的数据包括：

- 你的本地画像草稿
- 已提取的问题
- 推荐答案
- 本地会话记录
- 诊断信息

只有在你主动点击 `开始 AI 规划` 时，系统才会按当前设置调用 provider。

当前真实试用主路径是：

- `OpenAI`

本地 fallback provider 仍然存在，但主要用于开发或受控演示，不是当前真实试用的主路径。

请记住两条边界：

- ATTI 可能会在你主动触发后自动填写答案
- ATTI 不会自动提交问卷

## 4. 开始前准备

使用前请确认：

1. 你已经在 Edge 中加载了这个扩展。
2. 你打开的是当前受支持的测试网站问卷页面。
3. 你已经在 `ATTI 设置` 中选择了 `OpenAI`。
4. 你已经保存了可用的 `OpenAI API key`。

如果没有保存 API key，popup、options 和 side panel 都会提示当前 provider 尚未就绪。

## 5. 怎么使用

### 第一步：配置 provider

打开扩展的 `ATTI 设置` 页面，然后完成：

1. 在 `当前规划引擎` 中选择 `OpenAI`
2. 在 `OpenAI API key` 输入框中填入 key
3. 确认页面显示 key 已保存在本地

### 第二步：进入受支持页面

在浏览器中打开以下任一页面：

- `https://www.truity.com/test/enneagram-personality-test`
- `https://www.truity.com/test/disc-personality-test`
- `https://www.truity.com/test/type-finder-personality-test-new`
- `https://www.16personalities.com/free-personality-test`
- `https://sbti.cc/test`

然后打开 ATTI 的 `side panel`。

如果页面被正确识别，你会看到类似：

- `已识别页面：truity-enneagram`
- `已识别页面：truity-disc`
- `已识别页面：truity-typefinder`
- `已识别页面：sixteen-personalities`
- `已识别页面：sbti-test`

### 第三步：保存本地画像草稿

在 side panel 中填写：

- `画像摘要`
- `证据备注`

然后点击：

- `保存本地画像草稿`

这一步只会把你的画像草稿保存在本地。

### 第四步：开始 AI 规划并自动填写

在 side panel 中点击：

- `开始 AI 规划`

点击后会连续发生三件事：

1. 生成推荐答案
2. 展示推荐预览
3. 把可用推荐自动填写到当前问卷页面

当前试用阶段的规则是：

- 你点击 `开始 AI 规划`，就等于确认触发本次填写
- 系统会在规划完成后立即执行 fill
- 但仍然不会自动提交

如果页面因为刷新、切题中断或你想重新执行填写，也可以点击：

- `再次填写`

这个动作会直接复用当前会话里已经保存的推荐，不会重新生成一轮新的 AI 规划。

## 6. SBTI 页面说明

`https://sbti.cc/test` 和前面几个站点有一点不同，它是 `单题逐步前进` 的页面流。

你可以这样理解当前行为：

- 页面一次只展示一题
- 选中选项后，页面会自动进入下一题
- ATTI 会按当前页面实际显示的问题逐题填写，并持续推进到整套题填写完成
- 如果页面里出现条件题，ATTI 会按当前问卷流继续处理
- 当所有目标题目填写完成后，ATTI 会停在最终可提交状态
- `提交` 仍然由你自己决定是否点击

也就是说，ATTI 会帮你走到“题目都填好了，可以提交”的状态，但不会替你最终提交。

## 7. 你会看到什么

side panel 会展示每道题的：

- 页面填写结果
- 置信度
- 理由说明

建议你先快速检查推荐预览，确认这些结果大体符合你的判断。

如果某些 recommendation 被判定为质量降级，你仍然可能在预览中看到它们，但它们不会被当成可安全执行的 fill 结果继续写入页面。

## 8. 常见异常

### 1. provider 尚未就绪

如果没有保存 OpenAI key，或者 provider 配置不完整：

- `开始 AI 规划` 会被阻止，或出现明确提示
- 你需要先回到 `ATTI 设置` 完成配置

### 2. provider 请求失败

如果 OpenAI 调用失败，side panel 会显示清晰的错误提示。

这时通常需要检查：

- API key 是否正确
- 网络是否可用
- OpenAI 是否返回异常状态

### 3. 推荐质量不足

如果系统判断当前 recommendation 质量退化，例如：

- 置信度过低
- 理由像占位文本

那么 side panel 仍可能展示这些 recommendation，但系统不会把它们当成可安全执行的 fill 结果继续写入页面。

### 4. 页面无法被正确识别

如果页面结构发生变化，ATTI 可能无法正常提取或填写。

当前版本只对上面五个明确接入的公开测试问卷路由做了适配，不保证支持同域其他页面，也不保证支持未接入网站。

另外要注意：

- `Truity` 当前真实站点信心最高
- `16Personalities` 当前在本环境下仍缺少持续 live-site 验证
- generic fallback 仍是实验兜底，不应被理解成正式支持

## 9. 当前版本边界

为了避免误解，请按下面这些事实理解当前版本：

1. 这不是任意网站通用自动填写工具。
2. 这不是“所有测试网站都支持”的产品。
3. 当前是“多测试网站、小范围、明确接入”的 `0.4` 发布线，不是广泛正式发布。
4. 当前明确支持的只有五个公开测试网站问卷路由。
5. `provider / storage / adapter / UI` 的边界仍然保持分离。
6. `no auto-submit` 仍然成立：可以自动 fill，但不会自动提交问卷。

## 10. 还没有覆盖的内容

当前版本仍然没有覆盖：

- 其他未接入测试网站
- 已接入域名下的其他无关页面或其他测试
- 非测试类网站
- 通用网页登录、支付、招聘、表单后台等页面
- 云同步
- 多 profile 协作
- 大型审核台
- 权限中心

## 11. 如果你只想记住三句话

1. 现在只支持五个明确接入的测试网站路由：`Truity Enneagram`、`Truity DISC`、`Truity TypeFinder`、`16Personalities` 和 `SBTI / test`。
2. 点击 `开始 AI 规划` 会生成并填写答案，但不会自动提交。
3. 数据默认保留在本地，只有在你主动开始规划时才会调用 provider。
