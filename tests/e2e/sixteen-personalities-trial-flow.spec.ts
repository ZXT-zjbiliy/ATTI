import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { expect, test } from "@playwright/test";

import { launchEdgeExtensionContext, resolveExtensionId } from "./support/edge-extension-context";
import {
  installMockOpenAiFailureRoute,
  installMockOpenAiSuccessRoute
} from "./support/openai-provider-mock";

const sixteenPersonalitiesFixtureHtml = readFileSync(
  resolve(process.cwd(), "tests/fixtures/adapters/sixteen-personalities-assessment.html"),
  "utf8"
);
const sixteenPersonalitiesAssessmentUrl = "https://www.16personalities.com/free-personality-test";

function createInteractiveSixteenPersonalitiesFixture() {
  return sixteenPersonalitiesFixtureHtml.replace(
    "</body>",
    `<script>
      document.querySelectorAll("[data-atti-16p-question] [data-value]").forEach((button) => {
        button.setAttribute("aria-pressed", "false");
        button.addEventListener("click", () => {
          const container = button.closest("[data-atti-16p-question]");
          if (!container) {
            return;
          }

          container.querySelectorAll("[data-value]").forEach((candidate) => {
            candidate.setAttribute("aria-pressed", "false");
          });
          button.setAttribute("aria-pressed", "true");
          container.setAttribute("data-atti-selected-value", button.getAttribute("data-value") ?? "");
        });
      });
    </script></body>`
  );
}

async function waitForSessionDetection(sidepanelPage: import("@playwright/test").Page) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    await sidepanelPage.getByRole("button", { name: "刷新推荐预览" }).click();

    if (
      (await sidepanelPage.getByText("已识别页面：sixteen-personalities").isVisible()) &&
      (await sidepanelPage.getByText("会话状态：questions-extracted").isVisible())
    ) {
      return;
    }

    await sidepanelPage.waitForTimeout(250);
  }

  await expect(sidepanelPage.getByText("已识别页面：sixteen-personalities")).toBeVisible();
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

async function fillSavedProfileDraft(sidepanelPage: import("@playwright/test").Page) {
  await sidepanelPage.getByLabel("画像摘要").fill("I prefer friendly but exploratory choices.");
  await sidepanelPage
    .getByLabel("证据备注")
    .fill("Enjoy meeting new people\nExplore random topics");
  await sidepanelPage.getByRole("button", { name: "保存本地画像草稿" }).click();
  await expect(sidepanelPage.getByText("本地画像草稿已保存。")).toBeVisible();
}

