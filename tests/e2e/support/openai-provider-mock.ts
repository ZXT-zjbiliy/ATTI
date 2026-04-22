import type { BrowserContext, Worker } from "@playwright/test";

const OPENAI_RESPONSES_API_URL = "https://api.openai.com/v1/responses";

interface OpenAiRouteCall {
  readonly input: string;
}

interface InstallOpenAiSuccessMockOptions {
  readonly answerPlans: Array<{
    recommendedOptionIds: string[];
    confidence: number;
    rationale: string;
    requiresConfirmation?: boolean;
  }>;
}

export interface OpenAiMockHarness {
  getCalls(): Promise<OpenAiRouteCall[]>;
  dispose(): Promise<void>;
}

async function resolveBackgroundServiceWorker(context: BrowserContext): Promise<Worker> {
  let [serviceWorker] = context.serviceWorkers();

  if (!serviceWorker) {
    serviceWorker = await context.waitForEvent("serviceworker", { timeout: 15_000 });
  }

  return serviceWorker;
}

async function installFetchMock(
  context: BrowserContext,
  factorySource: string
): Promise<OpenAiMockHarness> {
  const serviceWorker = await resolveBackgroundServiceWorker(context);
  await serviceWorker.evaluate(factorySource);

  return {
    async getCalls() {
      return serviceWorker.evaluate(() => {
        return Array.isArray((globalThis as typeof globalThis & {
          __attiOpenAiMockCalls?: Array<{ input: string }>;
        }).__attiOpenAiMockCalls)
          ? (globalThis as typeof globalThis & {
              __attiOpenAiMockCalls?: Array<{ input: string }>;
            }).__attiOpenAiMockCalls ?? []
          : [];
      });
    },
    async dispose() {
      await serviceWorker.evaluate(() => {
        const runtime = globalThis as typeof globalThis & {
          __attiOriginalFetch?: typeof fetch;
          __attiOpenAiMockCalls?: Array<{ input: string }>;
        };

        if (runtime.__attiOriginalFetch) {
          globalThis.fetch = runtime.__attiOriginalFetch;
        }

        delete runtime.__attiOriginalFetch;
        delete runtime.__attiOpenAiMockCalls;
      });
    }
  };
}

export async function installMockOpenAiSuccessRoute(
  context: BrowserContext,
  options: InstallOpenAiSuccessMockOptions
): Promise<OpenAiMockHarness> {
  return installFetchMock(
    context,
    `(() => {
      const runtime = globalThis;
      runtime.__attiOpenAiMockCalls = [];

      if (!runtime.__attiOriginalFetch) {
        runtime.__attiOriginalFetch = globalThis.fetch.bind(globalThis);
      }

      const mockedAnswerPlans = ${JSON.stringify(
        options.answerPlans.map((answerPlan) => ({
          ...answerPlan,
          requiresConfirmation: answerPlan.requiresConfirmation ?? false
        }))
      )};

      globalThis.fetch = async (input, init) => {
        const requestUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

        if (requestUrl === "${OPENAI_RESPONSES_API_URL}") {
          let parsedBody = {};
          let parsedQuestions = [];

          if (typeof init?.body === "string") {
            try {
              parsedBody = JSON.parse(init.body);
            } catch {}
          }

          runtime.__attiOpenAiMockCalls.push({
            input: typeof parsedBody.input === "string" ? parsedBody.input : ""
          });

          if (typeof parsedBody.input === "string") {
            const questionsLine = parsedBody.input
              .split("\\n")
              .find((line) => line.startsWith("Questions: "));

            if (questionsLine) {
              try {
                parsedQuestions = JSON.parse(questionsLine.slice("Questions: ".length));
              } catch {}
            }
          }

          return new Response(JSON.stringify({
            output_text: JSON.stringify({
              answerPlans: mockedAnswerPlans.map((answerPlan, index) => ({
                questionId:
                  typeof parsedQuestions[index]?.id === "string"
                    ? parsedQuestions[index].id
                    : "mock-question-" + String(index + 1),
                recommendedOptionIds: answerPlan.recommendedOptionIds,
                confidence: answerPlan.confidence,
                rationale: answerPlan.rationale,
                requiresConfirmation: answerPlan.requiresConfirmation
              }))
            })
          }), {
            status: 200,
            headers: {
              "Content-Type": "application/json"
            }
          });
        }

        return runtime.__attiOriginalFetch(input, init);
      };
    })()`
  );
}

export async function installMockOpenAiFailureRoute(
  context: BrowserContext,
  status: number,
  body: string
): Promise<OpenAiMockHarness> {
  return installFetchMock(
    context,
    `(() => {
      const runtime = globalThis;
      runtime.__attiOpenAiMockCalls = [];

      if (!runtime.__attiOriginalFetch) {
        runtime.__attiOriginalFetch = globalThis.fetch.bind(globalThis);
      }

      const mockedBody = ${JSON.stringify(body)};
      const mockedStatus = ${status};

      globalThis.fetch = async (input, init) => {
        const requestUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

        if (requestUrl === "${OPENAI_RESPONSES_API_URL}") {
          let parsedBody = {};

          if (typeof init?.body === "string") {
            try {
              parsedBody = JSON.parse(init.body);
            } catch {}
          }

          runtime.__attiOpenAiMockCalls.push({
            input: typeof parsedBody.input === "string" ? parsedBody.input : ""
          });

          return new Response(mockedBody, {
            status: mockedStatus,
            headers: {
              "Content-Type": "application/json"
            }
          });
        }

        return runtime.__attiOriginalFetch(input, init);
      };
    })()`
  );
}
