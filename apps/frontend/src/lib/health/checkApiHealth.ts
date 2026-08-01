const CMS_URL = process.env.GRAPHQL_URL ?? "http://localhost:5000/graphql";

export async function checkApiHealth(): Promise<boolean> {
  try {
    const url = new URL(CMS_URL);
    const res = await fetch(`${url.origin}/health`, {
      signal: AbortSignal.timeout(5_000),
      cache: "no-store",
    });

    return res.ok;
  } catch {
    return false;
  }
}
