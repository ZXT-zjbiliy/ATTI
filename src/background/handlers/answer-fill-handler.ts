import type { AppResult, AnswerFillRunMessage } from "../../shared/types";
import type { BackgroundMessageHandler } from "./types";

function createErrorResult(code: string, message: string): AppResult {
  return {
    ok: false,
    error: {
      code,
      message
    }
  };
}

const GENERIC_FALLBACK_SITE_ID = "generic-fallback-assessment";
const GENERIC_FALLBACK_FILL_FLAG = "genericFallbackFill";

function isGenericFallbackFillAllowed(settings: {
  debugMode: boolean;
  featureFlags: Record<string, boolean>;
}): boolean {
  return settings.debugMode || settings.featureFlags[GENERIC_FALLBACK_FILL_FLAG] === true;
}

export const handleAnswerFillRunMessage: BackgroundMessageHandler<AnswerFillRunMessage> = async (
  message,
  context
): Promise<AppResult> => {
  const session = await context.sessionRepository.getSessionById(message.payload.sessionId);

  if (!session) {
    return createErrorResult(
      "SESSION_NOT_FOUND",
      `Session not found: ${message.payload.sessionId}`
    );
  }

  const [settings, questions, answerPlans] = await Promise.all([
    context.settingsRepository.getSettings(),
    context.questionRepository.listBySessionId(session.id),
    context.answerPlanRepository.listBySessionId(session.id)
  ]);
  const questionMap = new Map(questions.map((question) => [question.id, question]));
  const approvedSelections = answerPlans
    .filter(
      (answerPlan) =>
        answerPlan.reviewStatus !== "rejected" &&
        answerPlan.selectedOptionIds.length > 0 &&
        answerPlan.qualityStatus === "normal"
    )
    .map((answerPlan) => {
      const question = questionMap.get(answerPlan.questionId);

      if (!question) {
        throw new Error(`Question not found for fill: ${answerPlan.questionId}`);
      }

      return {
        questionId: answerPlan.questionId,
        questionText: question.text,
        questionOrder: question.order,
        selectedOptionIds: [...answerPlan.selectedOptionIds]
      };
    });

  if (approvedSelections.length === 0) {
    const degradedAnswerPlans = answerPlans.filter(
      (answerPlan) =>
        answerPlan.reviewStatus !== "rejected" &&
        answerPlan.selectedOptionIds.length > 0 &&
        answerPlan.qualityStatus === "degraded"
    );

    if (degradedAnswerPlans.length > 0) {
      await context.adapterDiagnosticsRepository.writeDiagnostic({
        sessionId: session.id,
        siteId: session.siteId,
        selectorVersion: "answer-fill-v1",
        phase: "answer-fill",
        message: "No fillable answer plans remain after quality gating.",
        payload: {
          failureBoundary: "router-quality",
          failureStage: "answer-fill-gating",
          failureCategory: "quality",
          degradedAnswerPlanCount: degradedAnswerPlans.length,
          qualityIssues: degradedAnswerPlans.flatMap((answerPlan) => answerPlan.qualityIssues)
        }
      });
    }

    return createErrorResult(
      "NO_FILLABLE_ANSWERS",
      `当前会话没有可执行填写的推荐结果：${session.id}`
    );
  }

  if (session.siteId === GENERIC_FALLBACK_SITE_ID && !isGenericFallbackFillAllowed(settings)) {
    await context.adapterDiagnosticsRepository.writeDiagnostic({
      sessionId: session.id,
      siteId: session.siteId,
      selectorVersion: "answer-fill-v1",
      phase: "answer-fill",
      message: "Generic fallback fill is disabled by default.",
      payload: {
        failureBoundary: "router-policy",
        failureStage: "answer-fill-gating",
        failureCategory: "policy",
        requiredFeatureFlag: GENERIC_FALLBACK_FILL_FLAG
      }
    });

    return createErrorResult(
      "GENERIC_FALLBACK_FILL_DISABLED",
      "实验性 generic fallback 页面默认只允许预览，不允许填写；如需调试填写，请开启 debug mode 或 genericFallbackFill feature flag。"
    );
  }

  if (!context.contentAutomationGateway) {
    return createErrorResult(
      "CONTENT_AUTOMATION_UNAVAILABLE",
      "Content automation gateway is unavailable for answer fill."
    );
  }

  try {
    const allowGenericFallbackFill =
      session.siteId === GENERIC_FALLBACK_SITE_ID && isGenericFallbackFillAllowed(settings);
    const fillResult = await context.contentAutomationGateway.applyAnswerFill({
      pageUrl: session.pageUrl,
      sessionId: session.id,
      siteId: session.siteId,
      allowGenericFallbackFill,
      selections: approvedSelections
    });

    await context.sessionRepository.updateFillState({
      sessionId: session.id,
      status: "answer-fill-complete",
      finishedAt: new Date().toISOString(),
      executionLogEntry: {
        phase: "answer-fill",
        source: "answerFillRun",
        filledCount: fillResult.filledCount
      }
    });

    return {
      ok: true,
      data: {
        sessionId: session.id,
        siteId: session.siteId,
        filledCount: fillResult.filledCount
      }
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown answer fill failure";

    await context.adapterDiagnosticsRepository.writeDiagnostic({
      sessionId: session.id,
      siteId: session.siteId,
      selectorVersion: "answer-fill-v1",
      phase: "answer-fill",
      message: errorMessage.slice(0, 200),
      payload: {
        approvedSelectionCount: approvedSelections.length
      }
    });
    await context.sessionRepository.updateFillState({
      sessionId: session.id,
      status: "answer-fill-failed",
      executionLogEntry: {
        phase: "answer-fill",
        source: "answerFillRun",
        failed: true,
        approvedSelectionCount: approvedSelections.length
      }
    });

    return createErrorResult("ANSWER_FILL_FAILED", errorMessage);
  }
};
