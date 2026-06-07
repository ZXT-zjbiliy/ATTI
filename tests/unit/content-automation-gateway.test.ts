import { describe, expect, it } from "vitest";

import { createChromeContentAutomationGateway } from "../../src/background/services/content-automation-gateway";

describe("content automation gateway", () => {
  it("returns a refresh hint when the content script receiver does not exist", async () => {
    const gateway = createChromeContentAutomationGateway({
      async query() {
        return [
          {
            id: 11,
            url: "https://www.truity.com/test/enneagram-personality-test"
          }
        ];
      },
      async sendMessage() {
        throw new Error("Could not establish connection. Receiving end does not exist.");
      }
    });

    await expect(
      gateway.runQuestionExtraction({
        pageUrl: "https://www.truity.com/test/enneagram-personality-test",
        sessionId: "session-1"
      })
    ).rejects.toThrow("请刷新测试页面后重试");
  });

  it("returns a refresh hint for answer fill when the page receiver is missing", async () => {
    const gateway = createChromeContentAutomationGateway({
      async query() {
        return [
          {
            id: 11,
            url: "https://www.truity.com/test/enneagram-personality-test"
          }
        ];
      },
      async sendMessage() {
        throw new Error("Could not establish connection. Receiving end does not exist.");
      }
    });

    await expect(
      gateway.applyAnswerFill({
        pageUrl: "https://www.truity.com/test/enneagram-personality-test",
        sessionId: "session-1",
        siteId: "truity-enneagram",
        selections: [
          {
            questionId: "question-1",
            selectedOptionIds: ["5"]
          }
        ]
      })
    ).rejects.toThrow("请刷新测试页面后重试");
  });

  it("preserves other sendMessage errors", async () => {
    const gateway = createChromeContentAutomationGateway({
      async query() {
        return [
          {
            id: 11,
            url: "https://www.truity.com/test/enneagram-personality-test"
          }
        ];
      },
      async sendMessage() {
        throw new Error("Unexpected tab messaging failure");
      }
    });

    await expect(
      gateway.runQuestionExtraction({
        pageUrl: "https://www.truity.com/test/enneagram-personality-test",
        sessionId: "session-1"
      })
    ).rejects.toThrow("Unexpected tab messaging failure");
  });
});
