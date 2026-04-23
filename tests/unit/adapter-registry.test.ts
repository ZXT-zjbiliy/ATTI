import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { createAdapterRegistry } from "../../src/adapters/registry/adapter-registry";
import { siteAdapterCatalog } from "../../src/adapters/registry/adapter-catalog";
import { placeholderSiteAdapter } from "../../src/adapters/sites/placeholder-site-adapter";
import { sixteenPersonalitiesSiteAdapter } from "../../src/adapters/sites/sixteen-personalities-site-adapter";
import { truityDiscSiteAdapter } from "../../src/adapters/sites/truity-disc-site-adapter";
import { truityTypeFinderSiteAdapter } from "../../src/adapters/sites/truity-typefinder-site-adapter";
import {
  extractTruityEnneagramQuestions,
  locateTruityEnneagramQuestionRegions,
  truityEnneagramSiteAdapter,
} from "../../src/adapters/sites/truity-enneagram";

const truityEnneagramFixture = readFileSync(
  resolve(
    process.cwd(),
    "tests/fixtures/adapters/truity-enneagram-assessment.html",
  ),
  "utf8",
);
const truityEnneagramLivePageFixture = readFileSync(
  resolve(
    process.cwd(),
    "tests/fixtures/adapters/truity-enneagram-live-page.html",
  ),
  "utf8",
);

describe("adapter registry", () => {
  it("exposes an explicit adapter catalog instead of hiding site registration in runtime code", () => {
    expect(siteAdapterCatalog).toEqual([
      truityEnneagramSiteAdapter,
      truityDiscSiteAdapter,
      truityTypeFinderSiteAdapter,
      sixteenPersonalitiesSiteAdapter,
      placeholderSiteAdapter,
    ]);
  });

  it("resolves the Truity Enneagram adapter when the real-site match rule fits", () => {
    const registry = createAdapterRegistry();

    const adapter = registry.findMatchingAdapter({
      url: "https://www.truity.com/test/enneagram-personality-test",
      title: "Enneagram Personality Test | Truity",
    });

    expect(adapter).toBe(truityEnneagramSiteAdapter);
    expect(adapter?.descriptor.siteId).toBe("truity-enneagram");
  });

  it("resolves the placeholder adapter when the match rule fits", () => {
    const registry = createAdapterRegistry();

    const adapter = registry.findMatchingAdapter({
      url: "https://placeholder.assessment.local/assessment-shell/demo",
      title: "Placeholder Assessment",
    });

    expect(adapter).toBe(placeholderSiteAdapter);
    expect(adapter?.descriptor.siteId).toBe("placeholder-assessment");
  });

  it("resolves the 16Personalities adapter when the match rule fits", () => {
    const registry = createAdapterRegistry();

    const adapter = registry.findMatchingAdapter({
      url: "https://www.16personalities.com/free-personality-test",
      title: "Free Personality Test | 16Personalities",
    });

    expect(adapter).toBe(sixteenPersonalitiesSiteAdapter);
    expect(adapter?.descriptor.siteId).toBe("sixteen-personalities");
  });

  it("resolves the Truity DISC adapter when the match rule fits", () => {
    const registry = createAdapterRegistry();

    const adapter = registry.findMatchingAdapter({
      url: "https://www.truity.com/test/disc-personality-test",
      title: "DISC Personality Assessment",
    });

    expect(adapter).toBe(truityDiscSiteAdapter);
    expect(adapter?.descriptor.siteId).toBe("truity-disc");
  });

  it("resolves the Truity TypeFinder adapter when the match rule fits", () => {
    const registry = createAdapterRegistry();

    const adapter = registry.findMatchingAdapter({
      url: "https://www.truity.com/test/type-finder-personality-test-new",
      title: "Personality Test of Myers & Briggs' 16 Types | TypeFinder®",
    });

    expect(adapter).toBe(truityTypeFinderSiteAdapter);
    expect(adapter?.descriptor.siteId).toBe("truity-typefinder");
  });

  it("returns null when no adapter matches", () => {
    const registry = createAdapterRegistry();

    const adapter = registry.findMatchingAdapter({
      url: "https://example.com/unrelated",
      title: "Unrelated Page",
    });

    expect(adapter).toBeNull();
  });

  it("can resolve a registered adapter by siteId", () => {
    const registry = createAdapterRegistry();

    expect(registry.getAdapterBySiteId("truity-enneagram")).toBe(truityEnneagramSiteAdapter);
    expect(registry.getAdapterBySiteId("truity-disc")).toBe(truityDiscSiteAdapter);
    expect(registry.getAdapterBySiteId("truity-typefinder")).toBe(truityTypeFinderSiteAdapter);
    expect(registry.getAdapterBySiteId("sixteen-personalities")).toBe(
      sixteenPersonalitiesSiteAdapter,
    );
    expect(registry.getAdapterBySiteId("placeholder-assessment")).toBe(placeholderSiteAdapter);
    expect(registry.getAdapterBySiteId("unknown-site")).toBeNull();
  });

  it("lists adapter descriptors without exposing adapter implementation ownership to runtime callers", () => {
    const registry = createAdapterRegistry();

    expect(registry.listAdapterDescriptors()).toEqual([
      truityEnneagramSiteAdapter.descriptor,
      truityDiscSiteAdapter.descriptor,
      truityTypeFinderSiteAdapter.descriptor,
      sixteenPersonalitiesSiteAdapter.descriptor,
      placeholderSiteAdapter.descriptor,
    ]);
  });

  it("rejects duplicate site registrations", () => {
    expect(() =>
      createAdapterRegistry([
        truityEnneagramSiteAdapter,
        {
          ...truityEnneagramSiteAdapter,
          descriptor: {
            ...truityEnneagramSiteAdapter.descriptor,
          },
        },
      ]),
    ).toThrowError("Duplicate adapter siteId registration: truity-enneagram");
  });
});

