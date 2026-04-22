import { describe, expect, it } from "vitest";

import {
  getProviderConfigurationState,
  normalizeActiveProvider
} from "../../src/shared/utils/provider-configuration";

describe("provider configuration", () => {
  it("normalizes legacy provider aliases to the current default strategy", () => {
    expect(normalizeActiveProvider("remote")).toBe("openai");
    expect(normalizeActiveProvider("fake")).toBe("local");
  });

  it("blocks OpenAI planning when no local API key is saved", () => {
    expect(
      getProviderConfigurationState({
        activeProvider: "openai",
        openAiApiKey: null
      })
    ).toEqual({
      normalizedActiveProvider: "openai",
      usesOpenAi: true,
      hasOpenAiApiKey: false,
      isReady: false,
      status: "action-required",
      summary: "已选择 OpenAI，但当前设备尚未保存 API key。",
      actionMessage: "请先在设置页补充 OpenAI API key，再开始 AI 规划。"
    });
  });

  it("treats the local fallback as ready without an OpenAI key", () => {
    expect(
      getProviderConfigurationState({
        activeProvider: "local",
        openAiApiKey: null
      }).isReady
    ).toBe(true);
  });
});
