import type { SiteAdapter } from "../base/site-adapter";
import { createTruityPairChoiceSupport } from "./truity-pair-choice/truity-pair-choice-support";

const support = createTruityPairChoiceSupport({
  siteId: "truity-typefinder",
  displayName: "Truity TypeFinder Assessment Adapter",
  path: "/test/type-finder-personality-test-new",
  titleIncludes: "TypeFinder",
  instructionIncludes: "To take the personality test"
});

export const truityTypeFinderSiteAdapter: SiteAdapter = {
  descriptor: {
    siteId: "truity-typefinder",
    displayName: "Truity TypeFinder Assessment Adapter",
    capabilities: {
      supportsQuestionExtraction: true,
      supportsPreview: false,
      supportsFill: true
    }
  },
  matches: support.matches,
  isSupportedAssessmentPage: support.isSupportedAssessmentPage,
  locateQuestionRegions: support.locateQuestionRegions,
  extractQuestions: support.extractQuestions,
  fillAnswers: support.fillAnswers
};
