import { adapterRegistry } from "../adapters";
import type { AppResult } from "../shared/types";
import { CONTENT_COMMAND_TYPES } from "../shared/types";
import { applyAnswerFillCommand, isSupportedContentCommand } from "./answer-fill";
import {
    reportContentPageMetadata,
    reportExtractedQuestions,
    reportQuestionExtractionFailure,
    type ContentRuntimeMessageSender
} from "./content-message-client";
import { collectContentPageMetadata } from "./page-metadata";
import { extractQuestionsFromSupportedPage } from "./question-extraction";

export interface ContentRuntimeDependencies {
  readonly document: {
    title: string;
    readyState: string;
    body?: {
      innerHTML: string;
    };
    documentElement?: {
      outerHTML: string;
    };
  };
  readonly location: {
    href: string;
  };
  readonly window: {
    self: unknown;
    top: unknown;
  };
  readonly sendMessage?: ContentRuntimeMessageSender;
  readonly runtime?: {
    onMessage?: {
      addListener(
        listener: (
          message: unknown,
          sender: unknown,
          sendResponse: (response: AppResult) => void
        ) => boolean | void
      ): void;
    };
  };
  readonly wait?: (ms: number) => Promise<void>;
}

function createRuntimeErrorResult(error: unknown): AppResult {
  return {
    ok: false,
    error: {
      code: "CONTENT_RUNTIME_COMMAND_FAILED",
      message: error instanceof Error ? error.message : "Content runtime command failed."
    }
  };
}

function resolveDefaultDependencies(): ContentRuntimeDependencies {
  return {
    document,
    location,
    window,
    runtime: (globalThis as typeof globalThis & {
      chrome?: {
        runtime?: ContentRuntimeDependencies["runtime"];
      };
    }).chrome?.runtime,
    wait(ms) {
      return new Promise((resolve) => {
        globalThis.setTimeout(resolve, ms);
      });
    }
  };
}

async function resolveExtractionResult(
  dependencies: ContentRuntimeDependencies,
  page: ReturnType<typeof collectContentPageMetadata>
) {
  const maxAttempts = 5;
  const wait =
    dependencies.wait ??
    ((ms: number) =>
      new Promise<void>((resolve) => {
        globalThis.setTimeout(resolve, ms);
      }));
  const adapter = adapterRegistry.findMatchingAdapter({
    url: page.url,
    title: page.title,
    html: dependencies.document.documentElement?.outerHTML ?? dependencies.document.body?.innerHTML,
  });

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const extractionResult = extractQuestionsFromSupportedPage({
      page,
      html:
        dependencies.document.documentElement?.outerHTML ??
        dependencies.document.body?.innerHTML ??
        ""
    });

    if (extractionResult.kind !== "no-supported-assessment-page") {
      return extractionResult;
    }

    if (!adapter || attempt === maxAttempts - 1) {
      return extractionResult;
    }

    await wait(250);
  }

  return {
    kind: "no-supported-assessment-page" as const,
    siteId: adapter?.descriptor.siteId ?? "unknown-site"
  };
}

async function runQuestionExtraction(
  dependencies: ContentRuntimeDependencies,
  sendMessage: ContentRuntimeMessageSender | undefined
) {
  const page = collectContentPageMetadata(dependencies.document, dependencies.location, dependencies.window);
  const metadataResult = await reportContentPageMetadata(page, sendMessage);

  if (!metadataResult.ok) {
    throw new Error(metadataResult.error.message);
  }

  const extractionResult = await resolveExtractionResult(dependencies, page);

  if (extractionResult.kind === "extracted") {
    const extractionMessageResult = await reportExtractedQuestions(
      {
        siteId: extractionResult.siteId,
        page,
        questions: extractionResult.questions
      },
      sendMessage
    );

    if (!extractionMessageResult.ok) {
      throw new Error(extractionMessageResult.error.message);
    }

    return {
      ok: true as const,
      data: {
        questionCount: extractionResult.questions.length,
        siteId: extractionResult.siteId
      }
    };
  }

  if (extractionResult.kind === "failed") {
    const failureResult = await reportQuestionExtractionFailure(
      {
        siteId: extractionResult.siteId,
        page,
        phase: extractionResult.phase,
        message: extractionResult.message,
        payload: extractionResult.payload
      },
      sendMessage
    );

    if (!failureResult.ok) {
      throw new Error(failureResult.error.message);
    }

    return {
      ok: false as const,
      error: {
        code: "QUESTION_EXTRACTION_FAILED",
        message: extractionResult.message
      }
    };
  }

  return {
    ok: false as const,
    error: {
      code: "NO_SUPPORTED_ASSESSMENT_PAGE",
      message: "Current page is not a supported assessment page."
    }
  };
}

export async function startContentRuntime(
  dependencies: ContentRuntimeDependencies = resolveDefaultDependencies()
): Promise<void> {
  dependencies.runtime?.onMessage?.addListener((message, _sender, sendResponse) => {
    if (!isSupportedContentCommand(message)) {
      return undefined;
    }

    if (message.type === CONTENT_COMMAND_TYPES.questionExtractionRun) {
      void runQuestionExtraction(dependencies, dependencies.sendMessage)
        .then(sendResponse)
        .catch((error) => {
          sendResponse(createRuntimeErrorResult(error));
        });
      return true;
    }

    sendResponse(
      applyAnswerFillCommand(message, {
        document: dependencies.document as Document,
        location: dependencies.location
      })
    );

    return true;
  });

  const result = await runQuestionExtraction(dependencies, dependencies.sendMessage);

  if (
    !result.ok &&
    result.error.code !== "NO_SUPPORTED_ASSESSMENT_PAGE" &&
    result.error.code !== "QUESTION_EXTRACTION_FAILED"
  ) {
    throw new Error(result.error.message);
  }

  console.log("ATTI content runtime initialized.");
}
