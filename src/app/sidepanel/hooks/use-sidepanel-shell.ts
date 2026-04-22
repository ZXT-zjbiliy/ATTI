import { useEffect, useState } from "react";

import type {
  Profile,
  ProfileDraft,
  RecommendationPreviewItem,
  Settings,
  Session
} from "../../../shared/types";
import { getProviderConfigurationState } from "../../../shared/utils/provider-configuration";
import { defaultSidePanelShellModel } from "../data/default-sidepanel-shell-model";
import { createProfileDraftClient, type ProfileDraftClient } from "../services/profile-draft-client";
import {
  createRecommendationPreviewClient,
  type RecommendationPreviewClient
} from "../services/recommendation-preview-client";
import {
  createAssessmentSessionClient,
  type AssessmentSessionClient
} from "../services/assessment-session-client";
import type { SidePanelShellModel } from "../types/sidepanel-shell";

function mapProfileToDraft(profile: Profile): ProfileDraft {
  return {
    narrativeSummary: profile.narrativeSummary,
    evidence: [...profile.evidence]
  };
}

function createDraftInput(draft: ProfileDraft) {
  return {
    narrativeSummary: draft.narrativeSummary,
    evidenceText: draft.evidence.join("\n")
  };
}

function parseEvidence(evidenceText: string): string[] {
  return evidenceText
    .split("\n")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function createPreviewEntry(item: RecommendationPreviewItem) {
  const optionLabelById = new Map(item.options.map((option) => [option.id, option.text]));

  return {
    ...item,
    recommendedOptionLabels: item.recommendedOptionIds.map(
      (optionId) => optionLabelById.get(optionId) ?? optionId
    )
  };
}

function wait(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, delayMs);
  });
}

function mapPageDetectionState(session: Session | null): SidePanelShellModel["pageDetectionStatus"] {
  if (!session) {
    return {
      kind: "loading",
      message: "Waiting for a supported assessment page."
    };
  }

  return {
    kind: "placeholder",
    summary: `Detected supported page: ${session.siteId}`,
    detail: session.pageUrl
  };
}

function mapSessionStatusState(
  session: Session | null,
  previewItemCount: number,
  settings: Settings | null
): SidePanelShellModel["sessionStatus"] {
  const providerConfiguration = settings ? getProviderConfigurationState(settings) : null;

  if (!session) {
    return {
      kind: "empty",
      message: "No active session is available yet."
    };
  }

  return {
    kind: "placeholder",
    summary: `Session status: ${session.status}`,
    detail: providerConfiguration?.isReady === false && providerConfiguration.actionMessage
      ? `${session.questionIds.length} questions extracted, ${previewItemCount} recommendations available. ${providerConfiguration.actionMessage}`
      : `${session.questionIds.length} questions extracted, ${previewItemCount} recommendations available.`
  };
}

