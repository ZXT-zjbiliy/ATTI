// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";

import type { AdapterPageContext } from "../../src/adapters/base/site-adapter";
import { genericFallbackSiteAdapter, setGenericFallbackAdapterEnabledForTesting } from "../../src/adapters/sites/generic-fallback-site-adapter";

const genericQuizHtml = `
  <html>
    <head>
      <title>Fun Personality Quiz</title>
    </head>
    <body>
      <fieldset>
        <legend>How do you prefer to spend a weekend?</legend>
        <label for="q0o0"><input id="q0o0" type="radio" name="q0" value="home">At home</label>
        <label for="q0o1"><input id="q0o1" type="radio" name="q0" value="outdoors">Outdoors</label>
        <label for="q0o2"><input id="q0o2" type="radio" name="q0" value="mixed">A mix of both</label>
      </fieldset>
      <fieldset>
        <legend>When you have a difficult choice, you usually</legend>
        <label for="q1o0"><input id="q1o0" type="radio" name="q1" value="plan">Plan ahead</label>
        <label for="q1o1"><input id="q1o1" type="radio" name="q1" value="go-with-flow">Go with the flow</label>
      </fieldset>
    </body>
  </html>
`;

function createPageContext(html: string): AdapterPageContext {
  return {
    url: "https://www.example.com/quiz/personality-test",
    title: "Personality Quiz",
    html,
  };
}

function createDocumentFromHtml(html: string): Document {
  return new DOMParser().parseFromString(html, "text/html");
}

