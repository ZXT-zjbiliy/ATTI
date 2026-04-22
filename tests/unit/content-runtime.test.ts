import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it, vi } from "vitest";

import { startContentRuntime } from "../../src/content/runtime";
import { MESSAGE_TYPES } from "../../src/shared/types";

const truityEnneagramFixture = readFileSync(
  resolve(
    process.cwd(),
    "tests/fixtures/adapters/truity-enneagram-assessment.html",
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
});
