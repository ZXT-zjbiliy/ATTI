import type { SiteAdapter } from "../base/site-adapter";
import { placeholderSiteAdapter } from "../sites/placeholder-site-adapter";
import { sixteenPersonalitiesSiteAdapter } from "../sites/sixteen-personalities-site-adapter";
import { truityEnneagramSiteAdapter } from "../sites/truity-enneagram";

// Keep site registration explicit: one adapter module per supported site family.
export const siteAdapterCatalog: readonly SiteAdapter[] = [
  truityEnneagramSiteAdapter,
  sixteenPersonalitiesSiteAdapter,
  placeholderSiteAdapter,
];
