import type { SiteAdapter } from "../base/site-adapter";
import { genericFallbackSiteAdapter } from "../sites/generic-fallback-site-adapter";
import { placeholderSiteAdapter } from "../sites/placeholder-site-adapter";
import { sixteenPersonalitiesSiteAdapter } from "../sites/sixteen-personalities-site-adapter";
import { sbtiSiteAdapter } from "../sites/sbti";
import { truityDiscSiteAdapter } from "../sites/truity-disc-site-adapter";
import { truityEnneagramSiteAdapter } from "../sites/truity-enneagram";
import { truityTypeFinderSiteAdapter } from "../sites/truity-typefinder-site-adapter";

// Keep site registration explicit: one adapter module per supported site family.
export const siteAdapterCatalog: readonly SiteAdapter[] = [
  truityEnneagramSiteAdapter,
  truityDiscSiteAdapter,
  truityTypeFinderSiteAdapter,
  sixteenPersonalitiesSiteAdapter,
  sbtiSiteAdapter,
  genericFallbackSiteAdapter,
  placeholderSiteAdapter,
];
