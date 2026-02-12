/**
 * Sanitize a user-provided search string for safe use in Supabase/PostgREST
 * ilike filters and `.or()` filter strings.
 *
 * - Escapes Postgres LIKE wildcards: % and _
 * - Removes characters that break PostgREST `.or()` syntax: ( ) , .
 * - Trims whitespace
 */
export function sanitizeSearch(input: string): string {
  return input
    .trim()
    // Escape Postgres LIKE special characters
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
    // Remove characters that can break PostgREST .or() filter syntax
    .replace(/[(),]/g, '')
}

