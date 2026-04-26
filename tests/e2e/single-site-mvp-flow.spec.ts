import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { expect, test } from "@playwright/test";

import { launchEdgeExtensionContext, resolveExtensionId } from "./support/edge-extension-context";
import {
  installMockOpenAiFailureRoute,
  installMockOpenAiSuccessRoute
} from "./support/openai-provider-mock";

const truityFixtureHtml = readFileSync(
  resolve(process.cwd(), "tests/fixtures/adapters/truity-enneagram-assessment.html"),
  "utf8"
);
const truityAssessmentUrl = "https://www.truity.com/test/enneagram-personality-test";

async function waitForSessionDetection(sidepanelPage: import("@playwright/test").Page) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    await sidepanelPage.getByRole("button", { name: "刷新推荐预览" }).click();

    if (
      (await sidepanelPage.getByText("已识别页面：truity-enneagram").isVisible()) &&
      (await sidepanelPage.getByText("会话状态：questions-extracted").isVisible())
    ) {
      return;
    }

    await sidepanelPage.waitForTimeout(250);
  }

  await expect(sidepanelPage.getByText("已识别页面：truity-enneagram")).toBeVisible();
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

test.describe("e2e: single-site MVP flow", () => {
  test("covers real-provider preview -> rationale -> auto-fill on the locked Truity MVP path", async () => {
    const extensionHandle = await launchEdgeExtensionContext();
    const openAiRoute = await installMockOpenAiSuccessRoute(extensionHandle.context, {
      answerPlans: [
        {
          recommendedOptionIds: ["2"],
          confidence: 0.73,
          rationale:
            "Profile evidence suggests a measured preference for structure over rigidity."
        },
        {
          recommendedOptionIds: ["5"],
          confidence: 0.84,
          rationale:
            "Profile evidence suggests a strong tendency to help others consistently."
        }
      ]
    });

    try {
      console.log("e2e-step: launch");
      const extensionId = await resolveExtensionId(extensionHandle.context);
      const assessmentPage = await extensionHandle.context.newPage();

      await assessmentPage.route(truityAssessmentUrl, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "text/html",
          body: truityFixtureHtml
        });
      });
      await assessmentPage.goto(truityAssessmentUrl);
      await expect(assessmentPage.getByText("I strive for perfection")).toBeVisible();
      console.log("e2e-step: assessment-loaded");

      const optionsPage = await extensionHandle.context.newPage();
      await optionsPage.goto(`chrome-extension://${extensionId}/options.html`);
      await configureOpenAiProvider(optionsPage);
      await optionsPage.close();
      console.log("e2e-step: provider-configured");

      const sidepanelPage = await extensionHandle.context.newPage();

      await sidepanelPage.goto(`chrome-extension://${extensionId}/sidepanel.html`);
      await expect(sidepanelPage.getByRole("heading", { name: "ATTI AI 侧边栏" })).toBeVisible();
      console.log("e2e-step: sidepanel-open");

      await waitForSessionDetection(sidepanelPage);
      console.log("e2e-step: session-detected");

      await sidepanelPage.getByLabel("画像摘要").fill(
        "I prefer reflective but helpful choices."
      );
      await sidepanelPage.getByLabel("证据备注").fill(
        "Prefer clear structure\nHelp others consistently"
      );
      await sidepanelPage.getByRole("button", { name: "保存本地画像草稿" }).click();
      await expect(sidepanelPage.getByText("本地画像草稿已保存。")).toBeVisible();
      console.log("e2e-step: profile-saved");

      await sidepanelPage.getByRole("button", { name: "开始 AI 规划" }).click();
      await expect(sidepanelPage.getByText("会话状态：answer-fill-complete")).toBeVisible();
      await expect(
        sidepanelPage.getByText("已加载 2 道题，其中 2 条已有 AI 推荐。")
      ).toBeVisible();
      await expect(sidepanelPage.getByText("Confirm recommendation")).toHaveCount(0);
      await expect(sidepanelPage.getByText("页面填写：Somewhat Inaccurate")).toBeVisible();
      await expect(sidepanelPage.getByText("页面填写：Accurate")).toBeVisible();
      await expect(
        sidepanelPage.getByText(
          "理由说明：Profile evidence suggests a measured preference for structure over rigidity."
        )
      ).toBeVisible();
      await expect(
        sidepanelPage.getByText(
          "理由说明：Profile evidence suggests a strong tendency to help others consistently."
        )
      ).toBeVisible();
      const openAiCalls = await openAiRoute.getCalls();
      expect(openAiCalls).toHaveLength(1);
      expect(openAiCalls[0]?.input).toContain("Questions: ");
      console.log("e2e-step: planning-complete");
      console.log("e2e-step: fill-complete");

      await expect(
        assessmentPage.locator('fieldset[data-atti-question-block="question-1"] input[value="2"]')
      ).toBeChecked();
      await expect(
        assessmentPage.locator('fieldset[data-atti-question-block="question-2"] input[value="5"]')
      ).toBeChecked();
    } finally {
      await openAiRoute.dispose();
      await extensionHandle.close();
    }
  });

  test("shows a clear side-panel error when the real provider request fails in-browser", async () => {
    const extensionHandle = await launchEdgeExtensionContext();
    const openAiRoute = await installMockOpenAiFailureRoute(
      extensionHandle.context,
      500,
      JSON.stringify({
        error: {
          message: "simulated provider failure"
        }
      })
    );

    try {
      const extensionId = await resolveExtensionId(extensionHandle.context);
      const assessmentPage = await extensionHandle.context.newPage();

      await assessmentPage.route(truityAssessmentUrl, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "text/html",
          body: truityFixtureHtml
        });
      });
      await assessmentPage.goto(truityAssessmentUrl);
      await expect(assessmentPage.getByText("I strive for perfection")).toBeVisible();

      const optionsPage = await extensionHandle.context.newPage();
      await optionsPage.goto(`chrome-extension://${extensionId}/options.html`);
      await configureOpenAiProvider(optionsPage);
      await optionsPage.close();

      const sidepanelPage = await extensionHandle.context.newPage();
      await sidepanelPage.goto(`chrome-extension://${extensionId}/sidepanel.html`);
      await expect(sidepanelPage.getByRole("heading", { name: "ATTI AI 侧边栏" })).toBeVisible();

      await waitForSessionDetection(sidepanelPage);

      await sidepanelPage.getByLabel("画像摘要").fill(
        "I prefer reflective but helpful choices."
      );
      await sidepanelPage.getByLabel("证据备注").fill(
        "Prefer clear structure\nHelp others consistently"
      );
      await sidepanelPage.getByRole("button", { name: "保存本地画像草稿" }).click();
      await expect(sidepanelPage.getByText("本地画像草稿已保存。")).toBeVisible();

      await sidepanelPage.getByRole("button", { name: "开始 AI 规划" }).click();
      await expect(
        sidepanelPage.getByText(
          "OpenAI provider 返回了非成功状态码。"
        )
      ).toBeVisible();
      await expect(
        sidepanelPage.getByText("已加载 2 道题，其中 2 条已有 AI 推荐。")
      ).toHaveCount(0);
      const openAiCalls = await openAiRoute.getCalls();
      expect(openAiCalls).toHaveLength(1);
    } finally {
      await openAiRoute.dispose();
      await extensionHandle.close();
    }
  });

  test("shows degraded recommendations but skips auto-fill when quality gating blocks every plan", async () => {
    const extensionHandle = await launchEdgeExtensionContext();
    const openAiRoute = await installMockOpenAiSuccessRoute(extensionHandle.context, {
      answerPlans: [
        {
          recommendedOptionIds: ["2"],
          confidence: 0.41,
          rationale: "Placeholder recommendation for question-1"
        },
        {
          recommendedOptionIds: ["5"],
          confidence: 0.42,
          rationale: "TODO: refine this recommendation"
        }
      ]
    });

    try {
      const extensionId = await resolveExtensionId(extensionHandle.context);
      const assessmentPage = await extensionHandle.context.newPage();

      await assessmentPage.route(truityAssessmentUrl, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "text/html",
          body: truityFixtureHtml
        });
      });
      await assessmentPage.goto(truityAssessmentUrl);
      await expect(assessmentPage.getByText("I strive for perfection")).toBeVisible();

      const optionsPage = await extensionHandle.context.newPage();
      await optionsPage.goto(`chrome-extension://${extensionId}/options.html`);
      await configureOpenAiProvider(optionsPage);
      await optionsPage.close();

      const sidepanelPage = await extensionHandle.context.newPage();
      await sidepanelPage.goto(`chrome-extension://${extensionId}/sidepanel.html`);
      await expect(sidepanelPage.getByRole("heading", { name: "ATTI AI 侧边栏" })).toBeVisible();

      await waitForSessionDetection(sidepanelPage);

      await sidepanelPage.getByLabel("画像摘要").fill(
        "I prefer reflective but helpful choices."
      );
      await sidepanelPage.getByLabel("证据备注").fill(
        "Prefer clear structure\nHelp others consistently"
      );
      await sidepanelPage.getByRole("button", { name: "保存本地画像草稿" }).click();
      await expect(sidepanelPage.getByText("本地画像草稿已保存。")).toBeVisible();

      await sidepanelPage.getByRole("button", { name: "开始 AI 规划" }).click();
      await expect(
        sidepanelPage.getByText(/当前会话没有可执行填写的推荐结果：/)
      ).toBeVisible();
      await expect(
        sidepanelPage.getByText("已加载 2 道题，其中 2 条已有 AI 推荐。")
      ).toBeVisible();
      await expect(
        sidepanelPage.getByText("质量状态：已降级（low-confidence, placeholder-rationale）")
      ).toHaveCount(2);
      await expect(
        assessmentPage.locator('fieldset[data-atti-question-block="question-1"] input[value="2"]')
      ).not.toBeChecked();
      await expect(
        assessmentPage.locator('fieldset[data-atti-question-block="question-2"] input[value="5"]')
      ).not.toBeChecked();
    } finally {
      await openAiRoute.dispose();
      await extensionHandle.close();
    }
  });
});
