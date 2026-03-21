import { Request, Response, NextFunction } from "express";

interface CacheEntry {
  body: unknown;
  statusCode: number;
  createdAt: number;
}

const MAX_ENTRIES = 64;
const DEFAULT_TTL_MS = 10_000; // 10 seconds

const cache = new Map<string, CacheEntry>();

function evictOldest(): void {
  if (cache.size >= MAX_ENTRIES) {
    const firstKey = cache.keys().next().value as string;
    cache.delete(firstKey);
  }
}

function getCacheKey(req: Request): string {
  return req.originalUrl || req.url;
}

/**
 * Express middleware that caches GET JSON responses in memory with LRU eviction and TTL.
 */
export function responseCacheMiddleware(ttlMs: number = DEFAULT_TTL_MS) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      next();
      return;
    }

    const key = getCacheKey(req);
    const entry = cache.get(key);

    if (entry && Date.now() - entry.createdAt < ttlMs) {
      // Move to end for LRU behavior
      cache.delete(key);
      cache.set(key, entry);
      res.status(entry.statusCode).json(entry.body);
      return;
    }

    // Monkey-patch res.json to intercept the response
    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        evictOldest();
        cache.set(key, {
          body,
          statusCode: res.statusCode,
          createdAt: Date.now(),
        });
      }
      return originalJson(body);
    };

    next();
  };
}

/**
 * Invalidate cache entries matching a URL prefix.
 */
export function invalidateCacheByPrefix(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

/**
 * Clear the entire response cache.
 */
export function clearResponseCache(): void {
  cache.clear();
}
