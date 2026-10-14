"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { cx } from "../../ui";

const SLIDES = [
  { src: "/media/posters/traits.webp", alt: "The Valley Miner trait sheet: helmets, tools, gems, ores and backgrounds" },
  { src: "/media/posters/valley-map.webp", alt: "A miner working the valley floor beside the mine entrance" },
  { src: "/media/posters/miner-sun.webp", alt: "A surface scout in a wide-brim hat" },
  { src: "/media/posters/miner-cave.webp", alt: "A deep digger in a red helmet" },
];

/** Crossfading banner strip. Every slide is mounted so the swap never flashes an empty frame. */
export function GateBanner({ className }: { className?: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((n) => (n + 1) % SLIDES.length), 4500);
    return () => clearInterval(t);
  }, []);
  return (
    <div className={cx("relative w-full overflow-hidden bg-[#DDA02A]", className)}>
      {SLIDES.map((s, n) => (
        <Image
          key={s.src}
          src={s.src}
          alt={n === i ? s.alt : ""}
          fill
          unoptimized
          priority={n === 0}
          className={cx("object-cover pixelated transition-opacity duration-[900ms] ease-in-out", n === i ? "opacity-100" : "opacity-0")}
        />
      ))}
      <div className="absolute bottom-2.5 right-3 flex gap-1.5">
        {SLIDES.map((s, n) => (
          <span key={s.src} aria-hidden className={cx("block size-2.5 border-2 border-night transition-colors duration-300", n === i ? "bg-gold" : "bg-cream/70")} />
        ))}
      </div>
    </div>
  );
}
