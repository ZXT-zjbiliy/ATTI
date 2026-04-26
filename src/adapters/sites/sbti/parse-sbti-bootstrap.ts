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

const SBTI_BOOTSTRAP_PATTERN =
  /window\.__SBTI_BOOTSTRAP__\s*=\s*(\{[\s\S]*?\})\s*;\s*<\/script>/i;

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
  const bootstrapMatch = html.match(SBTI_BOOTSTRAP_PATTERN);

  if (!bootstrapMatch?.[1]) {
    return null;
  }

  try {
    return JSON.parse(bootstrapMatch[1]) as SbtiBootstrapPayload;
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
      value: String(option.value),
    })),
    order,
  }));
}

export function toSbtiLocatedQuestionRegions(
  questions: readonly SbtiBootstrapQuestion[]
): readonly LocatedQuestionRegion[] {
  return questions.map((question, order) => ({
    order,
    promptText: normalizeText(question.text),
    locatorHint: createSbtiLocatorHint(question.text),
  }));
}
