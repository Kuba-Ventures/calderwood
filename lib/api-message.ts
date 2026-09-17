/**
 * An API error field is only safe to render if it is actually a string. A route
 * that hands back an object (or nothing) would otherwise paint the literal
 * "[object Object]" at the dentist, which says nothing and hides the real
 * failure. Fall back to plain copy instead.
 */
export function asMessage(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}
