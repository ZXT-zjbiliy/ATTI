import type { AdapterMatchContext, SiteAdapter } from "../base/site-adapter";
import { placeholderSiteAdapter } from "../sites/placeholder-site-adapter";
import { truityEnneagramSiteAdapter } from "../sites/truity-enneagram";

export interface AdapterRegistry {
  listAdapters: () => readonly SiteAdapter[];
  findMatchingAdapter: (context: AdapterMatchContext) => SiteAdapter | null;
}

export function createAdapterRegistry(
  adapters: readonly SiteAdapter[] = [
    truityEnneagramSiteAdapter,
    placeholderSiteAdapter,
  ],
): AdapterRegistry {
  return {
    listAdapters() {
      return adapters;
    },
    findMatchingAdapter(context) {
      return adapters.find((adapter) => adapter.matches(context)) ?? null;
    },
  };
}

export const adapterRegistry = createAdapterRegistry();