describe("adapter boundaries", () => {
  it("detects the Truity fixture as a supported assessment page", () => {
    expect(
      truityEnneagramSiteAdapter.isSupportedAssessmentPage?.({
        url: "https://www.truity.com/test/enneagram-personality-test",
        title: "Enneagram Personality Test | Truity",
        html: truityEnneagramFixture,
      }),
    ).toBe(true);
  });

  it("locates question regions from the Truity fixture baseline", () => {
    const result = locateTruityEnneagramQuestionRegions({
      url: "https://www.truity.com/test/enneagram-personality-test",
      title: "Enneagram Personality Test | Truity",
      html: truityEnneagramFixture,
    });

    expect(result.isSupportedAssessmentPage).toBe(true);
    expect(result.questionRegions).toEqual([
      {
        order: 0,
        promptText: "I strive for perfection",
        locatorHint: "prompt-key:i-strive-for-perfection",
      },
      {
        order: 1,
        promptText: "I work hard to be helpful to others",
        locatorHint: "prompt-key:i-work-hard-to-be-helpful-to-others",
      },
    ]);
  });

  it("extracts normalized questions from the Truity fixture baseline", () => {
    const result = extractTruityEnneagramQuestions({
      url: "https://www.truity.com/test/enneagram-personality-test",
      title: "Enneagram Personality Test | Truity",
      html: truityEnneagramFixture,
    });

    expect(result.questionCount).toBe(2);
    expect(result.questions).toEqual([
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
    ]);
  });

  it("supports later Truity assessment steps instead of only the first page", () => {
    const laterStepHtml = truityEnneagramFixture.replace("Step 1 of 11", "Step 2 of 11");

    const result = extractTruityEnneagramQuestions({
      url: "https://www.truity.com/test/enneagram-personality-test",
      title: "Enneagram Personality Test | Truity",
      html: laterStepHtml,
    });

    expect(result.questionCount).toBe(2);
    expect(result.questions.map((question) => question.text)).toEqual([
      "I strive for perfection",
      "I work hard to be helpful to others",
    ]);
  });

  it("locates question regions from the live Truity page shape", () => {
    const result = locateTruityEnneagramQuestionRegions({
      url: "https://www.truity.com/test/enneagram-personality-test",
      title: "Enneagram Personality Test | Truity",
      html: truityEnneagramLivePageFixture,
    });

    expect(result.isSupportedAssessmentPage).toBe(true);
    expect(result.questionRegions).toEqual([
      {
        order: 0,
        promptText: "I strive for perfection",
        locatorHint: "prompt-key:i-strive-for-perfection",
      },
      {
        order: 1,
        promptText: "I work hard to be helpful to others",
        locatorHint: "prompt-key:i-work-hard-to-be-helpful-to-others",
      },
      {
        order: 2,
        promptText: "It is important to me that other people like me",
        locatorHint: "prompt-key:it-is-important-to-me-that-other-people-like-me",
      },
    ]);
  });

  it("extracts normalized questions from the live Truity page shape", () => {
    const result = extractTruityEnneagramQuestions({
      url: "https://www.truity.com/test/enneagram-personality-test",
      title: "Enneagram Personality Test | Truity",
      html: truityEnneagramLivePageFixture,
    });

    expect(result.questionCount).toBe(3);
    expect(result.questions).toEqual([
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
      {
        text: "It is important to me that other people like me",
        type: "single-choice-rating",
        options: [
          { id: "1", text: "Inaccurate", value: "1" },
          { id: "2", text: "Somewhat Inaccurate", value: "2" },
          { id: "3", text: "Neutral", value: "3" },
          { id: "4", text: "Somewhat Accurate", value: "4" },
          { id: "5", text: "Accurate", value: "5" },
        ],
        order: 2,
      },
    ]);
  });

  it("keeps the placeholder adapter free of orchestration concerns", () => {
    const content = readFileSync(
      resolve(
        process.cwd(),
        "src/adapters/sites/placeholder-site-adapter.ts",
      ),
      "utf8",
    );

    expect(content).not.toContain("/background/");
    expect(content).not.toContain("/storage/");
    expect(content).not.toContain("/llm/");
    expect(content).not.toContain("sendMessage");
    expect(content).not.toContain("chrome.");
  });

  it("keeps the Truity adapter free of orchestration concerns", () => {
    const content = readFileSync(
      resolve(
        process.cwd(),
        "src/adapters/sites/truity-enneagram/truity-enneagram-site-adapter.ts",
      ),
      "utf8",
    );

    expect(content).not.toContain("/background/");
    expect(content).not.toContain("/storage/");
    expect(content).not.toContain("/llm/");
    expect(content).not.toContain("sendMessage");
    expect(content).not.toContain("chrome.");
  });

  it("keeps the registry decoupled from content runtime logic", () => {
    const registryContent = readFileSync(
      resolve(process.cwd(), "src/adapters/registry/adapter-registry.ts"),
      "utf8",
    );
    const catalogContent = readFileSync(
      resolve(process.cwd(), "src/adapters/registry/adapter-catalog.ts"),
      "utf8",
    );
    const contentRuntime = readFileSync(
      resolve(process.cwd(), "src/content/runtime.ts"),
      "utf8",
    );

    expect(registryContent).not.toContain("/content/");
    expect(catalogContent).not.toContain("/content/");
    expect(catalogContent).not.toContain("/background/");
    expect(catalogContent).not.toContain("/llm/");
    expect(contentRuntime).not.toContain("/adapters/");
    expect(contentRuntime).not.toContain("createAdapterRegistry");
  });

  it("keeps Truity-specific site logic inside adapter modules only", () => {
    const nonAdapterSourceFiles = [
      "src/background/runtime.ts",
      "src/content/runtime.ts",
      "src/storage/repos/question-repo.ts",
      "src/storage/repos/answer-plan-repo.ts",
      "src/app/sidepanel/App.tsx",
    ];

    for (const filePath of nonAdapterSourceFiles) {
      const content = readFileSync(resolve(process.cwd(), filePath), "utf8");

      expect(content).not.toContain("www.truity.com");
      expect(content).not.toContain("Enneagram Personality Test");
      expect(content).not.toContain("truity-enneagram");
    }
  });
});
