import type {
  AnswerPlanningResult,
  AssessmentProvider,
  ProfileSummary,
  QuestionInterpretation,
} from "./assessment-provider";
import type { Profile, Question } from "../../shared/types";

export interface AssessmentProviderRunner {
  summarizeProfile: (profile: Profile) => Promise<ProfileSummary>;
  interpretQuestion: (
    question: Question,
    profileSummary: ProfileSummary,
  ) => Promise<QuestionInterpretation>;
  planAnswers: (
    sessionId: string,
    questions: Question[],
    profile: Profile,
  ) => Promise<AnswerPlanningResult>;
}

export function createAssessmentProviderRunner(
  provider: AssessmentProvider,
): AssessmentProviderRunner {
  return {
    summarizeProfile(profile) {
      return provider.summarizeProfile({ profile });
    },
    interpretQuestion(question, profileSummary) {
      return provider.interpretQuestion({ question, profileSummary });
    },
    planAnswers(sessionId, questions, profile) {
      return provider.planAnswers({ sessionId, questions, profile });
    },
  };
}
