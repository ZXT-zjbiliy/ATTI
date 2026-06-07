import { ProviderExecutionError, createAssessmentProviderRunner } from "../../llm/providers";
import type { AppResult, AnswerPlanningRunMessage } from "../../shared/types";
import type { BackgroundMessageHandler } from "./types";
import { applyAnswerPlanQualityBaseline } from "./answer-plan-quality";
import { validateAnswerPlanningResult } from "./answer-plan-validation";

function getPlanningFailureBoundary(error: ProviderExecutionError): string {
  const explicitBoundary = error.details?.failureBoundary;

  if (typeof explicitBoundary === "string" && explicitBoundary.length > 0) {
    return explicitBoundary;
  }

  if (error.code.includes("_PARSE_")) {
    return "provider-parser";
  }

  if (error.code === "ANSWER_PLAN_PERSIST_FAILED") {
    return "persistence";
  }

  if (error.providerId === "provider-runner") {
    return "router";
  }

  return "provider";
}

function getPlanningFailureStage(error: ProviderExecutionError): string {
  const explicitStage = error.details?.failureStage;

  if (typeof explicitStage === "string" && explicitStage.length > 0) {
    return explicitStage;
  }

  if (error.code.includes("_PARSE_")) {
    return "response-parse";
  }

  if (error.code === "ANSWER_PLAN_PERSIST_FAILED") {
    return "answer-plan-persistence";
  }

  if (error.providerId === "provider-runner") {
    return "planning-orchestration";
  }

  return "provider-execution";
}

export const handleAnswerPlanningRunMessage: BackgroundMessageHandler<
  AnswerPlanningRunMessage
