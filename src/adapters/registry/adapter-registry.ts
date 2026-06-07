import type { AdapterMatchContext, SiteAdapter } from "../base/site-adapter";
import type { SiteAdapterDescriptor } from "../base/site-adapter";
import { siteAdapterCatalog } from "./adapter-catalog";

export interface AdapterRegistry {
  listAdapters: () => readonly SiteAdapter[];
  listAdapterDescriptors: () => readonly SiteAdapterDescriptor[];
  getAdapterBySiteId: (siteId: string) => SiteAdapter | null;
  findMatchingAdapter: (context: AdapterMatchContext) => SiteAdapter | null;
}

function assertUniqueSiteIds(adapters: readonly SiteAdapter[]): void {
  const seenSiteIds = new Set<string>();

  for (const adapter of adapters) {
    if (seenSiteIds.has(adapter.descriptor.siteId)) {
      throw new Error(`Duplicate adapter siteId registration: ${adapter.descriptor.siteId}`);
    }

    seenSiteIds.add(adapter.descriptor.siteId);
  }
}

export function createAdapterRegistry(
  adapters: readonly SiteAdapter[] = siteAdapterCatalog
): AdapterRegistry {
  const stableAdapters = [...adapters];
  const descriptorIndex = stableAdapters.map((adapter) => adapter.descriptor);
  const adapterBySiteId = new Map(
    stableAdapters.map((adapter) => [adapter.descriptor.siteId, adapter] as const)
  );

  assertUniqueSiteIds(stableAdapters);

  return {
    listAdapters() {
      return stableAdapters;
    },
    listAdapterDescriptors() {
      return descriptorIndex;
    },
    getAdapterBySiteId(siteId) {
      return adapterBySiteId.get(siteId) ?? null;
    },
    findMatchingAdapter(context) {
      return stableAdapters.find((adapter) => adapter.matches(context)) ?? null;
    }
  };
}

export const adapterRegistry = createAdapterRegistry();
