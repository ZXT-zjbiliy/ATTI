import type { SidePanelShellModel } from "../types/sidepanel-shell";

export const defaultSidePanelShellModel: SidePanelShellModel = {
  profilePanel: {
    status: "empty",
    message: "Create a minimal local profile draft to continue.",
    isLoading: false,
    isSaving: false,
    draftNarrativeSummary: "",
    draftEvidenceText: "",
    savedProfile: null
  },
  pageDetectionStatus: {
    kind: "loading",
    message: "Waiting for a supported assessment page.",
  },
  sessionStatus: {
    kind: "empty",
    message: "No active session is available yet.",
  },
  recommendationPreviewStatus: {
    kind: "empty",
    message: "Recommendation preview will appear after answer planning completes.",
  },
  isRunAnswerPlanningDisabled: true,
  setProfileDraftNarrativeSummary: () => undefined,
  setProfileDraftEvidenceText: () => undefined,
  runAnswerPlanning: async () => undefined,
  refreshRecommendationPreview: async () => undefined,
  saveProfileDraft: async () => undefined
};
