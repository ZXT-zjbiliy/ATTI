import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { truityDiscSiteAdapter } from "../../src/adapters/sites/truity-disc-site-adapter";
import { truityTypeFinderSiteAdapter } from "../../src/adapters/sites/truity-typefinder-site-adapter";

const truityDiscFixture = readFileSync(
  resolve(process.cwd(), "tests/fixtures/adapters/truity-disc-live-page.html"),
  "utf8"
);
const truityTypeFinderFixture = readFileSync(
  resolve(process.cwd(), "tests/fixtures/adapters/truity-typefinder-live-page.html"),
  "utf8"
);

class FakeElement {
  readonly children: FakeElement[] = [];
  parentElement: FakeElement | null = null;
  ownerDocument!: FakeDocument;

  constructor(
    readonly tagName: string,
    readonly textValue = "",
    readonly attributes: Record<string, string> = {}
  ) {}

  appendChild(child: FakeElement) {
    child.parentElement = this;
    child.ownerDocument = this.ownerDocument;
    this.children.push(child);
    return child;
  }

  get textContent(): string {
    return [this.textValue, ...this.children.map((child) => child.textContent)]
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }

  getAttribute(name: string): string | null {
    return this.attributes[name] ?? null;
  }

  querySelector(selector: string): FakeElement | null {
    return this.querySelectorAll(selector)[0] ?? null;
  }

  querySelectorAll<TElement extends FakeElement = FakeElement>(selector: string): TElement[] {
    const selectors = selector
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const matches: TElement[] = [];

    for (const child of this.children) {
      if (selectors.some((entry) => child.matches(entry))) {
        matches.push(child as TElement);
      }

      matches.push(...child.querySelectorAll<TElement>(selector));
    }

    return matches;
  }

  matches(selector: string): boolean {
    if (selector === "span" || selector === "div" || selector === "input") {
      return this.tagName === selector;
    }

    if (selector === ".question") {
      return (this.attributes.class ?? "").split(/\s+/).includes("question");
    }

    if (selector === 'input[type="radio"]') {
      return this.tagName === "input" && this.attributes.type === "radio";
    }

    return false;
  }
}

class FakeInputElement extends FakeElement {
  checked = false;
  clickCount = 0;

  constructor(
    readonly name: string,
    readonly value: string
  ) {
    super("input", "", {
      type: "radio",
      name,
      value
    });
  }

  click() {
    this.checked = true;
    this.clickCount += 1;
  }

  dispatchEvent() {
    return true;
  }
}

class FakeDocument extends FakeElement {
  constructor() {
    super("document");
    this.ownerDocument = this;
  }
}

function createPairQuestionDocument(
  questionPairs: Array<{ left: string; values: string[]; right: string }>
) {
  const document = new FakeDocument();
  const body = document.appendChild(new FakeElement("div"));

  for (const pair of questionPairs) {
    const question = body.appendChild(
      new FakeElement("div", "", {
        class: "question question-radio"
      })
    );
    const grid = question.appendChild(
      new FakeElement("div", "", {
        class: "question-grid emphasized"
      })
    );
    grid.appendChild(
      new FakeElement("span", pair.left, {
        class: "radio-label emphasized"
      })
    );

    for (const value of pair.values) {
      grid.appendChild(new FakeInputElement(`q-${pair.left}`, value));
    }

    grid.appendChild(
      new FakeElement("span", pair.right, {
        class: "radio-label emphasized"
      })
    );
  }

  return document;
}

