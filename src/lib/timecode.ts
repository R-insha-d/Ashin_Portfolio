export const FPS = 25;                       // PAL, matches Indian broadcast
export const SEQUENCE_FRAMES = 30 * FPS;     // 750 → 00:00:30:00
const pad = (n: number) => String(n).padStart(2, '0');
export function formatTimecode(frames: number): string {
  const f = Math.max(0, Math.floor(frames));
  const ff = f % FPS;
  const total = Math.floor(f / FPS);
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor(total / 60) % 60)}:${pad(total % 60)}:${pad(ff)}`;
}
