import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { expect, test } from "@playwright/test";

import { launchEdgeExtensionContext, resolveExtensionId } from "./support/edge-extension-context";
import { installMockOpenAiSuccessRoute } from "./support/openai-provider-mock";

const sbtiFixtureHtml = readFileSync(
  resolve(process.cwd(), "tests/fixtures/adapters/sbti-test-page.html"),
  "utf8"
);
const sbtiAssessmentUrl = "https://sbti.cc/test";

async function waitForSessionDetection(sidepanelPage: import("@playwright/test").Page) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    await sidepanelPage.getByRole("button", { name: "刷新推荐预览" }).click();

    if (
      (await sidepanelPage.getByText("已识别页面：sbti-test").isVisible()) &&
      (await sidepanelPage.getByText("会话状态：questions-extracted").isVisible())
    ) {
      return;
    }

    await sidepanelPage.waitForTimeout(250);
  }

  await expect(sidepanelPage.getByText("已识别页面：sbti-test")).toBeVisible();
  await expect(sidepanelPage.getByText("会话状态：questions-extracted")).toBeVisible();
}

async function configureOpenAiProvider(
  optionsPage: import("@playwright/test").Page,
  apiKey = "sk-e2e-test"
) {
  await optionsPage.getByRole("combobox", { name: "当前规划引擎" }).selectOption("openai");
  const apiKeyInput = optionsPage.getByLabel("API key");
  await apiKeyInput.fill(apiKey);
  await apiKeyInput.press("Tab");
  await optionsPage.getByText(/远程引擎 API key 已保存在本地。/).waitFor();
  await expect(optionsPage.getByText(/API 密钥状态：\s*已保存在本地/)).toBeVisible();
  await expect(optionsPage.getByText(/已选择 OpenAI/)).toBeVisible();
}

test.describe("e2e: SBTI trial flow", () => {
  test("covers bootstrap-backed extraction and step-by-step auto-fill without auto-submit", async () => {
    const extensionHandle = await launchEdgeExtensionContext();
    const openAiRoute = await installMockOpenAiSuccessRoute(extensionHandle.context, {
      answerPlans: [
        {
          recommendedOptionIds: ["3"],
          confidence: 0.73,
          rationale: "Profile evidence suggests a warm social style."
        },
        {
          recommendedOptionIds: ["2"],
          confidence: 0.79,
          rationale: "Profile evidence suggests cautious decision making."
        },
        {
          recommendedOptionIds: ["3"],
          confidence: 0.82,
          rationale: "Profile evidence suggests the drink gate should open."
        },
        {
          recommendedOptionIds: ["2"],
          confidence: 0.77,
          rationale: "Profile evidence suggests the follow-up should choose the stronger option."
        }
      ]
    });

    try {
      const extensionId = await resolveExtensionId(extensionHandle.context);
      const assessmentPage = await extensionHandle.context.newPage();

      await assessmentPage.route(sbtiAssessmentUrl, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "text/html",
          body: sbtiFixtureHtml
        });
      });
      await assessmentPage.goto(sbtiAssessmentUrl);
      await expect(assessmentPage.getByText("我会主动开口认识新朋友。")).toBeVisible();

      const optionsPage = await extensionHandle.context.newPage();
      await optionsPage.goto(`chrome-extension://${extensionId}/options.html`);
      await configureOpenAiProvider(optionsPage);
      await optionsPage.close();

      const sidepanelPage = await extensionHandle.context.newPage();
      await sidepanelPage.goto(`chrome-extension://${extensionId}/sidepanel.html`);
      await expect(sidepanelPage.getByRole("heading", { name: "ATTI AI 侧边栏" })).toBeVisible();

      await waitForSessionDetection(sidepanelPage);

      await sidepanelPage.getByLabel("画像摘要").fill("我偏向稳定、合作，也会保留自己的判断。");
      await sidepanelPage.getByLabel("证据备注").fill("愿意合作\n偏向先判断后行动");
      await sidepanelPage.getByRole("button", { name: "保存本地画像草稿" }).click();
      await expect(sidepanelPage.getByText("本地画像草稿已保存。")).toBeVisible();

      await sidepanelPage.getByRole("button", { name: "开始 AI 规划" }).click();
      await expect(sidepanelPage.getByText("会话状态：answer-fill-complete")).toBeVisible();
      await expect(
        sidepanelPage.getByText("已加载 4 道题，其中 4 条已有 AI 推荐。")
      ).toBeVisible();

      const openAiCalls = await openAiRoute.getCalls();
      expect(openAiCalls).toHaveLength(1);
      expect(openAiCalls[0]?.input).toContain("我会主动开口认识新朋友。");
      expect(openAiCalls[0]?.input).toContain("您平时有什么爱好？");

      await expect(assessmentPage.locator(".question-title")).toContainText(
        "我做决定前会先想清楚后果。"
      );
      await expect(assessmentPage.locator("#submitBtn")).toBeVisible();
      await expect(assessmentPage.locator("#submitBtn")).toBeEnabled();
    } finally {
      await openAiRoute.dispose();
      await extensionHandle.close();
    }
  });
});
