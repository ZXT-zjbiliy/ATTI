import type {
  AdapterFillContext,
  AdapterMatchContext,
  AdapterPageContext,
  AnswerFillResult,
  AnswerFillSelection,
  QuestionExtractionResult,
  QuestionRegionLocatorResult,
  SiteAdapter,
} from "../../base/site-adapter";
import {
  createSbtiPromptKey,
  extractSbtiBootstrapQuestions,
  toSbtiExtractedQuestions,
  toSbtiLocatedQuestionRegions,
} from "./parse-sbti-bootstrap";

const SBTI_HOSTNAME = "sbti.cc";
const SBTI_TEST_PATH = "/test";

function normalizeText(text: string | null | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

function tryParseUrl(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

export function matchesSbtiTestUrl(context: AdapterMatchContext): boolean {
  const parsedUrl = tryParseUrl(context.url);

  if (!parsedUrl) {
    return false;
  }

  return parsedUrl.hostname === SBTI_HOSTNAME && parsedUrl.pathname === SBTI_TEST_PATH;
}

export function isSupportedSbtiAssessmentPage(context: AdapterPageContext): boolean {
  if (!matchesSbtiTestUrl(context)) {
    return false;
  }

  const questions = extractSbtiBootstrapQuestions(context.html);

  return (
    questions.length >= 2 &&
    context.html.includes("questionList") &&
    context.html.includes("questionStage") &&
    context.html.includes("__SBTI_BOOTSTRAP__")
  );
}

export function locateSbtiQuestionRegions(
  context: AdapterPageContext
): QuestionRegionLocatorResult {
  if (!isSupportedSbtiAssessmentPage(context)) {
    return {
      isSupportedAssessmentPage: false,
      questionRegions: [],
    };
  }

  const questions = extractSbtiBootstrapQuestions(context.html);

  return {
    isSupportedAssessmentPage: questions.length > 0,
    questionRegions: toSbtiLocatedQuestionRegions(questions),
  };
}

export function extractSbtiQuestions(context: AdapterPageContext): QuestionExtractionResult {
  if (!isSupportedSbtiAssessmentPage(context)) {
    return {
      questionCount: 0,
      questions: [],
    };
  }

  const questions = extractSbtiBootstrapQuestions(context.html);

  if (questions.length === 0) {
    throw new Error("Failed to parse SBTI bootstrap questions within the adapter boundary.");
  }

  const extractedQuestions = toSbtiExtractedQuestions(questions);

  return {
    questionCount: extractedQuestions.length,
    questions: extractedQuestions,
  };
}

function resolveCurrentQuestionPrompt(document: Document): string {
  return normalizeText(document.querySelector(".question-title")?.textContent);
}

function resolveCurrentOptionInputs(document: Document): HTMLInputElement[] {
  return Array.from(
    document.querySelectorAll<HTMLInputElement>('.options input[type="radio"]')
  );
}

function findOptionInput(
  document: Document,
  selection: AnswerFillSelection
): HTMLInputElement | null {
  const optionInputs = resolveCurrentOptionInputs(document);

  for (const optionId of selection.selectedOptionIds) {
    const explicitMatch = optionInputs.find((input) => normalizeText(input.value) === optionId);
    if (explicitMatch) {
      return explicitMatch;
    }

    const fallbackIndex = Number.parseInt(optionId, 10) - 1;
    if (Number.isFinite(fallbackIndex) && fallbackIndex >= 0) {
      return optionInputs[fallbackIndex] ?? null;
    }
  }

  return null;
}

function withImmediateTimers(window: Window, action: () => void): void {
  const timerWindow = window as Window & typeof globalThis;
  const originalSetTimeout = timerWindow.setTimeout.bind(window);
  const originalClearTimeout = timerWindow.clearTimeout.bind(window);

  timerWindow.setTimeout = (((handler: TimerHandler, _timeout?: number, ...args: unknown[]) => {
    if (typeof handler === "function") {
      handler(...args);
    }
    return 0;
  }) as typeof setTimeout);
  timerWindow.clearTimeout = (((_id?: number) => {
    return undefined;
  }) as typeof clearTimeout);

  try {
    action();
  } finally {
    timerWindow.setTimeout = originalSetTimeout;
    timerWindow.clearTimeout = originalClearTimeout;
  }
}

export function fillSbtiAnswers(
  context: AdapterFillContext,
  selections: readonly AnswerFillSelection[]
): AnswerFillResult {
  if (!matchesSbtiTestUrl(context)) {
    throw new Error(`Unsupported fill target URL: ${context.url}`);
  }

  const selectionMap = new Map(
    selections.map((selection) => [createSbtiPromptKey(selection.questionText), selection])
  );
  const currentWindow = context.document.defaultView;

  if (!currentWindow) {
    throw new Error("SBTI fill requires a live document window.");
  }

  let filledCount = 0;

  withImmediateTimers(currentWindow, () => {
    const maxIterations = selectionMap.size + 4;
    const answeredPromptKeys = new Set<string>();

    for (let iteration = 0; iteration < maxIterations; iteration += 1) {
      const currentPromptText = resolveCurrentQuestionPrompt(context.document);

      if (currentPromptText.length === 0) {
        break;
      }

      const promptKey = createSbtiPromptKey(currentPromptText);

      if (answeredPromptKeys.has(promptKey)) {
        break;
      }

      const selection = selectionMap.get(promptKey);

      if (!selection) {
        throw new Error(
          `Unable to locate SBTI selection within the adapter boundary: promptKey=${promptKey}`
        );
      }

      const optionInput = findOptionInput(context.document, selection);

      if (!optionInput) {
        throw new Error(
          `Unable to locate SBTI option target within the adapter boundary: questionId=${selection.questionId}`
        );
      }

      answeredPromptKeys.add(promptKey);

      const InputEventConstructor = context.document.defaultView?.Event ?? Event;

      if (!optionInput.checked) {
        optionInput.click();
      } else {
        optionInput.dispatchEvent(new InputEventConstructor("input", { bubbles: true }));
        optionInput.dispatchEvent(new InputEventConstructor("change", { bubbles: true }));
      }

      filledCount += 1;

      const submitButton = context.document.getElementById("submitBtn") as HTMLButtonElement | null;
      const submitReady =
        submitButton !== null &&
        !submitButton.classList.contains("is-hidden") &&
        !submitButton.disabled;

      if (submitReady) {
        break;
      }
    }
  });

  return {
    filledCount,
  };
}

export const sbtiSiteAdapter: SiteAdapter = {
  descriptor: {
    siteId: "sbti-test",
    displayName: "SBTI Test Adapter",
    capabilities: {
      supportsQuestionExtraction: true,
      supportsPreview: false,
      supportsFill: true,
    },
  },
  matches(context) {
    return matchesSbtiTestUrl(context);
  },
  isSupportedAssessmentPage(context) {
    return isSupportedSbtiAssessmentPage(context);
  },
  locateQuestionRegions(context) {
    return locateSbtiQuestionRegions(context);
  },
  extractQuestions(context) {
    return extractSbtiQuestions(context);
  },
  fillAnswers(context, selections) {
    return fillSbtiAnswers(context, selections);
  },
};