test.describe("e2e: 16Personalities trial flow", () => {
  test("covers the second test-site sample through detection, preview, and fill", async () => {
    const extensionHandle = await launchEdgeExtensionContext();
    const openAiRoute = await installMockOpenAiSuccessRoute(extensionHandle.context, {
      answerPlans: [
        {
          recommendedOptionIds: ["2"],
          confidence: 0.76,
          rationale: "Profile evidence suggests a warm but not maximal social preference."
        },
        {
          recommendedOptionIds: ["5"],
          confidence: 0.82,
          rationale: "Profile evidence suggests exploratory curiosity without constant agreement."
        }
      ]
    });

    try {
      const extensionId = await resolveExtensionId(extensionHandle.context);
      const assessmentPage = await extensionHandle.context.newPage();

      await assessmentPage.route(sixteenPersonalitiesAssessmentUrl, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "text/html",
          body: createInteractiveSixteenPersonalitiesFixture()
        });
      });
      await assessmentPage.goto(sixteenPersonalitiesAssessmentUrl);
      await expect(assessmentPage.getByText("You regularly make new friends.")).toBeVisible();

      const optionsPage = await extensionHandle.context.newPage();
      await optionsPage.goto(`chrome-extension://${extensionId}/options.html`);
      await configureOpenAiProvider(optionsPage);
      await optionsPage.close();

      const sidepanelPage = await extensionHandle.context.newPage();
      await sidepanelPage.goto(`chrome-extension://${extensionId}/sidepanel.html`);
      await expect(sidepanelPage.getByRole("heading", { name: "ATTI AI 侧边栏" })).toBeVisible();

      await waitForSessionDetection(sidepanelPage);
      await fillSavedProfileDraft(sidepanelPage);

      await sidepanelPage.getByRole("button", { name: "开始 AI 规划" }).click();
      await expect(sidepanelPage.getByText("会话状态：answer-planning-complete")).toBeVisible();
      await expect(
        sidepanelPage
          .getByRole("article", { name: "推荐 1" })
          .getByText("You regularly make new friends.")
      ).toBeVisible();
      await expect(
        sidepanelPage
          .getByRole("article", { name: "推荐 2" })
          .getByText(
            "You spend a lot of your free time exploring various random topics that pique your interest."
          )
      ).toBeVisible();
      await expect(sidepanelPage.getByText("页面填写：Agree")).toBeVisible();
      await expect(sidepanelPage.getByText("页面填写：Slightly Disagree")).toBeVisible();
      await expect(
        sidepanelPage.getByText(
          "理由说明：Profile evidence suggests a warm but not maximal social preference."
        )
      ).toBeVisible();
      await expect(
        sidepanelPage.getByText(
          "理由说明：Profile evidence suggests exploratory curiosity without constant agreement."
        )
      ).toBeVisible();

      const openAiCalls = await openAiRoute.getCalls();
      expect(openAiCalls).toHaveLength(1);
      expect(openAiCalls[0]?.input).toContain("You regularly make new friends.");
      expect(openAiCalls[0]?.input).toContain(
        "You spend a lot of your free time exploring various random topics that pique your interest."
      );

      await expect(
        assessmentPage.locator('[data-atti-16p-question="question-1"]')
      ).not.toHaveAttribute("data-atti-selected-value", "2");
      await expect(
        assessmentPage.locator('[data-atti-16p-question="question-2"]')
      ).not.toHaveAttribute("data-atti-selected-value", "5");

      await sidepanelPage.getByRole("button", { name: "应用推荐填写" }).click();
      await expect(sidepanelPage.getByText("会话状态：answer-fill-complete")).toBeVisible();

      await expect(assessmentPage.locator('[data-atti-16p-question="question-1"]')).toHaveAttribute(
        "data-atti-selected-value",
        "2"
      );
      await expect(assessmentPage.locator('[data-atti-16p-question="question-2"]')).toHaveAttribute(
        "data-atti-selected-value",
        "5"
      );
    } finally {
      await openAiRoute.dispose();
      await extensionHandle.close();
    }
  });

  test("shows provider failure visibility on the second test-site sample", async () => {
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

      await assessmentPage.route(sixteenPersonalitiesAssessmentUrl, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "text/html",
          body: createInteractiveSixteenPersonalitiesFixture()
        });
      });
      await assessmentPage.goto(sixteenPersonalitiesAssessmentUrl);
      await expect(assessmentPage.getByText("You regularly make new friends.")).toBeVisible();

      const optionsPage = await extensionHandle.context.newPage();
      await optionsPage.goto(`chrome-extension://${extensionId}/options.html`);
      await configureOpenAiProvider(optionsPage);
      await optionsPage.close();

      const sidepanelPage = await extensionHandle.context.newPage();
      await sidepanelPage.goto(`chrome-extension://${extensionId}/sidepanel.html`);
      await expect(sidepanelPage.getByRole("heading", { name: "ATTI AI 侧边栏" })).toBeVisible();

      await waitForSessionDetection(sidepanelPage);
      await fillSavedProfileDraft(sidepanelPage);

      await sidepanelPage.getByRole("button", { name: "开始 AI 规划" }).click();
      await expect(sidepanelPage.getByText("OpenAI provider 返回了非成功状态码。")).toBeVisible();
      await expect(sidepanelPage.getByText("已加载 2 道题，其中 2 条已有 AI 推荐。")).toHaveCount(
        0
      );

      const openAiCalls = await openAiRoute.getCalls();
      expect(openAiCalls).toHaveLength(1);
    } finally {
      await openAiRoute.dispose();
      await extensionHandle.close();
    }
  });

  test("shows degraded recommendations but blocks fill when every 16Personalities plan is degraded", async () => {
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

      await assessmentPage.route(sixteenPersonalitiesAssessmentUrl, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "text/html",
          body: createInteractiveSixteenPersonalitiesFixture()
        });
      });
      await assessmentPage.goto(sixteenPersonalitiesAssessmentUrl);
      await expect(assessmentPage.getByText("You regularly make new friends.")).toBeVisible();

      const optionsPage = await extensionHandle.context.newPage();
      await optionsPage.goto(`chrome-extension://${extensionId}/options.html`);
      await configureOpenAiProvider(optionsPage);
      await optionsPage.close();

      const sidepanelPage = await extensionHandle.context.newPage();
      await sidepanelPage.goto(`chrome-extension://${extensionId}/sidepanel.html`);
      await expect(sidepanelPage.getByRole("heading", { name: "ATTI AI 侧边栏" })).toBeVisible();

      await waitForSessionDetection(sidepanelPage);
      await fillSavedProfileDraft(sidepanelPage);

      await sidepanelPage.getByRole("button", { name: "开始 AI 规划" }).click();
      await expect(sidepanelPage.getByText("会话状态：answer-planning-complete")).toBeVisible();
      await expect(sidepanelPage.getByText("已加载 2 道题，其中 2 条已有 AI 推荐。")).toBeVisible();
      await expect(
        sidepanelPage.getByText("质量状态：已降级（low-confidence, placeholder-rationale）")
      ).toHaveCount(2);
      await expect(
        assessmentPage.locator('[data-atti-16p-question="question-1"]')
      ).not.toHaveAttribute("data-atti-selected-value", "2");
      await expect(
        assessmentPage.locator('[data-atti-16p-question="question-2"]')
      ).not.toHaveAttribute("data-atti-selected-value", "5");

      await sidepanelPage.getByRole("button", { name: "应用推荐填写" }).click();
      await expect(sidepanelPage.getByText("当前会话没有可执行填写的推荐结果")).toBeVisible();
    } finally {
      await openAiRoute.dispose();
      await extensionHandle.close();
    }
  });
});
