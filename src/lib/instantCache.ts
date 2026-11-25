const CACHE_PREFIX = "yawmi_cache_";

/**
 * Retrieve cached JSON data from localStorage safely.
 */
export function getCachedData<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Store JSON data into localStorage safely.
 */
export function setCachedData<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(data));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Remove all Yawmi cached entries on logout so no stale data leaks across sessions.
 */
export function clearUserCache(): void {
  if (typeof window === "undefined") return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // Ignore storage errors
  }
}
