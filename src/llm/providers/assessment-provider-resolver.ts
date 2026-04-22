import type { AssessmentProvider } from "./assessment-provider";
import { normalizeActiveProvider } from "../../shared/utils/provider-configuration";
import { fakeAssessmentProvider } from "./fake-assessment-provider";
import { createOpenAiAssessmentProvider } from "./openai-assessment-provider";
import { ProviderExecutionError } from "./provider-error";
import type { Settings } from "../../shared/types";

export interface AssessmentProviderResolver {
  resolve: (settings: Pick<Settings, "activeProvider" | "openAiApiKey">) => AssessmentProvider;
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

      if (activeProvider === "local") {
        return options.fakeProvider ?? fakeAssessmentProvider;
      }

      if (activeProvider === "openai") {
        return (
          options.openAiProvider ??
          createOpenAiAssessmentProvider({
            apiKey: settings.openAiApiKey ?? undefined
          })
        );
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
