import type {
  AdapterFillContext,
  AdapterMatchContext,
  AdapterPageContext,
  AnswerFillResult,
  AnswerFillSelection,
  ExtractedQuestionDraft,
  LocatedQuestionRegion,
  QuestionExtractionResult,
  QuestionRegionLocatorResult
} from "../../base/site-adapter";
import { extractVisibleTextLines, normalizeText, TRUITY_STEP_MARKER_PATTERN } from "../truity-enneagram/truity-enneagram-text";

const TRUITY_HOSTNAME = "www.truity.com";

type PairChoiceSiteConfig = {
  readonly siteId: string;
  readonly displayName: string;
  readonly path: string;
  readonly titleIncludes: string | readonly string[];
  readonly instructionIncludes: string;
};

type PairChoiceDescriptor = {
  readonly order: number;
  readonly leftText: string;
  readonly rightText: string;
  readonly promptText: string;
  readonly promptKey: string;
  readonly locatorHint: string;
  readonly options: ExtractedQuestionDraft["options"];
};

function isDefined<T>(value: T | null): value is T {
  return value !== null;
}

function tryParseUrl(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

function createPairPromptText(leftText: string, rightText: string): string {
  return `${normalizeText(leftText)} <-> ${normalizeText(rightText)}`;
}

function createPairPromptKey(leftText: string, rightText: string): string {
  return createPairPromptText(leftText, rightText)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, "-");
}

function createPairLocatorHint(leftText: string, rightText: string): string {
  return `pair-key:${createPairPromptKey(leftText, rightText)}`;
}

function createOptionLabel(position: number, total: number, leftText: string, rightText: string): string {
  if (total === 5) {
    const labels = [
      `Stronger match: ${leftText}`,
      `Somewhat more like: ${leftText}`,
      `Both equally / neither`,
      `Somewhat more like: ${rightText}`,
      `Stronger match: ${rightText}`
    ];

    return labels[position] ?? `Choice ${position + 1}`;
  }

  if (total === 3) {
    const labels = [leftText, "Both equally / neither", rightText];

    return labels[position] ?? `Choice ${position + 1}`;
  }

  if (position === 0) {
    return leftText;
  }

  if (position === total - 1) {
    return rightText;
  }

  return `Middle choice ${position + 1}`;
}

function parseClassList(value: string | undefined): string[] {
  return (value ?? "").split(/\s+/).map((item) => item.trim()).filter(Boolean);
}

function hasAllClasses(value: string | undefined, requiredClasses: readonly string[]): boolean {
  const classList = new Set(parseClassList(value));

  return requiredClasses.every((requiredClass) => classList.has(requiredClass));
}

function getDomParserConstructor(): typeof DOMParser | undefined {
  return (globalThis as typeof globalThis & { DOMParser?: typeof DOMParser }).DOMParser;
}

function parseDocument(html: string): Document | null {
  const DomParserConstructor = getDomParserConstructor();

  if (!DomParserConstructor) {
    return null;
  }

  return new DomParserConstructor().parseFromString(html, "text/html");
}

function extractQuestionBlocks(html: string): string[] {
  const blockPattern = /<div\b[^>]*class="[^"]*\bquestion\b[^"]*\bquestion-radio\b[^"]*"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/gim;

  return [...html.matchAll(blockPattern)].map((match) => match[0] ?? "");
}

function extractBlockLabels(blockHtml: string): string[] {
  const labelPattern = /<span\b[^>]*class="[^"]*\bradio-label\b[^"]*"[^>]*>([\s\S]*?)<\/span>/gim;

  return [...blockHtml.matchAll(labelPattern)]
    .map((match) => normalizeText(match[1] ?? ""))
    .filter((label) => label.length > 0);
}

function extractBlockInputValues(blockHtml: string): string[] {
  const inputPattern = /<input\b[^>]*type="radio"[^>]*value="([^"]+)"[^>]*>/gim;

  return [...blockHtml.matchAll(inputPattern)]
    .map((match) => normalizeText(match[1] ?? ""))
    .filter((value) => value.length > 0);
}

