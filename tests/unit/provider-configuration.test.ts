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
      summary: "OpenAI is selected but no API key is saved locally.",
      actionMessage: "Add an OpenAI API key in Options before running answer planning."
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
