import { z } from "zod";

import { questionOptionSchema, questionSchema } from "../../shared/schemas";
import type { Question } from "../../shared/types";
import { attiDb, type AttiDatabase } from "../db";

const questionDraftSchema = z.object({
  sessionId: z.string().min(1),
  siteId: z.string().min(1),
  pageUrl: z.string().min(1),
  section: z.string().min(1).optional(),
  text: z.string().min(1),
  type: z.string().min(1),
  options: z.array(questionOptionSchema),
  order: z.number().int()
});

type QuestionDraft = z.infer<typeof questionDraftSchema>;

function cloneQuestion(question: Question): Question {
  return {
    ...question,
    options: question.options.map((option) => ({ ...option }))
  };
}

function createQuestionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `question-${Date.now()}`;
}

function buildQuestionFromDraft(draft: QuestionDraft): Question {
  return {
    id: createQuestionId(),
    sessionId: draft.sessionId,
    siteId: draft.siteId,
    pageUrl: draft.pageUrl,
    section: draft.section,
    text: draft.text,
    type: draft.type,
    options: draft.options.map((option) => ({ ...option })),
    order: draft.order,
    createdAt: new Date().toISOString()
  };
}

export class QuestionRepository {
  constructor(private readonly database: Pick<AttiDatabase, "questions"> = attiDb) {}

  async createQuestion(draft: QuestionDraft): Promise<Question> {
    const validatedDraft = questionDraftSchema.parse(draft);
    const question = questionSchema.parse(buildQuestionFromDraft(validatedDraft));

    await this.database.questions.put(question);

    return cloneQuestion(question);
  }

  async getQuestionById(questionId: string): Promise<Question | null> {
    const validatedQuestionId = z.string().min(1).parse(questionId);
    const question = await this.database.questions.get(validatedQuestionId);

    if (!question) {
      return null;
    }

    return cloneQuestion(questionSchema.parse(question));
  }

  async listBySessionId(sessionId: string): Promise<Question[]> {
    const validatedSessionId = z.string().min(1).parse(sessionId);
    const questions = await this.database.questions
      .where("sessionId")
      .equals(validatedSessionId)
      .sortBy("order");

    return questions.map((question) => cloneQuestion(questionSchema.parse(question)));
  }
}