function parsePairChoiceDescriptorsFromDocument(doc: Document): PairChoiceDescriptor[] {
  const containers = Array.from(
    doc.querySelectorAll<HTMLElement>(".question.question-radio, .question-radio")
  );

  const descriptors: Array<PairChoiceDescriptor | null> = containers
    .map((container, order) => {
      const labels = Array.from(container.querySelectorAll<HTMLElement>("span.radio-label"))
        .map((element) => normalizeText(element.textContent ?? ""))
        .filter((label) => label.length > 0);
      const inputValues = Array.from(
        container.querySelectorAll<HTMLInputElement>('input[type="radio"]')
      )
        .map((input) => normalizeText(input.value))
        .filter((value) => value.length > 0);

      if (labels.length < 2 || inputValues.length < 3) {
        return null;
      }

      const leftText = labels[0] ?? "";
      const rightText = labels[labels.length - 1] ?? "";

      return {
        order,
        leftText,
        rightText,
        promptText: createPairPromptText(leftText, rightText),
        promptKey: createPairPromptKey(leftText, rightText),
        locatorHint: createPairLocatorHint(leftText, rightText),
        options: inputValues.map((value, position) => ({
          id: value,
          text: createOptionLabel(position, inputValues.length, leftText, rightText),
          value
        }))
      } satisfies PairChoiceDescriptor;
    });

  return descriptors.filter(isDefined);
}

function parsePairChoiceDescriptors(html: string): PairChoiceDescriptor[] {
  const doc = parseDocument(html);

  if (doc) {
    const descriptors = parsePairChoiceDescriptorsFromDocument(doc);

    if (descriptors.length > 0) {
      return descriptors;
    }
  }

  const descriptors: Array<PairChoiceDescriptor | null> = extractQuestionBlocks(html)
    .map((blockHtml, order) => {
      const labels = extractBlockLabels(blockHtml);
      const inputValues = extractBlockInputValues(blockHtml);

      if (labels.length < 2 || inputValues.length < 3) {
        return null;
      }

      const leftText = labels[0] ?? "";
      const rightText = labels[labels.length - 1] ?? "";

      return {
        order,
        leftText,
        rightText,
        promptText: createPairPromptText(leftText, rightText),
        promptKey: createPairPromptKey(leftText, rightText),
        locatorHint: createPairLocatorHint(leftText, rightText),
        options: inputValues.map((value, position) => ({
          id: value,
          text: createOptionLabel(position, inputValues.length, leftText, rightText),
          value
        }))
      } satisfies PairChoiceDescriptor;
    });

  return descriptors.filter(isDefined);
}

function matchesSiteUrl(context: AdapterMatchContext, path: string): boolean {
  const parsedUrl = tryParseUrl(context.url);

  if (!parsedUrl) {
    return false;
  }

  return parsedUrl.hostname === TRUITY_HOSTNAME && parsedUrl.pathname === path;
}

function hasStepMarker(html: string): boolean {
  return extractVisibleTextLines(html).some((line) => TRUITY_STEP_MARKER_PATTERN.test(line));
}

function createSupportedPageCheck(config: PairChoiceSiteConfig) {
  return (context: AdapterPageContext): boolean => {
    if (!matchesSiteUrl(context, config.path)) {
      return false;
    }

    const normalizedTitle = (context.title ?? "").toLowerCase();
    const normalizedHtml = context.html.toLowerCase();
    const titleIncludes = Array.isArray(config.titleIncludes)
      ? config.titleIncludes
      : [config.titleIncludes];
    const hasExpectedTitle = titleIncludes.some((entry) =>
      normalizedTitle.includes(entry.toLowerCase())
    );

    return (
      hasExpectedTitle &&
      normalizedHtml.includes(config.instructionIncludes.toLowerCase()) &&
      hasStepMarker(context.html) &&
      parsePairChoiceDescriptors(context.html).length > 0
    );
  };
}

function createExtraction(config: PairChoiceSiteConfig) {
  const isSupportedAssessmentPage = createSupportedPageCheck(config);

  return (context: AdapterPageContext): QuestionExtractionResult => {
    if (!isSupportedAssessmentPage(context)) {
      return {
        questionCount: 0,
        questions: []
      };
    }

    const descriptors = parsePairChoiceDescriptors(context.html);

    if (descriptors.length === 0) {
      throw new Error(
        `Failed to locate ${config.displayName} question blocks after checking Truity pair-choice markers.`
      );
    }

    return {
      questionCount: descriptors.length,
      questions: descriptors.map((descriptor) => ({
        text: descriptor.promptText,
        type: "single-choice-pair-scale",
        options: descriptor.options.map((option) => ({ ...option })),
        order: descriptor.order
      }))
    };
  };
}

