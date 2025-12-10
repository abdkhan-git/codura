/**
 * Optimized API Client with automatic caching and request deduplication
 */

// Request deduplication map
const pendingRequests = new Map<string, Promise<any>>();

// Cache with TTL
interface CacheEntry {
  data: any;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const DEFAULT_TTL = 30000; // 30 seconds

/**
 * Optimized fetch with:
 * - Automatic request deduplication
 * - Client-side caching
 * - Error handling
 */
export async function apiClient<T = any>(
  url: string,
  options?: RequestInit & { ttl?: number; skipCache?: boolean }
): Promise<T> {
  const { ttl = DEFAULT_TTL, skipCache = false, ...fetchOptions } = options || {};
  const cacheKey = `${url}:${JSON.stringify(fetchOptions)}`;

  // Check cache first (unless skip)
  if (!skipCache) {
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data;
    }
  }

  // Check if request is already pending (deduplication)
  const pending = pendingRequests.get(cacheKey);
  if (pending) {
    return pending;
  }

  // Make the request
  const requestPromise = fetch(url, {
    ...fetchOptions,
    headers: {
      'Content-Type': 'application/json',
      ...fetchOptions?.headers,
    },
  })
    .then(async (res) => {
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      return res.json();
    })
    .then((data) => {
      // Cache the result
      if (!skipCache) {
        cache.set(cacheKey, {
          data,
          timestamp: Date.now(),
        });
      }

      // Clean up pending request
      pendingRequests.delete(cacheKey);

      return data as T;
    })
    .catch((error) => {
      // Clean up on error
      pendingRequests.delete(cacheKey);
      throw error;
    });

  // Store as pending
  pendingRequests.set(cacheKey, requestPromise);

  return requestPromise;
}

/**
 * Prefetch data to warm up the cache
 */
export function prefetch(url: string, options?: RequestInit): void {
  apiClient(url, options).catch(() => {
    // Ignore prefetch errors
  });
}

/**
 * Clear cache for a specific URL or all cache
 */
export function clearCache(url?: string): void {
  if (url) {
    // Clear specific URL
    for (const key of cache.keys()) {
      if (key.startsWith(url)) {
        cache.delete(key);
      }
    }
  } else {
    // Clear all
    cache.clear();
  }
}

/**
 * Clear expired cache entries
 */
export function clearExpiredCache(): void {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp > DEFAULT_TTL) {
      cache.delete(key);
    }
  }
}

// Auto-clear expired cache every minute
if (typeof window !== 'undefined') {
  setInterval(clearExpiredCache, 60000);
}