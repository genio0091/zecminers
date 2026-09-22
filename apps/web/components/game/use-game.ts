"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, type ApiResult } from "@/lib/client-api";
import type { InventoryItem, Me, Notice, Slot } from "./types";

const ERROR_TEXT: Record<string, string> = {
  MAINTENANCE: "ZecMiners is in maintenance. Your balance is safe; actions are paused.",
  RATE_LIMITED: "Too many requests. Wait a moment and try again.",
  UNAUTHORIZED: "Your session expired. Sign in again.",
};

/**
 * All server state for the game screen. The server is authoritative: after every action we
 * re-read slots, balance and inventory instead of guessing locally.
 */
export function useGame() {
  const [me, setMe] = useState<Me | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [offsetMs, setOffsetMs] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const mounted = useRef(true);

  const syncClock = useCallback((serverTime: string) => {
    setOffsetMs(Date.parse(serverTime) - Date.now());
  }, []);

  const refresh = useCallback(async () => {
    const [m, s, inv] = await Promise.all([api<Me>("/api/me"), api<Slot[]>("/api/slots"), api<InventoryItem[]>("/api/inventory")]);
    if (!mounted.current) return;
    if (m.ok) {
      setMe(m.data);
      syncClock(m.serverTime);
      setLoadError("");
    } else setLoadError(ERROR_TEXT[m.error.code] ?? m.error.message);
    if (s.ok) setSlots(s.data);
    if (inv.ok) setInventory(inv.data);
    setLoaded(true);
  }, [syncClock]);

  useEffect(() => {
    mounted.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount; state updates after the request resolves
    refresh();
    const t = setInterval(refresh, 30_000);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      mounted.current = false;
      clearInterval(t);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  /** Run a mutation, show its outcome, then re-sync from the server. */
  const act = useCallback(
    async <T,>(key: string, run: () => Promise<ApiResult<T>>, onOk?: (data: T) => string | void): Promise<ApiResult<T>> => {
      setBusy(key);
      const res = await run();
      setBusy(null);
      if (res.ok) {
        syncClock(res.serverTime);
        const msg = onOk?.(res.data);
        if (msg) setNotice({ kind: "good", text: msg });
      } else {
        setNotice({ kind: "bad", text: ERROR_TEXT[res.error.code] ?? res.error.message });
      }
      await refresh();
      return res;
    },
    [refresh, syncClock],
  );

  return { me, slots, inventory, offsetMs, loaded, loadError, notice, setNotice, busy, act, refresh };
}