function createQuestionRegionLocator(config: PairChoiceSiteConfig) {
  const isSupportedAssessmentPage = createSupportedPageCheck(config);

  return (context: AdapterPageContext): QuestionRegionLocatorResult => {
    if (!isSupportedAssessmentPage(context)) {
      return {
        isSupportedAssessmentPage: false,
        questionRegions: []
      };
    }

    return {
      isSupportedAssessmentPage: true,
      questionRegions: parsePairChoiceDescriptors(context.html).map((descriptor) => ({
        order: descriptor.order,
        promptText: descriptor.promptText,
        locatorHint: descriptor.locatorHint
      })) satisfies LocatedQuestionRegion[]
    };
  };
}

function resolveQuestionContainers(document: Document): Element[] {
  return Array.from(document.querySelectorAll(".question")).filter((element) =>
    hasAllClasses(element.getAttribute("class") ?? undefined, ["question", "question-radio"])
  );
}

function resolveContainerLabels(container: Element): string[] {
  return Array.from(container.querySelectorAll("span"))
    .filter((element) => parseClassList(element.getAttribute("class") ?? undefined).includes("radio-label"))
    .map((element) => normalizeText(element.textContent ?? ""))
    .filter((label) => label.length > 0);
}

function resolveQuestionPromptKey(container: Element): string | null {
  const labels = resolveContainerLabels(container);

  if (labels.length < 2) {
    return null;
  }

  return createPairPromptKey(labels[0] ?? "", labels[labels.length - 1] ?? "");
}

function resolveQuestionInputGroup(container: Element): HTMLInputElement[] {
  return Array.from(container.querySelectorAll<HTMLInputElement>('input[type="radio"]'));
}

function resolveQuestionInputGroupForSelection(
  context: AdapterFillContext,
  selection: AnswerFillSelection
): HTMLInputElement[] | null {
  const promptKey = selection.questionText
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, "-");
  const questionContainers = resolveQuestionContainers(context.document);
  const directMatch = questionContainers.find(
    (container) => resolveQuestionPromptKey(container) === promptKey
  );

  if (directMatch) {
    return resolveQuestionInputGroup(directMatch);
  }

  return questionContainers[selection.questionOrder]
    ? resolveQuestionInputGroup(questionContainers[selection.questionOrder]!)
    : null;
}

function createFill(config: PairChoiceSiteConfig) {
  return (context: AdapterFillContext, selections: readonly AnswerFillSelection[]): AnswerFillResult => {
    if (!matchesSiteUrl(context, config.path)) {
      throw new Error(`Unsupported fill target URL: ${context.url}`);
    }

    let filledCount = 0;

    for (const selection of selections) {
      const inputGroup = resolveQuestionInputGroupForSelection(context, selection);

      if (!inputGroup || inputGroup.length === 0) {
        throw new Error(
          `Unable to locate ${config.displayName} question target within adapter boundary: questionId=${selection.questionId} order=${selection.questionOrder}`
        );
      }

      const optionId = selection.selectedOptionIds[0];
      const input = inputGroup.find((candidate) => normalizeText(candidate.value) === normalizeText(optionId));

      if (!input) {
        throw new Error(
          `Unable to locate ${config.displayName} option target within adapter boundary: questionId=${selection.questionId} optionId=${optionId}`
        );
      }

      if (!input.checked) {
        input.click();
      } else {
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }

      filledCount += 1;
    }

    return {
      filledCount
    };
  };
}

export function createTruityPairChoiceSupport(config: PairChoiceSiteConfig) {
  return {
    matches(context: AdapterMatchContext) {
      return matchesSiteUrl(context, config.path);
    },
    isSupportedAssessmentPage: createSupportedPageCheck(config),
    locateQuestionRegions: createQuestionRegionLocator(config),
    extractQuestions: createExtraction(config),
    fillAnswers: createFill(config)
  };
}
