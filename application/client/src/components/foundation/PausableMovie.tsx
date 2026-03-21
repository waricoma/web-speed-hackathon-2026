import classNames from "classnames";
import { useCallback, useEffect, useRef, useState } from "react";

import { AspectRatioBox } from "@web-speed-hackathon-2026/client/src/components/foundation/AspectRatioBox";
import { FontAwesomeIcon } from "@web-speed-hackathon-2026/client/src/components/foundation/FontAwesomeIcon";

const reducedMotion = typeof window !== "undefined" ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false;

interface Props {
  src: string;
  posterSrc?: string;
}

export const PausableMovie = ({ src, posterSrc }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(!reducedMotion);
  // Start with poster image, defer video element mount until visible
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry!.isIntersecting) {
          setShowVideo(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleClick = useCallback(() => {
    if (!showVideo) {
      setShowVideo(true);
      return;
    }
    setIsPlaying((prev) => {
      if (prev) {
        videoRef.current?.pause();
      } else {
        videoRef.current?.play();
      }
      return !prev;
    });
  }, [showVideo]);

  return (
    <AspectRatioBox aspectHeight={1} aspectWidth={1}>
      <div ref={containerRef} className="h-full w-full">
        <button
          aria-label="動画プレイヤー"
          className="group relative block h-full w-full"
          onClick={handleClick}
          type="button"
        >
          {showVideo ? (
            <video
              ref={videoRef}
              autoPlay={!reducedMotion}
              className="h-full w-full object-cover"
              loop
              muted
              playsInline
              preload="metadata"
              src={src}
              onError={(e) => {
                const video = e.currentTarget;
                const retry = parseInt(video.dataset.retry || "0", 10);
                if (retry >= 10) return;
                video.dataset.retry = String(retry + 1);
                const delay = retry < 2 ? 500 : retry < 5 ? 1000 : 2000;
                setTimeout(() => { video.src = `${src}${src.includes("?") ? "&" : "?"}_r=${Date.now()}`; }, delay);
              }}
            />
          ) : posterSrc ? (
            <img className="h-full w-full object-cover" src={posterSrc} alt="" decoding="async" loading="lazy" />
          ) : (
            <div className="h-full w-full bg-cax-surface-subtle" />
          )}
          <div
            className={classNames(
              "absolute left-1/2 top-1/2 flex items-center justify-center w-16 h-16 text-cax-surface-raised text-3xl bg-cax-overlay/50 rounded-full -translate-x-1/2 -translate-y-1/2",
              {
                "opacity-0 group-hover:opacity-100": isPlaying && showVideo,
              },
            )}
          >
            <FontAwesomeIcon iconType={isPlaying && showVideo ? "pause" : "play"} styleType="solid" />
          </div>
        </button>
      </div>
    </AspectRatioBox>
  );
};
