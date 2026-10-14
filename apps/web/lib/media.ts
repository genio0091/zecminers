/**
 * Gameplay clips live in /public/media by default. After `pnpm media:upload` they can be served
 * from a Vercel Blob store instead: set NEXT_PUBLIC_MEDIA_BASE_URL to the printed base URL.
 */
const BASE = (process.env.NEXT_PUBLIC_MEDIA_BASE_URL ?? "/media").replace(/\/$/, "");

export const CLIPS = {
  valleyMap: "valley-map",
  minerCave: "miner-cave",
  minerSun: "miner-sun",
  zandy: "zandy",
  traits: "traits",
} as const;

export type Clip = (typeof CLIPS)[keyof typeof CLIPS];

export function clipSrc(clip: Clip): string {
  return `${BASE}/${clip}.mp4`;
}

/** Posters always ship with the app so first paint never waits on the video host. */
export function posterSrc(clip: Clip): string {
  return `/media/posters/${clip}.webp`;
}
