export type FeatureFlags = Record<string, boolean>;

export type Settings = {
  extensionEnabled: boolean;
  debugMode: boolean;
  activeProvider: string;
  openAiApiKey: string | null;
  approvedDomains: string[];
  lastActiveProfileId: string | null;
  featureFlags: FeatureFlags;
};
