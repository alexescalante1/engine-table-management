export type SaveStatus = "idle" | "pending" | "saving" | "saved" | "retrying" | "error";
export type FlushSource = "beforeunload" | "visibilitychange";

export interface UseAutoSaveOptions<T> {
  /** Current in-memory state to persist. */
  data: T | null;
  /** Persist `data` to the backend. Return `false` to signal no real change (skip toast/revalidation). */
  save: (data: T) => Promise<boolean | void>;
  /** Optional expensive side-effect (e.g. ISR revalidation). Debounced separately from save. */
  revalidate?: () => Promise<void>;
  /** Called after a flush-triggered save (beforeunload/visibilitychange) completes. */
  onFlushComplete?: (saved: boolean, source: FlushSource) => void;
  /** Called before each flush retry attempt. */
  onFlushRetry?: (attempt: number, maxRetries: number) => void;
  /** Check if there are real changes (hash differs from baseline). Skips unnecessary beforeunload dialog. */
  hasRealChanges?: () => boolean;
}

export interface UseAutoSaveReturn {
  /** Whether there are unsaved local changes. */
  isDirty: boolean;
  /** Current save lifecycle status. */
  status: SaveStatus;
  /** Ref that is `true` during save + echo cooldown — use in sync effects to skip subscription echoes. */
  savingRef: React.RefObject<boolean>;
  /** Mark state as dirty and let the observer decide when to save. */
  markDirty: () => void;
  /** Force an immediate save. Returns `true` if succeeded or nothing to save. */
  flush: () => Promise<boolean>;
  /** Discard pending changes and reset status. */
  discard: () => void;
  /** Timestamp (ms) when auto-save will fire. `null` = no countdown active. */
  countdownEnd: number | null;
  /** Current retry attempt info. `null` = not retrying. */
  retryInfo: { attempt: number; max: number } | null;
}
