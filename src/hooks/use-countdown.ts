import { useCallback, useEffect, useRef, useState } from "react";

type UsePreciseCountdownOptions = {
  onComplete?: () => void;
};

/**
 * A precise countdown that uses a target timestamp and requestAnimationFrame
 * to compute remaining whole seconds (3,2,1,0) without interval drift.
 */
export function usePreciseCountdown(options: UsePreciseCountdownOptions = {}) {
  const { onComplete } = options;
  const [seconds, setSeconds] = useState<number | null>(null);
  const runningRef = useRef(false);
  const targetMsRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastDisplayedRef = useRef<number | null>(null);

  const stop = useCallback(() => {
    runningRef.current = false;
    targetMsRef.current = null;
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const tick = useCallback(() => {
    if (!runningRef.current || targetMsRef.current == null) return;
    const now = performance.now();
    const remainingMs = Math.max(0, targetMsRef.current - now);
    // Display whole seconds remaining (3..2..1..0)
    const next = Math.ceil(remainingMs / 1000);
    if (next !== lastDisplayedRef.current) {
      lastDisplayedRef.current = next;
      setSeconds(next);
    }
    if (remainingMs <= 0) {
      stop();
      setSeconds(0);
      onComplete?.();
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [onComplete, stop]);

  const start = useCallback((durationSeconds: number) => {
    if (runningRef.current) return; // idempotent
    const now = performance.now();
    const durMs = Math.max(0, durationSeconds * 1000);
    targetMsRef.current = now + durMs;
    runningRef.current = true;
    lastDisplayedRef.current = null;
    // Prime with initial value (e.g., 3)
    setSeconds(Math.ceil(durMs / 1000));
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const reset = useCallback(() => {
    stop();
    setSeconds(null);
  }, [stop]);

  useEffect(() => () => stop(), [stop]);

  return {
    seconds,
    running: runningRef.current,
    start,
    reset,
  } as const;
}


