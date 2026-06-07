import type { Settings } from "../types";

export type ProviderStatus = "ready" | "action-required";

export interface ProviderConfigurationState {
  readonly normalizedActiveProvider: string;
  readonly providerLabel: string;
  readonly usesRemoteProvider: boolean;
  readonly hasProviderApiKey: boolean;
  readonly requiresCustomBaseUrl: boolean;
  readonly requiresCustomModel: boolean;
  readonly resolvedApiUrl: string | null;
  readonly resolvedModel: string | null;
  readonly isReady: boolean;
  readonly status: ProviderStatus;
  readonly summary: string;
  readonly actionMessage: string | null;
}

type ProviderSettings = Pick<
  Settings,
  "activeProvider" | "openAiApiKey" | "providerApiKey" | "providerBaseUrl" | "providerModel"
>;

function trimToNull(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : null;
}

function normalizeCompatibleProviderUrl(providerBaseUrl: string | null): string | null {
  if (!providerBaseUrl) {
    return null;
  }

  try {
    const normalizedUrl = new URL(providerBaseUrl);

    if (normalizedUrl.pathname === "/" || normalizedUrl.pathname.length === 0) {
      normalizedUrl.pathname = "/v1/chat/completions";
      return normalizedUrl.toString();
    }

    return normalizedUrl.toString();
  } catch {
    return providerBaseUrl;
  }
}

interface RemoteProviderPreset {
  readonly label: string;
  readonly defaultApiUrl: string | null;
  readonly defaultModel: string | null;
  readonly requiresCustomBaseUrl: boolean;
  readonly requiresCustomModel: boolean;
}

const remoteProviderPresets: Record<string, RemoteProviderPreset> = {
  openai: {
    label: "OpenAI",
    defaultApiUrl: "https://api.openai.com/v1/responses",
    defaultModel: "gpt-5.2",
    requiresCustomBaseUrl: false,
    requiresCustomModel: false
  },
  deepseek: {
    label: "DeepSeek",
    defaultApiUrl: "https://api.deepseek.com/chat/completions",
    defaultModel: "deepseek-chat",
    requiresCustomBaseUrl: false,
    requiresCustomModel: false
  },
  doubao: {
    label: "Doubao",
    defaultApiUrl: "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
    defaultModel: "doubao-1-5-pro-32k",
    requiresCustomBaseUrl: false,
    requiresCustomModel: false
  },
  compatible: {
    label: "兼容端点",
    defaultApiUrl: null,
    defaultModel: null,
    requiresCustomBaseUrl: true,
    requiresCustomModel: true
  }
};

export function normalizeActiveProvider(activeProvider: string): string {
  if (activeProvider === "remote") {
    return "openai";
  }

  if (activeProvider === "fake") {
    return "local";
  }

  return activeProvider;
}

export function resolveProviderApiKey(settings: ProviderSettings): string | null {
  const genericProviderApiKey = trimToNull(settings.providerApiKey);

  if (genericProviderApiKey) {
    return genericProviderApiKey;
  }

  const legacyOpenAiApiKey = trimToNull(settings.openAiApiKey);

  if (legacyOpenAiApiKey) {
    return legacyOpenAiApiKey;
  }

  return null;
}

export function getProviderConfigurationState(
  settings: ProviderSettings
): ProviderConfigurationState {
  const normalizedActiveProvider = normalizeActiveProvider(settings.activeProvider);
  const providerApiKey = resolveProviderApiKey(settings);
  const hasProviderApiKey = typeof providerApiKey === "string" && providerApiKey.length > 0;

  if (normalizedActiveProvider === "local") {
    return {
      normalizedActiveProvider,
      providerLabel: "本地回退",
      usesRemoteProvider: false,
      hasProviderApiKey,
      requiresCustomBaseUrl: false,
      requiresCustomModel: false,
      resolvedApiUrl: null,
      resolvedModel: null,
      isReady: true,
      status: "ready",
      summary: "当前使用本地回退引擎，无需远程 API 配置。",
      actionMessage: null
    };
  }

  const preset = remoteProviderPresets[normalizedActiveProvider];

  if (!preset) {
    return {
      normalizedActiveProvider,
      providerLabel: normalizedActiveProvider,
      usesRemoteProvider: true,
      hasProviderApiKey,
      requiresCustomBaseUrl: false,
      requiresCustomModel: false,
      resolvedApiUrl: null,
      resolvedModel: null,
      isReady: false,
      status: "action-required",
      summary: `当前 provider 暂不受支持：${settings.activeProvider}`,
      actionMessage: "请在设置页选择 OpenAI、DeepSeek、Doubao、兼容端点或本地回退。"
    };
  }

  const normalizedProviderBaseUrl = trimToNull(settings.providerBaseUrl);
  const normalizedProviderModel = trimToNull(settings.providerModel);
  const resolvedApiUrl =
    normalizedActiveProvider === "compatible"
      ? normalizeCompatibleProviderUrl(normalizedProviderBaseUrl)
      : (normalizedProviderBaseUrl ?? preset.defaultApiUrl);
  const resolvedModel = normalizedProviderModel ?? preset.defaultModel;
  const missingBaseUrl = preset.requiresCustomBaseUrl && !resolvedApiUrl;
  const missingModel = preset.requiresCustomModel && !resolvedModel;
  const isReady = hasProviderApiKey && !missingBaseUrl && !missingModel;

  return {
    normalizedActiveProvider,
    providerLabel: preset.label,
    usesRemoteProvider: true,
    hasProviderApiKey,
    requiresCustomBaseUrl: preset.requiresCustomBaseUrl,
    requiresCustomModel: preset.requiresCustomModel,
    resolvedApiUrl,
    resolvedModel,
    isReady,
    status: isReady ? "ready" : "action-required",
    summary: isReady
      ? `已选择 ${preset.label}，且当前设备中的远程引擎配置已就绪。`
      : `已选择 ${preset.label}，但当前设备中的远程引擎配置尚未完成。`,
    actionMessage: isReady
      ? null
      : missingBaseUrl
        ? `请先为 ${preset.label} 填写兼容 API URL，再开始 AI 规划。`
        : missingModel
          ? `请先为 ${preset.label} 填写模型名称，再开始 AI 规划。`
          : `请先为 ${preset.label} 填写 API key，再开始 AI 规划。`
  };
}
