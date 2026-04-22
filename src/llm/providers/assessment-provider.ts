import type { AnswerPlan, Profile, Question } from "../../shared/types";

export interface ProfileSummary {
  readonly narrativeSummary: string;
  readonly evidence: string[];
  readonly structuredTraits: Record<string, unknown>;
}

export interface QuestionInterpretation {
  readonly questionId: string;
  readonly interpretation: string;
  readonly inferredIntent: string;
}

export interface AnswerPlanningResult {
  readonly answerPlans: AnswerPlan[];
}

export interface AssessmentProvider {
  readonly providerId: string;
  summarizeProfile: (input: { profile: Profile }) => Promise<ProfileSummary>;
  interpretQuestion: (input: {
    question: Question;
    profileSummary: ProfileSummary;
  }) => Promise<QuestionInterpretation>;
  planAnswers: (input: {
    sessionId: string;
    questions: Question[];
    profile: Profile;
  }) => Promise<AnswerPlanningResult>;
}
