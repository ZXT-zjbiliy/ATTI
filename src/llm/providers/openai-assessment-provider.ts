import { profileSchema, questionSchema } from "../../shared/schemas";
import type { Profile, Question } from "../../shared/types";
import { buildOpenAiAnswerPlanningPrompt } from "../prompts/openai-answer-planning-prompt";
import { buildOpenAiProfileSummaryPrompt } from "../prompts/openai-profile-summary-prompt";
import { buildOpenAiQuestionInterpretationPrompt } from "../prompts/openai-question-interpretation-prompt";
import {
  getOpenAiAnswerPlanningJsonSchema,
  parseOpenAiAnswerPlanningResponse
} from "../parsers/openai-answer-planning-parser";
import {
  getOpenAiProfileSummaryJsonSchema,
  parseOpenAiProfileSummaryResponse
} from "../parsers/openai-profile-summary-parser";
import {
  getOpenAiQuestionInterpretationJsonSchema,
  parseOpenAiQuestionInterpretationResponse
} from "../parsers/openai-question-interpretation-parser";
import type { AssessmentProvider, ProfileSummary } from "./assessment-provider";
import { ProviderExecutionError } from "./provider-error";
import {
  executeProviderJsonRequest,
  resolveProviderFetch,
  type FetchLike
} from "./provider-http-executor";

const OPENAI_PROVIDER_ID = "openai-assessment-provider";
const OPENAI_DEFAULT_MODEL = "gpt-5.2";
const OPENAI_DEFAULT_API_URL = "https://api.openai.com/v1/responses";
const OPENAI_PROMPT_VERSION = "openai-v1";

interface OpenAiResponsesSuccess {
  readonly output_text?: string;
}

export interface OpenAiAssessmentProviderOptions {
  readonly apiKey?: string;
  readonly apiUrl?: string;
  readonly fetchImpl?: FetchLike;
  readonly model?: string;
}

function resolveApiKey(explicitApiKey?: string): string {
  const apiKey =
    explicitApiKey ?? (typeof process !== "undefined" ? process.env.OPENAI_API_KEY : undefined);

  if (!apiKey) {
    throw new ProviderExecutionError({
      providerId: OPENAI_PROVIDER_ID,
      code: "OPENAI_API_KEY_MISSING",
      message: "缺少 OpenAI API key。请先前往 ATTI 设置页保存 API key，再开始 AI 规划。",
      retryable: false
    });
  }

  return apiKey;
}

