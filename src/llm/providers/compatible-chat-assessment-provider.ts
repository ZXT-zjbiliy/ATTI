import { profileSchema, questionSchema } from "../../shared/schemas";
import type { Profile, Question } from "../../shared/types";
import {
  getOpenAiAnswerPlanningJsonSchema,
  parseOpenAiAnswerPlanningResponse
} from "../parsers/openai-answer-planning-parser";
import {
  parseOpenAiProfileSummaryResponse
} from "../parsers/openai-profile-summary-parser";
import {
  parseOpenAiQuestionInterpretationResponse
} from "../parsers/openai-question-interpretation-parser";
import { buildOpenAiAnswerPlanningPrompt } from "../prompts/openai-answer-planning-prompt";
import { buildOpenAiProfileSummaryPrompt } from "../prompts/openai-profile-summary-prompt";
import { buildOpenAiQuestionInterpretationPrompt } from "../prompts/openai-question-interpretation-prompt";
import type {
  AssessmentProvider,
  ProfileSummary
} from "./assessment-provider";
import { ProviderExecutionError } from "./provider-error";

type FetchLike = typeof fetch;

interface ChatCompletionsMessage {
  readonly content?: string | Array<{ readonly text?: string; readonly type?: string }>;
}

interface ChatCompletionsChoice {
  readonly message?: ChatCompletionsMessage;
}

interface ChatCompletionsSuccess {
  readonly choices?: ChatCompletionsChoice[];
}

export interface CompatibleChatAssessmentProviderOptions {
  readonly providerId: string;
  readonly providerLabel: string;
  readonly apiKey?: string;
  readonly apiUrl: string;
  readonly model: string;
  readonly fetchImpl?: FetchLike;
}

function resolveFetch(fetchImpl?: FetchLike): FetchLike {
  if (fetchImpl) {
    return fetchImpl;
  }

  if (typeof fetch === "function") {
    return fetch.bind(globalThis);
  }

  throw new Error("Compatible chat provider fetch is unavailable.");
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

async function readErrorBody(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

async function createJsonResponse(args: {
  apiKey: string;
  apiUrl: string;
  fetchImpl: FetchLike;
  input: string;
  model: string;
  providerId: string;
  providerLabel: string;
}): Promise<string> {
  let response: Response;
  let requestFailureCause = "unknown";

  try {
    response = await args.fetchImpl(args.apiUrl, {
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
        }
      })
    });
  } catch (error) {
    requestFailureCause = error instanceof Error ? error.message : "unknown";

    throw new ProviderExecutionError({
      providerId: args.providerId,
      code: "COMPATIBLE_CHAT_REQUEST_FAILED",
      message: `${args.providerLabel} provider 在收到响应前请求失败。原因：${requestFailureCause}`,
      retryable: true,
      details: {
        cause: requestFailureCause
      }
    });
  }

  if (!response.ok) {
    const isAuthFailure = response.status === 401 || response.status === 403;

    throw new ProviderExecutionError({
      providerId: args.providerId,
      code: isAuthFailure ? "COMPATIBLE_CHAT_AUTH_FAILED" : "COMPATIBLE_CHAT_RESPONSE_NOT_OK",
      message: isAuthFailure
        ? `${args.providerLabel} API key 被拒绝。请检查设置页中的 key 后重试。`
        : `${args.providerLabel} provider 返回了非成功状态码。`,
      statusCode: response.status,
      retryable: response.status >= 500,
      details: {
        body: await readErrorBody(response)
      }
    });
  }

  const data = (await response.json()) as ChatCompletionsSuccess;
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
  const fetchImpl = resolveFetch(options.fetchImpl);
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

  async function planAnswersInternal(args: {
    sessionId: string;
    questions: Question[];
    profile: Profile;
  }) {
    const outputText = await createJsonResponse({
      apiKey,
      apiUrl: options.apiUrl,
      fetchImpl,
      input: buildOpenAiAnswerPlanningPrompt(args),
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
