import { createStore } from "zustand/vanilla";

export interface PopupUiState {
  readonly isExpanded: boolean;
  readonly statusMessage: string | null;
}

export interface PopupUiActions {
  setExpanded: (isExpanded: boolean) => void;
  setStatusMessage: (statusMessage: string | null) => void;
  reset: () => void;
}

export type PopupUiStore = PopupUiState & PopupUiActions;

export const popupUiInitialState: PopupUiState = {
  isExpanded: false,
  statusMessage: null
};

export const createPopupUiStore = () =>
  createStore<PopupUiStore>()((set) => ({
    ...popupUiInitialState,
    setExpanded: (isExpanded) => {
      set({ isExpanded });
    },
    setStatusMessage: (statusMessage) => {
      set({ statusMessage });
    },
    reset: () => {
      set(popupUiInitialState);
    }
  }));

export const popupUiStore = createPopupUiStore();
