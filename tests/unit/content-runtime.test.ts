import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it, vi } from "vitest";

import { setGenericFallbackAdapterEnabledForTesting } from "../../src/adapters/sites/generic-fallback-site-adapter";
import { startContentRuntime } from "../../src/content/runtime";
import { MESSAGE_TYPES } from "../../src/shared/types";

const truityEnneagramFixture = readFileSync(
  resolve(
    process.cwd(),
    "tests/fixtures/adapters/truity-enneagram-assessment.html",
  ),
  "utf8",
);
const sixteenPersonalitiesFixture = readFileSync(
  resolve(
    process.cwd(),
    "tests/fixtures/adapters/sixteen-personalities-assessment.html",
  ),
  "utf8",
);

describe("content runtime", () => {
  it("loads on a test page and sends a structured message", async () => {
    const sendMessage = vi.fn(async () => ({
      ok: true as const,
      data: {
        received: true,
      },
    }));
    const dependencies = {
      document: {
        title: "Assessment Landing Page",
        readyState: "complete",
        body: {
          innerHTML: "<main><h1>Test Page</h1></main>",
        },
      },
      location: {
        href: "https://example.com/assessment",
      },
      window: {} as { self: unknown; top: unknown },
      sendMessage,
    };

    dependencies.window.self = dependencies.window;
    dependencies.window.top = dependencies.window;

    await expect(startContentRuntime(dependencies)).resolves.toBeUndefined();
    expect(sendMessage).toHaveBeenCalledWith({
      type: MESSAGE_TYPES.contentMetadataReport,
      payload: {
        page: {
          url: "https://example.com/assessment",
          title: "Assessment Landing Page",
          readyState: "complete",
          isTopLevel: true,
        },
      },
    });
  });

  it("does not modify page content", async () => {
    const body = {
      innerHTML: "<main><p>Original Body</p></main>",
    };
    const sendMessage = vi.fn(async () => ({
      ok: true as const,
      data: {
        received: true,
      },
    }));
    const dependencies = {
      document: {
        title: "Safe Test Page",
        readyState: "interactive",
        body,
      },
      location: {
        href: "https://example.com/passive",
      },
      window: {} as { self: unknown; top: unknown },
      sendMessage,
    };

    dependencies.window.self = dependencies.window;
    dependencies.window.top = dependencies.window;

    await startContentRuntime(dependencies);

    expect(body.innerHTML).toBe("<main><p>Original Body</p></main>");
  });

  it("uses documentElement.outerHTML for SPA page extraction when available", async () => {
    setGenericFallbackAdapterEnabledForTesting(true);

    const sendMessage = vi.fn(async (message: { type: string }) => {
      if (message.type === MESSAGE_TYPES.contentQuestionsExtracted) {
        return {
          ok: true as const,
          data: {
            persisted: true,
          },
        };
      }

      return {
        ok: true as const,
        data: {
          received: true,
        },
      };
    });

    const lightSpaHtml = `
      <html>
        <head>
          <title>性格测试页面</title>
        </head>
        <body>
          <div class="survey-block">
            <div class="survey-question">你更喜欢独处还是社交？</div>
            <div class="survey-answer">独处</div>
            <div class="survey-answer">社交</div>
          </div>
        </body>
      </html>
    `;

    const dependencies = {
      document: {
        title: "性格测试页面",
        readyState: "complete",
        body: {
          innerHTML: "",
        },
        documentElement: {
          outerHTML: lightSpaHtml,
        },
      },
      location: {
        href: "https://example.com/spa-assessment",
      },
      window: {} as { self: unknown; top: unknown },
      sendMessage,
    };

    dependencies.window.self = dependencies.window;
    dependencies.window.top = dependencies.window;

    try {
      await expect(startContentRuntime(dependencies)).resolves.toBeUndefined();
      expect(sendMessage).toHaveBeenCalledWith({
        type: MESSAGE_TYPES.contentQuestionsExtracted,
        payload: expect.objectContaining({
          siteId: "generic-fallback-assessment",
        }),
      });
    } finally {
      setGenericFallbackAdapterEnabledForTesting(false);
    }
  });

  it("extracts normalized questions from the Truity page and reports them", async () => {
    const sendMessage = vi.fn(async (message: { type: string }) => {
      if (message.type === MESSAGE_TYPES.contentQuestionsExtracted) {
        return {
          ok: true as const,
          data: {
            persisted: true,
          },
        };
      }

      return {
        ok: true as const,
        data: {
          received: true,
        },
      };
    });
    const dependencies = {
      document: {
        title: "Enneagram Personality Test | Truity",
        readyState: "complete",
        body: {
          innerHTML: truityEnneagramFixture,
        },
      },
      location: {
        href: "https://www.truity.com/test/enneagram-personality-test",
      },
      window: {} as { self: unknown; top: unknown },
      sendMessage,
    };

    dependencies.window.self = dependencies.window;
    dependencies.window.top = dependencies.window;

    await expect(startContentRuntime(dependencies)).resolves.toBeUndefined();
    expect(sendMessage).toHaveBeenNthCalledWith(1, {
      type: MESSAGE_TYPES.contentMetadataReport,
      payload: {
        page: {
          url: "https://www.truity.com/test/enneagram-personality-test",
          title: "Enneagram Personality Test | Truity",
          readyState: "complete",
          isTopLevel: true,
        },
      },
    });
    expect(sendMessage).toHaveBeenNthCalledWith(2, {
      type: MESSAGE_TYPES.contentQuestionsExtracted,
      payload: {
        siteId: "truity-enneagram",
        page: {
          url: "https://www.truity.com/test/enneagram-personality-test",
          title: "Enneagram Personality Test | Truity",
          readyState: "complete",
          isTopLevel: true,
        },
        questions: [
          {
            text: "I strive for perfection",
            type: "single-choice-rating",
            options: [
              { id: "1", text: "Inaccurate", value: "1" },
              { id: "2", text: "Somewhat Inaccurate", value: "2" },
              { id: "3", text: "Neutral", value: "3" },
              { id: "4", text: "Somewhat Accurate", value: "4" },
              { id: "5", text: "Accurate", value: "5" },
            ],
            order: 0,
          },
          {
            text: "I work hard to be helpful to others",
            type: "single-choice-rating",
            options: [
              { id: "1", text: "Inaccurate", value: "1" },
              { id: "2", text: "Somewhat Inaccurate", value: "2" },
              { id: "3", text: "Neutral", value: "3" },
              { id: "4", text: "Somewhat Accurate", value: "4" },
              { id: "5", text: "Accurate", value: "5" },
            ],
            order: 1,
          },
        ],
      },
    });
  });

  it("extracts normalized questions from the 16Personalities page and reports them", async () => {
    const sendMessage = vi.fn(async (message: { type: string }) => {
      if (message.type === MESSAGE_TYPES.contentQuestionsExtracted) {
        return {
          ok: true as const,
          data: {
            persisted: true,
          },
        };
      }

      return {
        ok: true as const,
        data: {
          received: true,
        },
      };
    });
    const dependencies = {
      document: {
        title: "Free Personality Test | 16Personalities",
        readyState: "complete",
        body: {
          innerHTML: sixteenPersonalitiesFixture,
        },
      },
      location: {
        href: "https://www.16personalities.com/free-personality-test",
      },
      window: {} as { self: unknown; top: unknown },
      sendMessage,
    };

    dependencies.window.self = dependencies.window;
    dependencies.window.top = dependencies.window;

    await expect(startContentRuntime(dependencies)).resolves.toBeUndefined();
    expect(sendMessage).toHaveBeenNthCalledWith(2, {
      type: MESSAGE_TYPES.contentQuestionsExtracted,
      payload: {
        siteId: "sixteen-personalities",
        page: {
          url: "https://www.16personalities.com/free-personality-test",
          title: "Free Personality Test | 16Personalities",
          readyState: "complete",
          isTopLevel: true,
        },
        questions: [
          {
            text: "You regularly make new friends.",
            type: "single-choice-rating",
            options: [
              { id: "1", text: "Strongly Agree", value: "1" },
              { id: "2", text: "Agree", value: "2" },
              { id: "3", text: "Slightly Agree", value: "3" },
              { id: "4", text: "Neutral", value: "4" },
              { id: "5", text: "Slightly Disagree", value: "5" },
              { id: "6", text: "Disagree", value: "6" },
              { id: "7", text: "Strongly Disagree", value: "7" },
            ],
            order: 0,
          },
          {
            text:
              "You spend a lot of your free time exploring various random topics that pique your interest.",
            type: "single-choice-rating",
            options: [
              { id: "1", text: "Strongly Agree", value: "1" },
              { id: "2", text: "Agree", value: "2" },
              { id: "3", text: "Slightly Agree", value: "3" },
              { id: "4", text: "Neutral", value: "4" },
              { id: "5", text: "Slightly Disagree", value: "5" },
              { id: "6", text: "Disagree", value: "6" },
              { id: "7", text: "Strongly Disagree", value: "7" },
            ],
            order: 1,
          },
        ],
      },
    });
  });

  it("reports sanitized extraction failures without sending raw page content", async () => {
    const sendMessage = vi.fn(async () => ({
      ok: true as const,
      data: {
        received: true,
      },
    }));
    const brokenAssessmentHtml = `
      <main>
        <h1>Enneagram Personality Test</h1>
        <p>Step 1 of 11</p>
        <p>Inaccurate Neutral Accurate</p>
      </main>
    `;
    const dependencies = {
      document: {
        title: "Enneagram Personality Test | Truity",
        readyState: "complete",
        body: {
          innerHTML: brokenAssessmentHtml,
        },
      },
      location: {
        href: "https://www.truity.com/test/enneagram-personality-test",
      },
      window: {} as { self: unknown; top: unknown },
      sendMessage,
    };

    dependencies.window.self = dependencies.window;
    dependencies.window.top = dependencies.window;

    await expect(startContentRuntime(dependencies)).resolves.toBeUndefined();

    expect(sendMessage).toHaveBeenNthCalledWith(2, {
      type: MESSAGE_TYPES.contentQuestionExtractionFailed,
      payload: {
        siteId: "truity-enneagram",
        page: {
          url: "https://www.truity.com/test/enneagram-personality-test",
          title: "Enneagram Personality Test | Truity",
          readyState: "complete",
          isTopLevel: true,
        },
        phase: "adapter-question-extraction",
        message:
          "Failed to locate Truity Enneagram question blocks after checking fieldset and live prompt markers.",
        payload: {
          pageReadyState: "title-present",
          htmlLength: brokenAssessmentHtml.length,
          isTopLevelCandidate: true,
        },
      },
    });
    expect(JSON.stringify(sendMessage.mock.calls[1]?.[0] ?? {})).not.toContain("<main>");
  });

  it("retries supported-page extraction until the Truity fixture is fully available", async () => {
    const sendMessage = vi.fn(async (message: { type: string }) => {
      if (message.type === MESSAGE_TYPES.contentQuestionsExtracted) {
        return {
          ok: true as const,
          data: {
            persisted: true
          }
        };
      }

      return {
        ok: true as const,
        data: {
          received: true
        }
      };
    });
    const body = {
      innerHTML: "<main><p>Loading Truity assessment...</p></main>"
    };
    const wait = vi.fn(async () => {
      body.innerHTML = truityEnneagramFixture;
    });
    const dependencies = {
      document: {
        title: "Enneagram Personality Test | Truity",
        readyState: "interactive",
        body
      },
      location: {
        href: "https://www.truity.com/test/enneagram-personality-test"
      },
      window: {} as { self: unknown; top: unknown },
      sendMessage,
      wait
    };

    dependencies.window.self = dependencies.window;
    dependencies.window.top = dependencies.window;

    await expect(startContentRuntime(dependencies)).resolves.toBeUndefined();

    expect(wait).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenNthCalledWith(2, {
      type: MESSAGE_TYPES.contentQuestionsExtracted,
      payload: {
        siteId: "truity-enneagram",
        page: {
          url: "https://www.truity.com/test/enneagram-personality-test",
          title: "Enneagram Personality Test | Truity",
          readyState: "interactive",
          isTopLevel: true
        },
        questions: [
          {
            text: "I strive for perfection",
            type: "single-choice-rating",
            options: [
              { id: "1", text: "Inaccurate", value: "1" },
              { id: "2", text: "Somewhat Inaccurate", value: "2" },
              { id: "3", text: "Neutral", value: "3" },
              { id: "4", text: "Somewhat Accurate", value: "4" },
              { id: "5", text: "Accurate", value: "5" }
            ],
            order: 0
          },
          {
            text: "I work hard to be helpful to others",
            type: "single-choice-rating",
            options: [
              { id: "1", text: "Inaccurate", value: "1" },
              { id: "2", text: "Somewhat Inaccurate", value: "2" },
              { id: "3", text: "Neutral", value: "3" },
              { id: "4", text: "Somewhat Accurate", value: "4" },
              { id: "5", text: "Accurate", value: "5" }
            ],
            order: 1
          }
        ]
      }
    });
  });

  it("supports an explicit re-extraction command for multi-page assessments", async () => {
    const sendMessage = vi.fn(async (message: { type: string }) => ({
      ok: true as const,
      data: { received: message.type }
    }));
    let listener:
      | ((message: unknown, sender: unknown, sendResponse: (response: unknown) => void) => boolean | void)
      | undefined;
    const runtime = {
      onMessage: {
        addListener(nextListener: typeof listener) {
          listener = nextListener;
        }
      }
    };
    const dependencies = {
      document: {
        title: "Enneagram Personality Test | Truity",
        readyState: "complete",
        body: {
          innerHTML: truityEnneagramFixture
        }
      },
      location: {
        href: "https://www.truity.com/test/enneagram-personality-test"
      },
      window: {} as { self: unknown; top: unknown },
      sendMessage,
      runtime
    };

    dependencies.window.self = dependencies.window;
    dependencies.window.top = dependencies.window;

    await expect(startContentRuntime(dependencies)).resolves.toBeUndefined();

    const response = await new Promise<unknown>((resolve) => {
      listener?.(
        {
          type: "questionExtractionRun",
          payload: {}
        },
        {},
        resolve
      );
    });

    expect(sendMessage).toHaveBeenLastCalledWith({
      type: MESSAGE_TYPES.contentQuestionsExtracted,
      payload: expect.objectContaining({
        siteId: "truity-enneagram"
      })
    });
    expect(response).toEqual({
      ok: true,
      data: {
        questionCount: 2,
        siteId: "truity-enneagram"
      }
    });
  });

  it("returns a structured error when the re-extraction command rejects", async () => {
    let listener:
      | ((message: unknown, sender: unknown, sendResponse: (response: unknown) => void) => boolean | void)
      | undefined;
    const runtime = {
      onMessage: {
        addListener(nextListener: typeof listener) {
          listener = nextListener;
        }
      }
    };
    const sendMessage = vi.fn(async (message: { type: string }) => {
      if (message.type === MESSAGE_TYPES.contentMetadataReport) {
        return {
          ok: false as const,
          error: {
            code: "CONTENT_METADATA_FAILED",
            message: "Metadata bridge unavailable"
          }
        };
      }

      return {
        ok: true as const,
        data: {
          received: true
        }
      };
    });
    const dependencies = {
      document: {
        title: "Assessment Landing Page",
        readyState: "complete",
        body: {
          innerHTML: "<main><h1>Unsupported</h1></main>"
        }
      },
      location: {
        href: "https://example.com/assessment"
      },
      window: {} as { self: unknown; top: unknown },
      sendMessage,
      runtime
    };

    dependencies.window.self = dependencies.window;
    dependencies.window.top = dependencies.window;

    await expect(startContentRuntime(dependencies)).rejects.toThrow("Metadata bridge unavailable");

    const response = await new Promise<unknown>((resolve) => {
      listener?.(
        {
          type: "questionExtractionRun",
          payload: {}
        },
        {},
        resolve
      );
    });

    expect(response).toEqual({
      ok: false,
      error: {
        code: "CONTENT_RUNTIME_COMMAND_FAILED",
        message: "Metadata bridge unavailable"
      }
    });
  });
});
