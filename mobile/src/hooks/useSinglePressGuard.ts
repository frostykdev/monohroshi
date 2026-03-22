import { useCallback, useEffect, useRef } from "react";

type GuardOptions = {
  cooldownMs?: number;
};

export const useSinglePressGuard = ({
  cooldownMs = 700,
}: GuardOptions = {}) => {
  const lockRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetGuard = useCallback(() => {
    lockRef.current = false;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const runWithGuard = useCallback(
    (fn: () => void) => {
      if (lockRef.current) return false;
      lockRef.current = true;
      fn();
      timerRef.current = setTimeout(() => {
        lockRef.current = false;
        timerRef.current = null;
      }, cooldownMs);
      return true;
    },
    [cooldownMs],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return { runWithGuard, resetGuard };
};
