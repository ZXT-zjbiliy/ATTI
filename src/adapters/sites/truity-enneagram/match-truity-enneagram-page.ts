import type { AdapterMatchContext, AdapterPageContext } from "../../base/site-adapter";
import { extractVisibleTextLines, TRUITY_STEP_MARKER_PATTERN } from "./truity-enneagram-text";

const TRUITY_HOSTNAME = "www.truity.com";
const TRUITY_ENNEAGRAM_PATH = "/test/enneagram-personality-test";
const TRUITY_ENNEAGRAM_TITLE = "Enneagram Personality Test";

function tryParseUrl(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

export function matchesTruityEnneagramUrl(context: AdapterMatchContext): boolean {
  const parsedUrl = tryParseUrl(context.url);

  if (!parsedUrl) {
    return false;
  }

  return parsedUrl.hostname === TRUITY_HOSTNAME && parsedUrl.pathname === TRUITY_ENNEAGRAM_PATH;
}

export function isSupportedTruityEnneagramAssessmentPage(context: AdapterPageContext): boolean {
  if (!matchesTruityEnneagramUrl(context)) {
    return false;
  }

  const normalizedTitle = context.title?.toLowerCase() ?? "";
  const normalizedHtml = context.html.toLowerCase();
  const visibleTextLines = extractVisibleTextLines(context.html);

  return (
    normalizedTitle.includes(TRUITY_ENNEAGRAM_TITLE.toLowerCase()) &&
    normalizedHtml.includes(TRUITY_ENNEAGRAM_TITLE.toLowerCase()) &&
    visibleTextLines.some((line) => TRUITY_STEP_MARKER_PATTERN.test(line)) &&
    normalizedHtml.includes("inaccurate") &&
    normalizedHtml.includes("accurate")
  );
}
