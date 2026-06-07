import type {
  AdapterFillContext,
  AnswerFillSelection,
  ExtractedQuestionDraft,
  QuestionRegionLocatorResult,
  SiteAdapter
} from "../base/site-adapter";

const FALLBACK_FEATURE_FLAG_NAME = "fallbackAdapter";
let fallbackEnabledOverride = false;

const GENERIC_ASSESSMENT_SIGNAL =
  /\b(test|quiz|assessment|personality|survey|inventory|question)\b|测评|测试|测验|问卷|人格|性格|题目/iu;
const GENERIC_NEGATIVE_SIGNAL =
  /\b(placeholder\.assessment\.local|localhost|127\.0\.0\.1|admin|dashboard|login|signup|checkout|cart|payment)\b|登录|注册|结账|购物|支付|付款/iu;

const GENERIC_QUESTION_BLOCK_SELECTORS = [
  "fieldset",
  "section",
  "article",
  "[role='group']",
  "[class*='question']",
  "[class*='quiz']",
  "[class*='assessment']",
  "[class*='survey']",
  "[class*='prompt']",
  "[class*='topic']",
  "[data-question]",
  "[data-quiz-question]",
  ".question",
  ".question-block",
  ".quiz-question",
  ".question-item",
  ".question-row",
  ".question-wrapper",
  ".answer-block",
  ".answer-group",
  ".options"
];

const GENERIC_OPTION_SELECTORS = [
  "input[type='radio']",
  "input[type='checkbox']",
  "button",
  "[role='radio']",
  "[role='option']",
  "[class*='option']",
  "[class*='choice']",
  "[class*='answer']",
  "[class*='item']",
  "[class*='button']"
].join(",");

const GENERIC_PROMPT_SELECTORS =
  "h1, h2, h3, h4, h5, h6, .title, .headline, .question-title, .quiz-title, [class*='topic'], [class*='question'], [class*='prompt'], [class*='survey']";

type FallbackQuestionOption = {
  id: string;
  text: string;
  value: string;
};

