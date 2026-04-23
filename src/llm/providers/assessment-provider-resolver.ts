import type { Settings } from "../../shared/types";
import {
  getProviderConfigurationState,
  normalizeActiveProvider,
  resolveProviderApiKey
} from "../../shared/utils/provider-configuration";
import type { AssessmentProvider } from "./assessment-provider";
import { createCompatibleChatAssessmentProvider } from "./compatible-chat-assessment-provider";
import { fakeAssessmentProvider } from "./fake-assessment-provider";
import { createOpenAiAssessmentProvider } from "./openai-assessment-provider";
import { ProviderExecutionError } from "./provider-error";

export interface AssessmentProviderResolver {
  resolve: (
    settings: Pick<
      Settings,
      "activeProvider" | "openAiApiKey" | "providerApiKey" | "providerBaseUrl" | "providerModel"
    >
  ) => AssessmentProvider;
}

export interface AssessmentProviderResolverOptions {
  readonly fakeProvider?: AssessmentProvider;
  readonly openAiProvider?: AssessmentProvider;
}

export function createAssessmentProviderResolver(
  options: AssessmentProviderResolverOptions = {}
): AssessmentProviderResolver {
  return {
    resolve(settings) {
      const activeProvider = normalizeActiveProvider(settings.activeProvider);
      const providerConfiguration = getProviderConfigurationState(settings);

      if (activeProvider === "local") {
        return options.fakeProvider ?? fakeAssessmentProvider;
      }

      if (!providerConfiguration.isReady) {
        throw new ProviderExecutionError({
          providerId: "provider-resolver",
          code: "REMOTE_PROVIDER_NOT_READY",
          message:
            providerConfiguration.actionMessage ??
            `Provider is not ready: ${providerConfiguration.providerLabel}`,
          retryable: false
        });
      }

      if (activeProvider === "openai") {
        return (
          options.openAiProvider ??
          createOpenAiAssessmentProvider({
            apiKey: resolveProviderApiKey(settings) ?? undefined,
            apiUrl: providerConfiguration.resolvedApiUrl ?? undefined,
            model: providerConfiguration.resolvedModel ?? undefined
          })
        );
      }

      if (
        activeProvider === "deepseek" ||
        activeProvider === "doubao" ||
        activeProvider === "compatible"
      ) {
        return createCompatibleChatAssessmentProvider({
          providerId: `${activeProvider}-assessment-provider`,
          providerLabel: providerConfiguration.providerLabel,
          apiKey: resolveProviderApiKey(settings) ?? undefined,
          apiUrl: providerConfiguration.resolvedApiUrl ?? "",
          model: providerConfiguration.resolvedModel ?? "",
          fetchImpl: options.openAiProvider ? undefined : undefined
        });
      }

      throw new ProviderExecutionError({
        providerId: "provider-resolver",
        code: "UNSUPPORTED_ACTIVE_PROVIDER",
        message: `Unsupported active provider for answer planning: ${activeProvider}`,
        retryable: false
      });
    }
  };
}
