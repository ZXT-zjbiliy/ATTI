import type {
  AdapterFillContext,
  AdapterMatchContext,
  AdapterPageContext,
  AnswerFillResult,
  AnswerFillSelection,
  ExtractedQuestionDraft,
  QuestionRegionLocatorResult,
  SiteAdapter
} from "../base/site-adapter";

const SIXTEEN_PERSONALITIES_HOSTNAME = "www.16personalities.com";
const SIXTEEN_PERSONALITIES_TEST_PATH = "/free-personality-test";
const SIXTEEN_PERSONALITIES_TEST_TITLE = "Free Personality Test";
const SIXTEEN_PERSONALITIES_INSTRUCTION_MARKER =
  "Be yourself and answer honestly to find out your personality type.";

const FIXED_SIXTEEN_PERSONALITIES_OPTIONS: ExtractedQuestionDraft["options"] = [
  { id: "1", text: "Strongly Agree", value: "1" },
  { id: "2", text: "Agree", value: "2" },
  { id: "3", text: "Slightly Agree", value: "3" },
  { id: "4", text: "Neutral", value: "4" },
  { id: "5", text: "Slightly Disagree", value: "5" },
  { id: "6", text: "Disagree", value: "6" },
  { id: "7", text: "Strongly Disagree", value: "7" }
];

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function normalizeComparisonText(text: string): string {
  return normalizeText(text).toLowerCase();
}

function stripHtmlTags(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/<[^>]+>/g, " ");
}

function createPromptKey(text: string): string {
  return normalizeComparisonText(text)
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, "-");
}

function createLocatorHint(promptText: string): string {
  return `prompt-key:${createPromptKey(promptText)}`;
}

