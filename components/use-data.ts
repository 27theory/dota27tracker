"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export function useData<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const controller = useRef<AbortController | null>(null);
  const load = useCallback(
    async (refresh = false) => {
      controller.current?.abort();
      const c = new AbortController();
      controller.current = c;
      setLoading(true);
      setError("");
      try {
        const sep = url.includes("?") ? "&" : "?";
        const r = await fetch(`${url}${refresh ? `${sep}refresh=1` : ""}`, {
          signal: c.signal,
        });
        const result = await r.json();
        if (!r.ok) throw new Error(result.error);
        setData(result);
      } catch (e) {
        if (!c.signal.aborted)
          setError(e instanceof Error ? e.message : "Ошибка загрузки");
      } finally {
        if (!c.signal.aborted) setLoading(false);
      }
    },
    [url],
  );
  useEffect(() => {
    setData(null);
    void load();
    return () => controller.current?.abort();
  }, [load]);
  return { data, error, loading, refresh: () => load(true) };
}
