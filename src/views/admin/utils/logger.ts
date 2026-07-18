import { IS_NOT_PROD as IS_DEV } from "@/env";

export const logger = {
  error: (ctx: string, err: unknown) => {
    if (!IS_DEV) return;
    console.error(`[${ctx}]`, err instanceof Error ? err.message : err);
  },
  warn: (ctx: string, msg: string) => {
    if (!IS_DEV) return;
    console.warn(`[${ctx}]`, msg);
  },
};
