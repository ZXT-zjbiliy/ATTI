import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { OptionsView } from "../../src/app/options/App";
import type { OptionsShellModel } from "../../src/app/options/hooks/use-options-shell";
import type { DebugSnapshot } from "../../src/app/options/services/options-debug-client";
import { getProviderConfigurationState } from "../../src/shared/utils/provider-configuration";

const defaultDebugSnapshot: DebugSnapshot = {
  runtimeName: "options",
  runtimeStatus: "ready",
  activeSettings: {
    extensionEnabled: true,
    debugMode: true,
    activeProvider: "local",
    openAiApiKey: null,
    approvedDomains: [],
    lastActiveProfileId: "profile-1",
    featureFlags: {},
  },
  hasActiveProfileDraft: true,
  activeProfileId: "profile-1",
  lastSessionSummary: "placeholder-assessment / placeholder-created / 2025-01-01T00:00:00.000Z",
  recentSessionHistory: [
    {
      id: "session-1",
      siteId: "placeholder-assessment",
      status: "placeholder-created",
      pageUrl: "https://placeholder.assessment.local/assessment-shell/demo",
      startedAt: "2025-01-01T00:00:00.000Z",
      questionCount: 0,
      recommendationCount: 0,
    },
  ],
};

function createOptionsModel(
  overrides: Partial<OptionsShellModel> = {},
): OptionsShellModel {
  return {
    settings: {
      extensionEnabled: true,
      debugMode: false,
      activeProvider: "openai",
      openAiApiKey: null,
      approvedDomains: [],
      lastActiveProfileId: null,
      featureFlags: {},
    },
    providerConfiguration: getProviderConfigurationState({
      activeProvider: "openai",
      openAiApiKey: null
    }),
    debugSnapshot: null,
    isDebugViewLoading: false,
    isLoading: false,
    isSaving: false,
    statusMessage: null,
    updateDebugMode: async () => {},
    updateProvider: async () => {},
    updateOpenAiApiKey: async () => {},
    ...overrides,
  };
}

describe("options page shell", () => {
  it("renders the settings shell with lightweight sections", () => {
    const markup = renderToStaticMarkup(
      <OptionsView model={createOptionsModel()} />,
    );

    expect(markup).toContain("ATTI 设置");
    expect(markup).toContain("调试模式");
    expect(markup).toContain("AI Provider 设置");
    expect(markup).toContain("OpenAI API key");
    expect(markup).toContain("OpenAI 密钥状态： 缺失");
    expect(markup).toContain("请先在设置页补充 OpenAI API key，再开始 AI 规划。");
    expect(markup).toContain("本地与 Provider 边界");
    expect(markup).toContain("画像草稿、题目、推荐结果、诊断信息与本地历史默认保存在当前设备。");
    expect(markup).toContain("当前界面已转向 AI-first 多站点过渡表达");
    expect(markup).toContain("数据管理");
    expect(markup).toContain("当前阶段不提供破坏性数据操作");
    expect(markup).not.toContain("调试视图");
  });

  it("shows the debug view only when debug mode is enabled", () => {
    const markup = renderToStaticMarkup(
      <OptionsView
        model={createOptionsModel({
          settings: {
            ...defaultDebugSnapshot.activeSettings,
          },
          providerConfiguration: getProviderConfigurationState({
            activeProvider: defaultDebugSnapshot.activeSettings.activeProvider,
            openAiApiKey: defaultDebugSnapshot.activeSettings.openAiApiKey
          }),
          debugSnapshot: defaultDebugSnapshot,
        })}
      />,
    );

    expect(markup).toContain("调试视图");
    expect(markup).toContain("运行时：options");
    expect(markup).toContain("是否存在画像草稿：true");
    expect(markup).toContain(
      "最近一次会话摘要：placeholder-assessment / placeholder-created / 2025-01-01T00:00:00.000Z",
    );
    expect(markup).toContain("最近会话历史：");
    expect(markup).toContain(
      "placeholder-assessment / 2025-01-01T00:00:00.000Z / placeholder-created / 0 题 / 0 条推荐",
    );
  });
});

describe("options module boundaries", () => {
  it("keeps runtime code away from main business database entities", () => {
    const optionsFiles = [
      "src/app/options/App.tsx",
      "src/app/options/hooks/use-options-shell.ts",
      "src/app/options/services/options-debug-client.ts",
      "src/app/options/services/options-settings-client.ts",
      "src/app/options/services/session-debug-client.ts",
      "src/app/options/components/debug-view-section.tsx",
      "src/app/options/components/debug-mode-section.tsx",
      "src/app/options/components/provider-boundary-section.tsx",
      "src/app/options/components/provider-status-note.tsx",
      "src/app/options/components/provider-selection-section.tsx",
      "src/app/options/components/data-management-section.tsx",
    ];

    for (const optionsFile of optionsFiles) {
      const content = readFileSync(resolve(process.cwd(), optionsFile), "utf8");

      expect(content).not.toContain("/storage/");
      expect(content).not.toContain("Dexie");
      expect(content).not.toContain("profiles");
      expect(content).not.toContain("sessions");
      expect(content).not.toContain("answerPlans");
    }
  });
});
