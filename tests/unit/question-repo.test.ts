import "fake-indexeddb/auto";

import { describe, expect, it } from "vitest";

import { createAttiDatabase } from "../../src/storage/db";
import { QuestionRepository } from "../../src/storage/repos/question-repo";

describe("question repository", () => {
  it("creates and reads a normalized question record", async () => {
    const database = createAttiDatabase("question-repo-create-read");
    const repository = new QuestionRepository(database);

    const createdQuestion = await repository.createQuestion({
      sessionId: "session-1",
      siteId: "truity-enneagram",
      pageUrl: "https://www.truity.com/test/enneagram-personality-test",
      section: "step-1",
      text: "I strive for perfection",
      type: "single-choice-rating",
      options: [
        { id: "1", text: "Inaccurate", value: "1" },
        { id: "5", text: "Accurate", value: "5" }
      ],
      order: 0
    });
    const loadedQuestion = await repository.getQuestionById(createdQuestion.id);

    expect(loadedQuestion).toEqual(createdQuestion);
    expect(createdQuestion.options).toEqual([
      { id: "1", text: "Inaccurate", value: "1" },
      { id: "5", text: "Accurate", value: "5" }
    ]);

    database.close();
  });

  it("lists questions by session in ascending order", async () => {
    const database = createAttiDatabase("question-repo-list-by-session");
    const repository = new QuestionRepository(database);

    await repository.createQuestion({
      sessionId: "session-1",
      siteId: "truity-enneagram",
      pageUrl: "https://www.truity.com/test/enneagram-personality-test",
      text: "Second question",
      type: "single-choice-rating",
      options: [{ id: "3", text: "Neutral", value: "3" }],
      order: 1
    });
    const firstQuestion = await repository.createQuestion({
      sessionId: "session-1",
      siteId: "truity-enneagram",
      pageUrl: "https://www.truity.com/test/enneagram-personality-test",
      text: "First question",
      type: "single-choice-rating",
      options: [{ id: "3", text: "Neutral", value: "3" }],
      order: 0
    });

    const questions = await repository.listBySessionId("session-1");

    expect(questions).toHaveLength(2);
    expect(questions[0]?.id).toBe(firstQuestion.id);
    expect(questions.map((question) => question.order)).toEqual([0, 1]);

    database.close();
  });

  it("rejects invalid question drafts before persistence", async () => {
    const database = createAttiDatabase("question-repo-invalid");
    const repository = new QuestionRepository(database);

    await expect(
      repository.createQuestion({
        sessionId: "",
        siteId: "truity-enneagram",
        pageUrl: "https://www.truity.com/test/enneagram-personality-test",
        text: "",
        type: "single-choice-rating",
        options: [],
        order: 0
      })
    ).rejects.toThrow();
    await expect(database.questions.count()).resolves.toBe(0);

    database.close();
  });
});
