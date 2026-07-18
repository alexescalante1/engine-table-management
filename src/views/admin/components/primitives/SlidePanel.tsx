"use client";

import { useState, useRef, useEffect } from "react";

interface SlidePanelProps {
  open: boolean;
  onClose: () => void;
  onExited?: () => void;
  children: React.ReactNode;
}

const TIMING = "[transition-timing-function:cubic-bezier(0.16,1,0.3,1)]";
const DURATION = 700;

export default function SlidePanel({ open, onClose, onExited, children }: SlidePanelProps) {
  const [show, setShow] = useState(false);
  const [visible, setVisible] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onExitedRef = useRef(onExited);
  onExitedRef.current = onExited;

  useEffect(() => {
    if (open) {
      setShow(true);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    } else {
      setVisible(false);
      closeTimerRef.current = setTimeout(() => {
        setShow(false);
        onExitedRef.current?.();
      }, DURATION);
    }
    return () => { if (closeTimerRef.current) clearTimeout(closeTimerRef.current); };
  }, [open]);

  useEffect(() => {
    if (!show || !open) return;
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    return () => cancelAnimationFrame(id);
  }, [show, open]);

  if (!show) return null;

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-700 ${TIMING} ${visible ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      />
      <aside
        className={`fixed right-0 top-0 z-50 hidden h-full w-[420px] bg-white shadow-2xl will-change-transform transition-transform duration-700 ${TIMING} dark:bg-zinc-950 md:block ${visible ? "translate-x-0" : "translate-x-full"}`}
      >
        {children}
      </aside>
      <div
        className={`fixed inset-0 z-50 bg-white will-change-transform transition-transform duration-700 ${TIMING} dark:bg-zinc-950 md:hidden ${visible ? "translate-y-0" : "translate-y-full"}`}
      >
        {children}
      </div>
    </>
  );
}
