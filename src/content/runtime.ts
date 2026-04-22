import type { AppResult } from "../shared/types";
import { applyAnswerFillCommand, isSupportedContentCommand } from "./answer-fill";
import { collectContentPageMetadata } from "./page-metadata";
import { adapterRegistry } from "../adapters";
import {
  reportExtractedQuestions,
  reportQuestionExtractionFailure,
  reportContentPageMetadata,
  type ContentRuntimeMessageSender,
} from "./content-message-client";
import { extractQuestionsFromSupportedPage } from "./question-extraction";

export interface ContentRuntimeDependencies {
  readonly document: {
    title: string;
    readyState: string;
    body?: {
      innerHTML: string;
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
  const wait = dependencies.wait ??
    ((ms: number) =>
      new Promise<void>((resolve) => {
        globalThis.setTimeout(resolve, ms);
      }));
  const adapter = adapterRegistry.findMatchingAdapter({
    url: page.url,
    title: page.title
  });

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const extractionResult = extractQuestionsFromSupportedPage({
      page,
      html: dependencies.document.body?.innerHTML ?? ""
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

export async function startContentRuntime(
  dependencies: ContentRuntimeDependencies = resolveDefaultDependencies(),
): Promise<void> {
  dependencies.runtime?.onMessage?.addListener((message, _sender, sendResponse) => {
    if (!isSupportedContentCommand(message)) {
      return undefined;
    }

    sendResponse(
      applyAnswerFillCommand(message, {
        document: dependencies.document as Document,
        location: dependencies.location
      })
    );

    return true;
  });

  const page = collectContentPageMetadata(
    dependencies.document,
    dependencies.location,
    dependencies.window,
  );
  const result = await reportContentPageMetadata(page, dependencies.sendMessage);

  if (result.ok) {
    const extractionResult = await resolveExtractionResult(dependencies, page);

    if (extractionResult.kind === "extracted") {
      const extractionMessageResult = await reportExtractedQuestions(
        {
          siteId: extractionResult.siteId,
          page,
          questions: extractionResult.questions
        },
        dependencies.sendMessage
      );

      if (!extractionMessageResult.ok) {
        throw new Error(extractionMessageResult.error.message);
      }
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
        dependencies.sendMessage
      );

      if (!failureResult.ok) {
        throw new Error(failureResult.error.message);
      }
    }
  }

  if (!result.ok) {
    throw new Error(result.error.message);
  }

  console.log("ATTI content runtime initialized.");
}
