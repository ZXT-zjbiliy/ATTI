import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
    extractSixteenPersonalitiesQuestions,
    isSupportedSixteenPersonalitiesAssessmentPage,
    locateSixteenPersonalitiesQuestionRegions,
    matchesSixteenPersonalitiesTestUrl,
} from "../../src/adapters/sites/sixteen-personalities-site-adapter";

const sixteenPersonalitiesFixture = readFileSync(
  resolve(
    process.cwd(),
    "tests/fixtures/adapters/sixteen-personalities-assessment.html",
  ),
  "utf8",
);

describe("16Personalities adapter", () => {
  it("matches the free personality test route", () => {
    expect(
      matchesSixteenPersonalitiesTestUrl({
        url: "https://www.16personalities.com/free-personality-test",
        title: "Free Personality Test | 16Personalities",
      }),
    ).toBe(true);
    expect(
      matchesSixteenPersonalitiesTestUrl({
        url: "https://www.16personalities.com/personality-types",
        title: "Personality Types",
      }),
    ).toBe(false);
  });

  it("detects the fixture as a supported assessment page", () => {
    expect(
      isSupportedSixteenPersonalitiesAssessmentPage({
        url: "https://www.16personalities.com/free-personality-test",
        title: "Free Personality Test | 16Personalities",
        html: sixteenPersonalitiesFixture,
      }),
    ).toBe(true);
  });

  it("locates question regions from the fixture", () => {
    const result = locateSixteenPersonalitiesQuestionRegions({
      url: "https://www.16personalities.com/free-personality-test",
      title: "Free Personality Test | 16Personalities",
      html: sixteenPersonalitiesFixture,
    });

    expect(result.isSupportedAssessmentPage).toBe(true);
    expect(result.questionRegions).toEqual([
      {
        order: 0,
        promptText: "You regularly make new friends.",
        locatorHint: "prompt-key:you-regularly-make-new-friends",
      },
      {
        order: 1,
        promptText:
          "You spend a lot of your free time exploring various random topics that pique your interest.",
        locatorHint:
          "prompt-key:you-spend-a-lot-of-your-free-time-exploring-various-random-topics-that-pique-your-interest",
      },
    ]);
  });

  it("extracts normalized seven-point rating questions from the fixture", () => {
    const result = extractSixteenPersonalitiesQuestions({
      url: "https://www.16personalities.com/free-personality-test",
      title: "Free Personality Test | 16Personalities",
      html: sixteenPersonalitiesFixture,
    });

    expect(result.questionCount).toBe(2);
    expect(result.questions).toEqual([
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
    ]);
  });

  it("extracts questions when the page does not include adapter-specific data markers", () => {
    const htmlWithoutMarkers = sixteenPersonalitiesFixture
      .replace(/data-atti-16p-question="[^"]*"/g, "")
      .replace(/data-atti-16p-prompt/g, "");

    const result = extractSixteenPersonalitiesQuestions({
      url: "https://www.16personalities.com/free-personality-test",
      title: "Free Personality Test | 16Personalities",
      html: htmlWithoutMarkers,
    });

    expect(result.questionCount).toBe(2);
    expect(result.questions.map((question) => question.text)).toEqual([
      "You regularly make new friends.",
      "You spend a lot of your free time exploring various random topics that pique your interest.",
    ]);
  });

  it("extracts questions from actual 16Personalities fieldset-based quiz markup", () => {
    const fieldsetHtml = `
      <div>
        <h1>Free Personality Test</h1>
        <p>Be yourself and answer honestly to find out your personality type.</p>
        <fieldset class="question" data-question="0">
          <legend class="sr-only"><span>Question 1 of 60: You regularly make new friends.</span></legend>
          <div class="input__label"><div class="statement"><span class="header">You regularly make new friends.</span></div></div>
          <div class="group__options">
            <div class="radios len--7">
              <span class="sp-radio"><input type="radio" value="-3" /><span></span></span>
              <span class="sp-radio"><input type="radio" value="-2" /><span></span></span>
              <span class="sp-radio"><input type="radio" value="-1" /><span></span></span>
              <span class="sp-radio"><input type="radio" value="0" /><span></span></span>
              <span class="sp-radio"><input type="radio" value="1" /><span></span></span>
              <span class="sp-radio"><input type="radio" value="2" /><span></span></span>
              <span class="sp-radio"><input type="radio" value="3" /><span></span></span>
            </div>
            <div class="captions--desktop caption agree">Agree</div>
            <div class="captions--desktop caption disagree">Disagree</div>
          </div>
        </fieldset>
      </div>
    `;

    const result = extractSixteenPersonalitiesQuestions({
      url: "https://www.16personalities.com/free-personality-test",
      title: "Free Personality Test | 16Personalities",
      html: fieldsetHtml,
    });

    expect(result.questionCount).toBe(1);
    expect(result.questions[0].text).toBe("You regularly make new friends.");
    expect(result.questions[0].options).toHaveLength(7);
  });
});
