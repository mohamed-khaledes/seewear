"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Options = {
  hasNextPage: boolean;
  isFetching: boolean;
  fetchNextPage: () => void;
  /** How far ahead of the sentinel to start loading. */
  rootMargin?: string;
};

/**
 * Loads the next page while a sentinel near the end of the list is in view.
 *
 * The observer records whether the sentinel is showing; an effect does the
 * fetching. That split matters: IntersectionObserver only fires when the
 * intersection *changes*, and on a short page the sentinel can sit in view the
 * whole time — so a callback that fetched directly would load exactly one extra
 * page and then go quiet. Watching the flag instead means each finished fetch
 * re-checks, and pages keep coming until the list outgrows the viewport.
 *
 * Returns a ref callback: attach it to an element after the last row.
 */
export function useInfiniteScroll({
  hasNextPage,
  isFetching,
  fetchNextPage,
  rootMargin = "600px",
}: Options) {
  const [showing, setShowing] = useState(false);
  const observer = useRef<IntersectionObserver | null>(null);

  const sentinelRef = useCallback(
    (node: HTMLElement | null) => {
      observer.current?.disconnect();
      if (!node) return;

      observer.current = new IntersectionObserver(
        (entries) => setShowing(Boolean(entries[0]?.isIntersecting)),
        { rootMargin },
      );
      observer.current.observe(node);
    },
    [rootMargin],
  );

  useEffect(() => () => observer.current?.disconnect(), []);

  useEffect(() => {
    if (showing && hasNextPage && !isFetching) fetchNextPage();
  }, [showing, hasNextPage, isFetching, fetchNextPage]);

  return sentinelRef;
}
