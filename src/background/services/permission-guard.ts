import { MESSAGE_TYPES } from "../../shared/types";
import type { MessageType, Settings } from "../../shared/types";
import { SettingsRepository } from "../../storage/repos/settings-repo";

export type PermissionGuardDecision =
  | {
      readonly allowed: true;
    }
  | {
      readonly allowed: false;
      readonly code: string;
      readonly message: string;
    };

export type PermissionGuard = {
  canProcessBackgroundMessage(message: unknown): Promise<PermissionGuardDecision>;
};

export interface PermissionGuardDependencies {
  readonly settingsRepository?: Pick<SettingsRepository, "getSettings">;
}

const alwaysAllowedMessageTypes = new Set<MessageType>([
  MESSAGE_TYPES.ping,
  MESSAGE_TYPES.settingsFetch,
  MESSAGE_TYPES.settingsUpdate,
  MESSAGE_TYPES.profileFetch,
  MESSAGE_TYPES.sessionFetch,
  MESSAGE_TYPES.sessionLatestFetch,
  MESSAGE_TYPES.sessionHistoryFetch
]);

const extensionEnabledMessageTypes = new Set<MessageType>([
  MESSAGE_TYPES.contentMetadataReport,
  MESSAGE_TYPES.contentQuestionsExtracted,
  MESSAGE_TYPES.contentQuestionExtractionFailed,
  MESSAGE_TYPES.contentExtractionRun,
  MESSAGE_TYPES.answerPlanningRun,
  MESSAGE_TYPES.recommendationPreviewFetch,
  MESSAGE_TYPES.answerPlanReviewSave,
  MESSAGE_TYPES.answerFillRun,
  MESSAGE_TYPES.profileDraftSave,
  MESSAGE_TYPES.profilePresetAnalyze
]);

const contentPageDomainMessageTypes = new Set<MessageType>([
  MESSAGE_TYPES.contentMetadataReport,
  MESSAGE_TYPES.contentQuestionsExtracted,
  MESSAGE_TYPES.contentQuestionExtractionFailed
]);

function allow(): PermissionGuardDecision {
  return { allowed: true };
}

function deny(code: string, message: string): PermissionGuardDecision {
  return {
    allowed: false,
    code,
    message
  };
}

function resolveMessageType(message: unknown): MessageType | null {
  if (!message || typeof message !== "object" || !("type" in message)) {
    return null;
  }

  const messageType = (message as { readonly type?: unknown }).type;

  if (typeof messageType !== "string") {
    return null;
  }

  if (!Object.values(MESSAGE_TYPES).includes(messageType as MessageType)) {
    return null;
  }

  return messageType as MessageType;
}

function resolvePageUrl(message: unknown): string | null {
  if (!message || typeof message !== "object" || !("payload" in message)) {
    return null;
  }

  const payload = (message as { readonly payload?: unknown }).payload;

  if (!payload || typeof payload !== "object" || !("page" in payload)) {
    return null;
  }

  const page = (payload as { readonly page?: unknown }).page;

  if (!page || typeof page !== "object" || !("url" in page)) {
    return null;
  }

  const url = (page as { readonly url?: unknown }).url;

  return typeof url === "string" ? url : null;
}

function normalizeApprovedDomain(domain: string): string {
  return domain.trim().toLowerCase();
}

function isHostnameApproved(hostname: string, approvedDomains: readonly string[]): boolean {
  const normalizedHostname = hostname.toLowerCase();

  return approvedDomains.some((domain) => {
    const normalizedDomain = normalizeApprovedDomain(domain);

    if (normalizedDomain.length === 0) {
      return false;
    }

    return (
      normalizedHostname === normalizedDomain || normalizedHostname.endsWith(`.${normalizedDomain}`)
    );
  });
}

function canProcessApprovedDomain(
  settings: Settings,
  pageUrl: string | null
): PermissionGuardDecision {
  if (settings.approvedDomains.length === 0) {
    return allow();
  }

  if (!pageUrl) {
    return deny("DOMAIN_NOT_APPROVED", "ATTI is not approved for this page domain.");
  }

  try {
    const hostname = new URL(pageUrl).hostname;

    if (isHostnameApproved(hostname, settings.approvedDomains)) {
      return allow();
    }
  } catch {
    return deny("DOMAIN_NOT_APPROVED", "ATTI is not approved for this page domain.");
  }

  return deny("DOMAIN_NOT_APPROVED", "ATTI is not approved for this page domain.");
}

export function createPermissionGuard(
  dependencies: PermissionGuardDependencies = {}
): PermissionGuard {
  const settingsRepository = dependencies.settingsRepository ?? new SettingsRepository();

  return {
    async canProcessBackgroundMessage(message) {
      const messageType = resolveMessageType(message);

      if (!messageType || alwaysAllowedMessageTypes.has(messageType)) {
        return allow();
      }

      if (!extensionEnabledMessageTypes.has(messageType)) {
        return allow();
      }

      const settings = await settingsRepository.getSettings();

      if (!settings.extensionEnabled) {
        return deny("EXTENSION_DISABLED", "ATTI extension is disabled in settings.");
      }

      if (contentPageDomainMessageTypes.has(messageType)) {
        return canProcessApprovedDomain(settings, resolvePageUrl(message));
      }

      return allow();
    }
  };
}
