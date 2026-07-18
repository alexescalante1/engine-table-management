import { useState, useEffect, useRef } from "react";

/**
 * Returns `true` only after `delay` ms have passed while `isLoading` is true.
 * If loading resolves before the delay, the hook never returns `true` — avoiding
 * a flash of skeleton / spinner on cached or fast loads.
 */
export function useDelayedLoading(isLoading: boolean, delay = 0): boolean {
  const [show, setShow] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);
  useEffect(() => {
    if (!isLoading) { setShow(false); return; }
    timerRef.current = setTimeout(() => setShow(true), delay);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isLoading, delay]);
  return show;
}