export function useSidePanelShell(
  profileClient?: ProfileDraftClient,
  recommendationClient?: RecommendationPreviewClient,
  assessmentSessionClient?: AssessmentSessionClient,
): SidePanelShellModel {
  const [stableProfileClient] = useState<ProfileDraftClient>(
    () => profileClient ?? createProfileDraftClient()
  );
  const [stableRecommendationClient] = useState<RecommendationPreviewClient>(
    () => recommendationClient ?? createRecommendationPreviewClient()
  );
  const [stableAssessmentSessionClient] = useState<AssessmentSessionClient>(
    () => assessmentSessionClient ?? createAssessmentSessionClient()
  );
  const [savedProfile, setSavedProfile] = useState<Profile | null>(null);
  const [draftNarrativeSummary, setDraftNarrativeSummary] = useState("");
  const [draftEvidenceText, setDraftEvidenceText] = useState("");
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "empty" | "error" | "ready">("loading");
  const [pageDetectionStatus, setPageDetectionStatus] =
    useState<SidePanelShellModel["pageDetectionStatus"]>(defaultSidePanelShellModel.pageDetectionStatus);
  const [sessionStatus, setSessionStatus] =
    useState<SidePanelShellModel["sessionStatus"]>(defaultSidePanelShellModel.sessionStatus);
  const [recommendationPreviewStatus, setRecommendationPreviewStatus] =
    useState<SidePanelShellModel["recommendationPreviewStatus"]>({
      kind: "loading",
      message: "Loading recommendation preview."
    });
  const [settings, setSettings] = useState<Settings | null>(null);
  const [latestSession, setLatestSession] = useState<Session | null>(null);

  async function refreshRecommendationPreview(currentSettings: Settings | null = settings) {
    setRecommendationPreviewStatus({
      kind: "loading",
      message: "Loading recommendation preview."
    });

    try {
      let result: Awaited<ReturnType<RecommendationPreviewClient["fetchLatestPreview"]>> = null;

      for (let attempt = 0; attempt < 8; attempt += 1) {
        result = await stableRecommendationClient.fetchLatestPreview();

        if (result) {
          break;
        }

        if (attempt < 7) {
          await wait(500);
        }
      }

      if (!result) {
        setLatestSession(null);
        setPageDetectionStatus({
          kind: "loading",
          message: "Waiting for a supported assessment page."
        });
        setSessionStatus({
          kind: "empty",
          message: "No active session is available yet."
        });
        setRecommendationPreviewStatus({
          kind: "empty",
          message: "Recommendation preview will appear after answer planning completes."
        });
        return;
      }

      setLatestSession(result.session);
      setPageDetectionStatus(mapPageDetectionState(result.session));
      setSessionStatus(
        mapSessionStatusState(result.session, result.preview.items.length, currentSettings)
      );
      setRecommendationPreviewStatus(
        result.preview.items.length === 0
          ? {
              kind: "empty",
              message: "No recommendations are available for this session yet."
            }
          : {
              kind: "ready",
              sessionId: result.preview.sessionId,
              items: result.preview.items.map(createPreviewEntry),
              isRefreshing: false,
              message: `Loaded ${result.preview.items.length} recommendation${result.preview.items.length === 1 ? "" : "s"}.`
            }
      );
    } catch (error) {
      const nextMessage =
        error instanceof Error ? error.message : "Unable to load recommendation preview.";

      setRecommendationPreviewStatus({
        kind: "error",
        message: nextMessage
      });
      setSessionStatus({
        kind: "error",
        message: nextMessage
      });
    }
  }

  useEffect(() => {
    let isActive = true;

    void (async () => {
      try {
        const [profile, nextSettings] = await Promise.all([
          stableProfileClient.fetchActiveProfile(),
          stableProfileClient.fetchSettings()
        ]);

        if (!isActive) {
          return;
        }

        setSettings(nextSettings);
        await refreshRecommendationPreview(nextSettings);

        if (!isActive) {
          return;
        }

        if (!profile) {
          setStatus("empty");
          setMessage("Create a minimal local profile draft to continue.");
          return;
        }

        setSavedProfile(profile);
        setStatus("ready");
        setMessage("Local profile draft saved.");
        const draftInput = createDraftInput(mapProfileToDraft(profile));
        setDraftNarrativeSummary(draftInput.narrativeSummary);
        setDraftEvidenceText(draftInput.evidenceText);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Unable to load local profile draft.");
      } finally {
        if (isActive) {
          setIsProfileLoading(false);
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, [stableProfileClient]);

  return {
    ...defaultSidePanelShellModel,
    profilePanel: {
      status,
      message,
      isLoading: isProfileLoading,
      isSaving,
      draftNarrativeSummary,
      draftEvidenceText,
      savedProfile
    },
    pageDetectionStatus,
    sessionStatus,
    recommendationPreviewStatus,
    isRunAnswerPlanningDisabled:
      latestSession == null ||
      (settings != null && getProviderConfigurationState(settings).isReady === false),
    setProfileDraftNarrativeSummary(narrativeSummary) {
      setDraftNarrativeSummary(narrativeSummary);
    },
    setProfileDraftEvidenceText(evidenceText) {
      setDraftEvidenceText(evidenceText);
    },
    async runAnswerPlanning() {
      if (!latestSession) {
        setSessionStatus({
          kind: "error",
          message: "No active session is available for answer planning."
        });
        return;
      }

      if (settings && getProviderConfigurationState(settings).isReady === false) {
        setSessionStatus({
          kind: "error",
          message:
            getProviderConfigurationState(settings).actionMessage ??
            "Provider configuration must be completed before answer planning can run."
        });
        return;
      }

      try {
        await stableAssessmentSessionClient.runAnswerPlanning(latestSession.id);
        await refreshRecommendationPreview(settings);

        try {
          await stableAssessmentSessionClient.applyReviewedAnswers(latestSession.id);
          await refreshRecommendationPreview(settings);
        } catch (error) {
          await refreshRecommendationPreview(settings);
          setSessionStatus({
            kind: "error",
            message:
              error instanceof Error ? error.message : "Unable to run answer planning."
          });
        }
      } catch (error) {
        setSessionStatus({
          kind: "error",
          message: error instanceof Error ? error.message : "Unable to run answer planning."
        });
      }
    },
    async refreshRecommendationPreview() {
      await refreshRecommendationPreview(settings);
    },
    async saveProfileDraft() {
      setIsSaving(true);

      try {
        const profile = await stableProfileClient.saveProfileDraft({
          narrativeSummary: draftNarrativeSummary.trim(),
          evidence: parseEvidence(draftEvidenceText)
        });
        const draftInput = createDraftInput(mapProfileToDraft(profile));

        setSavedProfile(profile);
        setDraftNarrativeSummary(draftInput.narrativeSummary);
        setDraftEvidenceText(draftInput.evidenceText);
        setStatus("ready");
        setMessage("Local profile draft saved.");
      } catch (error) {
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Unable to save local profile draft.");
      } finally {
        setIsSaving(false);
      }
    }
  };
}
