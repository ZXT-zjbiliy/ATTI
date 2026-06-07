import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it, vi } from "vitest";

import { parseOpenAiAnswerPlanningResponse } from "../../src/llm/parsers/openai-answer-planning-parser";
import { buildOpenAiAnswerPlanningPrompt } from "../../src/llm/prompts/openai-answer-planning-prompt";
import { createAssessmentProviderRunner } from "../../src/llm/providers/assessment-provider-runner";
import { fakeAssessmentProvider } from "../../src/llm/providers/fake-assessment-provider";
import { createOpenAiAssessmentProvider } from "../../src/llm/providers/openai-assessment-provider";
import { ProviderExecutionError } from "../../src/llm/providers/provider-error";
import type {
  AssessmentProvider,
  ProfileSummary
} from "../../src/llm/providers/assessment-provider";
import type { Profile, Question } from "../../src/shared/types";

const sampleProfile: Profile = {
  id: "profile-1",
  version: 1,
  rawInput: {},
  structuredTraits: {},
  narrativeSummary: "Initial narrative",
  evidence: ["evidence-1"],
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z"
};

const sampleQuestion: Question = {
  id: "question-1",
  sessionId: "session-1",
  siteId: "placeholder-assessment",
  pageUrl: "https://placeholder.assessment.local/assessment-shell/demo",
  section: "intro",
  text: "How do you approach teamwork?",
  type: "single-choice",
  options: [
    { id: "option-1", text: "Collaborative" },
    { id: "option-2", text: "Independent" }
  ],
  order: 1,
  createdAt: "2025-01-01T00:00:00.000Z"
};

describe("provider contract", () => {
  it("fake provider satisfies the assessment provider contract", async () => {
    const provider: AssessmentProvider = fakeAssessmentProvider;

    const profileSummary = await provider.summarizeProfile({
      profile: sampleProfile
    });
    const interpretation = await provider.interpretQuestion({
      question: sampleQuestion,
      profileSummary
    });
    const planningResult = await provider.planAnswers({
      sessionId: "session-1",
      questions: [sampleQuestion],
      profile: sampleProfile
    });

    expect(provider.providerId).toBe("fake-assessment-provider");
    expect(profileSummary.narrativeSummary).toContain("Fake summary");
    expect(interpretation.questionId).toBe("question-1");
    expect(planningResult.answerPlans).toHaveLength(1);
    expect(planningResult.answerPlans[0]?.providerId).toBe("fake-assessment-provider");
  });

  it("provider consumers depend on the interface instead of the fake implementation", async () => {
    const provider: AssessmentProvider = fakeAssessmentProvider;
    const runner = createAssessmentProviderRunner(provider);
    const profileSummary: ProfileSummary = await runner.summarizeProfile(sampleProfile);
    const planningResult = await runner.planAnswers("session-1", [sampleQuestion], sampleProfile);

    expect(profileSummary.structuredTraits).toEqual({
      profileVersion: 1,
      summarySource: "fake-provider"
    });
    expect(planningResult.answerPlans[0]?.questionId).toBe("question-1");
  });

  it("real OpenAI provider satisfies the assessment provider contract through the shared interface", async () => {
    const fetchImpl = vi
      .fn<(...args: unknown[]) => Promise<Response>>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            output_text: JSON.stringify({
              narrativeSummary: "Structured summary",
              evidence: ["evidence-1"],
              structuredTraits: {
                style: "reflective"
              }
            })
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            output_text: JSON.stringify({
              questionId: "question-1",
              interpretation: "Measures social collaboration preference",
              inferredIntent: "teamwork-style"
            })
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            output_text: JSON.stringify({
              answerPlans: [
                {
                  questionId: "question-1",
                  recommendedOptionIds: ["option-1"],
                  confidence: 0.81,
                  rationale: "The profile evidence points to collaborative behavior.",
                  requiresConfirmation: true
                }
              ]
            })
          }),
          { status: 200 }
        )
      );

    const provider: AssessmentProvider = createOpenAiAssessmentProvider({
      apiKey: "test-key",
      fetchImpl
    });
    const runner = createAssessmentProviderRunner(provider);
    const profileSummary = await runner.summarizeProfile(sampleProfile);
    const interpretation = await runner.interpretQuestion(sampleQuestion, profileSummary);
    const planningResult = await runner.planAnswers("session-1", [sampleQuestion], sampleProfile);

    expect(provider.providerId).toBe("openai-assessment-provider");
    expect(profileSummary.narrativeSummary).toBe("Structured summary");
    expect(interpretation.inferredIntent).toBe("teamwork-style");
    expect(planningResult.answerPlans[0]).toMatchObject({
      sessionId: "session-1",
      questionId: "question-1",
      providerId: "openai-assessment-provider",
      promptVersion: "openai-v1",
      recommendedOptionIds: ["option-1"],
      selectedOptionIds: ["option-1"],
      reviewStatus: "pending"
    });
  });

  it("wraps provider failures in a structured provider error instead of crashing", async () => {
    const provider = createOpenAiAssessmentProvider({
      apiKey: "test-key",
      fetchImpl: vi.fn(async () => new Response(JSON.stringify({ error: "boom" }), { status: 500 }))
    });

    await expect(
      provider.planAnswers({
        sessionId: "session-1",
        questions: [sampleQuestion],
        profile: sampleProfile
      })
    ).rejects.toMatchObject({
      name: "ProviderExecutionError",
      providerId: "openai-assessment-provider",
      code: "OPENAI_RESPONSE_NOT_OK",
      statusCode: 500,
      retryable: true
    } satisfies Partial<ProviderExecutionError>);
  });

  it("returns an actionable error when the OpenAI key is missing", async () => {
    const provider = createOpenAiAssessmentProvider({
      fetchImpl: vi.fn(async () => new Response(JSON.stringify({}), { status: 200 }))
    });

    await expect(
      provider.planAnswers({
        sessionId: "session-1",
        questions: [sampleQuestion],
        profile: sampleProfile
      })
    ).rejects.toMatchObject({
      name: "ProviderExecutionError",
      providerId: "openai-assessment-provider",
      code: "OPENAI_API_KEY_MISSING",
      message: "缺少 OpenAI API key。请先前往 ATTI 设置页保存 API key，再开始 AI 规划。",
      retryable: false
    } satisfies Partial<ProviderExecutionError>);
  });

  it("returns an actionable error when the saved OpenAI key is rejected", async () => {
    const provider = createOpenAiAssessmentProvider({
      apiKey: "test-key",
      fetchImpl: vi.fn(
        async () => new Response(JSON.stringify({ error: "invalid key" }), { status: 401 })
      )
    });

    await expect(
      provider.planAnswers({
        sessionId: "session-1",
        questions: [sampleQuestion],
        profile: sampleProfile
      })
    ).rejects.toMatchObject({
      name: "ProviderExecutionError",
      providerId: "openai-assessment-provider",
      code: "OPENAI_AUTH_FAILED",
      message: "已保存的 OpenAI API key 被拒绝。请检查设置页中的 key 后重试。",
      statusCode: 401,
      retryable: false
    } satisfies Partial<ProviderExecutionError>);
  });
});