describe("Truity pair-choice adapters", () => {
  it("extracts DISC pair-choice questions from the live DOM shape", () => {
    const result = truityDiscSiteAdapter.extractQuestions?.({
      url: "https://www.truity.com/test/disc-personality-test",
      title: "DISC Personality Assessment",
      html: truityDiscFixture
    });

    expect(result).toEqual({
      questionCount: 2,
      questions: [
        {
          text: "Open <-> Skeptical",
          type: "single-choice-pair-scale",
          options: [
            { id: "5", text: "Stronger match: Open", value: "5" },
            { id: "4", text: "Somewhat more like: Open", value: "4" },
            { id: "3", text: "Both equally / neither", value: "3" },
            { id: "2", text: "Somewhat more like: Skeptical", value: "2" },
            { id: "1", text: "Stronger match: Skeptical", value: "1" }
          ],
          order: 0
        },
        {
          text: "Cheerful <-> Methodical",
          type: "single-choice-pair-scale",
          options: [
            { id: "5", text: "Stronger match: Cheerful", value: "5" },
            { id: "4", text: "Somewhat more like: Cheerful", value: "4" },
            { id: "3", text: "Both equally / neither", value: "3" },
            { id: "2", text: "Somewhat more like: Methodical", value: "2" },
            { id: "1", text: "Stronger match: Methodical", value: "1" }
          ],
          order: 1
        }
      ]
    });
  });

  it("extracts TypeFinder pair-choice questions from the live DOM shape", () => {
    const result = truityTypeFinderSiteAdapter.extractQuestions?.({
      url: "https://www.truity.com/test/type-finder-personality-test-new",
      title: "Personality Test of Myers & Briggs' 16 Types | TypeFinder®",
      html: truityTypeFinderFixture
    });

    expect(result?.questionCount).toBe(2);
    expect(result?.questions[0]).toEqual({
      text: "I am often disorganized <-> I keep myself organized",
      type: "single-choice-pair-scale",
      options: [
        { id: "1", text: "Stronger match: I am often disorganized", value: "1" },
        { id: "2", text: "Somewhat more like: I am often disorganized", value: "2" },
        { id: "3", text: "Both equally / neither", value: "3" },
        { id: "4", text: "Somewhat more like: I keep myself organized", value: "4" },
        { id: "5", text: "Stronger match: I keep myself organized", value: "5" }
      ],
      order: 0
    });
  });

  it("fills DISC answers by prompt or question order using the real radio values", () => {
    const document = createPairQuestionDocument([
      { left: "Open", values: ["5", "4", "3", "2", "1"], right: "Skeptical" },
      { left: "Cheerful", values: ["5", "4", "3", "2", "1"], right: "Methodical" }
    ]);

    const result = truityDiscSiteAdapter.fillAnswers?.(
      {
        url: "https://www.truity.com/test/disc-personality-test",
        title: "DISC Personality Assessment",
        document: document as unknown as Document
      },
      [
        {
          questionId: "question-1",
          questionText: "Open <-> Skeptical",
          questionOrder: 0,
          selectedOptionIds: ["2"]
        }
      ]
    );

    const selectedInput = document.querySelectorAll<FakeInputElement>('input[type="radio"]')[3];

    expect(result).toEqual({ filledCount: 1 });
    expect(selectedInput?.checked).toBe(true);
    expect(selectedInput?.clickCount).toBe(1);
  });

  it("fills TypeFinder answers using the extracted prompt text", () => {
    const document = createPairQuestionDocument([
      {
        left: "I am often disorganized",
        values: ["1", "2", "3", "4", "5"],
        right: "I keep myself organized"
      }
    ]);

    const result = truityTypeFinderSiteAdapter.fillAnswers?.(
      {
        url: "https://www.truity.com/test/type-finder-personality-test-new",
        title: "TypeFinder® Personality Test",
        document: document as unknown as Document
      },
      [
        {
          questionId: "question-1",
          questionText: "I am often disorganized <-> I keep myself organized",
          questionOrder: 0,
          selectedOptionIds: ["5"]
        }
      ]
    );

    const selectedInput = document.querySelectorAll<FakeInputElement>('input[type="radio"]')[4];

    expect(result).toEqual({ filledCount: 1 });
    expect(selectedInput?.checked).toBe(true);
    expect(selectedInput?.clickCount).toBe(1);
  });
});