// Utilities
function normalizeText(value: string | null | undefined): string {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

function getGlobalFeatureFlags(): Record<string, boolean> | undefined {
  return (globalThis as unknown as { __ATTI_FEATURE_FLAGS__?: Record<string, boolean> })
    .__ATTI_FEATURE_FLAGS__;
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

function hasDisallowedHtmlSignal(html: string): boolean {
  return /\b(password|login|sign in|sign-up|register|checkout|cart|payment|credit card|billing|captcha|verify|verification)\b|鐧诲綍|娉ㄥ唽|缁撹处|璐墿|鏀粯|浠樻/iu.test(
    html
  );
}

function hasAssessmentHtmlSignal(html: string, title?: string): boolean {
  return GENERIC_ASSESSMENT_SIGNAL.test(`${title ?? ""} ${html}`);
}

function hasQuestionBlockHtmlSignal(html: string): boolean {
  const promptCount = (
    html.match(
      /question|prompt|survey|assessment|quiz|legend|fieldset|闂嵎|娴嬭瘯|娴嬭瘎|棰樼洰/giu
    ) ?? []
  ).length;
  const optionCount = (
    html.match(/radio|checkbox|button|option|choice|answer|鍚屾剰|涓嶅悓鎰?/giu) ?? []
  ).length;

  return promptCount >= 2 && optionCount >= 4;
}

function stripHtmlTags(value: string): string {
  return normalizeText(value.replace(/<[^>]+>/g, " "));
}

function extractQuestionsFromHtmlWithoutDom(html: string): ExtractedQuestionDraft[] {
  const blockStartPattern =
    /<div[^>]*class=["'][^"']*(?:survey|question|quiz|assessment)[^"']*["'][^>]*>/giu;
  const blockStarts = Array.from(html.matchAll(blockStartPattern));
  const blockHtmlChunks = blockStarts.map((match, index) => {
    const startIndex = match.index ?? 0;
    const nextStartIndex = blockStarts[index + 1]?.index ?? html.length;
    return html.slice(startIndex, nextStartIndex);
  });

  const questions = blockHtmlChunks.reduce<ExtractedQuestionDraft[]>(
    (allQuestions, blockHtml, questionIndex) => {
      const promptMatch =
        blockHtml.match(
          /<div[^>]*class=["'][^"']*(?:question|prompt|title|headline)[^"']*["'][^>]*>([\s\S]*?)<\/div>/iu
        ) ?? blockHtml.match(/<legend[^>]*>([\s\S]*?)<\/legend>/iu);
      const prompt = stripHtmlTags(promptMatch?.[1] ?? "");

      if (prompt.length < 5) {
        return allQuestions;
      }

      const optionMatches = Array.from(
        blockHtml.matchAll(
          /<div[^>]*class=["'][^"']*(?:answer|option|choice|item|button)[^"']*["'][^>]*>([\s\S]*?)<\/div>/giu
        )
      );
      const options = optionMatches.reduce<FallbackQuestionOption[]>(
        (allOptions, optionMatch, optionIndex) => {
          const text = stripHtmlTags(optionMatch[1] ?? "");
          if (text.length === 0) {
            return allOptions;
          }

          allOptions.push({
            id: `${questionIndex}-${optionIndex}`,
            text,
            value: text
          });

          return allOptions;
        },
        []
      );

      if (options.length < 2) {
        return allQuestions;
      }

      allQuestions.push({
        section: undefined,
        text: prompt,
        type: "single-choice",
        options,
        order: questionIndex
      });

      return allQuestions;
    },
    []
  );

  if (questions.length > 0) {
    return questions;
  }

  const promptMatches = Array.from(
    html.matchAll(
      /<div[^>]*class=["'][^"']*(?:question|prompt|title|headline)[^"']*["'][^>]*>([\s\S]*?)<\/div>/giu
    )
  );
  const optionMatches = Array.from(
    html.matchAll(
      /<div[^>]*class=["'][^"']*(?:answer|option|choice|item|button)[^"']*["'][^>]*>([\s\S]*?)<\/div>/giu
    )
  );

  if (promptMatches.length >= 1 && optionMatches.length >= 2) {
    const prompt = stripHtmlTags(promptMatches[0]?.[1] ?? "");
    const options = optionMatches.reduce<FallbackQuestionOption[]>(
      (allOptions, optionMatch, optionIndex) => {
        const text = stripHtmlTags(optionMatch[1] ?? "");
        if (text.length === 0) {
          return allOptions;
        }

        allOptions.push({
          id: `0-${optionIndex}`,
          text,
          value: text
        });

        return allOptions;
      },
      []
    );

    if (prompt.length >= 5 && options.length >= 2) {
      return [
        {
          section: undefined,
          text: prompt,
          type: "single-choice",
          options,
          order: 0
        }
      ];
    }
  }

  return [];
}

function isFallbackAdapterEnabled(): boolean {
  if (fallbackEnabledOverride) {
    return true;
  }

  const flags = getGlobalFeatureFlags();
  return flags?.[FALLBACK_FEATURE_FLAG_NAME] ?? true;
}

export function setGenericFallbackAdapterEnabledForTesting(value: boolean): void {
  fallbackEnabledOverride = value;
}

// Page signal matching
function isLightAssessmentSignal(url: string, title: string): boolean {
  const combinedText = `${url} ${title}`;
  return GENERIC_ASSESSMENT_SIGNAL.test(combinedText);
}

function isNegativeSignal(url: string, title: string): boolean {
  const combinedText = `${url} ${title}`;
  return GENERIC_NEGATIVE_SIGNAL.test(combinedText);
}

// Page structure validation
function hasAssessmentPageSignal(doc: Document, title?: string): boolean {
  const hintText = [
    title,
    ...Array.from(
      doc.querySelectorAll("meta[name='description'], meta[name='keywords'], meta[property^='og:']")
    ).map((element) => element.getAttribute("content") ?? "")
  ]
    .join(" ")
    .toLowerCase();

  const pageText = [
    hintText,
    normalizeText(doc.body?.textContent),
    ...Array.from(doc.querySelectorAll(GENERIC_PROMPT_SELECTORS)).map((element) =>
      normalizeText(element.textContent)
    )
  ]
    .join(" ")
    .toLowerCase();

  return GENERIC_ASSESSMENT_SIGNAL.test(pageText);
}

function hasDisallowedPageStructure(doc: Document): boolean {
  if (
    doc.querySelector(
      "input[type='password'], input[name*='password'], button[type='submit'][value*='login'], button[type='submit'][value*='sign in']"
    )
  ) {
    return true;
  }

  const formElement = doc.querySelector("form");
  if (formElement) {
    const formText = normalizeText(formElement.textContent).toLowerCase();
    if (
      /\b(checkout|cart|payment|credit card|billing|invoice|subscribe|subscription|coupon|promo|order summary|login|sign in|sign-up|register|password|captcha|verify|verification)\b|登录|注册|结账|购物|支付|付款/.test(
        formText
      )
    ) {
      return true;
    }
  }

  return false;
}

function hasAssessmentPageContentSignal(context: {
  readonly title?: string;
  readonly html?: string;
}): boolean {
  if (!context.html) {
    return false;
  }

  const doc = parseDocument(context.html);
  if (!doc) {
    if (hasDisallowedHtmlSignal(context.html)) {
      return false;
    }

    return (
      hasAssessmentHtmlSignal(context.html, context.title) ||
      hasQuestionBlockHtmlSignal(context.html)
    );
  }

  if (hasDisallowedPageStructure(doc)) {
    return false;
  }

  if (hasAssessmentPageSignal(doc, context.title)) {
    return true;
  }

  const questions = extractQuestionsFromDocument(doc);
  return questions.length >= 1;
}

function isLikelyOptionCandidate(element: Element): boolean {
  const text = normalizeText(element.textContent);
  const ariaLabel = normalizeText(element.getAttribute("aria-label"));
  const dataValue = normalizeText(element.getAttribute("data-value"));
  const role = normalizeText(element.getAttribute("role")).toLowerCase();
  const tagName = element.tagName.toLowerCase();

  if (text.length > 0 || ariaLabel.length > 0 || dataValue.length > 0) {
    return true;
  }

  return (
    tagName === "button" ||
    tagName === "label" ||
    tagName === "option" ||
    role === "radio" ||
    role === "option" ||
    role === "button"
  );
}

function findFallbackOptionCandidates(block: Element): Element[] {
  const fallbackOptions = Array.from(
    block.querySelectorAll(
      ":scope > div, :scope > li, :scope > a, :scope > span, :scope > button, :scope > label"
    )
  ).filter((element) => isLikelyOptionCandidate(element));

  return fallbackOptions;
}

function looksLikeOptionOnlyBlock(prompt: string, optionElements: Element[]): boolean {
  const optionTexts = optionElements
    .map((element) => normalizeText(element.textContent))
    .filter((text) => text.length > 0);

  if (optionTexts.length < 2) {
    return false;
  }

  const joinedOptionText = normalizeText(optionTexts.join(" "));

  return prompt === joinedOptionText || optionTexts.includes(prompt);
}

// Question extraction helpers
function locateQuestionBlocks(doc: Document): Element[] {
  const fieldsetCandidates = Array.from(doc.querySelectorAll("fieldset")).filter(
    (fieldset) => fieldset.querySelector(GENERIC_OPTION_SELECTORS) !== null
  );

  const sectionCandidates = Array.from(
    doc.querySelectorAll(GENERIC_QUESTION_BLOCK_SELECTORS.join(","))
  ).filter((element) => element.querySelector(GENERIC_OPTION_SELECTORS) !== null);

  const heuristicCandidates = Array.from(doc.querySelectorAll("div, section, article, li")).filter(
    (element) => {
      if (normalizeText(element.textContent).length < 10) {
        return false;
      }

      const prompt = extractPromptText(element);
      if (prompt.length < 5) {
        return false;
      }

      const options = extractOptionElements(element);
      if (looksLikeOptionOnlyBlock(prompt, options)) {
        return false;
      }
      if (options.length >= 2) {
        return true;
      }

      const fallbackOptions = findFallbackOptionCandidates(element);
      if (looksLikeOptionOnlyBlock(prompt, fallbackOptions)) {
        return false;
      }
      return fallbackOptions.length >= 2;
    }
  );

  const candidates = Array.from(
    new Set([...fieldsetCandidates, ...sectionCandidates, ...heuristicCandidates])
  );

  return candidates
    .filter((element) => {
      const prompt = extractPromptText(element);
      const options = extractOptionElements(element);
      const fallbackOptions = options.length > 0 ? options : findFallbackOptionCandidates(element);

      return !looksLikeOptionOnlyBlock(prompt, fallbackOptions);
    })
    .filter((element) => normalizeText(element.textContent).length > 0)
    .filter(
      (element, _, allCandidates) =>
        !allCandidates.some((other) => other !== element && other.contains(element))
    )
    .slice(0, 30);
}

function extractOptionText(optionElement: Element): string {
  if (optionElement instanceof HTMLLabelElement) {
    return normalizeText(optionElement.textContent);
  }

  if (optionElement instanceof HTMLInputElement) {
    const titleText = normalizeText(optionElement.title);
    if (titleText.length > 0) {
      return titleText;
    }

    const textContent = normalizeText(optionElement.textContent);
    if (textContent.length > 0) {
      return textContent;
    }

    return normalizeText(optionElement.value);
  }

  const textContent = normalizeText(optionElement.textContent);
  if (textContent.length > 0) {
    return textContent;
  }

  return normalizeText(optionElement.getAttribute("aria-label"));
}

function extractOptionValue(optionElement: Element): string {
  if (optionElement instanceof HTMLInputElement) {
    const value = normalizeText(optionElement.value);
    if (value.length > 0) {
      return value;
    }

    const ariaLabel = normalizeText(optionElement.getAttribute("aria-label"));
    if (ariaLabel.length > 0) {
      return ariaLabel;
    }

    return normalizeText(optionElement.textContent);
  }

  if (optionElement instanceof HTMLLabelElement) {
    const input = optionElement.querySelector<HTMLInputElement>(
      "input[type='radio'], input[type='checkbox']"
    );
    if (input?.value) {
      return normalizeText(input.value);
    }

    const ariaLabel = normalizeText(optionElement.getAttribute("aria-label"));
    if (ariaLabel.length > 0) {
      return ariaLabel;
    }

    return normalizeText(optionElement.textContent);
  }

  const dataValue = normalizeText(optionElement.getAttribute("data-value"));
  if (dataValue.length > 0) {
    return dataValue;
  }

  const ariaLabel = normalizeText(optionElement.getAttribute("aria-label"));
  if (ariaLabel.length > 0) {
    return ariaLabel;
  }

  return normalizeText(optionElement.textContent);
}

function extractOptionElements(block: Element): Element[] {
  const labelElements = Array.from(block.querySelectorAll("label")).filter(
    (label) => normalizeText(label.textContent).length > 0
  );

  if (labelElements.length > 0) {
    return labelElements;
  }

  const radioInputs = Array.from(
    block.querySelectorAll("input[type='radio'], input[type='checkbox']")
  );

  if (radioInputs.length > 0) {
    return radioInputs;
  }

  const buttonElements = Array.from(
    block.querySelectorAll("button, [role='radio'], [role='option']")
  ).filter((button) => normalizeText(button.textContent).length > 0);

  if (buttonElements.length > 0) {
    return buttonElements;
  }

  const styledOptions = Array.from(
    block.querySelectorAll(
      "[class*='option'], [class*='choice'], [class*='answer'], [class*='item'], [class*='button'], .option, .choice, .answer-option, .answer-choice, .quiz-option, [data-option], [role='listitem']"
    )
  ).filter((element) => normalizeText(element.textContent).length > 0);
  if (styledOptions.length > 0) {
    return styledOptions;
  }

  return findFallbackOptionCandidates(block);
}

function extractPromptText(block: Element): string {
  const legend = block.querySelector("legend");
  if (legend) {
    const text = normalizeText(legend.textContent);
    if (text.length > 0) {
      return text;
    }
  }

  const heading = block.querySelector(
    "h1, h2, h3, h4, h5, h6, .question-title, .prompt, .question-text, .prompt-text, .statement, .question-label, .question-header, [class*='topic'], [class*='question'], [class*='prompt'], [class*='title']"
  );
  if (heading) {
    const text = normalizeText(heading.textContent);
    if (text.length > 0) {
      return text;
    }
  }

  const textContent = normalizeText(block.textContent);
  const firstLine = textContent
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  return firstLine ?? "";
}

function extractQuestionsFromDocument(doc: Document): ExtractedQuestionDraft[] {
  return locateQuestionBlocks(doc).reduce<ExtractedQuestionDraft[]>(
    (questions, block, questionIndex) => {
      const prompt = extractPromptText(block);
      const optionElements = extractOptionElements(block);

      if (prompt.length < 5) {
        return questions;
      }

      const options = optionElements.reduce<FallbackQuestionOption[]>(
        (allOptions, element, optionIndex) => {
          const text = extractOptionText(element);
          if (text.length === 0) {
            return allOptions;
          }

          const value = extractOptionValue(element);

          allOptions.push({
            id: `${questionIndex}-${optionIndex}`,
            text,
            value
          });

          return allOptions;
        },
        []
      );

      if (options.length < 2 || options.length > 10) {
        return questions;
      }

      questions.push({
        section: undefined,
        text: prompt,
        type: "single-choice",
        options,
        order: questionIndex
      });

      return questions;
    },
    []
  );
}

function buildLocatorHint(question: ExtractedQuestionDraft): string {
  return `fallback-question-${question.order}-${question.text
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/gu, "-")
    .replace(/(^-|-$)/g, "")}`;
}

function buildQuestionRegionLocatorResults(
  questions: ExtractedQuestionDraft[]
): QuestionRegionLocatorResult {
  return {
    isSupportedAssessmentPage: questions.length >= 1,
    questionRegions: questions.map((question) => ({
      order: question.order,
      promptText: question.text,
      locatorHint: buildLocatorHint(question)
    }))
  };
}

// Fill matching helpers
function getOptionMatchCandidates(element: Element): string[] {
  const text = normalizeText(element.textContent);
  const dataValue = normalizeText(element.getAttribute("data-value"));
  const ariaLabel = normalizeText(element.getAttribute("aria-label"));
  const id = normalizeText((element as HTMLElement).id);
  const value = element instanceof HTMLInputElement ? normalizeText(element.value) : "";
  const candidates = [id, value, dataValue, ariaLabel, text].filter(
    (candidate) => candidate.length > 0
  );

  if (element instanceof HTMLLabelElement) {
    const forId = normalizeText(element.getAttribute("for"));
    if (forId.length > 0) {
      candidates.push(forId);
    }
  }

  return candidates;
}

function findMatchingOptionElement(
  document: Document,
  questionOrder: number,
  selection: AnswerFillSelection
): HTMLInputElement | HTMLElement | null {
  const blocks = locateQuestionBlocks(document);
  const block = blocks[questionOrder];
  if (!block) {
    return null;
  }

  const candidateInputs = Array.from(
    block.querySelectorAll<HTMLInputElement>("input[type='radio'], input[type='checkbox']")
  );
  const candidateLabels = Array.from(block.querySelectorAll<HTMLLabelElement>("label"));
  const candidateGenericOptions = extractOptionElements(block).filter(
    (element) => !(element instanceof HTMLInputElement) && !(element instanceof HTMLLabelElement)
  ) as HTMLElement[];

  const candidates = Array.from(
    new Set([...candidateInputs, ...candidateLabels, ...candidateGenericOptions])
  ) as Array<HTMLInputElement | HTMLElement>;
  const targetValues = selection.selectedOptionIds.map(normalizeText);

  for (const option of candidates) {
    const matchValues = getOptionMatchCandidates(option);
    if (matchValues.some((candidate) => targetValues.includes(candidate))) {
      if (option instanceof HTMLLabelElement) {
        const forId = option.getAttribute("for");
        if (forId) {
          const input = document.getElementById(forId) as HTMLInputElement | null;
          return input ?? option;
        }
      }

      return option;
    }
  }

  const fallbackIndex = Number(selection.selectedOptionIds[0].split("-").at(-1));
  if (!Number.isNaN(fallbackIndex)) {
    if (candidates[fallbackIndex]) {
      return candidates[fallbackIndex];
    }
  }

  return null;
}

function fillQuestionSelection(document: Document, selection: AnswerFillSelection): boolean {
  const optionElement = findMatchingOptionElement(document, selection.questionOrder, selection);
  if (!optionElement) {
    return false;
  }

  if (optionElement instanceof HTMLInputElement) {
    optionElement.checked = true;
    return true;
  }

  optionElement.click();
  return true;
}

export const genericFallbackSiteAdapter: SiteAdapter = {
  descriptor: {
    siteId: "generic-fallback-assessment",
    displayName: "Generic Fallback Assessment Adapter",
    capabilities: {
      supportsQuestionExtraction: true,
      supportsPreview: true,
      supportsFill: false
    }
  },
  matches(context) {
    if (!isFallbackAdapterEnabled()) {
      return false;
    }

    const url = context.url.toLowerCase();
    const title = normalizeText(context.title).toLowerCase();

    const negativeSignal = isNegativeSignal(url, title);
    if (negativeSignal) {
      return false;
    }

    const lightPositiveSignal = isLightAssessmentSignal(url, title);
    if (!context.html) {
      return lightPositiveSignal;
    }

    const doc = parseDocument(context.html);
    if (doc) {
      if (hasDisallowedPageStructure(doc)) {
        return false;
      }
    } else if (hasDisallowedHtmlSignal(context.html)) {
      return false;
    }

    return lightPositiveSignal || hasAssessmentPageContentSignal(context);
  },
  isSupportedAssessmentPage(context) {
    const doc = parseDocument(context.html);
    if (!doc) {
      if (hasDisallowedHtmlSignal(context.html)) {
        return false;
      }

      if (!hasAssessmentHtmlSignal(context.html, context.title)) {
        return false;
      }

      return extractQuestionsFromHtmlWithoutDom(context.html).length >= 1;
    }

    if (hasDisallowedPageStructure(doc)) {
      return false;
    }

    if (!hasAssessmentPageSignal(doc, context.title)) {
      return false;
    }

    const questions = extractQuestionsFromDocument(doc);
    return questions.length >= 1;
  },
  locateQuestionRegions(context) {
    const doc = parseDocument(context.html);
    if (!doc) {
      return {
        isSupportedAssessmentPage: false,
        questionRegions: []
      };
    }
    const questions = extractQuestionsFromDocument(doc);

    return buildQuestionRegionLocatorResults(questions);
  },
  extractQuestions(context) {
    const doc = parseDocument(context.html);
    if (!doc) {
      const questions = extractQuestionsFromHtmlWithoutDom(context.html);
      return {
        questionCount: questions.length,
        questions
      };
    }
    const questions = extractQuestionsFromDocument(doc);

    return {
      questionCount: questions.length,
      questions
    };
  },
  fillAnswers(context: AdapterFillContext, selections) {
    const document = context.document;
    let filledCount = 0;

    for (const selection of selections) {
      if (fillQuestionSelection(document, selection)) {
        filledCount += 1;
      }
    }

    return { filledCount };
  }
};
