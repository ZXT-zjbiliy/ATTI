import type { SidePanelShellModel } from "../types/sidepanel-shell";

export const defaultSidePanelShellModel: SidePanelShellModel = {
  profilePanel: {
    status: "empty",
    message: "请先创建一份最小可用的本地画像草稿。",
    isLoading: false,
    isSaving: false,
    isAnalyzingPreset: false,
    draftNarrativeSummary: "",
    draftEvidenceText: "",
    presetAnswers: {},
    savedProfile: null
  },
  pageDetectionStatus: {
    kind: "loading",
    message: "正在等待可识别的测评页面。"
  },
  pageDetectionProgress: null,
  sessionStatus: {
    kind: "empty",
    message: "当前还没有可用的活动会话。"
  },
  sessionProgress: null,
  recommendationPreviewStatus: {
    kind: "empty",
    message: "开始 AI 规划后，这里会出现推荐预览。"
  },
  isRunAnswerPlanningDisabled: true,
  isReapplyAnswerFillDisabled: true,
  isReextractDisabled: true,
  setProfilePresetAnswer: () => undefined,
  setProfileDraftNarrativeSummary: () => undefined,
  setProfileDraftEvidenceText: () => undefined,
  runAnswerPlanning: async () => undefined,
  reapplyAnswerFill: async () => undefined,
  rerunQuestionExtraction: async () => undefined,
  refreshPageDetection: async () => undefined,
  refreshRecommendationPreview: async () => undefined,
  analyzeProfilePreset: async () => undefined,
  saveProfileDraft: async () => undefined
};
