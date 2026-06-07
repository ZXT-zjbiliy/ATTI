import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

import {
  extractSbtiQuestions,
  fillSbtiAnswers,
  isSupportedSbtiAssessmentPage,
  locateSbtiQuestionRegions,
  matchesSbtiTestUrl
} from "../../src/adapters/sites/sbti";

const sbtiFixture = readFileSync(
  resolve(process.cwd(), "tests/fixtures/adapters/sbti-test-page.html"),
  "utf8"
);

describe("SBTI adapter", () => {
  it("matches the sbti test route", () => {
    expect(
      matchesSbtiTestUrl({
        url: "https://sbti.cc/test",
        title: "开始测试 | SBTI"
      })
    ).toBe(true);

    expect(
      matchesSbtiTestUrl({
        url: "https://sbti.cc/about",
        title: "测试说明 | SBTI"
      })
    ).toBe(false);
  });

  it("detects the fixture as a supported assessment page", () => {
    expect(
      isSupportedSbtiAssessmentPage({
        url: "https://sbti.cc/test",
        title: "开始测试 | SBTI",
        html: sbtiFixture
      })
    ).toBe(true);
  });

  it("locates question regions from bootstrap-backed fixture data", () => {
    const result = locateSbtiQuestionRegions({
      url: "https://sbti.cc/test",
      title: "开始测试 | SBTI",
      html: sbtiFixture
    });

    expect(result.isSupportedAssessmentPage).toBe(true);
    expect(result.questionRegions).toEqual([
      {
        order: 0,
        promptText: "我会主动开口认识新朋友。",
        locatorHint: "prompt-key:我会主动开口认识新朋友"
      },
      {
        order: 1,
        promptText: "我做决定前会先想清楚后果。",
        locatorHint: "prompt-key:我做决定前会先想清楚后果"
      },
      {
        order: 2,
        promptText: "您平时有什么爱好？",
        locatorHint: "prompt-key:您平时有什么爱好"
      },
      {
        order: 3,
        promptText: "您对饮酒的态度是？",
        locatorHint: "prompt-key:您对饮酒的态度是"
      }
    ]);
  });

  it("extracts normalized questions from bootstrap-backed fixture data", () => {
    const result = extractSbtiQuestions({
      url: "https://sbti.cc/test",
      title: "开始测试 | SBTI",
      html: sbtiFixture
    });

    expect(result.questionCount).toBe(4);
    expect(result.questions).toEqual([
      {
        text: "我会主动开口认识新朋友。",
        type: "single-choice-sbti",
        options: [
          { id: "1", text: "不认同", value: "1" },
          { id: "2", text: "中立", value: "2" },
          { id: "3", text: "认同", value: "3" }
        ],
        order: 0
      },
      {
        text: "我做决定前会先想清楚后果。",
        type: "single-choice-sbti",
        options: [
          { id: "1", text: "不认同", value: "1" },
          { id: "2", text: "中立", value: "2" },
          { id: "3", text: "认同", value: "3" }
        ],
        order: 1
      },
      {
        text: "您平时有什么爱好？",
        type: "single-choice-sbti",
        options: [
          { id: "1", text: "吃喝拉撒", value: "1" },
          { id: "2", text: "艺术爱好", value: "2" },
          { id: "3", text: "饮酒", value: "3" },
          { id: "4", text: "健身", value: "4" }
        ],
        order: 2
      },
      {
        text: "您对饮酒的态度是？",
        type: "single-choice-sbti",
        options: [
          { id: "1", text: "小酌怡情", value: "1" },
          { id: "2", text: "保温杯里泡白酒", value: "2" }
        ],
        order: 3
      }
    ]);
  });

  it("fills the live single-question flow by following prompt text instead of a fixed order", async () => {
    const dom = new JSDOM(sbtiFixture, {
      runScripts: "dangerously",
      url: "https://sbti.cc/test"
    });
    const { document } = dom.window;

    const result = await fillSbtiAnswers(
      {
        url: "https://sbti.cc/test",
        document
      },
      [
        {
          questionId: "bootstrap-q1",
          questionText: "我会主动开口认识新朋友。",
          questionOrder: 0,
          selectedOptionIds: ["3"]
        },
        {
          questionId: "bootstrap-q2",
          questionText: "我做决定前会先想清楚后果。",
          questionOrder: 1,
          selectedOptionIds: ["2"]
        },
        {
          questionId: "bootstrap-drink-gate-q1",
          questionText: "您平时有什么爱好？",
          questionOrder: 2,
          selectedOptionIds: ["3"]
        },
        {
          questionId: "bootstrap-drink-gate-q2",
          questionText: "您对饮酒的态度是？",
          questionOrder: 3,
          selectedOptionIds: ["2"]
        }
      ]
    );

    expect(result.filledCount).toBe(4);
    expect(document.querySelector(".question-title")?.textContent).toContain(
      "我做决定前会先想清楚后果。"
    );
    expect((document.getElementById("submitBtn") as HTMLButtonElement | null)?.disabled).toBe(
      false
    );
  });
});
