import type { Settings } from "../types";

export type ProviderStatus = "ready" | "action-required";

export interface ProviderConfigurationState {
  readonly normalizedActiveProvider: string;
  readonly usesOpenAi: boolean;
  readonly hasOpenAiApiKey: boolean;
  readonly isReady: boolean;
  readonly status: ProviderStatus;
  readonly summary: string;
  readonly actionMessage: string | null;
}

type ProviderSettings = Pick<Settings, "activeProvider" | "openAiApiKey">;

export function normalizeActiveProvider(activeProvider: string): string {
  if (activeProvider === "remote") {
    return "openai";
  }

  if (activeProvider === "fake") {
    return "local";
  }

  return activeProvider;
}

export function getProviderConfigurationState(
  settings: ProviderSettings
): ProviderConfigurationState {
  const normalizedActiveProvider = normalizeActiveProvider(settings.activeProvider);
  const hasOpenAiApiKey = typeof settings.openAiApiKey === "string" && settings.openAiApiKey.length > 0;
  const usesOpenAi = normalizedActiveProvider === "openai";

  if (normalizedActiveProvider === "local") {
    return {
      normalizedActiveProvider,
      usesOpenAi,
      hasOpenAiApiKey,
      isReady: true,
      status: "ready",
      summary: "Local provider fallback is selected. No OpenAI API key is required.",
      actionMessage: null
    };
  }

  if (usesOpenAi && hasOpenAiApiKey) {
    return {
      normalizedActiveProvider,
      usesOpenAi,
      hasOpenAiApiKey,
      isReady: true,
      status: "ready",
      summary: "OpenAI is selected and an API key is saved locally on this device.",
      actionMessage: null
    };
  }

  if (usesOpenAi) {
    return {
      normalizedActiveProvider,
      usesOpenAi,
      hasOpenAiApiKey,
      isReady: false,
      status: "action-required",
      summary: "OpenAI is selected but no API key is saved locally.",
      actionMessage: "Add an OpenAI API key in Options before running answer planning."
    };
  }

  return {
    normalizedActiveProvider,
    usesOpenAi,
    hasOpenAiApiKey,
    isReady: false,
    status: "action-required",
    summary: `The selected provider is unsupported: ${settings.activeProvider}`,
    actionMessage: "Choose OpenAI or the local provider fallback in Options."
  };
}
