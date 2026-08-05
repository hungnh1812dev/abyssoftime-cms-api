import { checkApiHealth } from "@/lib/health/checkApiHealth";

const TTL_MS = 5_000;

type Cache = { healthy: boolean; checkedAt: number };

let cache: Cache | null = null;
let inFlight: Promise<boolean> | null = null;

function refresh(): Promise<boolean> {
  if (inFlight) return inFlight;

  inFlight = checkApiHealth()
    .then((healthy) => {
      cache = { healthy, checkedAt: Date.now() };
      return healthy;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

/**
 * Gates on a cached health status instead of the network on every request.
 * Healthy + fresh: instant, cached. Healthy + stale: instant, refreshed in the
 * background via `waitUntil`. Unhealthy: re-verified live (blocking) so a
 * recovery is picked up immediately rather than waiting out the TTL.
 */
export async function getApiHealth(
  waitUntil: (promise: Promise<unknown>) => void,
): Promise<boolean> {
  if (!cache) {
    return refresh();
  }

  if (cache.healthy) {
    if (Date.now() - cache.checkedAt >= TTL_MS) {
      waitUntil(refresh());
    }
    return true;
  }

  return refresh();
}
