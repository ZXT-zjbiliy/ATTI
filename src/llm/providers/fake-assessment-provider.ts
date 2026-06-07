import type { AnswerPlan, Profile, Question } from "../../shared/types";
import type {
  AnswerPlanningResult,
  AssessmentProvider,
  ProfileSummary,
  QuestionInterpretation
} from "./assessment-provider";

function buildProfileSummary(profile: Profile): ProfileSummary {
  return {
    narrativeSummary: `Fake summary for profile ${profile.id}`,
    evidence: profile.evidence,
    structuredTraits: {
      profileVersion: profile.version,
      summarySource: "fake-provider"
    }
  };
}

function buildQuestionInterpretation(question: Question): QuestionInterpretation {
  return {
    questionId: question.id,
    interpretation: `Fake interpretation for question ${question.id}`,
    inferredIntent: "placeholder-intent"
  };
}

function buildAnswerPlan(sessionId: string, question: Question): AnswerPlan {
  const firstOption = question.options[0];

  return {
    id: `fake-plan-${question.id}`,
    sessionId,
    questionId: question.id,
    recommendedOptionIds: firstOption ? [firstOption.id] : [],
    selectedOptionIds: firstOption ? [firstOption.id] : [],
    confidence: 0.5,
    rationale: `Placeholder recommendation for ${question.id}`,
    requiresConfirmation: true,
    reviewStatus: "pending",
    providerId: "fake-assessment-provider",
    promptVersion: "fake-v1",
    qualityStatus: "normal",
    qualityIssues: [],
    createdAt: new Date(0).toISOString()
  };
}

export const fakeAssessmentProvider: AssessmentProvider = {
  providerId: "fake-assessment-provider",
  async summarizeProfile({ profile }) {
    return buildProfileSummary(profile);
  },
  async interpretQuestion({ question }) {
    return buildQuestionInterpretation(question);
  },
  async planAnswers({ sessionId, questions }) {
    return {
      answerPlans: questions.map((question) => buildAnswerPlan(sessionId, question))
    } satisfies AnswerPlanningResult;
  }
};