> = async (message, context): Promise<AppResult> => {
  let session = await context.sessionRepository.getSessionById(message.payload.sessionId);

  if (!session) {
    return {
      ok: false,
      error: {
        code: "SESSION_NOT_FOUND",
        message: `Session not found: ${message.payload.sessionId}`
      }
    };
  }

  const settings = await context.settingsRepository.getSettings();
  let profile = await context.profileRepository.getProfileById(session.profileId);

  if (!profile && settings.lastActiveProfileId) {
    profile = await context.profileRepository.getProfileById(settings.lastActiveProfileId);

    if (profile && session.profileId !== profile.id) {
      session = await context.sessionRepository.assignProfileId({
        sessionId: session.id,
        profileId: profile.id
      });
    }
  }

  if (!profile) {
    return {
      ok: false,
      error: {
        code: "PROFILE_NOT_FOUND",
        message: `Profile not found: ${session.profileId}`
      }
    };
  }

  const questions = await context.questionRepository.listBySessionId(session.id);

  if (questions.length === 0) {
    return {
      ok: false,
      error: {
        code: "QUESTIONS_NOT_FOUND",
        message: `No extracted questions found for session: ${session.id}`
      }
    };
  }

  try {
    const provider = context.assessmentProviderResolver.resolve({
      activeProvider: settings.activeProvider,
      openAiApiKey: settings.openAiApiKey,
      providerApiKey: settings.providerApiKey,
      providerBaseUrl: settings.providerBaseUrl,
      providerModel: settings.providerModel
    });
    const runner = createAssessmentProviderRunner(provider);
    const planningResult = await runner.planAnswers(session.id, questions, profile);
    const structurallyValidatedAnswerPlans = validateAnswerPlanningResult({
      answerPlans: planningResult.answerPlans,
      providerId: provider.providerId,
      questions,
      sessionId: session.id
    });
    const qualityEvaluatedAnswerPlans = applyAnswerPlanQualityBaseline(
      structurallyValidatedAnswerPlans
    );
    const degradedAnswerPlans = qualityEvaluatedAnswerPlans.filter(
      (answerPlan) => answerPlan.qualityStatus === "degraded"
    );

    for (const degradedAnswerPlan of degradedAnswerPlans) {
      await context.adapterDiagnosticsRepository.writeDiagnostic({
        sessionId: session.id,
        siteId: session.siteId,
        selectorVersion: "provider-planning-v1",
        phase: "answer-planning",
        message:
          `Recommendation quality degraded for question: ${degradedAnswerPlan.questionId}`.slice(
            0,
            200
          ),
        payload: {
          providerId: provider.providerId,
          errorCode: "ANSWER_PLAN_QUALITY_DEGRADED",
          failureBoundary: "router-quality",
          failureStage: "answer-plan-quality-evaluation",
          failureCategory: "quality",
          retryable: false,
          statusCode: null,
          qualityIssues: degradedAnswerPlan.qualityIssues
        }
      });
    }
    await context.answerPlanRepository.deleteBySessionId(session.id);
    let persistedAnswerPlans;

    try {
      persistedAnswerPlans = await Promise.all(
        qualityEvaluatedAnswerPlans.map((answerPlan) =>
          context.answerPlanRepository.createAnswerPlan({
            sessionId: answerPlan.sessionId,
            questionId: answerPlan.questionId,
            recommendedOptionIds: [...answerPlan.recommendedOptionIds],
            confidence: answerPlan.confidence,
            rationale: answerPlan.rationale,
            requiresConfirmation: answerPlan.requiresConfirmation,
            providerId: answerPlan.providerId,
            promptVersion: answerPlan.promptVersion,
            qualityStatus: answerPlan.qualityStatus,
            qualityIssues: [...answerPlan.qualityIssues]
          })
        )
      );
    } catch (error) {
      throw new ProviderExecutionError({
        providerId: provider.providerId,
        code: "ANSWER_PLAN_PERSIST_FAILED",
        message: "Validated answer plans could not be persisted.",
        retryable: false,
        details: {
          failureBoundary: "persistence",
          failureStage: "answer-plan-persistence",
          cause: error instanceof Error ? error.message : "unknown"
        }
      });
    }

    const updatedSession = await context.sessionRepository.updatePlanningState({
      sessionId: session.id,
      status: "answer-planning-complete",
      answerPlanIds: persistedAnswerPlans.map((answerPlan) => answerPlan.id),
      executionLogEntry: {
        phase: "answer-planning",
        source: "answerPlanningRun",
        providerId: provider.providerId,
        answerPlanCount: persistedAnswerPlans.length
      }
    });

    return {
      ok: true,
      data: {
        sessionId: updatedSession.id,
        answerPlanCount: persistedAnswerPlans.length,
        providerId: provider.providerId
      }
    };
  } catch (error) {
    const providerError =
      error instanceof ProviderExecutionError
        ? error
        : new ProviderExecutionError({
            providerId: "provider-runner",
            code: "PROVIDER_PLANNING_FAILED",
            message: error instanceof Error ? error.message : "Unknown provider planning error",
            retryable: false
          });

    await context.adapterDiagnosticsRepository.writeDiagnostic({
      sessionId: session.id,
      siteId: session.siteId,
      selectorVersion: "provider-planning-v1",
      phase: "answer-planning",
      message: providerError.message.slice(0, 200),
      payload: {
        providerId: providerError.providerId,
        errorCode: providerError.code,
        failureBoundary: getPlanningFailureBoundary(providerError),
        failureStage: getPlanningFailureStage(providerError),
        failureCategory: "structural",
        retryable: providerError.retryable,
        statusCode: providerError.statusCode ?? null,
        cause:
          typeof providerError.details?.cause === "string"
            ? providerError.details.cause.slice(0, 200)
            : null
      }
    });
    await context.sessionRepository.updatePlanningState({
      sessionId: session.id,
      status: "answer-planning-failed",
      answerPlanIds: [],
      executionLogEntry: {
        phase: "answer-planning",
        source: "answerPlanningRun",
        providerId: providerError.providerId,
        errorCode: providerError.code,
        failed: true
      }
    });

    return {
      ok: false,
      error: {
        code: providerError.code,
        message: providerError.message
      }
    };
  }
};
