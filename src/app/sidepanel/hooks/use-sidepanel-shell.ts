import { useEffect, useState } from "react";

import type {
  Profile,
  ProfileDraft,
  ProfilePresetAnalysisInput,
  RecommendationPreviewItem,
  Settings,
  Session
} from "../../../shared/types";
import { profilePresetQuestions } from "../../../domain/profile/profile-preset-questionnaire";
import { getProviderConfigurationState } from "../../../shared/utils/provider-configuration";
import { defaultSidePanelShellModel } from "../data/default-sidepanel-shell-model";
import {
  createProfileDraftClient,
  type ProfileDraftClient
} from "../services/profile-draft-client";
import {
  createRecommendationPreviewClient,
  type RecommendationPreviewClient
} from "../services/recommendation-preview-client";
import {
  createAssessmentSessionClient,
  type AssessmentSessionClient
} from "../services/assessment-session-client";
import type { SidePanelShellModel } from "../types/sidepanel-shell";

type PlanningRequestState = "idle" | "sending" | "sent";
type PageDetectionAction = "refresh-detection" | "reextract-questions";
type PageDetectionRequestState = "idle" | "sending" | "sent";

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

function countRecommendedItems(items: RecommendationPreviewItem[]): number {
  return items.filter((item) => item.hasRecommendation).length;
}

function wait(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, delayMs);
  });
}

function mapPageDetectionState(
  session: Session | null
): SidePanelShellModel["pageDetectionStatus"] {
  if (!session) {
    return {
      kind: "loading",
      message: "正在等待可识别的测评页面。"
    };
  }

  return {
    kind: "placeholder",
    summary: `已识别页面：${session.siteId}`,
    detail: session.pageUrl
  };
}

function mapSessionStatusState(
  session: Session | null,
  recommendedItemCount: number,
  settings: Settings | null
): SidePanelShellModel["sessionStatus"] {
  const providerConfiguration = settings ? getProviderConfigurationState(settings) : null;

  if (!session) {
    return {
      kind: "empty",
      message: "当前还没有可用的活动会话。"
    };
  }

  const detail = `已提取 ${session.questionIds.length} 道题，当前有 ${recommendedItemCount} 条推荐。`;

  return {
    kind: "placeholder",
    summary: `会话状态：${session.status}`,
    detail:
      providerConfiguration?.isReady === false && providerConfiguration.actionMessage
        ? `${detail} ${providerConfiguration.actionMessage}`
        : detail
  };
}

function createSessionProgress(
  session: Session | null,
  recommendedItemCount: number,
  requestState: PlanningRequestState
) {
  if (!session) {
    return null;
  }

  const totalCount = session.questionIds.length;

  if (totalCount === 0) {
    return null;
  }

  const completedCount = Math.max(0, Math.min(recommendedItemCount, totalCount));

  if (requestState === "sending") {
    return {
      completedCount,
      totalCount,
      label: `规划进度：${completedCount} / ${totalCount}`,
      requestIcon: "◔",
      requestLabel: "已发送规划请求"
    };
  }

  if (requestState === "sent") {
    return {
      completedCount,
      totalCount,
      label: `规划进度：${completedCount} / ${totalCount}`,
      requestIcon: "●",
      requestLabel: "已收到规划结果"
    };
  }

  return {
    completedCount,
    totalCount,
    label: `规划进度：${completedCount} / ${totalCount}`,
    requestIcon: "○",
    requestLabel: "尚未发送规划请求"
  };
}

function createPageDetectionProgress(
  action: PageDetectionAction,
  requestState: PageDetectionRequestState
) {
  if (requestState === "idle") {
    return null;
  }

  const isRefreshAction = action === "refresh-detection";
  const labelPrefix = isRefreshAction ? "页面识别刷新进度" : "重新提取进度";

  if (requestState === "sending") {
    return {
      completedCount: 0,
      totalCount: 1,
      label: `${labelPrefix}：0 / 1`,
      requestIcon: "◔",
      requestLabel: isRefreshAction ? "已发送页面识别刷新请求" : "已发送重新提取请求"
    };
  }

  return {
    completedCount: 1,
    totalCount: 1,
    label: `${labelPrefix}：1 / 1`,
    requestIcon: "●",
    requestLabel: isRefreshAction ? "页面识别已刷新" : "题目已重新提取"
  };
}

const PERMANENT_ERROR_MARKERS = [
  "API key",
  "api key",
  "API_KEY",
  "provider 配置",
  "provider configuration",
  "GENERIC_FALLBACK_FILL_DISABLED",
  "EXTENSION_DISABLED",
  "DOMAIN_NOT_APPROVED"
];

function isRetryableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);

  return !PERMANENT_ERROR_MARKERS.some((marker) => message.includes(marker));
}

function extractErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function useSidePanelShell(
  profileClient?: ProfileDraftClient,
  recommendationClient?: RecommendationPreviewClient,
  assessmentSessionClient?: AssessmentSessionClient
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
  const [isAnalyzingPreset, setIsAnalyzingPreset] = useState(false);
  const [presetAnswers, setPresetAnswers] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "empty" | "error" | "ready">("loading");
  const [pageDetectionStatus, setPageDetectionStatus] = useState<
    SidePanelShellModel["pageDetectionStatus"]
  >(defaultSidePanelShellModel.pageDetectionStatus);
  const [pageDetectionProgress, setPageDetectionProgress] = useState<
    SidePanelShellModel["pageDetectionProgress"]
  >(defaultSidePanelShellModel.pageDetectionProgress);
  const [sessionStatus, setSessionStatus] = useState<SidePanelShellModel["sessionStatus"]>(
    defaultSidePanelShellModel.sessionStatus
  );
  const [sessionProgress, setSessionProgress] = useState<SidePanelShellModel["sessionProgress"]>(
    defaultSidePanelShellModel.sessionProgress
  );
  const [recommendationPreviewStatus, setRecommendationPreviewStatus] = useState<
    SidePanelShellModel["recommendationPreviewStatus"]
  >({
    kind: "loading",
    message: "正在加载 AI 推荐预览。"
  });
  const [settings, setSettings] = useState<Settings | null>(null);
  const [latestSession, setLatestSession] = useState<Session | null>(null);
  const [planningRequestState, setPlanningRequestState] = useState<PlanningRequestState>("idle");

  async function refreshRecommendationPreview(currentSettings: Settings | null = settings) {
    setRecommendationPreviewStatus({
      kind: "loading",
      message: "正在加载 AI 推荐预览。"
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
        setPlanningRequestState("idle");
        setPageDetectionProgress(null);
        setSessionProgress(null);
        setPageDetectionStatus({
          kind: "loading",
          message: "正在等待可识别的测评页面。"
        });
        setSessionStatus({
          kind: "empty",
          message: "当前还没有可用的活动会话。"
        });
        setRecommendationPreviewStatus({
          kind: "empty",
          message: "当前活动标签页不是受支持的测试页面，或尚未打开最近一次会话对应的问卷页。"
        });
        return;
      }

      const recommendedItemCount = countRecommendedItems(result.preview.items);
      const nextRequestState =
        planningRequestState === "sending" || recommendedItemCount > 0
          ? "sent"
          : planningRequestState;

      setPlanningRequestState(nextRequestState);
      setLatestSession(result.session);
      setSessionProgress(
        createSessionProgress(result.session, recommendedItemCount, nextRequestState)
      );
      setPageDetectionStatus(mapPageDetectionState(result.session));
      setSessionStatus(
        mapSessionStatusState(result.session, recommendedItemCount, currentSettings)
      );
      setRecommendationPreviewStatus(
        result.preview.items.length === 0
          ? {
              kind: "empty",
              message: "当前会话还没有可用的题目或推荐。"
            }
          : {
              kind: "ready",
              sessionId: result.preview.sessionId,
              items: result.preview.items.map(createPreviewEntry),
              isRefreshing: false,
              message:
                recommendedItemCount > 0
                  ? `已加载 ${result.preview.items.length} 道题，其中 ${recommendedItemCount} 条已有 AI 推荐。`
                  : `已加载 ${result.preview.items.length} 道题，等待 AI 推荐。`
            }
      );
    } catch (error) {
      const nextMessage = extractErrorMessage(error, "无法加载推荐预览。");
      const retryable = isRetryableError(error);

      setPlanningRequestState("sent");
      setRecommendationPreviewStatus({
        kind: "error",
        message: nextMessage
      });
      setSessionProgress(createSessionProgress(latestSession, 0, "sent"));
      setSessionStatus({
        kind: "error",
        message: nextMessage,
        retryable,
        retryLabel: "刷新预览"
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
          setMessage("请先创建一份最小可用的本地画像草稿。");
          return;
        }

        setSavedProfile(profile);
        setStatus("ready");
        setMessage("本地画像草稿已保存。");
        const draftInput = createDraftInput(mapProfileToDraft(profile));
        setDraftNarrativeSummary(draftInput.narrativeSummary);
        setDraftEvidenceText(draftInput.evidenceText);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setStatus("error");
        setMessage(error instanceof Error ? error.message : "无法加载本地画像草稿。");
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

  async function executeAnswerPlanning() {
    if (!latestSession) {
      setSessionStatus({
        kind: "error",
        message: "当前没有可用于 AI 规划的活动会话。"
      });
      return;
    }

    if (settings && getProviderConfigurationState(settings).isReady === false) {
      setSessionStatus({
        kind: "error",
        message:
          getProviderConfigurationState(settings).actionMessage ??
          "请先完成 provider 配置，再开始 AI 规划。"
      });
      return;
    }

    setPlanningRequestState("sending");
    setSessionProgress(createSessionProgress(latestSession, 0, "sending"));

    try {
      await stableAssessmentSessionClient.runAnswerPlanning(latestSession.id);
      setPlanningRequestState("sent");
      await refreshRecommendationPreview(settings);
    } catch (error) {
      setPlanningRequestState("sent");
      setSessionProgress(createSessionProgress(latestSession, 0, "sent"));
      setSessionStatus({
        kind: "error",
        message: extractErrorMessage(error, "无法执行 AI 规划。"),
        retryable: isRetryableError(error),
        retryLabel: "重新规划"
      });
    }
  }

  return {
    ...defaultSidePanelShellModel,
    profilePanel: {
      status,
      message,
      isLoading: isProfileLoading,
      isSaving,
      isAnalyzingPreset,
      draftNarrativeSummary,
      draftEvidenceText,
      presetAnswers,
      savedProfile
    },
    pageDetectionStatus,
    pageDetectionProgress,
    sessionStatus,
    sessionProgress,
    recommendationPreviewStatus,
    isRunAnswerPlanningDisabled:
      latestSession == null ||
      (settings != null && getProviderConfigurationState(settings).isReady === false),
    isReapplyAnswerFillDisabled: latestSession == null,
    isReextractDisabled: latestSession == null,
    retrySessionPlanning:
      sessionStatus.kind === "error" && sessionStatus.retryable
        ? () => {
            void executeAnswerPlanning();
          }
        : undefined,
    setProfilePresetAnswer(questionId, selectedOptionId) {
      setPresetAnswers((currentAnswers) => ({
        ...currentAnswers,
        [questionId]: selectedOptionId
      }));
    },
    setProfileDraftNarrativeSummary(narrativeSummary) {
      setDraftNarrativeSummary(narrativeSummary);
    },
    setProfileDraftEvidenceText(evidenceText) {
      setDraftEvidenceText(evidenceText);
    },
    async runAnswerPlanning() {
      await executeAnswerPlanning();
    },
    async reapplyAnswerFill() {
      if (!latestSession) {
        setSessionStatus({
          kind: "error",
          message: "当前没有可重新填写的活动会话。"
        });
        return;
      }

      setSessionProgress(createSessionProgress(latestSession, 0, "sending"));

      try {
        await stableAssessmentSessionClient.applyReviewedAnswers(latestSession.id);
        await refreshRecommendationPreview(settings);
      } catch (error) {
        await refreshRecommendationPreview(settings);
        setSessionStatus({
          kind: "error",
          message: extractErrorMessage(error, "无法重新填写当前问卷。"),
          retryable: isRetryableError(error),
          retryLabel: "重新填写"
        });
      }
    },
    async rerunQuestionExtraction() {
      if (!latestSession) {
        setPageDetectionStatus({
          kind: "error",
          message: "当前没有可重新提取的活动会话。"
        });
        return;
      }

      try {
        setPlanningRequestState("idle");
        setPageDetectionProgress(createPageDetectionProgress("reextract-questions", "sending"));
        await stableAssessmentSessionClient.rerunQuestionExtraction(latestSession.id);
        await refreshRecommendationPreview(settings);
        setPageDetectionProgress(createPageDetectionProgress("reextract-questions", "sent"));
      } catch (error) {
        setPageDetectionProgress(createPageDetectionProgress("reextract-questions", "sent"));
        setPageDetectionStatus({
          kind: "error",
          message: extractErrorMessage(error, "无法重新提取当前页题目。"),
          retryable: isRetryableError(error),
          retryLabel: "重新提取"
        });
      }
    },
    async refreshPageDetection() {
      setPageDetectionProgress(createPageDetectionProgress("refresh-detection", "sending"));

      try {
        await refreshRecommendationPreview(settings);
        setPageDetectionProgress(createPageDetectionProgress("refresh-detection", "sent"));
      } catch (error) {
        setPageDetectionProgress(createPageDetectionProgress("refresh-detection", "sent"));
        setPageDetectionStatus({
          kind: "error",
          message: extractErrorMessage(error, "无法刷新页面识别状态。"),
          retryable: isRetryableError(error),
          retryLabel: "重新识别"
        });
      }
    },
    async refreshRecommendationPreview() {
      await refreshRecommendationPreview(settings);
    },
    async analyzeProfilePreset() {
      if (settings && getProviderConfigurationState(settings).isReady === false) {
        setStatus("error");
        setMessage(
          getProviderConfigurationState(settings).actionMessage ??
            "请先完成 provider 配置，再生成本地画像。"
        );
        return;
      }

      const input: ProfilePresetAnalysisInput = {
        answers: profilePresetQuestions.map((question) => ({
          questionId: question.id,
          selectedOptionId: presetAnswers[question.id] ?? ""
        }))
      };

      setIsAnalyzingPreset(true);

      try {
        const profile = await stableProfileClient.analyzeProfilePreset(input);
        const draftInput = createDraftInput(mapProfileToDraft(profile));

        setSavedProfile(profile);
        setDraftNarrativeSummary(draftInput.narrativeSummary);
        setDraftEvidenceText(draftInput.evidenceText);
        setStatus("ready");
        setMessage("AI 已根据预设问卷生成本地画像。");
      } catch (error) {
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "无法根据预设问卷生成本地画像。");
      } finally {
        setIsAnalyzingPreset(false);
      }
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
        setMessage("本地画像草稿已保存。");
      } catch (error) {
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "无法保存本地画像草稿。");
      } finally {
        setIsSaving(false);
      }
    }
  };
}
