import { describe, expect, it } from "vitest";

import {
  getProviderConfigurationState,
  normalizeActiveProvider,
  resolveProviderApiKey
} from "../../src/shared/utils/provider-configuration";

describe("provider configuration", () => {
  it("normalizes legacy provider aliases to the current default strategy", () => {
    expect(normalizeActiveProvider("remote")).toBe("openai");
    expect(normalizeActiveProvider("fake")).toBe("local");
  });

  it("prefers the generic provider API key over the legacy OpenAI key", () => {
    expect(
      resolveProviderApiKey({
        activeProvider: "deepseek",
        openAiApiKey: "sk-legacy",
        providerApiKey: "sk-generic",
        providerBaseUrl: null,
        providerModel: null
      })
    ).toBe("sk-generic");
  });

  it("blocks remote planning when the API key is missing", () => {
    expect(
      getProviderConfigurationState({
        activeProvider: "openai",
        openAiApiKey: null,
        providerApiKey: null,
        providerBaseUrl: null,
        providerModel: null
      })
    ).toMatchObject({
      normalizedActiveProvider: "openai",
      providerLabel: "OpenAI",
      usesRemoteProvider: true,
      hasProviderApiKey: false,
      isReady: false,
      actionMessage: "请先为 OpenAI 填写 API key，再开始 AI 规划。"
    });
  });

  it("treats the local fallback as ready without remote settings", () => {
    expect(
      getProviderConfigurationState({
        activeProvider: "local",
        openAiApiKey: null,
        providerApiKey: null,
        providerBaseUrl: null,
        providerModel: null
      }).isReady
    ).toBe(true);
  });

  it("requires a custom base URL and model for compatible endpoints", () => {
    expect(
      getProviderConfigurationState({
        activeProvider: "compatible",
        openAiApiKey: null,
        providerApiKey: "sk-compatible",
        providerBaseUrl: null,
        providerModel: null
      })
    ).toMatchObject({
      requiresCustomBaseUrl: true,
      requiresCustomModel: true,
      isReady: false,
      actionMessage: "请先为 兼容端点 填写兼容 API URL，再开始 AI 规划。"
    });
  });

  it("marks DeepSeek as ready when the key is present", () => {
    expect(
      getProviderConfigurationState({
        activeProvider: "deepseek",
        openAiApiKey: null,
        providerApiKey: "sk-deepseek",
        providerBaseUrl: null,
        providerModel: null
      })
    ).toMatchObject({
      providerLabel: "DeepSeek",
      resolvedApiUrl: "https://api.deepseek.com/chat/completions",
      resolvedModel: "deepseek-chat",
      isReady: true
    });
  });

  it("normalizes compatible endpoints that only provide the host root", () => {
    expect(
      getProviderConfigurationState({
        activeProvider: "compatible",
        openAiApiKey: null,
        providerApiKey: "sk-compatible",
        providerBaseUrl: " https://api.vectorengine.cn ",
        providerModel: " gpt-4o "
      })
    ).toMatchObject({
      resolvedApiUrl: "https://api.vectorengine.cn/v1/chat/completions",
      resolvedModel: "gpt-4o",
      isReady: true
    });
  });
});
