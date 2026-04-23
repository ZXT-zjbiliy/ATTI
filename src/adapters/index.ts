export { adapterRegistry, createAdapterRegistry } from "./registry/adapter-registry";
export { siteAdapterCatalog } from "./registry/adapter-catalog";
export type {
  AdapterCapabilities,
  ExtractedQuestionDraft,
  AdapterMatchContext,
  AdapterPageContext,
  LocatedQuestionRegion,
  QuestionExtractionResult,
  QuestionRegionLocatorResult,
  SiteAdapter,
  SiteAdapterDescriptor,
} from "./base/site-adapter";
export { placeholderSiteAdapter } from "./sites/placeholder-site-adapter";
export { truityDiscSiteAdapter } from "./sites/truity-disc-site-adapter";
export { truityTypeFinderSiteAdapter } from "./sites/truity-typefinder-site-adapter";
export {
  sixteenPersonalitiesSiteAdapter,
  extractSixteenPersonalitiesQuestions,
  fillSixteenPersonalitiesAnswers,
  isSupportedSixteenPersonalitiesAssessmentPage,
  locateSixteenPersonalitiesQuestionRegions,
  matchesSixteenPersonalitiesTestUrl,
} from "./sites/sixteen-personalities-site-adapter";
export { truityEnneagramSiteAdapter } from "./sites/truity-enneagram";
