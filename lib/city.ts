/**
 * City name handling.
 *
 * Cities are free text on both sides (profiles.city, sessions.city), so an
 * exact string comparison silently returns zero results for "Montréal" vs
 * "Montreal" vs "montréal ". Discover compares cities through
 * normalizeCityKey() instead of a raw SQL equality.
 */

/** Comparison key: trimmed, whitespace-collapsed, lowercased, accent-free. */
export function normalizeCityKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/** Storage cleanup applied when a session is created. */
export function cleanCityName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/** URL/cookie value meaning "no city restriction". */
export const ALL_CITIES = "all";

/** Cookie that persists the Discover city selection (one year). */
export const CITY_COOKIE = "plaiyo_city";
