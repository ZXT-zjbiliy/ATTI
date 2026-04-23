import type { Profile, RecommendationPreviewItem } from "../../../shared/types";

export type SidePanelSectionState =
  | {
      kind: "loading";
      message: string;
    }
  | {
      kind: "empty";
      message: string;
    }
  | {
      kind: "error";
      message: string;
    }
  | {
      kind: "placeholder";
      summary: string;
      detail: string;
    };

export interface SidePanelProfilePanelState {
  readonly status: "loading" | "empty" | "error" | "ready";
  readonly message: string | null;
  readonly isLoading: boolean;
  readonly isSaving: boolean;
  readonly draftNarrativeSummary: string;
  readonly draftEvidenceText: string;
  readonly savedProfile: Profile | null;
}

export interface RecommendationPreviewEntryState extends RecommendationPreviewItem {
  readonly recommendedOptionLabels: string[];
}

export interface SessionProgressState {
  readonly completedCount: number;
  readonly totalCount: number;
  readonly label: string;
  readonly requestIcon: string;
  readonly requestLabel: string;
}

export type RecommendationPreviewState =
  | {
      kind: "loading";
      message: string;
    }
  | {
      kind: "empty";
      message: string;
    }
  | {
      kind: "error";
      message: string;
    }
  | {
      kind: "ready";
      sessionId: string;
      items: RecommendationPreviewEntryState[];
      isRefreshing: boolean;
      message: string | null;
    };

export interface SidePanelShellModel {
  readonly profilePanel: SidePanelProfilePanelState;
  readonly pageDetectionStatus: SidePanelSectionState;
  readonly sessionStatus: SidePanelSectionState;
  readonly sessionProgress: SessionProgressState | null;
  readonly recommendationPreviewStatus: RecommendationPreviewState;
  readonly isRunAnswerPlanningDisabled: boolean;
  setProfileDraftNarrativeSummary: (narrativeSummary: string) => void;
  setProfileDraftEvidenceText: (evidenceText: string) => void;
  runAnswerPlanning: () => Promise<void>;
  refreshRecommendationPreview: () => Promise<void>;
  saveProfileDraft: () => Promise<void>;
}
