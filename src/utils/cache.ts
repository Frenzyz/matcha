interface CacheOptions {
  maxAge?: number;
}

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  maxAge: number;
}

class Cache {
  private storage = new Map<string, CacheEntry<any>>();

  set<T>(key: string, value: T, options: CacheOptions = {}): void {
    const maxAge = options.maxAge || Infinity;
    this.storage.set(key, {
      value,
      timestamp: Date.now(),
      maxAge
    });
  }

  get<T>(key: string, options: CacheOptions = {}): T | null {
    const entry = this.storage.get(key);
    if (!entry) return null;

    const maxAge = options.maxAge || entry.maxAge;
    const age = Date.now() - entry.timestamp;

    if (age > maxAge) {
      this.storage.delete(key);
      return null;
    }

    return entry.value as T;
  }

  remove(key: string): void {
    this.storage.delete(key);
  }

  clear(): void {
    this.storage.clear();
  }
}

export const cache = new Cache();