describe("provider boundaries", () => {
  it("keeps UI runtimes free of direct provider imports", () => {
    const uiFiles = [
      "src/app/popup/App.tsx",
      "src/app/popup/hooks/use-popup-shell.ts",
      "src/app/sidepanel/App.tsx",
      "src/app/options/App.tsx",
      "src/app/options/hooks/use-options-shell.ts"
    ];

    for (const uiFile of uiFiles) {
      const content = readFileSync(resolve(process.cwd(), uiFile), "utf8");

      expect(content).not.toContain("/llm/");
      expect(content).not.toContain("fakeAssessmentProvider");
      expect(content).not.toContain("AssessmentProvider");
    }
  });

  it("keeps fake provider free of UI and orchestration concerns", () => {
    const providerContent = readFileSync(
      resolve(process.cwd(), "src/llm/providers/fake-assessment-provider.ts"),
      "utf8"
    );
    const runnerContent = readFileSync(
      resolve(process.cwd(), "src/llm/providers/assessment-provider-runner.ts"),
      "utf8"
    );

    expect(providerContent).not.toContain("/app/");
    expect(providerContent).not.toContain("/background/");
    expect(providerContent).not.toContain("chrome.");
    expect(runnerContent).not.toContain("fakeAssessmentProvider");
  });

  it("keeps prompts and parsers inside llm boundaries only", () => {
    const promptFiles = [
      "src/llm/prompts/openai-profile-summary-prompt.ts",
      "src/llm/prompts/openai-question-interpretation-prompt.ts",
      "src/llm/prompts/openai-answer-planning-prompt.ts"
    ];
    const parserFiles = [
      "src/llm/parsers/openai-profile-summary-parser.ts",
      "src/llm/parsers/openai-question-interpretation-parser.ts",
      "src/llm/parsers/openai-answer-planning-parser.ts"
    ];

    for (const filePath of [...promptFiles, ...parserFiles]) {
      const content = readFileSync(resolve(process.cwd(), filePath), "utf8");

      expect(content).not.toContain("/app/");
      expect(content).not.toContain("/background/");
      expect(content).not.toContain("/adapters/");
    }
  });

  it("keeps answer-planning prompts scoped to normalized questions instead of site DOM context", () => {
    const prompt = buildOpenAiAnswerPlanningPrompt({
      sessionId: "session-1",
      profile: sampleProfile,
      questions: [sampleQuestion]
    });

    expect(prompt).toContain("How do you approach teamwork?");
    expect(prompt).toContain("Collaborative");
    expect(prompt).not.toContain(sampleQuestion.siteId);
    expect(prompt).not.toContain(sampleQuestion.pageUrl);
    expect(prompt).not.toContain("selector");
    expect(prompt).not.toContain("querySelector");
    expect(prompt).not.toContain("document.");
  });

  it("keeps answer-planning parsing focused on normalized recommendation output only", () => {
    const result = parseOpenAiAnswerPlanningResponse({
      rawText: JSON.stringify({
        answerPlans: [
          {
            questionId: "question-1",
            recommendedOptionIds: ["option-1"],
            confidence: 0.74,
            rationale: "  Prefers collaborative work based on profile evidence.  ",
            requiresConfirmation: false
          }
        ]
      }),
      providerId: "openai-assessment-provider",
      promptVersion: "openai-v1",
      questions: [sampleQuestion],
      sessionId: "session-1"
    });
    const parserContent = readFileSync(
      resolve(process.cwd(), "src/llm/parsers/openai-answer-planning-parser.ts"),
      "utf8"
    );

    expect(result.answerPlans[0]).toMatchObject({
      questionId: "question-1",
      recommendedOptionIds: ["option-1"],
      rationale: "Prefers collaborative work based on profile evidence."
    });
    expect(parserContent).not.toContain("truity");
    expect(parserContent).not.toContain("sixteen-personalities");
    expect(parserContent).not.toContain("querySelector");
    expect(parserContent).not.toContain("document.");
    expect(parserContent).not.toContain("siteId");
    expect(parserContent).not.toContain("pageUrl");
  });
});