async function createJsonResponse(args: {
  apiKey: string;
  apiUrl: string;
  fetchImpl: FetchLike;
  input: string;
  jsonSchema: ReturnType<
    | typeof getOpenAiProfileSummaryJsonSchema
    | typeof getOpenAiQuestionInterpretationJsonSchema
    | typeof getOpenAiAnswerPlanningJsonSchema
  >;
  model: string;
}): Promise<OpenAiResponsesSuccess> {
  const data = await executeProviderJsonRequest<OpenAiResponsesSuccess>({
    authFailedCode: "OPENAI_AUTH_FAILED",
    authFailedMessage: "已保存的 OpenAI API key 被拒绝。请检查设置页中的 key 后重试。",
    fetchImpl: args.fetchImpl,
    providerId: OPENAI_PROVIDER_ID,
    requestFailedCode: "OPENAI_REQUEST_FAILED",
    requestFailedMessage: () => "OpenAI provider 在收到响应前请求失败。",
    responseInit: {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${args.apiKey}`
      },
      body: JSON.stringify({
        model: args.model,
        input: args.input,
        text: {
          format: {
            type: "json_schema",
            name: args.jsonSchema.name,
            schema: args.jsonSchema.schema,
            strict: args.jsonSchema.strict
          }
        }
      })
    },
    responseNotOkCode: "OPENAI_RESPONSE_NOT_OK",
    responseNotOkMessage: "OpenAI provider 返回了非成功状态码。",
    url: args.apiUrl
  });

  if (!data.output_text) {
    throw new ProviderExecutionError({
      providerId: OPENAI_PROVIDER_ID,
      code: "OPENAI_OUTPUT_TEXT_MISSING",
      message: "OpenAI provider 的响应中缺少 output_text。",
      retryable: false
    });
  }

  return data;
}

export function createOpenAiAssessmentProvider(
  options: OpenAiAssessmentProviderOptions = {}
): AssessmentProvider {
  const fetchImpl = resolveProviderFetch({
    fetchImpl: options.fetchImpl,
    providerId: OPENAI_PROVIDER_ID,
    unavailableCode: "OPENAI_FETCH_UNAVAILABLE",
    unavailableMessage: "当前运行环境无法为 OpenAI provider 发起网络请求。"
  });
  const apiUrl = options.apiUrl ?? OPENAI_DEFAULT_API_URL;
  const model = options.model ?? OPENAI_DEFAULT_MODEL;

  async function summarizeProfileInternal(profile: Profile) {
    const response = await createJsonResponse({
      apiKey: resolveApiKey(options.apiKey),
      apiUrl,
      fetchImpl,
      input: buildOpenAiProfileSummaryPrompt(profile),
      jsonSchema: getOpenAiProfileSummaryJsonSchema(),
      model
    });

    try {
      return parseOpenAiProfileSummaryResponse(response.output_text ?? "");
    } catch (error) {
      throw new ProviderExecutionError({
        providerId: OPENAI_PROVIDER_ID,
        code: "OPENAI_PROFILE_SUMMARY_PARSE_FAILED",
        message: "OpenAI 返回的画像摘要结果无法解析。",
        retryable: false,
        details: {
          cause: error instanceof Error ? error.message : "unknown"
        }
      });
    }
  }

  async function interpretQuestionInternal(question: Question, profileSummary: ProfileSummary) {
    const response = await createJsonResponse({
      apiKey: resolveApiKey(options.apiKey),
      apiUrl,
      fetchImpl,
      input: buildOpenAiQuestionInterpretationPrompt(question, profileSummary),
      jsonSchema: getOpenAiQuestionInterpretationJsonSchema(),
      model
    });

    try {
      return parseOpenAiQuestionInterpretationResponse(response.output_text ?? "");
    } catch (error) {
      throw new ProviderExecutionError({
        providerId: OPENAI_PROVIDER_ID,
        code: "OPENAI_QUESTION_INTERPRETATION_PARSE_FAILED",
        message: "OpenAI 返回的问题解读结果无法解析。",
        retryable: false,
        details: {
          cause: error instanceof Error ? error.message : "unknown"
        }
      });
    }
  }

  async function planAnswersInternal(args: {
    profile: Profile;
    questions: Question[];
    sessionId: string;
  }) {
    const response = await createJsonResponse({
      apiKey: resolveApiKey(options.apiKey),
      apiUrl,
      fetchImpl,
      input: buildOpenAiAnswerPlanningPrompt(args),
      jsonSchema: getOpenAiAnswerPlanningJsonSchema(),
      model
    });

    try {
      return parseOpenAiAnswerPlanningResponse({
        rawText: response.output_text ?? "",
        providerId: OPENAI_PROVIDER_ID,
        promptVersion: OPENAI_PROMPT_VERSION,
        questions: args.questions,
        sessionId: args.sessionId
      });
    } catch (error) {
      throw new ProviderExecutionError({
        providerId: OPENAI_PROVIDER_ID,
        code: "OPENAI_ANSWER_PLANNING_PARSE_FAILED",
        message: "OpenAI 返回的答题规划结果无法解析。",
        retryable: false,
        details: {
          cause: error instanceof Error ? error.message : "unknown"
        }
      });
    }
  }

  return {
    providerId: OPENAI_PROVIDER_ID,
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
