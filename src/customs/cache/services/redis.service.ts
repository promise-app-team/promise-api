import { Redis, RedisOptions } from 'ioredis'

import type { CacheService, CacheServiceOptions } from './cache.service'

export { RedisOptions }

export class RedisCacheService implements CacheService {
  private readonly client: Redis

  constructor(param: Redis | RedisOptions) {
    this.client = param instanceof Redis ? param : new Redis(param)
  }

  async get<T = any>(key: string): Promise<T | null> {
    try {
      const cachedValue = await this.client.get(key)
      return cachedValue ? JSON.parse(cachedValue) : null
    }
    catch {
      return null
    }
  }

  async set<T = any>(key: string, value: T, opts?: CacheServiceOptions | undefined): Promise<void> {
    if (opts?.ttl) {
      if (opts.ttl <= 0) throw new Error('TTL must be greater than 0')
      await this.client.set(key, JSON.stringify(value), 'EX', opts.ttl)
    }
    else {
      await this.client.set(key, JSON.stringify(value))
    }
  }

  async del(key: string): Promise<void> {
    await this.client.unlink(key)
  }
}