function tryParseUrl(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

export function matchesSixteenPersonalitiesTestUrl(context: AdapterMatchContext): boolean {
  const parsedUrl = tryParseUrl(context.url);

  if (!parsedUrl) {
    return false;
  }

  return (
    parsedUrl.hostname === SIXTEEN_PERSONALITIES_HOSTNAME &&
    parsedUrl.pathname === SIXTEEN_PERSONALITIES_TEST_PATH
  );
}

export function isSupportedSixteenPersonalitiesAssessmentPage(
  context: AdapterPageContext
): boolean {
  if (!matchesSixteenPersonalitiesTestUrl(context)) {
    return false;
  }

  const normalizedTitle = normalizeComparisonText(context.title ?? "");
  const normalizedHtml = normalizeComparisonText(context.html);

  return (
    normalizedTitle.includes(normalizeComparisonText(SIXTEEN_PERSONALITIES_TEST_TITLE)) &&
    normalizedHtml.includes(normalizeComparisonText(SIXTEEN_PERSONALITIES_TEST_TITLE)) &&
    normalizedHtml.includes(normalizeComparisonText(SIXTEEN_PERSONALITIES_INSTRUCTION_MARKER)) &&
    normalizedHtml.includes("agree") &&
    normalizedHtml.includes("disagree")
  );
}

function createDocument(html: string): Document | null {
  if (typeof DOMParser === "undefined") {
    return null;
  }

  return new DOMParser().parseFromString(html, "text/html");
}

function collectQuestionContainers(doc: Document): HTMLElement[] {
  const selectors = [
    "section[data-atti-16p-question]",
    ".question-card",
    ".question-item",
    "[data-question-id]",
    "fieldset",
    "section",
    "article"
  ];

  return Array.from(doc.querySelectorAll<HTMLElement>(selectors.join(","))).filter((container) => {
    const promptText = resolvePromptText(container);
    if (!promptText || promptText.length < 10) {
      return false;
    }

    const optionElements = collectOptionElements(container);
    return optionElements.length >= 5;
  });
}

function parseQuestionDescriptors(html: string): Array<{
  order: number;
  promptText: string;
  locatorHint: string;
  options: ExtractedQuestionDraft["options"];
}> {
  const descriptors: Array<{
    order: number;
    promptText: string;
    locatorHint: string;
    options: ExtractedQuestionDraft["options"];
  }> = [];

  const document = createDocument(html);

  if (document) {
    const containers = collectQuestionContainers(document);
    const seenKeys = new Set<string>();

    for (const container of containers) {
      const promptText = resolvePromptText(container);
      const promptKey = createPromptKey(promptText);

      if (!promptText || seenKeys.has(promptKey)) {
        continue;
      }

      const optionElements = collectOptionElements(container);

      if (optionElements.length < 5) {
        continue;
      }

      descriptors.push({
        order: descriptors.length,
        promptText,
        locatorHint: createLocatorHint(promptText),
        options: FIXED_SIXTEEN_PERSONALITIES_OPTIONS.map((option) => ({ ...option }))
      });
      seenKeys.add(promptKey);
    }
  }

  if (descriptors.length > 0) {
    return descriptors;
  }

  const blockPattern =
    /<(section|article|fieldset|div)\b[^>]*(?:data-atti-16p-question\b|class=(?:"[^"]*\bquestion-card\b[^"]*"|'[^']*\bquestion-card\b[^']*')|class=(?:"[^"]*\bquestion\b[^"]*"|'[^']*\bquestion\b[^']*'))[^>]*>[\s\S]*?<\/\1>/gim;

  for (const blockMatch of html.matchAll(blockPattern)) {
    const blockHtml = blockMatch[0] ?? "";
    const promptMatch =
      blockHtml.match(/data-atti-16p-prompt[^>]*>([\s\S]*?)<\/[^>]+>/i) ??
      blockHtml.match(
        /<(?:h1|h2|h3|h4|p|span|div)\b[^>]*>([\s\S]*?)<\/(?:h1|h2|h3|h4|p|span|div)>/i
      );

    if (!promptMatch) {
      continue;
    }

    let promptText = normalizeText(stripHtmlTags(promptMatch[1] ?? ""));
    promptText = promptText.replace(/^question\s*\d+\s*of\s*\d+\s*:?[\s\u00A0]*/i, "");

    if (promptText.length === 0) {
      continue;
    }

    descriptors.push({
      order: descriptors.length,
      promptText,
      locatorHint: createLocatorHint(promptText),
      options: FIXED_SIXTEEN_PERSONALITIES_OPTIONS.map((option) => ({ ...option }))
    });
  }

  return descriptors;
}

export function locateSixteenPersonalitiesQuestionRegions(
  context: AdapterPageContext
): QuestionRegionLocatorResult {
  if (!isSupportedSixteenPersonalitiesAssessmentPage(context)) {
    return {
      isSupportedAssessmentPage: false,
      questionRegions: []
    };
  }

  return {
    isSupportedAssessmentPage: true,
    questionRegions: parseQuestionDescriptors(context.html).map((descriptor) => ({
      order: descriptor.order,
      promptText: descriptor.promptText,
      locatorHint: descriptor.locatorHint
    }))
  };
}

export function extractSixteenPersonalitiesQuestions(context: AdapterPageContext): {
  questionCount: number;
  questions: readonly ExtractedQuestionDraft[];
} {
  if (!isSupportedSixteenPersonalitiesAssessmentPage(context)) {
    return {
      questionCount: 0,
      questions: []
    };
  }

  const descriptors = parseQuestionDescriptors(context.html);

  if (descriptors.length === 0) {
    throw new Error(
      "Failed to locate 16Personalities question blocks within the adapter boundary."
    );
  }

  return {
    questionCount: descriptors.length,
    questions: descriptors.map((descriptor) => ({
      text: descriptor.promptText,
      type: "single-choice-rating",
      options: descriptor.options.map((option) => ({ ...option })),
      order: descriptor.order
    }))
  };
}

function matchesSelectionPrompt(
  selection: AnswerFillSelection,
  candidateText: string | null | undefined
): boolean {
  return createPromptKey(candidateText ?? "") === createPromptKey(selection.questionText);
}

function resolvePromptText(container: Element): string {
  const prioritizedSelectors = [
    "[data-atti-16p-prompt]",
    ".header",
    ".statement",
    "legend span",
    "legend",
    "h1",
    "h2",
    "h3",
    "h4",
    "p",
    "span",
    "div"
  ];

  for (const selector of prioritizedSelectors) {
    const promptElement = container.querySelector(selector);
    if (!promptElement) {
      continue;
    }

    let promptText = normalizeText(promptElement.textContent ?? "");
    promptText = promptText.replace(/^question\s*\d+\s*of\s*\d+\s*:??\s*/i, "");

    if (promptText.length > 0) {
      return promptText;
    }
  }

  return "";
}

function collectOptionElements(container: Element): HTMLElement[] {
  const directValueButtons = Array.from(
    container.querySelectorAll<HTMLElement>('button[data-value], [role="radio"][data-value]')
  );

  if (directValueButtons.length > 0) {
    return directValueButtons;
  }

  const radioInputs = Array.from(
    container.querySelectorAll<HTMLInputElement>('input[type="radio"]')
  );

  if (radioInputs.length >= 5) {
    return radioInputs as HTMLElement[];
  }

  const optionCandidates = Array.from(
    container.querySelectorAll<HTMLElement>(
      'button, [role="radio"], [role="button"], label, span.sp-radio, [class*="sp-radio"]'
    )
  ).filter((candidate) => {
    if (candidate.tagName.toLowerCase() === "label") {
      return !!candidate.querySelector('input[type="radio"]');
    }

    return true;
  });

  return optionCandidates;
}

function resolveOptionElements(
  context: AdapterFillContext,
  selection: AnswerFillSelection
): HTMLElement[] | null {
  const containers = Array.from(
    context.document.querySelectorAll<HTMLElement>(
      [
        "[data-atti-16p-question]",
        ".question",
        ".question-item",
        ".question-card",
        "[data-question-id]",
        "fieldset",
        "section",
        "article"
      ].join(", ")
    )
  );

  for (const container of containers) {
    if (!matchesSelectionPrompt(selection, resolvePromptText(container))) {
      continue;
    }

    const optionElements = collectOptionElements(container);

    if (optionElements.length >= 5) {
      return optionElements;
    }
  }

  return null;
}

function clickOptionElement(optionElement: HTMLElement): void {
  const targetInput =
    optionElement.tagName.toLowerCase() === "input"
      ? (optionElement as HTMLInputElement)
      : optionElement.querySelector<HTMLInputElement>('input[type="radio"]');

  if (targetInput) {
    if (!targetInput.checked) {
      targetInput.click();
    }

    targetInput.dispatchEvent(new Event("input", { bubbles: true }));
    targetInput.dispatchEvent(new Event("change", { bubbles: true }));
    return;
  }

  if (optionElement.tagName.toLowerCase() === "label") {
    const radioInput = optionElement.querySelector<HTMLInputElement>('input[type="radio"]');

    if (!radioInput) {
      throw new Error("16Personalities label target is missing its radio input.");
    }

    if (!radioInput.checked) {
      radioInput.click();
    }

    radioInput.dispatchEvent(new Event("input", { bubbles: true }));
    radioInput.dispatchEvent(new Event("change", { bubbles: true }));
    return;
  }

  optionElement.click();
  optionElement.dispatchEvent(new Event("input", { bubbles: true }));
  optionElement.dispatchEvent(new Event("change", { bubbles: true }));
}

export function fillSixteenPersonalitiesAnswers(
  context: AdapterFillContext,
  selections: readonly AnswerFillSelection[]
): AnswerFillResult {
  if (!matchesSixteenPersonalitiesTestUrl(context)) {
    throw new Error(`Unsupported fill target URL: ${context.url}`);
  }

  let filledCount = 0;

  for (const selection of selections) {
    const optionElements = resolveOptionElements(context, selection);

    if (!optionElements) {
      throw new Error(
        `Unable to locate 16Personalities question target within adapter boundary: questionId=${selection.questionId} promptKey=${createPromptKey(selection.questionText)} order=${selection.questionOrder}`
      );
    }

    for (const optionId of selection.selectedOptionIds) {
      const explicitValueMatch = optionElements.find((candidate) => {
        const dataValue = normalizeText(candidate.getAttribute("data-value") ?? "");
        const radioValue = normalizeText(
          candidate.querySelector<HTMLInputElement>('input[type="radio"]')?.value ?? ""
        );

        return dataValue === optionId || radioValue === optionId;
      });
      const orderIndex = Number.parseInt(optionId, 10) - 1;
      const fallbackMatch =
        Number.isFinite(orderIndex) && orderIndex >= 0
          ? (optionElements[orderIndex] ?? null)
          : null;
      const target = explicitValueMatch ?? fallbackMatch;

      if (!target) {
        throw new Error(
          `Unable to locate 16Personalities option target: ${selection.questionId} / ${optionId}`
        );
      }

      clickOptionElement(target);
    }

    filledCount += 1;
  }

  return {
    filledCount
  };
}

export const sixteenPersonalitiesSiteAdapter: SiteAdapter = {
  descriptor: {
    siteId: "sixteen-personalities",
    displayName: "16Personalities Free Personality Test Adapter",
    capabilities: {
      supportsQuestionExtraction: true,
      supportsPreview: false,
      supportsFill: true
    }
  },
  matches(context) {
    return matchesSixteenPersonalitiesTestUrl(context);
  },
  isSupportedAssessmentPage(context) {
    return isSupportedSixteenPersonalitiesAssessmentPage(context);
  },
  locateQuestionRegions(context) {
    return locateSixteenPersonalitiesQuestionRegions(context);
  },
  extractQuestions(context) {
    return extractSixteenPersonalitiesQuestions(context);
  },
  fillAnswers(context, selections) {
    return fillSixteenPersonalitiesAnswers(context, selections);
  }
};
