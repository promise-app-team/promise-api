import { CacheService, CacheServiceOptions } from './cache.service';

export class InMemoryCacheService implements CacheService {
  private readonly cache = new Map<string, string>();

  async get<T = any>(key: string): Promise<T | null> {
    const cachedValue = this.cache.get(key);
    try {
      return cachedValue ? JSON.parse(cachedValue) : null;
    } catch {
      return null;
    }
  }

  async set<T = any>(key: string, value: T, opts?: CacheServiceOptions | undefined): Promise<void> {
    if (opts?.ttl && opts.ttl <= 0) throw new Error('TTL must be greater than 0');
    if (opts?.ttl) setTimeout(() => this.cache.delete(key), opts.ttl * 1000);
    this.cache.set(key, JSON.stringify(value));
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
  }
}
