export type {
    AdapterCapabilities, AdapterMatchContext,
    AdapterPageContext, ExtractedQuestionDraft, LocatedQuestionRegion,
    QuestionExtractionResult,
    QuestionRegionLocatorResult,
    SiteAdapter,
    SiteAdapterDescriptor
} from "./base/site-adapter";
export { siteAdapterCatalog } from "./registry/adapter-catalog";
export { adapterRegistry, createAdapterRegistry } from "./registry/adapter-registry";
export { genericFallbackSiteAdapter } from "./sites/generic-fallback-site-adapter";
export { placeholderSiteAdapter } from "./sites/placeholder-site-adapter";
export {
    extractSixteenPersonalitiesQuestions,
    fillSixteenPersonalitiesAnswers,
    isSupportedSixteenPersonalitiesAssessmentPage,
    locateSixteenPersonalitiesQuestionRegions,
    matchesSixteenPersonalitiesTestUrl, sixteenPersonalitiesSiteAdapter
} from "./sites/sixteen-personalities-site-adapter";
export {
    extractSbtiQuestions,
    fillSbtiAnswers,
    isSupportedSbtiAssessmentPage,
    locateSbtiQuestionRegions,
    matchesSbtiTestUrl,
    sbtiSiteAdapter
} from "./sites/sbti";
export { truityDiscSiteAdapter } from "./sites/truity-disc-site-adapter";
export { truityEnneagramSiteAdapter } from "./sites/truity-enneagram";
export { truityTypeFinderSiteAdapter } from "./sites/truity-typefinder-site-adapter";
