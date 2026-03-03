const BASE_URL = 'https://api.dataforseo.com/v3';

function getAuth(): string | null {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  if (!login || !password) return null;
  return Buffer.from(`${login}:${password}`).toString('base64');
}

export function isDataForSeoConfigured(): boolean {
  return !!process.env.DATAFORSEO_LOGIN && !!process.env.DATAFORSEO_PASSWORD;
}

export async function dataforseoPost<T>(endpoint: string, body: Record<string, unknown>): Promise<T | null> {
  const auth = getAuth();
  if (!auth) return null;

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([body]),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      console.warn(`DataForSEO ${endpoint} failed: ${res.status} ${res.statusText}`);
      return null;
    }

    const data = await res.json();
    return data as T;
  } catch (err) {
    console.warn(`DataForSEO ${endpoint} error:`, err);
    return null;
  }
}

export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  }
}
