import { RefObject, useEffect, useState } from "react";

export function useHasContentBelow(
  contentEndRef: RefObject<HTMLElement | null>,
  boundaryRef: RefObject<HTMLElement | null>,
): boolean {
  const [hasContentBelow, setHasContentBelow] = useState(false);

  useEffect(() => {
    const endEl = contentEndRef.current;
    const barEl = boundaryRef.current;
    if (!endEl || !barEl) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setHasContentBelow(!entry!.isIntersecting);
      },
      { root: null, threshold: 0 },
    );
    observer.observe(endEl);

    return () => observer.disconnect();
  }, [contentEndRef, boundaryRef]);

  return hasContentBelow;
}
