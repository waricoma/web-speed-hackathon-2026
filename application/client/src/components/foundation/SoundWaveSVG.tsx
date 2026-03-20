import { useEffect, useRef, useState } from "react";

interface ParsedData {
  max: number;
  peaks: number[];
}

function mean(arr: (number | undefined)[]): number {
  let sum = 0;
  let count = 0;
  for (const v of arr) {
    if (v != null) {
      sum += v;
      count++;
    }
  }
  return count > 0 ? sum / count : 0;
}

let sharedAudioCtx: AudioContext | null = null;
const cache = new WeakMap<ArrayBuffer, ParsedData>();

async function calculate(data: ArrayBuffer): Promise<ParsedData> {
  const cached = cache.get(data);
  if (cached) return cached;

  if (!sharedAudioCtx) {
    sharedAudioCtx = new AudioContext();
  }

  const buffer = await sharedAudioCtx.decodeAudioData(data.slice(0));
  const leftData = Array.from(buffer.getChannelData(0), Math.abs);
  const rightData = buffer.numberOfChannels > 1
    ? Array.from(buffer.getChannelData(1), Math.abs)
    : leftData;

  const normalized = leftData.map((v, i) => mean([v, rightData[i]]));
  const chunkSize = Math.ceil(normalized.length / 100);
  const peaks: number[] = [];
  for (let i = 0; i < normalized.length; i += chunkSize) {
    peaks.push(mean(normalized.slice(i, i + chunkSize)));
  }
  const max = Math.max(...peaks, 0);

  const result = { max, peaks };
  cache.set(data, result);
  return result;
}

interface Props {
  soundData: ArrayBuffer;
}

export const SoundWaveSVG = ({ soundData }: Props) => {
  const uniqueIdRef = useRef(Math.random().toString(16));
  const [{ max, peaks }, setPeaks] = useState<ParsedData>({
    max: 0,
    peaks: [],
  });

  useEffect(() => {
    calculate(soundData).then(({ max, peaks }) => {
      setPeaks({ max, peaks });
    });
  }, [soundData]);

  return (
    <svg className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 1">
      {peaks.map((peak, idx) => {
        const ratio = peak / max;
        return (
          <rect
            key={`${uniqueIdRef.current}#${idx}`}
            fill="var(--color-cax-accent)"
            height={ratio}
            width="1"
            x={idx}
            y={1 - ratio}
          />
        );
      })}
    </svg>
  );
};