describe("generic fallback site adapter", () => {
  afterEach(() => {
    setGenericFallbackAdapterEnabledForTesting(false);
  });

  it("matches by default when page signals look like an assessment", () => {
    const context = createPageContext(genericQuizHtml);

    expect(genericFallbackSiteAdapter.matches(context)).toBe(true);
  });

  it("matches when feature flag is enabled and page title contains quiz signals", () => {
    setGenericFallbackAdapterEnabledForTesting(true);

    const context = createPageContext(genericQuizHtml);

    expect(genericFallbackSiteAdapter.matches(context)).toBe(true);
  });

  it("matches Chinese quiz pages by title signals", () => {
    setGenericFallbackAdapterEnabledForTesting(true);

    const context: AdapterPageContext = {
      url: "https://www.example.com/quiz/personality-test",
      title: "性格测试 - 免费人格评估",
      html: `<html><head><title>性格测试 - 免费人格评估</title></head><body></body></html>`,
    };

    expect(genericFallbackSiteAdapter.matches(context)).toBe(true);
  });

  it("does not match disallowed page structures even when title contains quiz signals", () => {
    setGenericFallbackAdapterEnabledForTesting(true);

    const context: AdapterPageContext = {
      url: "https://www.example.com/quiz/login",
      title: "性格测试 登录",
      html: `
        <html>
          <body>
            <form>
              <input type="password" name="password" />
              <button type="submit">登录</button>
            </form>
          </body>
        </html>
      `,
    };

    expect(genericFallbackSiteAdapter.matches(context)).toBe(false);
  });

  it("matches page content when title/url are not explicit", () => {
    setGenericFallbackAdapterEnabledForTesting(true);

    const context: AdapterPageContext = {
      url: "https://www.example.com/test-page",
      title: "欢迎",
      html: `
        <html>
          <body>
            <div class="survey-block">
              <div class="survey-question">你更喜欢早起还是晚睡？</div>
              <div class="survey-answer">早起</div>
              <div class="survey-answer">晚睡</div>
            </div>
          </body>
        </html>
      `,
    };

    expect(genericFallbackSiteAdapter.matches(context)).toBe(true);
  });

  it("extracts generic assessment questions into ExtractedQuestionDraft", () => {
    setGenericFallbackAdapterEnabledForTesting(true);

    const context = createPageContext(genericQuizHtml);
    const result = genericFallbackSiteAdapter.extractQuestions?.(context);

    expect(result).toBeDefined();
    expect(result?.questionCount).toBe(2);
    expect(result?.questions).toEqual([
      {
        section: undefined,
        text: "How do you prefer to spend a weekend?",
        type: "single-choice",
        options: [
          { id: "0-0", text: "At home", value: "home" },
          { id: "0-1", text: "Outdoors", value: "outdoors" },
          { id: "0-2", text: "A mix of both", value: "mixed" },
        ],
        order: 0,
      },
      {
        section: undefined,
        text: "When you have a difficult choice, you usually",
        type: "single-choice",
        options: [
          { id: "1-0", text: "Plan ahead", value: "plan" },
          { id: "1-1", text: "Go with the flow", value: "go-with-flow" },
        ],
        order: 1,
      },
    ]);
  });

  it("extracts questions from a common quiz site block structure", () => {
    setGenericFallbackAdapterEnabledForTesting(true);

    const quizHtml = `
      <html>
        <head>
          <title>Personality Assessment</title>
        </head>
        <body>
          <div class="question-wrapper" data-question="1">
            <div class="question-text">Do you enjoy social gatherings?</div>
            <div class="answer-options">
              <div class="answer-option"><input type="radio" name="q0" value="yes">Yes</div>
              <div class="answer-option"><input type="radio" name="q0" value="no">No</div>
            </div>
          </div>
          <div class="question-wrapper" data-question="2">
            <div class="question-text">Do you make plans in advance?</div>
            <div class="answer-options">
              <div class="answer-option"><input type="radio" name="q1" value="often">Often</div>
              <div class="answer-option"><input type="radio" name="q1" value="rarely">Rarely</div>
            </div>
          </div>
        </body>
      </html>
    `;

    const result = genericFallbackSiteAdapter.extractQuestions?.(createPageContext(quizHtml));

    expect(result?.questionCount).toBe(2);
    expect(result?.questions.map((q) => q.text)).toEqual([
      "Do you enjoy social gatherings?",
      "Do you make plans in advance?",
    ]);
  });

  it("extracts questions from CSS-module style quiz blocks", () => {
    setGenericFallbackAdapterEnabledForTesting(true);

    const quizHtml = `
      <html>
        <head>
          <title>性格测试页面</title>
        </head>
        <body>
          <div class="style_questionItem__euFM6">
            <div class="style_topic__c4Clp">你喜欢社交场合吗？</div>
            <div class="style_options__0PLPp">喜欢</div>
            <div class="style_options__0PLPp">不喜欢</div>
          </div>
          <div class="style_questionItem__euFM6">
            <div class="style_topic__c4Clp">你会提前计划吗？</div>
            <div class="style_options__0PLPp">会</div>
            <div class="style_options__0PLPp">不会</div>
          </div>
        </body>
      </html>
    `;

    const result = genericFallbackSiteAdapter.extractQuestions?.(createPageContext(quizHtml));

    expect(result?.questionCount).toBe(2);
    expect(result?.questions[0].text).toBe("你喜欢社交场合吗？");
    expect(result?.questions[0].options.map((option) => option.text)).toEqual(["喜欢", "不喜欢"]);
  });

  it("extracts questions from plain SPA quiz blocks without explicit option selectors", () => {
    setGenericFallbackAdapterEnabledForTesting(true);

    const quizHtml = `
      <html>
        <head>
          <title>性格测试页面</title>
        </head>
        <body>
          <div class="survey-block">
            <div class="survey-question">你更喜欢早起还是晚睡？</div>
            <div class="survey-answer">早起</div>
            <div class="survey-answer">晚睡</div>
          </div>
          <div class="survey-block">
            <div class="survey-question">你通常会先计划再行动吗？</div>
            <div class="survey-answer">会</div>
            <div class="survey-answer">不会</div>
          </div>
        </body>
      </html>
    `;

    const result = genericFallbackSiteAdapter.extractQuestions?.(createPageContext(quizHtml));

    expect(result?.questionCount).toBe(2);
    expect(result?.questions[0].text).toBe("你更喜欢早起还是晚睡？");
    expect(result?.questions[0].options.map((option) => option.text)).toEqual(["早起", "晚睡"]);
  });

  it("fills CSS-module option blocks by clicking the matched element", () => {
    setGenericFallbackAdapterEnabledForTesting(true);

    const html = `
      <html>
        <body>
          <div class="style_questionItem__euFM6">
            <div class="style_topic__c4Clp">你喜欢社交场合吗？</div>
            <div class="style_options__0PLPp" id="opt0">喜欢</div>
            <div class="style_options__0PLPp" id="opt1">不喜欢</div>
          </div>
        </body>
      </html>
    `;

    const document = createDocumentFromHtml(html);
    const context = {
      url: "https://www.example.com/quiz/personality-test",
      title: "性格测试",
      document,
    };

    const optionElement = document.querySelector<HTMLElement>("#opt1");
    expect(optionElement).not.toBeNull();
    if (optionElement) {
      const clickSpy = vi.spyOn(optionElement, "click");
      const result = genericFallbackSiteAdapter.fillAnswers?.(context, [
        {
          questionId: "0-1",
          questionText: "你喜欢社交场合吗？",
          questionOrder: 0,
          selectedOptionIds: ["opt1"],
        },
      ]);

      expect(result).toEqual({ filledCount: 1 });
      expect(clickSpy).toHaveBeenCalled();
    }
  });

  it("fills selected options without submitting the form", () => {
    setGenericFallbackAdapterEnabledForTesting(true);

    const document = createDocumentFromHtml(genericQuizHtml);
    const context = {
      url: "https://www.example.com/quiz/personality-test",
      title: "Personality Quiz",
      document,
    };

    const selections = [
      {
        questionId: "0-2",
        questionText: "How do you prefer to spend a weekend?",
        questionOrder: 0,
        selectedOptionIds: ["0-2"],
      },
      {
        questionId: "1-1",
        questionText: "When you have a difficult choice, you usually",
        questionOrder: 1,
        selectedOptionIds: ["1-1"],
      },
    ];

    const result = genericFallbackSiteAdapter.fillAnswers?.(context, selections);

    expect(result).toEqual({ filledCount: 2 });
    expect(document.querySelector<HTMLInputElement>("#q0o2")?.checked).toBe(true);
    expect(document.querySelector<HTMLInputElement>("#q1o1")?.checked).toBe(true);
  });
});
