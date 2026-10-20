/**
 * Discover loading state — shown while the server component fetches, so a
 * slow connection reads as "loading" and is never confused with an empty
 * city or a network error (brief scenario 3).
 */
export default function DiscoverLoading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading activities">
      <div className="space-y-2">
        <div className="h-9 w-40 animate-pulse rounded-full bg-navy/10" />
        <div className="h-5 w-32 animate-pulse rounded-full bg-navy/10" />
      </div>
      <div className="h-12 w-full animate-pulse rounded-full bg-navy/10" />
      <div className="flex gap-2">
        {[64, 56, 76, 72].map((w, i) => (
          <div
            key={i}
            className="h-9 animate-pulse rounded-full bg-navy/10"
            style={{ width: w }}
          />
        ))}
      </div>
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="overflow-hidden rounded-3xl border border-border bg-white"
          >
            <div className="h-36 w-full animate-pulse bg-navy/15" />
            <div className="space-y-2 p-4">
              <div className="h-5 w-2/3 animate-pulse rounded-full bg-navy/10" />
              <div className="h-4 w-1/2 animate-pulse rounded-full bg-navy/10" />
              <div className="h-4 w-1/3 animate-pulse rounded-full bg-navy/10" />
            </div>
          </div>
        ))}
      </div>
      <p className="text-sm font-semibold text-muted">Loading activities…</p>
    </div>
  );
}
