"use client";

import { useEffect, useRef, useState } from "react";
import { clipSrc, playMuted, posterSrc, type Clip } from "@/lib/media";
import { cx } from "./ui";

/**
 * A muted, looping gameplay clip. Below-the-fold clips start loading when they get near the
 * viewport; `eager` ones load straight away. Every clip plays on its own — the poster frame is
 * only what shows while the first frames arrive.
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
  /** Empty for decorative clips (hidden from screen readers). */
  label: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(eager);
  const src = near ? clipSrc(clip) : undefined;

  useEffect(() => {
    const v = ref.current;
    if (!v || near) return;
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
  }, [near]);

  useEffect(() => {
    const v = ref.current;
    if (v && src) playMuted(v);
  }, [src]);

  return (
    <video
      ref={ref}
      src={src}
      poster={posterSrc(clip)}
      muted
      loop
      playsInline
      autoPlay
      preload={eager ? "auto" : "metadata"}
      onCanPlay={(e) => {
        if (e.currentTarget.paused) playMuted(e.currentTarget);
      }}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
      className={cx("block w-full object-cover pixelated", className)}
      style={style}
    />
  );
}
