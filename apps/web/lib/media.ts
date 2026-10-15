/**
 * Gameplay clips ship with the app in /public/media (≈2 MB in total), so they always deploy
 * together with the code that names them.
 */
export const CLIPS = {
  valleyMap: "valley-map",
  minerCave: "miner-cave",
  minerSun: "miner-sun",
  zandy: "zandy",
  traits: "traits",
} as const;

export type Clip = (typeof CLIPS)[keyof typeof CLIPS];

export function clipSrc(clip: Clip): string {
  return `/media/${clip}.mp4`;
}

export function posterSrc(clip: Clip): string {
  return `/media/posters/${clip}.webp`;
}

/** Muted loops may autoplay everywhere; set the property before asking, and retry once data arrives. */
export function playMuted(v: HTMLVideoElement) {
  v.muted = true;
  v.defaultMuted = true;
  v.playsInline = true;
  const p = v.play();
  if (p && typeof p.catch === "function") p.catch(() => {});
}
