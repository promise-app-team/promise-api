export interface CacheServiceOptions {
  ttl?: number // Time to live in seconds
}

export abstract class CacheService {
  abstract get<T = any>(key: string): Promise<T | null>
  abstract set<T = any>(key: string, value: T, opts?: CacheServiceOptions): Promise<void>
  abstract del(key: string): Promise<void>
}
