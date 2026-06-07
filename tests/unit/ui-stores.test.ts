import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { createPopupUiStore, popupUiInitialState } from "../../src/app/popup/state/popup-ui-store";
import {
  createSidepanelUiStore,
  sidepanelUiInitialState
} from "../../src/app/sidepanel/state/sidepanel-ui-store";
import {
  createSettingsUiStore,
  settingsUiInitialState
} from "../../src/app/options/state/settings-ui-store";

describe("popup ui store", () => {
  it("starts with the expected default state", () => {
    const store = createPopupUiStore();

    expect(store.getState().isExpanded).toBe(popupUiInitialState.isExpanded);
    expect(store.getState().statusMessage).toBe(popupUiInitialState.statusMessage);
  });

  it("applies state transitions and can reset", () => {
    const store = createPopupUiStore();

    store.getState().setExpanded(true);
    store.getState().setStatusMessage("ready");

    expect(store.getState().isExpanded).toBe(true);
    expect(store.getState().statusMessage).toBe("ready");

    store.getState().reset();

    expect(store.getState().isExpanded).toBe(popupUiInitialState.isExpanded);
    expect(store.getState().statusMessage).toBe(popupUiInitialState.statusMessage);
  });
});

describe("sidepanel ui store", () => {
  it("starts with the expected default state", () => {
    const store = createSidepanelUiStore();

    expect(store.getState().activeSection).toBe(sidepanelUiInitialState.activeSection);
    expect(store.getState().isBusy).toBe(sidepanelUiInitialState.isBusy);
    expect(store.getState().selectedSessionId).toBe(sidepanelUiInitialState.selectedSessionId);
  });

  it("applies state transitions and can reset", () => {
    const store = createSidepanelUiStore();

    store.getState().setActiveSection("preview");
    store.getState().setBusy(true);
    store.getState().setSelectedSessionId("session-1");

    expect(store.getState().activeSection).toBe("preview");
    expect(store.getState().isBusy).toBe(true);
    expect(store.getState().selectedSessionId).toBe("session-1");

    store.getState().reset();

    expect(store.getState().activeSection).toBe(sidepanelUiInitialState.activeSection);
    expect(store.getState().isBusy).toBe(sidepanelUiInitialState.isBusy);
    expect(store.getState().selectedSessionId).toBe(sidepanelUiInitialState.selectedSessionId);
  });
});

describe("settings ui store", () => {
  it("starts with the expected default state", () => {
    const store = createSettingsUiStore();

    expect(store.getState().activeView).toBe(settingsUiInitialState.activeView);
    expect(store.getState().isDirty).toBe(settingsUiInitialState.isDirty);
    expect(store.getState().isSaving).toBe(settingsUiInitialState.isSaving);
    expect(store.getState().lastSaveError).toBe(settingsUiInitialState.lastSaveError);
  });

  it("applies state transitions and can reset", () => {
    const store = createSettingsUiStore();

    store.getState().setActiveView("privacy");
    store.getState().setDirty(true);
    store.getState().setSaving(true);
    store.getState().setLastSaveError("save_failed");

    expect(store.getState().activeView).toBe("privacy");
    expect(store.getState().isDirty).toBe(true);
    expect(store.getState().isSaving).toBe(true);
    expect(store.getState().lastSaveError).toBe("save_failed");

    store.getState().reset();

    expect(store.getState().activeView).toBe(settingsUiInitialState.activeView);
    expect(store.getState().isDirty).toBe(settingsUiInitialState.isDirty);
    expect(store.getState().isSaving).toBe(settingsUiInitialState.isSaving);
    expect(store.getState().lastSaveError).toBe(settingsUiInitialState.lastSaveError);
  });
});

describe("ui store boundaries", () => {
  const storeFiles = [
    "src/app/popup/state/popup-ui-store.ts",
    "src/app/sidepanel/state/sidepanel-ui-store.ts",
    "src/app/options/state/settings-ui-store.ts"
  ];

  it("does not couple ui stores to persistence modules", () => {
    for (const storeFile of storeFiles) {
      const content = readFileSync(resolve(process.cwd(), storeFile), "utf8");

      expect(content).not.toContain("chrome.storage");
      expect(content).not.toContain("Dexie");
      expect(content).not.toContain("@/storage/");
      expect(content).not.toContain("settings-repo");
    }
  });
});
