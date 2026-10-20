import { NextResponse, type NextRequest } from "next/server";
import { ALL_CITIES, CITY_COOKIE, cleanCityName } from "@/lib/city";

/**
 * Persists the Discover city selection in the `plaiyo_city` cookie, then
 * redirects back to /discover with the selection in the URL. This is how
 * plain GET links (city selector, "All cities" chip) can set a cookie
 * without any client JavaScript: Server Components cannot set cookies,
 * Route Handlers can.
 *
 * The redirect target is always /discover — query parameters are picked
 * from an allowlist, never copied wholesale, so this cannot become an
 * open redirect.
 */
const PRESERVED_PARAMS = ["q", "when", "sport", "level", "free", "women"];

export async function GET(request: NextRequest) {
  const incoming = request.nextUrl.searchParams;
  const rawCity = incoming.get("city") ?? "";
  const city =
    rawCity === ALL_CITIES ? ALL_CITIES : cleanCityName(rawCity).slice(0, 80);

  const target = new URL("/discover", request.url);
  for (const key of PRESERVED_PARAMS) {
    const value = incoming.get(key);
    if (value) target.searchParams.set(key, value);
  }
  if (city) target.searchParams.set("city", city);

  const response = NextResponse.redirect(target);
  if (city) {
    response.cookies.set(CITY_COOKIE, city, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }
  return response;
}
