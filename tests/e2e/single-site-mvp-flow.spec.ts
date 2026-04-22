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
    await sidepanelPage.getByRole("button", { name: "Refresh recommendation preview" }).click();

    if (
      (await sidepanelPage.getByText("Detected supported page: truity-enneagram").isVisible()) &&
      (await sidepanelPage.getByText("Session status: questions-extracted").isVisible())
    ) {
      return;
    }

    await sidepanelPage.waitForTimeout(250);
  }

  await expect(sidepanelPage.getByText("Detected supported page: truity-enneagram")).toBeVisible();
  await expect(sidepanelPage.getByText("Session status: questions-extracted")).toBeVisible();
}

async function configureOpenAiProvider(
  optionsPage: import("@playwright/test").Page,
  apiKey = "sk-e2e-test"
) {
  await optionsPage.getByRole("combobox", { name: "Provider" }).selectOption("openai");
  await optionsPage.getByLabel("OpenAI API key").fill(apiKey);
  await expect(optionsPage.getByText("OpenAI API key saved locally.")).toBeVisible();
  await expect(optionsPage.getByText("OpenAI key status: Saved locally")).toBeVisible();
  await expect(
    optionsPage.getByText("OpenAI is selected and an API key is saved locally on this device.")
  ).toBeVisible();
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
      await expect(sidepanelPage.getByRole("heading", { name: "ATTI Side Panel" })).toBeVisible();
      console.log("e2e-step: sidepanel-open");

      await waitForSessionDetection(sidepanelPage);
      console.log("e2e-step: session-detected");

      await sidepanelPage.getByLabel("Profile summary").fill(
        "I prefer reflective but helpful choices."
      );
      await sidepanelPage.getByLabel("Evidence notes").fill(
        "Prefer clear structure\nHelp others consistently"
      );
      await sidepanelPage.getByRole("button", { name: "Save local profile draft" }).click();
      await expect(sidepanelPage.getByText("Local profile draft saved.")).toBeVisible();
      console.log("e2e-step: profile-saved");

      await sidepanelPage.getByRole("button", { name: "Run answer planning" }).click();
      await expect(sidepanelPage.getByText("Session status: answer-fill-complete")).toBeVisible();
      await expect(sidepanelPage.getByText("Loaded 2 recommendations.")).toBeVisible();
      await expect(sidepanelPage.getByText("Confirm recommendation")).toHaveCount(0);
      await expect(sidepanelPage.getByText("Filled on page: Somewhat Inaccurate")).toBeVisible();
      await expect(sidepanelPage.getByText("Filled on page: Accurate")).toBeVisible();
      await expect(
        sidepanelPage.getByText(
          "Rationale: Profile evidence suggests a measured preference for structure over rigidity."
        )
      ).toBeVisible();
      await expect(
        sidepanelPage.getByText(
          "Rationale: Profile evidence suggests a strong tendency to help others consistently."
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
      await expect(sidepanelPage.getByRole("heading", { name: "ATTI Side Panel" })).toBeVisible();

      await waitForSessionDetection(sidepanelPage);

      await sidepanelPage.getByLabel("Profile summary").fill(
        "I prefer reflective but helpful choices."
      );
      await sidepanelPage.getByLabel("Evidence notes").fill(
        "Prefer clear structure\nHelp others consistently"
      );
      await sidepanelPage.getByRole("button", { name: "Save local profile draft" }).click();
      await expect(sidepanelPage.getByText("Local profile draft saved.")).toBeVisible();

      await sidepanelPage.getByRole("button", { name: "Run answer planning" }).click();
      await expect(
        sidepanelPage.getByText(
          "The OpenAI assessment provider returned a non-success HTTP status."
        )
      ).toBeVisible();
      await expect(sidepanelPage.getByText("Loaded 2 recommendations.")).toHaveCount(0);
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
      await expect(sidepanelPage.getByRole("heading", { name: "ATTI Side Panel" })).toBeVisible();

      await waitForSessionDetection(sidepanelPage);

      await sidepanelPage.getByLabel("Profile summary").fill(
        "I prefer reflective but helpful choices."
      );
      await sidepanelPage.getByLabel("Evidence notes").fill(
        "Prefer clear structure\nHelp others consistently"
      );
      await sidepanelPage.getByRole("button", { name: "Save local profile draft" }).click();
      await expect(sidepanelPage.getByText("Local profile draft saved.")).toBeVisible();

      await sidepanelPage.getByRole("button", { name: "Run answer planning" }).click();
      await expect(
        sidepanelPage.getByText(/No fillable answer plans are available for session:/)
      ).toBeVisible();
      await expect(sidepanelPage.getByText("Loaded 2 recommendations.")).toBeVisible();
      await expect(
        sidepanelPage.getByText("Quality: Degraded (low-confidence, placeholder-rationale)")
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
