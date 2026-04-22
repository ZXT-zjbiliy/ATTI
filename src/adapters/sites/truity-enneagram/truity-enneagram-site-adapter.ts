import type { SiteAdapter } from "../../base/site-adapter";
import {
  isSupportedTruityEnneagramAssessmentPage,
  matchesTruityEnneagramUrl,
} from "./match-truity-enneagram-page";
import { extractTruityEnneagramQuestions } from "./extract-truity-enneagram-questions";
import { fillTruityEnneagramAnswers } from "./fill-truity-enneagram-answers";
import { locateTruityEnneagramQuestionRegions } from "./locate-truity-enneagram-question-regions";

export const truityEnneagramSiteAdapter: SiteAdapter = {
  descriptor: {
    siteId: "truity-enneagram",
    displayName: "Truity Enneagram Assessment Adapter",
    capabilities: {
      supportsQuestionExtraction: true,
      supportsPreview: false,
      supportsFill: true
    }
  },
  matches(context) {
    return matchesTruityEnneagramUrl(context);
  },
  isSupportedAssessmentPage(context) {
    return isSupportedTruityEnneagramAssessmentPage(context);
  },
  locateQuestionRegions(context) {
    return locateTruityEnneagramQuestionRegions(context);
  },
  extractQuestions(context) {
    return extractTruityEnneagramQuestions(context);
  },
  fillAnswers(context, selections) {
    return fillTruityEnneagramAnswers(context, selections);
  }
};
