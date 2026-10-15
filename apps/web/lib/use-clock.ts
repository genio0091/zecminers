"use client";

import { useSyncExternalStore } from "react";

/** One shared 1 s ticker for every countdown on the page. Server render gets `null`. */
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;
let current = 0;

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (!timer) {
    current = Date.now();
    timer = setInterval(() => {
      current = Date.now();
      listeners.forEach((l) => l());
    }, 1000);
  }
  return () => {
    listeners.delete(cb);
    if (!listeners.size && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

export function useClock(offsetMs = 0): number | null {
  const now = useSyncExternalStore(
    subscribe,
    () => current || Date.now(),
    () => null,
  );
  return now === null ? null : now + offsetMs;
}
