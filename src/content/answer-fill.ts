import type { SiteAdapter } from "../adapters/base/site-adapter";
import type {
  AdapterFillContext,
  AnswerFillSelection
} from "../adapters/base/site-adapter";
import { adapterRegistry, type AdapterRegistry } from "../adapters/registry/adapter-registry";
import { answerFillApplyCommandSchema, questionExtractionRunCommandSchema } from "../shared/schemas";
import type { AnswerFillApplyCommand, AppResult, ContentCommand } from "../shared/types";
import { CONTENT_COMMAND_TYPES } from "../shared/types";

export interface ContentFillDependencies {
  readonly document: Document;
  readonly location: {
    href: string;
  };
  readonly adapterRegistry?: AdapterRegistry;
}

function createErrorResult(code: string, message: string): AppResult {
  return {
    ok: false,
    error: {
      code,
      message
    }
  };
}

function resolveFillAdapter(
  registry: AdapterRegistry,
  context: { url: string; title: string }
): SiteAdapter | null {
  return registry.findMatchingAdapter(context);
}

function parseAnswerFillSelections(command: AnswerFillApplyCommand): AnswerFillSelection[] {
  return command.payload.selections.map((selection) => ({
    questionId: selection.questionId,
    questionText: selection.questionText,
    questionOrder: selection.questionOrder,
    selectedOptionIds: [...selection.selectedOptionIds]
  }));
}

export function applyAnswerFillCommand(
  command: AnswerFillApplyCommand,
  dependencies: ContentFillDependencies
): AppResult {
  const validatedCommand = answerFillApplyCommandSchema.parse(command);
  const registry = dependencies.adapterRegistry ?? adapterRegistry;
  const adapter = resolveFillAdapter(registry, {
    url: dependencies.location.href,
    title: dependencies.document.title
  });

  if (!adapter) {
    return createErrorResult("ADAPTER_NOT_FOUND", `No adapter matches fill target: ${dependencies.location.href}`);
  }

  if (!adapter.fillAnswers) {
    return createErrorResult(
      "ADAPTER_FILL_NOT_SUPPORTED",
      `Adapter does not support fill: ${adapter.descriptor.siteId}`
    );
  }

  const fillContext: AdapterFillContext = {
    url: dependencies.location.href,
    title: dependencies.document.title,
    document: dependencies.document
  };

  try {
    const result = adapter.fillAnswers(fillContext, parseAnswerFillSelections(validatedCommand));

    return {
      ok: true,
      data: {
        siteId: adapter.descriptor.siteId,
        filledCount: result.filledCount
      }
    };
  } catch (error) {
    return createErrorResult(
      "ANSWER_FILL_FAILED",
      error instanceof Error ? error.message : "Unknown answer fill error"
    );
  }
}

export function isSupportedContentCommand(message: unknown): message is ContentCommand {
  return (
    answerFillApplyCommandSchema.safeParse(message).success ||
    questionExtractionRunCommandSchema.safeParse(message).success
  );
}
