import type {
  AppResult,
  ProfileDraftSaveMessage,
  ProfileFetchMessage,
  ProfilePresetAnalyzeMessage,
  Profile
} from "../../shared/types";
import {
  PROFILE_PRESET_QUESTIONNAIRE_VERSION,
  resolveProfilePresetAnswers
} from "../../domain/profile/profile-preset-questionnaire";
import { ProviderExecutionError, createAssessmentProviderRunner } from "../../llm/providers";
import type { BackgroundMessageHandler } from "./types";

function createErrorResult(code: string, message: string): AppResult {
  return {
    ok: false,
    error: {
      code,
      message
    }
  };
}

export const handleProfileDraftSaveMessage: BackgroundMessageHandler<
  ProfileDraftSaveMessage
> = async (message, context): Promise<AppResult> => {
  const profile = await context.profileRepository.saveDraft(message.payload.draft);
  const settings = await context.settingsRepository.getSettings();

  await context.settingsRepository.saveSettings({
    ...settings,
    lastActiveProfileId: profile.id
  });

  return {
    ok: true,
    data: profile
  };
};

function createProfileId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `profile-${Date.now()}`;
}

function createTemporaryPresetProfile(message: ProfilePresetAnalyzeMessage): Profile {
  const resolvedAnswers = resolveProfilePresetAnswers(message.payload);
  const now = new Date().toISOString();

  return {
    id: createProfileId(),
    version: 1,
    rawInput: {
      source: "preset-profile-questionnaire",
      version: PROFILE_PRESET_QUESTIONNAIRE_VERSION,
      answers: resolvedAnswers
    },
    structuredTraits: {
      source: "preset-profile-questionnaire",
      version: PROFILE_PRESET_QUESTIONNAIRE_VERSION
    },
    narrativeSummary: resolvedAnswers
      .map((answer) => `${answer.questionText}: ${answer.selectedOptionText}`)
      .join("\n"),
    evidence: resolvedAnswers.map(
      (answer) => `${answer.questionText} -> ${answer.selectedOptionText}`
    ),
    createdAt: now,
    updatedAt: now
  };
}

function toProfileAnalysisError(error: unknown): AppResult {
  if (error instanceof ProviderExecutionError) {
    return createErrorResult(error.code, error.message);
  }

  return createErrorResult(
    "PROFILE_PRESET_ANALYSIS_FAILED",
    error instanceof Error ? error.message : "Profile preset analysis failed."
  );
}

export const handleProfilePresetAnalyzeMessage: BackgroundMessageHandler<
  ProfilePresetAnalyzeMessage
> = async (message, context): Promise<AppResult> => {
  try {
    const settings = await context.settingsRepository.getSettings();
    const provider = context.assessmentProviderResolver.resolve({
      activeProvider: settings.activeProvider,
      openAiApiKey: settings.openAiApiKey,
      providerApiKey: settings.providerApiKey,
      providerBaseUrl: settings.providerBaseUrl,
      providerModel: settings.providerModel
    });
    const temporaryProfile = createTemporaryPresetProfile(message);
    const summary =
      await createAssessmentProviderRunner(provider).summarizeProfile(temporaryProfile);
    const now = new Date().toISOString();
    const profile = await context.profileRepository.saveProfile({
      ...temporaryProfile,
      rawInput: {
        ...temporaryProfile.rawInput,
        providerId: provider.providerId
      },
      structuredTraits: summary.structuredTraits,
      narrativeSummary: summary.narrativeSummary,
      evidence: summary.evidence,
      updatedAt: now
    });

    await context.settingsRepository.saveSettings({
      ...settings,
      lastActiveProfileId: profile.id
    });

    return {
      ok: true,
      data: profile
    };
  } catch (error) {
    return toProfileAnalysisError(error);
  }
};

export const handleProfileFetchMessage: BackgroundMessageHandler<ProfileFetchMessage> = async (
  message,
  context
): Promise<AppResult> => {
  const profile = await context.profileRepository.getProfileById(message.payload.profileId);

  if (!profile) {
    return createErrorResult(
      "PROFILE_NOT_FOUND",
      `Profile not found: ${message.payload.profileId}`
    );
  }

  return {
    ok: true,
    data: profile
  };
};
