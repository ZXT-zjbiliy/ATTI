import type { ContentPageMetadata } from "../shared/types";

export interface ContentDocumentLike {
  readonly title: string;
  readonly readyState: string;
}

export interface ContentLocationLike {
  readonly href: string;
}

export interface ContentWindowLike {
  readonly self: unknown;
  readonly top: unknown;
}

export function collectContentPageMetadata(
  document: ContentDocumentLike,
  location: ContentLocationLike,
  window: ContentWindowLike
): ContentPageMetadata {
  return {
    url: location.href,
    title: document.title,
    readyState: document.readyState,
    isTopLevel: window.self === window.top
  };
}
