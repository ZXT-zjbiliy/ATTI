import { describe, expect, it } from "vitest";

import { extractTruityEnneagramQuestions } from "../../src/adapters/sites/truity-enneagram/extract-truity-enneagram-questions";
import { fillTruityEnneagramAnswers } from "../../src/adapters/sites/truity-enneagram/fill-truity-enneagram-answers";

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

  contains(candidate: FakeElement): boolean {
    if (candidate === this) {
      return true;
    }

    return this.children.some((child) => child.contains(candidate));
  }

  compareDocumentPosition(other: FakeElement): number {
    const nodes = this.ownerDocument.flatten();

    return nodes.indexOf(this) < nodes.indexOf(other) ? 4 : 0;
  }

  querySelector(selector: string): FakeElement | null {
    return this.querySelectorAll(selector)[0] ?? null;
  }

  querySelectorAll<TElement extends FakeElement = FakeElement>(selector: string): TElement[] {
    const selectors = selector.split(",").map((item) => item.trim()).filter(Boolean);
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
    if (selector === "fieldset") {
      return this.tagName === "fieldset";
    }

    if (selector === 'fieldset[data-atti-question-block]') {
      return this.tagName === "fieldset" && "data-atti-question-block" in this.attributes;
    }

    if (selector === 'input[type="radio"]') {
      return this.tagName === "input" && this.attributes.type === "radio";
    }

    if (selector === '[role="group"]' || selector === '[role="radiogroup"]') {
      return this.attributes.role === selector.slice(7, -2);
    }

    if (selector.startsWith(".")) {
      return (this.attributes.class ?? "")
        .split(/\s+/)
        .includes(selector.slice(1));
    }

    return this.tagName === selector.toLowerCase();
  }
}

class FakeInputElement extends FakeElement {
  checked = false;
  clickCount = 0;
  dispatchCount = 0;

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
    this.dispatchCount += 1;
    return true;
  }
}

class FakeDocument extends FakeElement {
  readonly documentElement: FakeElement;

  constructor() {
    super("document");
    this.ownerDocument = this;
    this.documentElement = new FakeElement("html");
    this.documentElement.ownerDocument = this;
    this.children.push(this.documentElement);
  }

  flatten(): FakeElement[] {
    const nodes: FakeElement[] = [];

    const visit = (node: FakeElement) => {
      nodes.push(node);

      for (const child of node.children) {
        visit(child);
      }
    };

    visit(this);

    return nodes;
  }
}

function createStructuredFillDocument() {
  const document = new FakeDocument();
  const body = document.documentElement.appendChild(new FakeElement("body"));
  const questionContainer = body.appendChild(
    new FakeElement("div", "", {
      class: "question-wrap"
    })
  );
  questionContainer.appendChild(new FakeElement("h3", "  i STRIVE for\n perfection  "));
  const radioContainer = questionContainer.appendChild(
    new FakeElement("div", "", {
      role: "radiogroup"
    })
  );
  const firstInput = radioContainer.appendChild(new FakeInputElement("question-1", "1"));
  const selectedInput = radioContainer.appendChild(new FakeInputElement("question-1", "5"));

  return {
    document,
    firstInput,
    selectedInput
  };
}

describe("Truity adapter drift tolerance", () => {
  it("extracts fixture questions when the legend and labels gain lightweight wrappers", () => {
    const wrappedFixtureHtml = `
      <main>
        <h1>Enneagram Personality Test</h1>
        <p>Step 1 of 11</p>
        <form action="/test/enneagram-personality-test" method="post">
          <fieldset data-atti-question-block="question-1">
            <legend><span> I strive for perfection </span></legend>
            <label><span><input type="radio" name="question-1" value="1" /></span><span>Inaccurate</span></label>
            <label><span><input type="radio" name="question-1" value="2" /></span><span>Somewhat Inaccurate</span></label>
            <label><span><input type="radio" name="question-1" value="3" /></span><span>Neutral</span></label>
            <label><span><input type="radio" name="question-1" value="4" /></span><span>Somewhat Accurate</span></label>
            <label><span><input type="radio" name="question-1" value="5" /></span><span>Accurate</span></label>
          </fieldset>
        </form>
      </main>
    `;

    const result = extractTruityEnneagramQuestions({
      url: "https://www.truity.com/test/enneagram-personality-test",
      title: "Enneagram Personality Test | Truity",
      html: wrappedFixtureHtml
    });

    expect(result).toEqual({
      questionCount: 1,
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
        }
      ]
    });
  });

  it("extracts live-page questions despite casing and whitespace drift around prompts", () => {
    const driftedLiveHtml = `
      <main>
        <h1>Enneagram Personality Test</h1>
        <p> To take the Enneagram test, mark each statement based on how well it describes your personality. </p>
        <section>
          <h2> I STRIVE
            FOR PERFECTION </h2>
          <div> Inaccurate </div>
          <div> Accurate </div>
        </section>
        <p>Step 1 of 11</p>
      </main>
    `;

    const result = extractTruityEnneagramQuestions({
      url: "https://www.truity.com/test/enneagram-personality-test",
      title: "Enneagram Personality Test | Truity",
      html: driftedLiveHtml
    });

    expect(result.questions[0]).toMatchObject({
      text: "I STRIVE FOR PERFECTION",
      order: 0
    });
  });

  it("keeps later Truity steps supported during drift checks", () => {
    const laterStepHtml = `
      <main>
        <h1>Enneagram Personality Test</h1>
        <p>To take the Enneagram test, mark each statement based on how well it describes your personality.</p>
        <section>
          <h2>I strive for perfection</h2>
          <div>Inaccurate</div>
          <div>Accurate</div>
        </section>
        <p>Step 7 of 11</p>
      </main>
    `;

    const result = extractTruityEnneagramQuestions({
      url: "https://www.truity.com/test/enneagram-personality-test",
      title: "Enneagram Personality Test | Truity",
      html: laterStepHtml
    });

    expect(result.questionCount).toBe(1);
    expect(result.questions[0]).toMatchObject({
      text: "I strive for perfection",
      order: 0
    });
  });

  it("fills answers through the structured prompt and radio-group fallback path", () => {
    const { document, firstInput, selectedInput } = createStructuredFillDocument();

    const result = fillTruityEnneagramAnswers(
      {
        url: "https://www.truity.com/test/enneagram-personality-test",
        title: "Enneagram Personality Test | Truity",
        document: document as unknown as Document
      },
      [
        {
          questionId: "question-1",
          questionText: "I strive for perfection",
          questionOrder: 0,
          selectedOptionIds: ["5"]
        }
      ]
    );

    expect(result).toEqual({ filledCount: 1 });
    expect(firstInput.checked).toBe(false);
    expect(selectedInput.checked).toBe(true);
    expect(selectedInput.clickCount).toBe(1);
  });

  it("returns sanitized adapter-boundary details when fill cannot resolve a target", () => {
    const { document } = createStructuredFillDocument();

    expect(() =>
      fillTruityEnneagramAnswers(
        {
          url: "https://www.truity.com/test/enneagram-personality-test",
          title: "Enneagram Personality Test | Truity",
          document: document as unknown as Document
        },
        [
          {
            questionId: "question-9",
            questionText: "Unknown prompt",
            questionOrder: 9,
            selectedOptionIds: ["5"]
          }
        ]
      )
    ).toThrow(
      "Unable to locate Truity question target within adapter boundary: questionId=question-9 promptKey=unknown-prompt order=9"
    );
  });
});
