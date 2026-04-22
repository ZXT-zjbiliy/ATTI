import type { AdapterMatchContext, SiteAdapter } from "../base/site-adapter";

const PLACEHOLDER_HOSTNAME = "placeholder.assessment.local";
const PLACEHOLDER_PATH_PREFIX = "/assessment-shell";

function matchesPlaceholderUrl(context: AdapterMatchContext): boolean {
  const url = new URL(context.url);

  return (
    url.hostname === PLACEHOLDER_HOSTNAME &&
    url.pathname.startsWith(PLACEHOLDER_PATH_PREFIX)
  );
}

export const placeholderSiteAdapter: SiteAdapter = {
  descriptor: {
    siteId: "placeholder-assessment",
    displayName: "Placeholder Assessment Adapter",
    capabilities: {
      supportsQuestionExtraction: false,
      supportsPreview: false,
      supportsFill: false,
    },
  },
  matches(context) {
    return matchesPlaceholderUrl(context);
  },
};
