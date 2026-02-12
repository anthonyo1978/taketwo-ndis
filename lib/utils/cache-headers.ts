/**
 * Cache-Control header helpers for API responses.
 *
 * All headers use `private` because responses are per-organisation (auth-gated).
 * `stale-while-revalidate` lets the browser serve a cached copy instantly while
 * re-fetching in the background — a big perceived-perf win for list pages.
 */

/** Short-lived cache for data that changes frequently (residents, houses, transactions). */
export const CACHE_SHORT = {
  'Cache-Control': 'private, max-age=0, stale-while-revalidate=30',
}

/** Medium cache for reference/config data that rarely changes (suppliers, owners, plan managers). */
export const CACHE_MEDIUM = {
  'Cache-Control': 'private, max-age=60, stale-while-revalidate=120',
}

/** No cache — for mutations, auth, and real-time data (notifications, todos). */
export const CACHE_NONE = {
  'Cache-Control': 'private, no-cache, no-store, must-revalidate',
}

