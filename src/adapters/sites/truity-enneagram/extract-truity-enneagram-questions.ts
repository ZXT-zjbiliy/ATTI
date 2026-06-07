import type {
  AdapterPageContext,
  ExtractedQuestionDraft,
  QuestionExtractionResult
} from "../../base/site-adapter";
import { isSupportedTruityEnneagramAssessmentPage } from "./match-truity-enneagram-page";
import { parseTruityQuestionDescriptors } from "./parse-truity-enneagram-question-descriptors";

export function extractTruityEnneagramQuestions(
  context: AdapterPageContext
): QuestionExtractionResult {
  if (!isSupportedTruityEnneagramAssessmentPage(context)) {
    return {
      questionCount: 0,
      questions: []
    };
  }

  const descriptors = parseTruityQuestionDescriptors(context.html);

  if (descriptors.length === 0) {
    throw new Error(
      "Failed to locate Truity Enneagram question blocks after checking fieldset and live prompt markers."
    );
  }

  return {
    questionCount: descriptors.length,
    questions: descriptors.map((descriptor) => ({
      text: descriptor.promptText,
      type: "single-choice-rating",
      options: descriptor.options.map((option) => ({
        ...option
      })) as ExtractedQuestionDraft["options"],
      order: descriptor.order
    }))
  };
}
