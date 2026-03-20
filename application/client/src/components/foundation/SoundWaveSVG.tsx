import { useEffect, useRef, useState } from "react";

import { fetchJSON } from "@web-speed-hackathon-2026/client/src/utils/fetchers";

interface Props {
  soundId: string;
}

export const SoundWaveSVG = ({ soundId }: Props) => {
  const uniqueIdRef = useRef(Math.random().toString(16));
  const [peaks, setPeaks] = useState<number[]>([]);

  useEffect(() => {
    fetchJSON<{ peaks: number[] }>(`/api/v1/waveform/${soundId}`).then(({ peaks }) => {
      setPeaks(peaks);
    });
  }, [soundId]);

  if (peaks.length === 0) return null;

  return (
    <svg className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 1">
      {peaks.map((ratio, idx) => (
        <rect
          key={`${uniqueIdRef.current}#${idx}`}
          fill="var(--color-cax-accent)"
          height={ratio}
          width="1"
          x={idx}
          y={1 - ratio}
        />
      ))}
    </svg>
  );
};
