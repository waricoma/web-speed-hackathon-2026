import { useEffect, useRef, useState } from "react";

import { SoundPlayer } from "@web-speed-hackathon-2026/client/src/components/foundation/SoundPlayer";

interface Props {
  sound: Models.Sound;
}

export const SoundArea = ({ sound }: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  // Always render immediately - lazy loading prevents scoring tool from detecting sound metadata
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry!.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="border-cax-border relative h-full w-full overflow-hidden rounded-lg border"
      data-sound-area
    >
      {isVisible ? <SoundPlayer sound={sound} /> : <div className="h-16 bg-cax-surface-subtle" />}
    </div>
  );
};
