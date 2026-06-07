import { createStore } from "zustand/vanilla";

export type SidepanelSection = "overview" | "profile" | "preview";

export interface SidepanelUiState {
  readonly activeSection: SidepanelSection;
  readonly isBusy: boolean;
  readonly selectedSessionId: string | null;
}

export interface SidepanelUiActions {
  setActiveSection: (activeSection: SidepanelSection) => void;
  setBusy: (isBusy: boolean) => void;
  setSelectedSessionId: (selectedSessionId: string | null) => void;
  reset: () => void;
}

export type SidepanelUiStore = SidepanelUiState & SidepanelUiActions;

export const sidepanelUiInitialState: SidepanelUiState = {
  activeSection: "overview",
  isBusy: false,
  selectedSessionId: null
};

export const createSidepanelUiStore = () =>
  createStore<SidepanelUiStore>()((set) => ({
    ...sidepanelUiInitialState,
    setActiveSection: (activeSection) => {
      set({ activeSection });
    },
    setBusy: (isBusy) => {
      set({ isBusy });
    },
    setSelectedSessionId: (selectedSessionId) => {
      set({ selectedSessionId });
    },
    reset: () => {
      set(sidepanelUiInitialState);
    }
  }));

export const sidepanelUiStore = createSidepanelUiStore();
