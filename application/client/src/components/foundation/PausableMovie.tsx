import classNames from "classnames";
import { useCallback, useEffect, useRef, useState } from "react";

import { AspectRatioBox } from "@web-speed-hackathon-2026/client/src/components/foundation/AspectRatioBox";
import { FontAwesomeIcon } from "@web-speed-hackathon-2026/client/src/components/foundation/FontAwesomeIcon";

const reducedMotion = typeof window !== "undefined" ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false;

interface Props {
  src: string;
  posterSrc?: string;
  eager?: boolean;
}

export const PausableMovie = ({ src, posterSrc, eager = false }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const [isPlaying, setIsPlaying] = useState(!reducedMotion);
  // eager=true skips IntersectionObserver and shows video immediately
  const [showVideo, setShowVideo] = useState(eager);

  useEffect(() => {
    if (eager || showVideo) return;
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
  }, [eager, showVideo]);

  // Draw video frames to canvas (matches upstream's gifler canvas rendering approach)
  useEffect(() => {
    if (!showVideo) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let lastDrawTime = 0;
    const drawFrame = (timestamp: number) => {
      // Throttle to ~12fps to match video frame rate and reduce main thread usage
      if (timestamp - lastDrawTime > 80) {
        lastDrawTime = timestamp;
        if (video.readyState >= 2) {
          if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth || 320;
            canvas.height = video.videoHeight || 320;
          }
          ctx.drawImage(video, 0, 0);
        }
      }
      rafRef.current = requestAnimationFrame(drawFrame);
    };

    const onPlay = () => { rafRef.current = requestAnimationFrame(drawFrame); };
    const onLoaded = () => {
      canvas.width = video.videoWidth || 320;
      canvas.height = video.videoHeight || 320;
      ctx.drawImage(video, 0, 0);
    };

    video.addEventListener("play", onPlay);
    video.addEventListener("loadeddata", onLoaded);

    if (!video.paused) {
      rafRef.current = requestAnimationFrame(drawFrame);
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("loadeddata", onLoaded);
    };
  }, [showVideo]);

  const handleClick = useCallback(() => {
    if (!showVideo) {
      setShowVideo(true);
      return;
    }
    setIsPlaying((prev) => {
      if (prev) {
        videoRef.current?.pause();
        cancelAnimationFrame(rafRef.current);
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
            <>
              <video
                ref={videoRef}
                autoPlay={!reducedMotion}
                className="hidden"
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
              <canvas ref={canvasRef} className="h-full w-full object-cover" />
            </>
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
