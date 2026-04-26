import type { AdapterPageContext } from "../adapters";
import { adapterRegistry } from "../adapters";
import type { ContentPageMetadata } from "../shared/types";

function sanitizeExtractionErrorPayload(
  error: unknown,
  context: AdapterPageContext,
): {
  phase: string;
  message: string;
  payload: Record<string, string | number | boolean | null | string[] | number[] | boolean[]>;
} {
  const message = error instanceof Error ? error.message : "Unknown adapter extraction error";

  return {
    phase: "adapter-question-extraction",
    message: message.slice(0, 200),
    payload: {
      pageReadyState: context.title ? "title-present" : "title-missing",
      htmlLength: context.html.length,
      isTopLevelCandidate: true
    }
  };
}

export function extractQuestionsFromSupportedPage(args: {
  page: ContentPageMetadata;
  html: string;
}) {
  const adapter = adapterRegistry.findMatchingAdapter({
    url: args.page.url,
    title: args.page.title,
    html: args.html,
  });

  if (!adapter?.isSupportedAssessmentPage || !adapter.extractQuestions) {
    return {
      kind: "no-supported-adapter" as const
    };
  }

  const context: AdapterPageContext = {
    url: args.page.url,
    title: args.page.title,
    html: args.html
  };

  if (!adapter.isSupportedAssessmentPage(context)) {
    return {
      kind: "no-supported-assessment-page" as const,
      siteId: adapter.descriptor.siteId
    };
  }

  try {
    const extraction = adapter.extractQuestions(context);

    return {
      kind: "extracted" as const,
      siteId: adapter.descriptor.siteId,
      questions: extraction.questions.map((question) => ({
        section: question.section,
        text: question.text,
        type: question.type,
        options: question.options.map((option) => ({ ...option })),
        order: question.order
      }))
    };
  } catch (error) {
    const sanitizedFailure = sanitizeExtractionErrorPayload(error, context);

    return {
      kind: "failed" as const,
      siteId: adapter.descriptor.siteId,
      ...sanitizedFailure
    };
  }
}
