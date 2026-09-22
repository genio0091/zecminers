"use client";

import { useEffect, useRef, useState } from "react";
import { clipSrc, posterSrc, type Clip } from "@/lib/media";
import { usePrefersReducedMotion } from "@/lib/use-clock";
import { cx } from "./ui";

/**
 * Clips are ~5 MB each: load one only when it's near the viewport, and never autoplay
 * for people who asked for reduced motion (they get the poster frame).
 */
export function LazyVideo({
  clip,
  className,
  eager = false,
  label,
  style,
}: {
  clip: Clip;
  className?: string;
  eager?: boolean;
  label: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(false);
  const reduce = usePrefersReducedMotion();
  const src = !reduce && (eager || near) ? clipSrc(clip) : undefined;

  useEffect(() => {
    const v = ref.current;
    if (!v || eager) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "500px 0px" },
    );
    io.observe(v);
    return () => io.disconnect();
  }, [eager]);

  useEffect(() => {
    const v = ref.current;
    if (v && src) v.play().catch(() => {});
  }, [src]);

  return (
    <video
      ref={ref}
      src={src}
      poster={posterSrc(clip)}
      muted
      loop
      playsInline
      autoPlay={!!src}
      preload={eager ? "auto" : "none"}
      aria-label={label}
      className={cx("block w-full object-cover pixelated", className)}
      style={style}
    />
  );
}
