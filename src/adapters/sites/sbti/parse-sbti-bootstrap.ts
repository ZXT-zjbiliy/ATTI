import type { ExtractedQuestionDraft, LocatedQuestionRegion } from "../../base/site-adapter";

export interface SbtiBootstrapQuestion {
  readonly id: string;
  readonly dim?: string;
  readonly text: string;
  readonly options: readonly {
    readonly label: string;
    readonly value: string | number;
  }[];
}

interface SbtiBootstrapData {
  readonly questions: readonly SbtiBootstrapQuestion[];
  readonly specialQuestions?: readonly SbtiBootstrapQuestion[];
}

export interface SbtiBootstrapPayload {
  readonly data: SbtiBootstrapData;
}

const SBTI_BOOTSTRAP_MARKER = "window.__SBTI_BOOTSTRAP__";

function extractBalancedObjectLiteral(text: string, startIndex: number): string | null {
  let depth = 0;
  let objectStartIndex = -1;
  let quote: '"' | "'" | null = null;
  let escaped = false;

  for (let index = startIndex; index < text.length; index += 1) {
    const char = text[index];

    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === quote) {
        quote = null;
      }

      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (char === "{") {
      if (depth === 0) {
        objectStartIndex = index;
      }

      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;

      if (depth === 0 && objectStartIndex !== -1) {
        return text.slice(objectStartIndex, index + 1);
      }
    }
  }

  return null;
}

function normalizeBootstrapObjectLiteral(objectLiteral: string): string {
  return objectLiteral.replace(/([{,]\s*)([A-Za-z_$][\w$]*)\s*:/g, '$1"$2":');
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function createSbtiPromptKey(text: string): string {
  return normalizeText(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/(^-|-$)/g, "");
}

export function createSbtiLocatorHint(promptText: string): string {
  return `prompt-key:${createSbtiPromptKey(promptText)}`;
}

export function parseSbtiBootstrap(html: string): SbtiBootstrapPayload | null {
  const markerIndex = html.indexOf(SBTI_BOOTSTRAP_MARKER);

  if (markerIndex === -1) {
    return null;
  }

  const objectLiteral = extractBalancedObjectLiteral(
    html,
    markerIndex + SBTI_BOOTSTRAP_MARKER.length
  );

  if (!objectLiteral) {
    return null;
  }

  try {
    return JSON.parse(normalizeBootstrapObjectLiteral(objectLiteral)) as SbtiBootstrapPayload;
  } catch {
    return null;
  }
}

export function extractSbtiBootstrapQuestions(html: string): readonly SbtiBootstrapQuestion[] {
  const bootstrap = parseSbtiBootstrap(html);

  if (!bootstrap) {
    return [];
  }

  return [...bootstrap.data.questions, ...(bootstrap.data.specialQuestions ?? [])];
}

export function toSbtiExtractedQuestions(
  questions: readonly SbtiBootstrapQuestion[]
): readonly ExtractedQuestionDraft[] {
  return questions.map((question, order) => ({
    text: normalizeText(question.text),
    type: "single-choice-sbti",
    options: question.options.map((option) => ({
      id: String(option.value),
      text: normalizeText(option.label),
      value: String(option.value)
    })),
    order
  }));
}

export function toSbtiLocatedQuestionRegions(
  questions: readonly SbtiBootstrapQuestion[]
): readonly LocatedQuestionRegion[] {
  return questions.map((question, order) => ({
    order,
    promptText: normalizeText(question.text),
    locatorHint: createSbtiLocatorHint(question.text)
  }));
}
