import { APP_API_URL } from "@/utils/Constants";

export async function checkApiHealth(): Promise<boolean> {
  try {
    const url = new URL(APP_API_URL);
    const res = await fetch(`${url.origin}/health`, {
      signal: AbortSignal.timeout(5_000),
      cache: "no-store",
    });

    return res.ok;
  } catch {
    return false;
  }
}
