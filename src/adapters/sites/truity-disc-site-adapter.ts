import type { SiteAdapter } from "../base/site-adapter";
import { createTruityPairChoiceSupport } from "./truity-pair-choice/truity-pair-choice-support";

const support = createTruityPairChoiceSupport({
  siteId: "truity-disc",
  displayName: "Truity DISC Assessment Adapter",
  path: "/test/disc-personality-test",
  titleIncludes: ["DISC Personality Assessment", "DISC Assessment"],
  instructionIncludes: "To take the DISC assessment"
});

export const truityDiscSiteAdapter: SiteAdapter = {
  descriptor: {
    siteId: "truity-disc",
    displayName: "Truity DISC Assessment Adapter",
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
