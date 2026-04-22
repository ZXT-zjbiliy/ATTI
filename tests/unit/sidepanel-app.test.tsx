import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SidePanelView } from "../../src/app/sidepanel/App";
import { defaultSidePanelShellModel } from "../../src/app/sidepanel/data/default-sidepanel-shell-model";
import type { SidePanelShellModel } from "../../src/app/sidepanel/types/sidepanel-shell";

function createSidePanelModel(
  overrides: Partial<SidePanelShellModel> = {},
): SidePanelShellModel {
  return {
    ...defaultSidePanelShellModel,
    ...overrides,
  };
}

describe("side panel shell", () => {
  it("renders the empty-state shell stably", () => {
    const markup = renderToStaticMarkup(
      <SidePanelView model={defaultSidePanelShellModel} />,
    );

    expect(markup).toContain("ATTI AI 侧边栏");
    expect(markup).toContain("本地画像");
    expect(markup).toContain("页面识别");
    expect(markup).toContain("执行会话");
    expect(markup).toContain("AI 推荐预览");
    expect(markup).toContain("请先创建一份最小可用的本地画像草稿。");
    expect(markup).toContain("保存本地画像草稿");
    expect(markup).toContain("空状态：当前还没有可用的活动会话。");
    expect(markup).toContain("开始 AI 规划");
    expect(markup).toContain("disabled=\"\"");
    expect(markup).not.toContain("Apply reviewed answers");
  });

  it("renders loading placeholders", () => {
    const markup = renderToStaticMarkup(
      <SidePanelView
        model={createSidePanelModel({
          profilePanel: {
            ...defaultSidePanelShellModel.profilePanel,
            status: "loading",
            isLoading: true,
            message: "正在加载本地画像状态。",
          },
          pageDetectionStatus: {
            kind: "loading",
            message: "正在检查当前页面。",
          },
        })}
      />,
    );

    expect(markup).toContain("正在加载本地画像状态。");
    expect(markup).toContain("加载中：正在检查当前页面。");
  });

  it("renders error placeholders", () => {
    const markup = renderToStaticMarkup(
      <SidePanelView
        model={createSidePanelModel({
          sessionStatus: {
            kind: "error",
            message: "无法读取当前会话状态。",
          },
        })}
      />,
    );

    expect(markup).toContain("错误：无法读取当前会话状态。");
    expect(markup).toContain("role=\"alert\"");
  });

  it("renders placeholder preview data", () => {
    const markup = renderToStaticMarkup(
      <SidePanelView
        model={createSidePanelModel({
          profilePanel: {
            ...defaultSidePanelShellModel.profilePanel,
            status: "ready",
            message: "本地画像草稿已保存。",
            savedProfile: {
              id: "profile-1",
              version: 1,
              rawInput: {
                narrativeSummary: "I enjoy collaborative planning.",
                evidence: ["Prefer clear expectations"]
              },
              structuredTraits: {},
              narrativeSummary: "I enjoy collaborative planning.",
              evidence: ["Prefer clear expectations"],
              createdAt: "2025-01-01T00:00:00.000Z",
              updatedAt: "2025-01-01T00:00:00.000Z"
            },
            draftNarrativeSummary: "I enjoy collaborative planning.",
            draftEvidenceText: "Prefer clear expectations"
          },
          recommendationPreviewStatus: {
            kind: "ready",
            sessionId: "session-1",
            items: [
              {
                answerPlanId: "plan-1",
                questionId: "question-1",
                questionText: "I strive for perfection.",
                questionType: "single-choice-rating",
                questionOrder: 0,
                options: [
                  { id: "1", text: "Inaccurate", value: "1" },
                  { id: "5", text: "Accurate", value: "5" }
                ],
                recommendedOptionIds: ["5"],
                selectedOptionIds: ["5"],
                confidence: 0.92,
                rationale: "The saved profile strongly aligns with high agreement.",
                requiresConfirmation: true,
                reviewStatus: "pending",
                qualityStatus: "normal",
                qualityIssues: [],
                recommendedOptionLabels: ["Accurate"]
              }
            ],
            isRefreshing: false,
            message: "已加载 1 条推荐。",
          },
        })}
      />,
    );

    expect(markup).toContain("已保存画像摘要：I enjoy collaborative planning.");
    expect(markup).toContain("I strive for perfection.");
    expect(markup).toContain("页面填写：Accurate");
    expect(markup).toContain("置信度：92%");
    expect(markup).toContain("理由说明：The saved profile strongly aligns with high agreement.");
    expect(markup).not.toContain("质量状态：已降级");
    expect(markup).not.toContain("Confirm recommendation");
    expect(markup).not.toContain("Reject recommendation");
    expect(markup).not.toContain("Save modified selection");
  });
});

describe("side panel component boundaries", () => {
  it("keeps the side panel split across multiple small components", () => {
    const componentFiles = [
      "src/app/sidepanel/App.tsx",
      "src/app/sidepanel/components/status-card.tsx",
      "src/app/sidepanel/components/section-state-view.tsx",
      "src/app/sidepanel/components/profile-status-card.tsx",
      "src/app/sidepanel/components/profile-draft-form.tsx",
      "src/app/sidepanel/components/saved-profile-summary.tsx",
      "src/app/sidepanel/components/page-detection-status-card.tsx",
      "src/app/sidepanel/components/session-status-card.tsx",
      "src/app/sidepanel/components/recommendation-preview-card.tsx",
      "src/app/sidepanel/components/recommendation-preview-item-view.tsx",
    ];

    expect(componentFiles.length).toBeGreaterThan(4);

    for (const componentFile of componentFiles) {
      const content = readFileSync(resolve(process.cwd(), componentFile), "utf8");
      const lineCount = content.split(/\r?\n/).length;

      expect(lineCount).toBeLessThan(80);
    }
  });

  it("keeps side panel UI modules away from provider and repository internals", () => {
    const sidepanelFiles = [
      "src/app/sidepanel/App.tsx",
      "src/app/sidepanel/hooks/use-sidepanel-shell.ts",
      "src/app/sidepanel/services/assessment-session-client.ts",
      "src/app/sidepanel/services/profile-draft-client.ts",
      "src/app/sidepanel/services/recommendation-preview-client.ts",
      "src/app/sidepanel/components/recommendation-preview-card.tsx",
      "src/app/sidepanel/components/recommendation-preview-item-view.tsx",
    ];

    for (const sidepanelFile of sidepanelFiles) {
      const content = readFileSync(resolve(process.cwd(), sidepanelFile), "utf8");

      expect(content).not.toContain("/storage/");
      expect(content).not.toContain("Dexie");
      expect(content).not.toContain("/llm/providers/");
      expect(content).not.toContain("openaiAssessmentProvider");
    }
  });
});
