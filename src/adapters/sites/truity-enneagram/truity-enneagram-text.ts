export const TRUITY_INSTRUCTION_MARKER =
  "To take the Enneagram test, mark each statement based on how well it describes your personality.";
export const TRUITY_SCALE_HEADER = "Inaccurate Neutral Accurate";
export const TRUITY_QUESTION_SCALE_MARKER = "Inaccurate Accurate";
export const TRUITY_QUESTION_SCALE_START_MARKER = "Inaccurate";
export const TRUITY_QUESTION_SCALE_END_MARKER = "Accurate";
export const TRUITY_STEP_MARKER_PATTERN = /^Step \d+ of \d+$/i;

export function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

export function stripHtmlTags(text: string): string {
  return decodeHtmlEntities(text.replace(/<[^>]+>/g, " "));
}

export function normalizeComparisonText(text: string): string {
  return normalizeText(text).toLowerCase();
}

export function createTruityPromptKey(text: string): string {
  return normalizeComparisonText(text)
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, "-");
}

export function createTruityLocatorHint(promptText: string): string {
  return `prompt-key:${createTruityPromptKey(promptText)}`;
}

export function extractVisibleTextLines(html: string): string[] {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gim, " ")
      .replace(/<style[\s\S]*?<\/style>/gim, " ")
      .replace(/\s*\r?\n\s*/g, " ")
      .replace(/<[^>]+>/g, "\n")
  )
    .split("\n")
    .map(normalizeText)
    .filter((line) => line.length > 0);
}

export function isTruityInstructionLine(text: string): boolean {
  return normalizeComparisonText(text) === normalizeComparisonText(TRUITY_INSTRUCTION_MARKER);
}

export function isTruityScaleLine(text: string): boolean {
  const normalizedText = normalizeComparisonText(text);

  return (
    normalizedText === normalizeComparisonText(TRUITY_SCALE_HEADER) ||
    normalizedText === normalizeComparisonText(TRUITY_QUESTION_SCALE_MARKER) ||
    normalizedText === normalizeComparisonText(TRUITY_QUESTION_SCALE_START_MARKER) ||
    normalizedText === normalizeComparisonText("Neutral") ||
    normalizedText === normalizeComparisonText(TRUITY_QUESTION_SCALE_END_MARKER)
  );
}

export function isTruityQuestionPromptFollowedByScale(
  lines: readonly string[],
  index: number
): boolean {
  const nextLine = normalizeComparisonText(lines[index + 1] ?? "");
  const lineAfterNext = normalizeComparisonText(lines[index + 2] ?? "");

  return (
    nextLine === normalizeComparisonText(TRUITY_QUESTION_SCALE_MARKER) ||
    (nextLine === normalizeComparisonText(TRUITY_QUESTION_SCALE_START_MARKER) &&
      lineAfterNext === normalizeComparisonText(TRUITY_QUESTION_SCALE_END_MARKER))
  );
}
