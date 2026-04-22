export { adapterRegistry, createAdapterRegistry } from "./registry/adapter-registry";
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
export { truityEnneagramSiteAdapter } from "./sites/truity-enneagram";
