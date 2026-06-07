import type {
  AdapterPageContext,
  LocatedQuestionRegion,
  QuestionRegionLocatorResult
} from "../../base/site-adapter";
import { isSupportedTruityEnneagramAssessmentPage } from "./match-truity-enneagram-page";
import {
  mapDescriptorsToLocatedQuestionRegions,
  parseTruityQuestionDescriptors
} from "./parse-truity-enneagram-question-descriptors";

export function locateTruityEnneagramQuestionRegions(
  context: AdapterPageContext
): QuestionRegionLocatorResult {
  if (!isSupportedTruityEnneagramAssessmentPage(context)) {
    return {
      isSupportedAssessmentPage: false,
      questionRegions: []
    };
  }

  return {
    isSupportedAssessmentPage: true,
    questionRegions: mapDescriptorsToLocatedQuestionRegions(
      parseTruityQuestionDescriptors(context.html)
    ) as LocatedQuestionRegion[]
  };
}
