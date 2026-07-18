"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { logger } from "@/views/admin/utils/logger";
import {
  COUNTDOWN_MS,
  REVALIDATE_MS,
  ECHO_COOLDOWN_MS,
  SAVED_DISPLAY_MS,
  MAX_RETRIES,
  RETRY_BASE_MS,
} from "./constants";
import type { SaveStatus, FlushSource, UseAutoSaveOptions, UseAutoSaveReturn } from "./types";
import { isUserEditingText } from "./is-editing-text";

export type { SaveStatus, FlushSource, UseAutoSaveOptions, UseAutoSaveReturn };

export function useAutoSave<T>({
  data,
  save,
  revalidate,
  onFlushComplete,
  onFlushRetry,
  hasRealChanges,
}: UseAutoSaveOptions<T>): UseAutoSaveReturn {
  const [isDirty, setIsDirty] = useState(false);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [countdownEnd, setCountdownEnd] = useState<number | null>(null);
  const [retryInfo, setRetryInfo] = useState<{ attempt: number; max: number } | null>(null);

  // Latest-value refs for use inside timers/handlers.
  const dataRef = useRef(data);
  dataRef.current = data;
  const isDirtyRef = useRef(false);
  isDirtyRef.current = isDirty;

  // Timer refs
  const countdownRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revalidateRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedDisplayRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Echo suppression
  const savingRef = useRef(false);

  // Guard against concurrent performSave calls (e.g. visibilitychange + beforeunload)
  const saveInProgressRef = useRef(false);

  // Flush callback (only fires for visibilitychange/beforeunload-triggered saves)
  const flushSourceRef = useRef<FlushSource | null>(null);
  const onFlushCompleteRef = useRef(onFlushComplete);
  onFlushCompleteRef.current = onFlushComplete;
  const onFlushRetryRef = useRef(onFlushRetry);
  onFlushRetryRef.current = onFlushRetry;
  const hasRealChangesRef = useRef(hasRealChanges);
  hasRealChangesRef.current = hasRealChanges;

  // Stable ref for performSave — used in event handlers to keep deps arrays constant
  const performSaveRef = useRef<() => Promise<boolean>>(async () => true);

  // ── Core save ──

  const performSave = useCallback(async (): Promise<boolean> => {
    if (!dataRef.current || !isDirtyRef.current) return true;
    // Skip if no real changes (safety net — useEffect on data should catch this first)
    if (hasRealChangesRef.current && !hasRealChangesRef.current()) {
      setIsDirty(false);
      isDirtyRef.current = false;
      setStatus("idle");
      return true;
    }
    if (saveInProgressRef.current) return true;

    saveInProgressRef.current = true;
    savingRef.current = true;
    setCountdownEnd(null);

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      setStatus(attempt === 0 ? "saving" : "retrying");
      if (attempt > 0) setRetryInfo({ attempt, max: MAX_RETRIES });

      try {
        const result = await save(dataRef.current);
        setIsDirty(false);
        isDirtyRef.current = false;
        setRetryInfo(null);

        // save returned false → no real change, silent discard (no toast)
        if (result === false) {
          setStatus("idle");
          flushSourceRef.current = null;
          savingRef.current = false;
          saveInProgressRef.current = false;
          return true;
        }

        setStatus("saved");

        // Notify flush caller (beforeunload/visibilitychange)
        if (flushSourceRef.current) {
          const src = flushSourceRef.current;
          flushSourceRef.current = null;
          onFlushCompleteRef.current?.(true, src);
        }

        // Schedule revalidation (debounced — resets if another save happens soon)
        if (revalidate) {
          if (revalidateRef.current) clearTimeout(revalidateRef.current);
          revalidateRef.current = setTimeout(() => {
            revalidate().catch((e) => logger.error("revalidate", e));
          }, REVALIDATE_MS);
        }

        // Auto-hide "saved" badge
        if (savedDisplayRef.current) clearTimeout(savedDisplayRef.current);
        savedDisplayRef.current = setTimeout(() => {
          setStatus((prev) => (prev === "saved" ? "idle" : prev));
        }, SAVED_DISPLAY_MS);

        // Echo cooldown
        setTimeout(() => { savingRef.current = false; }, ECHO_COOLDOWN_MS);

        saveInProgressRef.current = false;
        return true;
      } catch {
        if (attempt < MAX_RETRIES) {
          if (flushSourceRef.current) onFlushRetryRef.current?.(attempt + 1, MAX_RETRIES);
          await new Promise((r) => setTimeout(r, RETRY_BASE_MS * 2 ** attempt));
          continue;
        }
        setStatus("error");
        setRetryInfo(null);
        if (flushSourceRef.current) {
          const src = flushSourceRef.current;
          flushSourceRef.current = null;
          onFlushCompleteRef.current?.(false, src);
        }
        savingRef.current = false;
        saveInProgressRef.current = false;
        return false;
      }
    }

    saveInProgressRef.current = false;
    return false;
  }, [save, revalidate]);
  performSaveRef.current = performSave;

  // ── markDirty ──

  const markDirty = useCallback(() => {
    setIsDirty(true);
    isDirtyRef.current = true;
    setStatus("pending");

    // If user is in a text field → only mark dirty, ZERO timers
    if (isUserEditingText()) return;

    // Not in a text field (toggle/button) → start countdown
    if (countdownRef.current) clearTimeout(countdownRef.current);
    countdownRef.current = setTimeout(() => { performSaveRef.current(); }, COUNTDOWN_MS);
    setCountdownEnd(Date.now() + COUNTDOWN_MS);
  }, []);

  // ── flush ──

  const flush = useCallback(async (): Promise<boolean> => {
    if (countdownRef.current) { clearTimeout(countdownRef.current); countdownRef.current = null; }
    setCountdownEnd(null);
    if (!isDirtyRef.current) return true;
    return performSave();
  }, [performSave]);

  // ── discard ──

  const discard = useCallback(() => {
    if (countdownRef.current) { clearTimeout(countdownRef.current); countdownRef.current = null; }
    setIsDirty(false);
    isDirtyRef.current = false;
    setStatus("idle");
    setCountdownEnd(null);
  }, []);

  // ── focusout: user left a text field → start countdown ──

  useEffect(() => {
    const handler = () => {
      requestAnimationFrame(() => {
        if (!isDirtyRef.current) return;
        if (isUserEditingText()) return; // tab to another input — keep waiting

        // Left the text field — NOW start countdown
        if (countdownRef.current) clearTimeout(countdownRef.current);
        countdownRef.current = setTimeout(() => { performSaveRef.current(); }, COUNTDOWN_MS);
        setCountdownEnd(Date.now() + COUNTDOWN_MS);
      });
    };
    document.addEventListener("focusout", handler);
    return () => document.removeEventListener("focusout", handler);
  }, []);

  // ── focusin: user entered a text field → cancel countdown ──

  useEffect(() => {
    const handler = () => {
      if (!isDirtyRef.current) return;
      if (!isUserEditingText()) return; // not a text field, ignore

      // Entered an input → cancel countdown
      if (countdownRef.current) { clearTimeout(countdownRef.current); countdownRef.current = null; }
      setCountdownEnd(null);
    };
    document.addEventListener("focusin", handler);
    return () => document.removeEventListener("focusin", handler);
  }, []);

  // ── Auto-discard: revert detected (edit→undo) ──

  useEffect(() => {
    if (!isDirtyRef.current) return;
    if (hasRealChangesRef.current && !hasRealChangesRef.current()) {
      if (countdownRef.current) { clearTimeout(countdownRef.current); countdownRef.current = null; }
      setIsDirty(false);
      isDirtyRef.current = false;
      setStatus("idle");
      setCountdownEnd(null);
    }
  }, [data]);

  // ── beforeunload ──

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!isDirtyRef.current) return;
      if (hasRealChangesRef.current && !hasRealChangesRef.current()) {
        isDirtyRef.current = false;
        setIsDirty(false);
        setStatus("idle");
        return;
      }
      e.preventDefault();
      flushSourceRef.current = "beforeunload";
      flush();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [flush]);

  // ── visibilitychange: flush when user leaves tab ──

  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === "hidden" && isDirtyRef.current) {
        flushSourceRef.current = "visibilitychange";
        flush();
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [flush]);

  // ── Cleanup ──

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearTimeout(countdownRef.current);
      if (revalidateRef.current) clearTimeout(revalidateRef.current);
      if (savedDisplayRef.current) clearTimeout(savedDisplayRef.current);
    };
  }, []);

  return { isDirty, status, savingRef, markDirty, flush, discard, countdownEnd, retryInfo };
}
