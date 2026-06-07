import { profileSchema, questionSchema } from "../../shared/schemas";
import type { Profile, Question } from "../../shared/types";
import { parseOpenAiAnswerPlanningResponse } from "../parsers/openai-answer-planning-parser";
import { parseOpenAiProfileSummaryResponse } from "../parsers/openai-profile-summary-parser";
import { parseOpenAiQuestionInterpretationResponse } from "../parsers/openai-question-interpretation-parser";
import { buildOpenAiAnswerPlanningPrompt } from "../prompts/openai-answer-planning-prompt";
import { buildOpenAiProfileSummaryPrompt } from "../prompts/openai-profile-summary-prompt";
import { buildOpenAiQuestionInterpretationPrompt } from "../prompts/openai-question-interpretation-prompt";
import type { AssessmentProvider, ProfileSummary } from "./assessment-provider";
import { ProviderExecutionError } from "./provider-error";
import {
  executeProviderJsonRequest,
  resolveProviderFetch,
  type FetchLike
} from "./provider-http-executor";

interface ChatCompletionsMessage {
  readonly content?: string | Array<{ readonly text?: string; readonly type?: string }>;
}

interface ChatCompletionsChoice {
  readonly message?: ChatCompletionsMessage;
}

interface ChatCompletionsSuccess {
  readonly choices?: ChatCompletionsChoice[];
}

interface AnswerPlanningArgs {
  readonly sessionId: string;
  readonly questions: Question[];
  readonly profile: Profile;
}

export interface CompatibleChatAssessmentProviderOptions {
  readonly providerId: string;
  readonly providerLabel: string;
  readonly apiKey?: string;
  readonly apiUrl: string;
  readonly model: string;
  readonly fetchImpl?: FetchLike;
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function splitQuestionsIntoChunks(
  questions: readonly Question[],
  chunkSize: number
): readonly Question[][] {
  const chunks: Question[][] = [];

  for (let index = 0; index < questions.length; index += chunkSize) {
    chunks.push([...questions.slice(index, index + chunkSize)]);
  }

  return chunks;
}

function resolveMessageContent(content: ChatCompletionsMessage["content"]): string {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => item.text ?? "")
      .join("")
      .trim();
  }

  return "";
}

function createRawSnippet(rawText: string): string {
  return rawText.trim().replace(/\s+/g, " ").slice(0, 240);
}

