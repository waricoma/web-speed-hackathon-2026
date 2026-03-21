import { useEffect, useMemo, useState } from "react";

interface Props {
  soundId: string;
}

// Fallback: generate peaks on main thread if Worker unavailable
function generatePeaks(id: string, count: number): number[] {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  }
  const peaks: number[] = [];
  for (let i = 0; i < count; i++) {
    peaks.push(0.3 + 0.4 * Math.abs(Math.sin(i * 0.3 + hash) * Math.sin(i * 0.07 + hash * 0.5)));
  }
  return peaks;
}

function generatePathD(id: string): string {
  const peaks = generatePeaks(id, 100);
  return peaks.map((ratio, i) => `M${i},${1 - ratio}v${ratio}`).join("");
}

// Shared worker instance (lazy initialized)
let sharedWorker: Worker | null = null;
let workerFailed = false;
const pendingCallbacks = new Map<string, (pathD: string) => void>();

function getWorker(): Worker | null {
  if (workerFailed) return null;
  if (sharedWorker) return sharedWorker;
  try {
    sharedWorker = new Worker(new URL("@web-speed-hackathon-2026/client/src/workers/waveform-worker.ts", import.meta.url));
    sharedWorker.addEventListener("message", (e: MessageEvent<{ soundId: string; pathD: string }>) => {
      const cb = pendingCallbacks.get(e.data.soundId);
      if (cb) {
        cb(e.data.pathD);
        pendingCallbacks.delete(e.data.soundId);
      }
    });
    return sharedWorker;
  } catch {
    workerFailed = true;
    return null;
  }
}

export const SoundWaveSVG = ({ soundId }: Props) => {
  const [pathD, setPathD] = useState<string | null>(null);

  // Fallback path for SSR or if worker fails
  const fallbackPathD = useMemo(() => generatePathD(soundId), [soundId]);

  useEffect(() => {
    const worker = getWorker();
    if (!worker) {
      setPathD(fallbackPathD);
      return;
    }
    pendingCallbacks.set(soundId, setPathD);
    worker.postMessage({ soundId });
    return () => {
      pendingCallbacks.delete(soundId);
    };
  }, [soundId, fallbackPathD]);

  const d = pathD ?? fallbackPathD;

  return (
    <svg className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 1">
      <path d={d} stroke="var(--color-cax-accent)" strokeWidth="1" fill="none" vectorEffect="non-scaling-stroke" />
    </svg>
  );
};
