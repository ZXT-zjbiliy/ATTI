import { describe, expect, it, vi } from "vitest";

import { createCompatibleChatAssessmentProvider } from "../../src/llm/providers/compatible-chat-assessment-provider";
import { ProviderExecutionError } from "../../src/llm/providers/provider-error";
import type { Profile, Question } from "../../src/shared/types";

const sampleProfile: Profile = {
  id: "profile-1",
  version: 1,
  rawInput: {},
  structuredTraits: {},
  narrativeSummary: "Reflective and cooperative",
  evidence: ["prefers structure"],
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z"
};

const sampleQuestion: Question = {
  id: "question-1",
  sessionId: "session-1",
  siteId: "sixteen-personalities",
  pageUrl: "https://www.16personalities.com/free-personality-test",
  section: "intro",
  text: "You regularly make new friends.",
  type: "single-choice-rating",
  options: [
    { id: "1", text: "Strongly Agree", value: "1" },
    { id: "2", text: "Agree", value: "2" }
  ],
  order: 1,
  createdAt: "2025-01-01T00:00:00.000Z"
};

function createSampleQuestion(index: number): Question {
  return {
    ...sampleQuestion,
    id: `question-${index}`,
    text: `Question ${index}`,
    order: index
  };
}

describe("compatible chat assessment provider", () => {
  it("plans answers through an OpenAI-compatible chat completions response", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  answerPlans: [
                    {
                      questionId: "question-1",
                      recommendedOptionIds: ["2"],
                      confidence: 0.82,
                      rationale: "Profile evidence suggests cooperative but moderate social behavior.",
                      requiresConfirmation: false
                    }
                  ]
                })
              }
            }
          ]
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        }
      )
    );
    const provider = createCompatibleChatAssessmentProvider({
      providerId: "deepseek-assessment-provider",
      providerLabel: "DeepSeek",
      apiKey: "sk-test",
      apiUrl: "https://api.deepseek.com/chat/completions",
      model: "deepseek-chat",
      fetchImpl
    });

    const result = await provider.planAnswers({
      sessionId: "session-1",
      questions: [sampleQuestion],
      profile: sampleProfile
    });

    expect(result.answerPlans[0]).toMatchObject({
      providerId: "deepseek-assessment-provider",
      questionId: "question-1",
      recommendedOptionIds: ["2"]
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.deepseek.com/chat/completions",
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: "application/json",
          Authorization: "Bearer sk-test",
          "Content-Type": "application/json"
        }),
        body: expect.stringContaining('"max_tokens":1200')
      })
    );
  });

  it("surfaces the underlying fetch failure cause in the provider error message", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    const provider = createCompatibleChatAssessmentProvider({
      providerId: "compatible-assessment-provider",
      providerLabel: "兼容端点",
      apiKey: "sk-test",
      apiUrl: "https://api.vectorengine.cn/v1/chat/completions",
      model: "gpt-4o",
      fetchImpl
    });

    await expect(
      provider.planAnswers({
        sessionId: "session-1",
        questions: [sampleQuestion],
        profile: sampleProfile
      })
    ).rejects.toMatchObject<Partial<ProviderExecutionError>>({
      code: "COMPATIBLE_CHAT_REQUEST_FAILED",
      message: "兼容端点 provider 在收到响应前请求失败。原因：Failed to fetch"
    });
  });

  it("binds the global fetch implementation before invoking it", async () => {
    const originalFetch = globalThis.fetch;
    const boundFetchSpy = vi.fn(async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  answerPlans: [
                    {
                      questionId: "question-1",
                      recommendedOptionIds: ["2"],
                      confidence: 0.82,
                      rationale: "Bound fetch works.",
                      requiresConfirmation: false
                    }
                  ]
                })
              }
            }
          ]
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        }
      )
    );

    globalThis.fetch = function fetchWithContext(
      this: typeof globalThis,
      ...args: Parameters<typeof fetch>
    ) {
      if (this !== globalThis) {
        throw new TypeError("Illegal invocation");
      }

      return boundFetchSpy(...args);
    } as typeof fetch;

    try {
      const provider = createCompatibleChatAssessmentProvider({
        providerId: "compatible-assessment-provider",
        providerLabel: "兼容端点",
        apiKey: "sk-test",
        apiUrl: "https://api.vectorengine.cn/v1/chat/completions",
        model: "gpt-4o"
      });

      const result = await provider.planAnswers({
        sessionId: "session-1",
        questions: [sampleQuestion],
        profile: sampleProfile
      });

      expect(result.answerPlans[0]?.questionId).toBe("question-1");
      expect(boundFetchSpy).toHaveBeenCalledTimes(1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("includes a raw response snippet when answer planning parsing fails", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: "Here is the result: {\"notAnswerPlans\":true}"
              }
            }
          ]
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        }
      )
    );
    const provider = createCompatibleChatAssessmentProvider({
      providerId: "compatible-assessment-provider",
      providerLabel: "兼容端点",
      apiKey: "sk-test",
      apiUrl: "https://api.vectorengine.cn/v1/chat/completions",
      model: "gpt-4o",
      fetchImpl
    });

    await expect(
      provider.planAnswers({
        sessionId: "session-1",
        questions: [sampleQuestion],
        profile: sampleProfile
      })
    ).rejects.toMatchObject<Partial<ProviderExecutionError>>({
      code: "COMPATIBLE_CHAT_ANSWER_PLANNING_PARSE_FAILED",
      message: expect.stringContaining("片段：Here is the result")
    });
  });
  it("plans large question sets in multiple compatible-endpoint batches", async () => {
    const fetchImpl = vi.fn(async (_url, init) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as {
        messages?: Array<{ content?: string }>;
      };
      const promptText = body.messages?.[0]?.content ?? "";
      const questionIds = Array.from(
        promptText.matchAll(/"id":"(question-\d+)"/g),
        (match) => match[1]
      );

      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  answerPlans: questionIds.map((questionId) => ({
                    questionId,
                    recommendedOptionIds: ["2"],
                    confidence: 0.8,
                    rationale: `Planned for ${questionId}.`,
                    requiresConfirmation: false
                  }))
                })
              }
            }
          ]
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    });

    const provider = createCompatibleChatAssessmentProvider({
      providerId: "compatible-assessment-provider",
      providerLabel: "鍏煎绔偣",
      apiKey: "sk-test",
      apiUrl: "https://api.vectorengine.cn/v1/chat/completions",
      model: "gpt-4o",
      fetchImpl
    });

    const result = await provider.planAnswers({
      sessionId: "session-1",
      questions: Array.from({ length: 9 }, (_, index) => createSampleQuestion(index + 1)),
      profile: sampleProfile
    });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(result.answerPlans).toHaveLength(9);
    expect(result.answerPlans.map((plan) => plan.questionId)).toEqual(
      Array.from({ length: 9 }, (_, index) => `question-${index + 1}`)
    );
  });
});
