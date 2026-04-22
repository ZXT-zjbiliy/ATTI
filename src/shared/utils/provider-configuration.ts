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
      summary: "当前使用本地回退引擎，无需 OpenAI API key。",
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
      summary: "已选择 OpenAI，且当前设备已保存可用的 API key。",
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
      summary: "已选择 OpenAI，但当前设备尚未保存 API key。",
      actionMessage: "请先在设置页补充 OpenAI API key，再开始 AI 规划。"
    };
  }

  return {
    normalizedActiveProvider,
    usesOpenAi,
    hasOpenAiApiKey,
    isReady: false,
    status: "action-required",
    summary: `当前 provider 暂不受支持：${settings.activeProvider}`,
    actionMessage: "请在设置页选择 OpenAI 或本地回退引擎。"
  };
}
