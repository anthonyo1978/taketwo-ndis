/**
 * Safe JSON parsing helper for Next.js 15 API routes and client-side code
 * Resolves the common 'unknown' type issue with response.json() and request.json()
 */

export async function safeJson<T>(res: Response | { json: () => Promise<unknown> }): Promise<T> {
  return (await res.json()) as T; // TODO: Replace with Zod parse when schemas are available
}

/**
 * Type-safe request body parsing for API routes
 * Usage: const body = await safeRequestJson<ExpectedType>(req);
 */
export async function safeRequestJson<T>(req: Request): Promise<T> {
  return (await req.json()) as T; // TODO: Replace with Zod parse when schemas are available
}

/**
 * Common API response types for consistency
 */
export type ApiResponse<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
};

/**
 * Helper to create consistent API responses
 */
export function createApiResponse<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}

export function createApiError(error: string): ApiResponse<never> {
  return { success: false, error };
}
