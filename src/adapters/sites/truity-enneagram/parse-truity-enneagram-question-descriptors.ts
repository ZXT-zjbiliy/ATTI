import type { ExtractedQuestionDraft, LocatedQuestionRegion } from "../../base/site-adapter";
import {
  createTruityLocatorHint,
  createTruityPromptKey,
  extractVisibleTextLines,
  isTruityInstructionLine,
  isTruityQuestionPromptFollowedByScale,
  isTruityScaleLine,
  normalizeText,
  stripHtmlTags,
  TRUITY_STEP_MARKER_PATTERN
} from "./truity-enneagram-text";

export interface TruityQuestionDescriptor {
  readonly order: number;
  readonly promptText: string;
  readonly promptKey: string;
  readonly locatorHint: string;
  readonly options: ExtractedQuestionDraft["options"];
}

const FIXED_RATING_OPTIONS: ExtractedQuestionDraft["options"] = [
  { id: "1", text: "Inaccurate", value: "1" },
  { id: "2", text: "Somewhat Inaccurate", value: "2" },
  { id: "3", text: "Neutral", value: "3" },
  { id: "4", text: "Somewhat Accurate", value: "4" },
  { id: "5", text: "Accurate", value: "5" }
];

function extractAttributeValue(tagHtml: string, attributeName: string): string | null {
  const pattern = new RegExp(
    `${attributeName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
    "i"
  );
  const match = tagHtml.match(pattern);

  if (!match) {
    return null;
  }

  return normalizeText(match[1] ?? match[2] ?? match[3] ?? "");
}

function extractRadioOptions(fieldsetHtml: string): ExtractedQuestionDraft["options"] {
  const options: ExtractedQuestionDraft["options"] = [];
  const labelPattern = /<label\b[^>]*>([\s\S]*?)<\/label>/gim;

  for (const labelMatch of fieldsetHtml.matchAll(labelPattern)) {
    const labelHtml = labelMatch[1] ?? "";
    const inputTagMatch = labelHtml.match(/<input\b[^>]*>/i);

    if (!inputTagMatch) {
      continue;
    }

    const inputTag = inputTagMatch[0];
    const inputType = extractAttributeValue(inputTag, "type");

    if (inputType?.toLowerCase() !== "radio") {
      continue;
    }

    const optionValue = extractAttributeValue(inputTag, "value");

    if (!optionValue) {
      continue;
    }

    const optionText = normalizeText(stripHtmlTags(labelHtml.replace(inputTag, " ")));

    options.push({
      id: optionValue,
      text: optionText,
      value: optionValue
    });
  }

  return options;
}

function extractFieldsetPromptText(fieldsetHtml: string): string | null {
  const legendMatch = fieldsetHtml.match(/<legend\b[^>]*>([\s\S]*?)<\/legend>/i);

  if (legendMatch) {
    return normalizeText(stripHtmlTags(legendMatch[1] ?? ""));
  }

  return null;
}

export function parseTruityFixtureQuestionDescriptors(html: string): TruityQuestionDescriptor[] {
  const descriptors: TruityQuestionDescriptor[] = [];
  const fieldsetPattern = /<fieldset\b[^>]*>([\s\S]*?)<\/fieldset>/gim;

  for (const fieldsetMatch of html.matchAll(fieldsetPattern)) {
    const fieldsetHtml = fieldsetMatch[0] ?? "";
    const promptText = extractFieldsetPromptText(fieldsetHtml);
    const options = extractRadioOptions(fieldsetHtml);

    if (!promptText || options.length === 0) {
      continue;
    }

    descriptors.push({
      order: descriptors.length,
      promptText,
      promptKey: createTruityPromptKey(promptText),
      locatorHint: createTruityLocatorHint(promptText),
      options
    });
  }

  return descriptors;
}

export function parseTruityLiveQuestionDescriptors(html: string): TruityQuestionDescriptor[] {
  const lines = extractVisibleTextLines(html);
  const instructionIndex = lines.findIndex((line) => isTruityInstructionLine(line));

  if (instructionIndex === -1) {
    return [];
  }

  const stepIndex = lines.findIndex(
    (line, index) => index > instructionIndex && TRUITY_STEP_MARKER_PATTERN.test(line)
  );
  const questionRegion =
    stepIndex === -1 ? lines.slice(instructionIndex + 1) : lines.slice(instructionIndex + 1, stepIndex);
  const descriptors: TruityQuestionDescriptor[] = [];

  for (let index = 0; index < questionRegion.length; index += 1) {
    if (isTruityScaleLine(questionRegion[index] ?? "")) {
      continue;
    }

    const promptLines: string[] = [];
    let scanIndex = index;

    while (scanIndex < questionRegion.length && !isTruityScaleLine(questionRegion[scanIndex] ?? "")) {
      promptLines.push(questionRegion[scanIndex] ?? "");
      scanIndex += 1;
    }

    if (promptLines.length === 0) {
      continue;
    }

    const promptText = normalizeText(promptLines.join(" "));

    if (!isTruityQuestionPromptFollowedByScale([promptText, ...questionRegion.slice(scanIndex)], 0)) {
      continue;
    }

    descriptors.push({
      order: descriptors.length,
      promptText,
      promptKey: createTruityPromptKey(promptText),
      locatorHint: createTruityLocatorHint(promptText),
      options: FIXED_RATING_OPTIONS.map((option) => ({ ...option }))
    });

    index = Math.max(index, scanIndex - 1);
  }

  return descriptors;
}

export function parseTruityQuestionDescriptors(html: string): TruityQuestionDescriptor[] {
  const fixtureDescriptors = parseTruityFixtureQuestionDescriptors(html);

  if (fixtureDescriptors.length > 0) {
    return fixtureDescriptors;
  }

  return parseTruityLiveQuestionDescriptors(html);
}

export function mapDescriptorsToLocatedQuestionRegions(
  descriptors: readonly TruityQuestionDescriptor[]
): LocatedQuestionRegion[] {
  return descriptors.map((descriptor) => ({
    order: descriptor.order,
    promptText: descriptor.promptText,
    locatorHint: descriptor.locatorHint
  }));
}
