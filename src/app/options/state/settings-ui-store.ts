import { createStore } from "zustand/vanilla";

export type SettingsView = "general" | "privacy";

export interface SettingsUiState {
  readonly activeView: SettingsView;
  readonly isDirty: boolean;
  readonly isSaving: boolean;
  readonly lastSaveError: string | null;
}

export interface SettingsUiActions {
  setActiveView: (activeView: SettingsView) => void;
  setDirty: (isDirty: boolean) => void;
  setSaving: (isSaving: boolean) => void;
  setLastSaveError: (lastSaveError: string | null) => void;
  reset: () => void;
}

export type SettingsUiStore = SettingsUiState & SettingsUiActions;

export const settingsUiInitialState: SettingsUiState = {
  activeView: "general",
  isDirty: false,
  isSaving: false,
  lastSaveError: null,
};

export const createSettingsUiStore = () =>
  createStore<SettingsUiStore>()((set) => ({
    ...settingsUiInitialState,
    setActiveView: (activeView) => {
      set({ activeView });
    },
    setDirty: (isDirty) => {
      set({ isDirty });
    },
    setSaving: (isSaving) => {
      set({ isSaving });
    },
    setLastSaveError: (lastSaveError) => {
      set({ lastSaveError });
    },
    reset: () => {
      set(settingsUiInitialState);
    },
  }));

export const settingsUiStore = createSettingsUiStore();
