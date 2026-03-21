// Web Worker for generating deterministic waveform peaks off the main thread

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

self.addEventListener("message", (e: MessageEvent<{ soundId: string }>) => {
  const peaks = generatePeaks(e.data.soundId, 100);
  const pathD = peaks.map((ratio, i) => `M${i},${1 - ratio}v${ratio}`).join("");
  self.postMessage({ soundId: e.data.soundId, pathD });
});
