const PREFIX = "admin:";

export function readCache<T>(key: string, businessId: string): T | null {
  try {
    const raw = localStorage.getItem(`${PREFIX}${key}:${businessId}`);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeCache<T>(key: string, businessId: string, data: T): void {
  try {
    localStorage.setItem(`${PREFIX}${key}:${businessId}`, JSON.stringify(data));
  } catch {
    // localStorage full or unavailable — ignore
  }
}

/** Remove all admin cache keys (admin:*). Called on logout. */
export function clearCache(): void {
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(PREFIX)) toRemove.push(key);
    }
    for (const key of toRemove) localStorage.removeItem(key);
  } catch {
    // ignore
  }
}
