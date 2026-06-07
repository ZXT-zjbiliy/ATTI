import type {
  AdapterFillContext,
  AnswerFillResult,
  AnswerFillSelection
} from "../../base/site-adapter";
import { matchesTruityEnneagramUrl } from "./match-truity-enneagram-page";
import { createTruityPromptKey, normalizeText } from "./truity-enneagram-text";

const DOCUMENT_POSITION_FOLLOWING = 4;

function collectRadioGroups(root: ParentNode): HTMLInputElement[][] {
  const groupedInputs = new Map<string, HTMLInputElement[]>();

  for (const input of root.querySelectorAll<HTMLInputElement>('input[type="radio"]')) {
    const groupName = normalizeText(input.name);

    if (groupName.length === 0) {
      continue;
    }

    if (!groupedInputs.has(groupName)) {
      groupedInputs.set(groupName, []);
    }

    groupedInputs.get(groupName)?.push(input);
  }

  return [...groupedInputs.values()];
}

function createSelectionPromptKey(selection: AnswerFillSelection): string {
  return createTruityPromptKey(selection.questionText);
}

function matchesSelectionPrompt(
  selection: AnswerFillSelection,
  candidateText: string | null | undefined
): boolean {
  return createTruityPromptKey(candidateText ?? "") === createSelectionPromptKey(selection);
}

function resolvePromptTextFromStructuredContainer(container: Element): string {
  const promptElement = container.querySelector("legend, h1, h2, h3, h4, h5, h6, p, span, div");

  return normalizeText(promptElement?.textContent ?? "");
}

function resolveNearestRadioGroupFromPrompt(promptElement: Element): HTMLInputElement[] | null {
  let currentElement: Element | null = promptElement;

  while (currentElement && currentElement !== promptElement.ownerDocument.documentElement) {
    const radioGroups = collectRadioGroups(currentElement);

    if (radioGroups.length === 1) {
      return radioGroups[0] ?? null;
    }

    const followingGroup = radioGroups.find((group) => {
      const firstInput = group[0];

      return (
        !!firstInput &&
        (promptElement.contains(firstInput) ||
          !!(promptElement.compareDocumentPosition(firstInput) & DOCUMENT_POSITION_FOLLOWING))
      );
    });

    if (followingGroup) {
      return followingGroup;
    }

    currentElement = currentElement.parentElement;
  }

  return null;
}

function resolveStructuredQuestionGroup(
  context: AdapterFillContext,
  selection: AnswerFillSelection
): HTMLInputElement[] | null {
  const containers = Array.from(
    context.document.querySelectorAll<HTMLElement>(
      'fieldset, [role="group"], [role="radiogroup"], .question, .question-wrap, .question-item, .field--name-field-questions'
    )
  );

  for (const container of containers) {
    if (!matchesSelectionPrompt(selection, resolvePromptTextFromStructuredContainer(container))) {
      continue;
    }

    const radioGroup = collectRadioGroups(container)[0];

    if (radioGroup) {
      return radioGroup;
    }
  }

  return null;
}

function resolveLiveQuestionGroupByPrompt(
  context: AdapterFillContext,
  selection: AnswerFillSelection
): HTMLInputElement[] | null {
  const promptCandidates = Array.from(
    context.document.querySelectorAll<HTMLElement>("legend, h1, h2, h3, h4, h5, h6, p, span, div")
  ).filter((candidate) => matchesSelectionPrompt(selection, candidate.textContent));

  for (const promptCandidate of promptCandidates) {
    const radioGroup = resolveNearestRadioGroupFromPrompt(promptCandidate);

    if (radioGroup) {
      return radioGroup;
    }
  }

  return null;
}

function resolveLiveQuestionGroupByOrder(
  context: AdapterFillContext,
  selection: AnswerFillSelection
): HTMLInputElement[] | null {
  const radioGroups = collectRadioGroups(context.document);

  return radioGroups[selection.questionOrder] ?? null;
}

function resolveQuestionRadioGroup(
  context: AdapterFillContext,
  selection: AnswerFillSelection
): HTMLInputElement[] | null {
  const fieldsets = Array.from(context.document.querySelectorAll<HTMLFieldSetElement>("fieldset"));
  const matchingFieldset = fieldsets.find((candidate) =>
    matchesSelectionPrompt(selection, candidate.querySelector("legend")?.textContent)
  );

  return (
    (matchingFieldset ? (collectRadioGroups(matchingFieldset)[0] ?? null) : null) ??
    resolveStructuredQuestionGroup(context, selection) ??
    resolveLiveQuestionGroupByPrompt(context, selection) ??
    resolveLiveQuestionGroupByOrder(context, selection)
  );
}

function applyRadioSelection(
  selection: AnswerFillSelection,
  radioGroup: readonly HTMLInputElement[]
): void {
  for (const optionId of selection.selectedOptionIds) {
    const input = radioGroup.find(
      (candidate) => normalizeText(candidate.value) === normalizeText(optionId)
    );

    if (!input) {
      throw new Error(
        `Unable to locate Truity option target: ${selection.questionId} / ${optionId}`
      );
    }

    if (!input.checked) {
      input.click();
      continue;
    }

    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

export function fillTruityEnneagramAnswers(
  context: AdapterFillContext,
  selections: readonly AnswerFillSelection[]
): AnswerFillResult {
  if (!matchesTruityEnneagramUrl(context)) {
    throw new Error(`Unsupported fill target URL: ${context.url}`);
  }

  let filledCount = 0;

  for (const selection of selections) {
    const radioGroup = resolveQuestionRadioGroup(context, selection);

    if (!radioGroup) {
      throw new Error(
        `Unable to locate Truity question target within adapter boundary: questionId=${selection.questionId} promptKey=${createSelectionPromptKey(selection)} order=${selection.questionOrder}`
      );
    }

    applyRadioSelection(selection, radioGroup);
    filledCount += 1;
  }

  return {
    filledCount
  };
}