async function createJsonResponse(args: {
  apiKey: string;
  apiUrl: string;
  fetchImpl: FetchLike;
  input: string;
  maxTokens?: number;
  model: string;
  providerId: string;
  providerLabel: string;
}): Promise<string> {
  const data = await executeProviderJsonRequest<ChatCompletionsSuccess>({
    authFailedCode: "COMPATIBLE_CHAT_AUTH_FAILED",
    authFailedMessage: `${args.providerLabel} API key 被拒绝。请检查设置页中的 key 后重试。`,
    fetchImpl: args.fetchImpl,
    providerId: args.providerId,
    requestFailedCode: "COMPATIBLE_CHAT_REQUEST_FAILED",
    requestFailedMessage: (cause) =>
      `${args.providerLabel} provider 在收到响应前请求失败。原因：${cause}`,
    responseInit: {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${args.apiKey}`
      },
      body: JSON.stringify({
        model: args.model,
        messages: [
          {
            role: "user",
            content: `${args.input}\nReturn JSON only.`
          }
        ],
        response_format: {
          type: "json_object"
        },
        ...(typeof args.maxTokens === "number" ? { max_tokens: args.maxTokens } : {})
      })
    },
    responseNotOkCode: "COMPATIBLE_CHAT_RESPONSE_NOT_OK",
    responseNotOkMessage: `${args.providerLabel} provider 返回了非成功状态码。`,
    url: args.apiUrl
  });

  const outputText = resolveMessageContent(data.choices?.[0]?.message?.content);

  if (!outputText) {
    throw new ProviderExecutionError({
      providerId: args.providerId,
      code: "COMPATIBLE_CHAT_OUTPUT_MISSING",
      message: `${args.providerLabel} provider 的响应中缺少可解析文本。`,
      retryable: false
    });
  }

  return outputText;
}

export function createCompatibleChatAssessmentProvider(
  options: CompatibleChatAssessmentProviderOptions
): AssessmentProvider {
  const fetchImpl = resolveProviderFetch({
    fetchImpl: options.fetchImpl,
    providerId: options.providerId,
    unavailableCode: "COMPATIBLE_CHAT_FETCH_UNAVAILABLE",
    unavailableMessage: "Compatible chat provider fetch is unavailable."
  });
  const apiKey = options.apiKey ?? "";

  if (!apiKey) {
    throw new ProviderExecutionError({
      providerId: options.providerId,
      code: "COMPATIBLE_CHAT_API_KEY_MISSING",
      message: `缺少 ${options.providerLabel} API key。请先前往 ATTI 设置页补充配置。`,
      retryable: false
    });
  }

  async function summarizeProfileInternal(profile: Profile) {
    const outputText = await createJsonResponse({
      apiKey,
      apiUrl: options.apiUrl,
      fetchImpl,
      input: buildOpenAiProfileSummaryPrompt(profile),
      model: options.model,
      providerId: options.providerId,
      providerLabel: options.providerLabel
    });

    try {
      return parseOpenAiProfileSummaryResponse(outputText);
    } catch (error) {
      throw new ProviderExecutionError({
        providerId: options.providerId,
        code: "COMPATIBLE_CHAT_PROFILE_SUMMARY_PARSE_FAILED",
        message: `${options.providerLabel} 返回的画像摘要无法解析。`,
        retryable: false,
        details: {
          cause: error instanceof Error ? error.message : "unknown"
        }
      });
    }
  }

  async function interpretQuestionInternal(question: Question, profileSummary: ProfileSummary) {
    const outputText = await createJsonResponse({
      apiKey,
      apiUrl: options.apiUrl,
      fetchImpl,
      input: buildOpenAiQuestionInterpretationPrompt(question, profileSummary),
      model: options.model,
      providerId: options.providerId,
      providerLabel: options.providerLabel
    });

    try {
      return parseOpenAiQuestionInterpretationResponse(outputText);
    } catch (error) {
      throw new ProviderExecutionError({
        providerId: options.providerId,
        code: "COMPATIBLE_CHAT_QUESTION_INTERPRETATION_PARSE_FAILED",
        message: `${options.providerLabel} 返回的问题解释无法解析。`,
        retryable: false,
        details: {
          cause: error instanceof Error ? error.message : "unknown"
        }
      });
    }
  }

  async function planAnswerChunkInternal(args: AnswerPlanningArgs) {
    const maxTokens = clampNumber(args.questions.length * 140, 1200, 8000);

    const outputText = await createJsonResponse({
      apiKey,
      apiUrl: options.apiUrl,
      fetchImpl,
      input: buildOpenAiAnswerPlanningPrompt(args),
      maxTokens,
      model: options.model,
      providerId: options.providerId,
      providerLabel: options.providerLabel
    });

    try {
      return parseOpenAiAnswerPlanningResponse({
        rawText: outputText,
        providerId: options.providerId,
        promptVersion: `${options.providerId}-v1`,
        questions: args.questions,
        sessionId: args.sessionId
      });
    } catch (error) {
      const rawSnippet = createRawSnippet(outputText);

      throw new ProviderExecutionError({
        providerId: options.providerId,
        code: "COMPATIBLE_CHAT_ANSWER_PLANNING_PARSE_FAILED",
        message: `${options.providerLabel} 返回的答题规划无法解析。片段：${rawSnippet}`,
        retryable: false,
        details: {
          cause: error instanceof Error ? error.message : "unknown",
          rawSnippet
        }
      });
    }
  }

  async function planAnswersInternal(args: AnswerPlanningArgs) {
    const questionChunks = splitQuestionsIntoChunks(args.questions, 8);

    if (questionChunks.length === 1) {
      return planAnswerChunkInternal(args);
    }

    const answerPlans = [];

    for (const questionChunk of questionChunks) {
      const chunkResult = await planAnswerChunkInternal({
        sessionId: args.sessionId,
        questions: questionChunk,
        profile: args.profile
      });

      answerPlans.push(...chunkResult.answerPlans);
    }

    return {
      answerPlans
    };
  }

  return {
    providerId: options.providerId,
    async summarizeProfile({ profile }) {
      return summarizeProfileInternal(profileSchema.parse(profile));
    },
    async interpretQuestion({ question, profileSummary }) {
      return interpretQuestionInternal(questionSchema.parse(question), profileSummary);
    },
    async planAnswers({ sessionId, questions, profile }) {
      return planAnswersInternal({
        sessionId,
        questions: questions.map((question) => questionSchema.parse(question)),
        profile: profileSchema.parse(profile)
      });
    }
  };
}
