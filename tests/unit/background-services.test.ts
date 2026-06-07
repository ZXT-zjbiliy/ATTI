import { describe, expect, it } from "vitest";

import { createBackgroundOrchestrator } from "../../src/background/services/orchestrator";
import { createPermissionGuard } from "../../src/background/services/permission-guard";
import { createSessionManager } from "../../src/background/services/session-manager";
import { MESSAGE_TYPES } from "../../src/shared/types";
import type { AppResult, Settings } from "../../src/shared/types";
import { defaultSettings } from "../../src/storage/repos/settings-repo";

function createSettings(overrides: Partial<Settings> = {}): Settings {
  return {
    ...defaultSettings,
    ...overrides,
    approvedDomains: overrides.approvedDomains ?? [...defaultSettings.approvedDomains],
    featureFlags: overrides.featureFlags ?? { ...defaultSettings.featureFlags }
  };
}

function createSettingsRepository(settings: Settings) {
  return {
    async getSettings() {
      return settings;
    }
  };
}

function createContentMetadataMessage(url: string) {
  return {
    type: MESSAGE_TYPES.contentMetadataReport,
    payload: {
      page: {
        url,
        title: "Assessment",
        readyState: "complete",
        isTopLevel: true
      }
    }
  };
}

describe("background service boundaries", () => {
  it("imports session manager independently", () => {
    const sessionManager = createSessionManager();

    expect(sessionManager.getCurrentSessionId()).toBeNull();
  });

  it("allows high-impact messages with default settings", async () => {
    const permissionGuard = createPermissionGuard({
      settingsRepository: createSettingsRepository(createSettings())
    });

    await expect(
      permissionGuard.canProcessBackgroundMessage({
        type: MESSAGE_TYPES.answerPlanningRun,
        payload: {
          sessionId: "session-1"
        }
      })
    ).resolves.toEqual({ allowed: true });
  });

  it("allows settings and ping messages while the extension is disabled", async () => {
    const permissionGuard = createPermissionGuard({
      settingsRepository: createSettingsRepository(createSettings({ extensionEnabled: false }))
    });

    await expect(
      permissionGuard.canProcessBackgroundMessage({
        type: MESSAGE_TYPES.ping,
        payload: {}
      })
    ).resolves.toEqual({ allowed: true });
    await expect(
      permissionGuard.canProcessBackgroundMessage({
        type: MESSAGE_TYPES.settingsFetch,
        payload: {}
      })
    ).resolves.toEqual({ allowed: true });
    await expect(
      permissionGuard.canProcessBackgroundMessage({
        type: MESSAGE_TYPES.settingsUpdate,
        payload: {
          settings: createSettings({ extensionEnabled: true })
        }
      })
    ).resolves.toEqual({ allowed: true });
  });

  it("blocks high-impact messages while the extension is disabled", async () => {
    const permissionGuard = createPermissionGuard({
      settingsRepository: createSettingsRepository(createSettings({ extensionEnabled: false }))
    });

    await expect(
      permissionGuard.canProcessBackgroundMessage({
        type: MESSAGE_TYPES.answerPlanningRun,
        payload: {
          sessionId: "session-1"
        }
      })
    ).resolves.toEqual({
      allowed: false,
      code: "EXTENSION_DISABLED",
      message: "ATTI extension is disabled in settings."
    });
  });

  it("allows approved page domains and subdomains", async () => {
    const permissionGuard = createPermissionGuard({
      settingsRepository: createSettingsRepository(
        createSettings({ approvedDomains: ["example.com"] })
      )
    });

    await expect(
      permissionGuard.canProcessBackgroundMessage(
        createContentMetadataMessage("https://example.com/assessment")
      )
    ).resolves.toEqual({ allowed: true });
    await expect(
      permissionGuard.canProcessBackgroundMessage(
        createContentMetadataMessage("https://sub.example.com/assessment")
      )
    ).resolves.toEqual({ allowed: true });
  });

  it("blocks unapproved page domains", async () => {
    const permissionGuard = createPermissionGuard({
      settingsRepository: createSettingsRepository(
        createSettings({ approvedDomains: ["example.com"] })
      )
    });

    await expect(
      permissionGuard.canProcessBackgroundMessage(
        createContentMetadataMessage("https://evil.test/assessment")
      )
    ).resolves.toEqual({
      allowed: false,
      code: "DOMAIN_NOT_APPROVED",
      message: "ATTI is not approved for this page domain."
    });
  });

  it("imports orchestrator independently and delegates to the router", async () => {
    const orchestrator = createBackgroundOrchestrator({
      router: {
        routeMessage: async () => ({
          ok: true,
          data: {
            delegated: true
          }
        })
      },
      permissionGuard: createPermissionGuard({
        settingsRepository: createSettingsRepository(createSettings())
      }),
      sessionManager: createSessionManager()
    });

    const result = await orchestrator.handleIncomingMessage({
      type: MESSAGE_TYPES.ping,
      payload: {}
    });

    expect(result).toEqual({
      ok: true,
      data: {
        delegated: true
      }
    });
  });

  it("returns the permission error without delegating to the router", async () => {
    let routerCallCount = 0;
    const orchestrator = createBackgroundOrchestrator({
      router: {
        routeMessage: async (): Promise<AppResult> => {
          routerCallCount += 1;
          return {
            ok: true,
            data: {
              delegated: true
            }
          };
        }
      },
      permissionGuard: createPermissionGuard({
        settingsRepository: createSettingsRepository(createSettings({ extensionEnabled: false }))
      }),
      sessionManager: createSessionManager()
    });

    const result = await orchestrator.handleIncomingMessage({
      type: MESSAGE_TYPES.contentMetadataReport,
      payload: {
        page: {
          url: "https://example.com/assessment",
          title: "Assessment",
          readyState: "complete",
          isTopLevel: true
        }
      }
    });

    expect(routerCallCount).toBe(0);
    expect(result).toEqual({
      ok: false,
      error: {
        code: "EXTENSION_DISABLED",
        message: "ATTI extension is disabled in settings."
      }
    });
  });
});
