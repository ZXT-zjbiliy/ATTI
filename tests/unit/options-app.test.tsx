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

    expect(markup).toContain("ATTI Options");
    expect(markup).toContain("Debug Mode");
    expect(markup).toContain("Provider Selection");
    expect(markup).toContain("OpenAI API key");
    expect(markup).toContain("OpenAI key status: Missing");
    expect(markup).toContain("Add an OpenAI API key in Options before running answer planning.");
    expect(markup).toContain("Local And Provider Boundary");
    expect(markup).toContain("Your saved profile draft, extracted questions, planned answers, diagnostics, and local history stay on this device by default.");
    expect(markup).toContain("clicking Run answer planning also triggers page fill immediately after planning");
    expect(markup).toContain("Current supported scope is limited to the locked single-site MVP path: Truity Enneagram.");
    expect(markup).toContain("Data Management");
    expect(markup).toContain("No destructive data actions are available in this shell.");
    expect(markup).not.toContain("Debug View");
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

    expect(markup).toContain("Debug View");
    expect(markup).toContain("Runtime: options");
    expect(markup).toContain("Profile draft present: true");
    expect(markup).toContain(
      "Last session summary: placeholder-assessment / placeholder-created / 2025-01-01T00:00:00.000Z",
    );
    expect(markup).toContain("Recent session history:");
    expect(markup).toContain(
      "placeholder-assessment / 2025-01-01T00:00:00.000Z / placeholder-created / 0 questions / 0 recommendations",
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
