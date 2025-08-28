import fetch from 'node-fetch';

export async function resolveOpenAccessPdf(doi: string, contactEmail: string): Promise<string | undefined> {
  try {
    const url = `https://api.unpaywall.org/v2/${encodeURIComponent(doi)}?email=${encodeURIComponent(contactEmail)}`;
    const res = await fetch(url);
    if (!res.ok) return undefined;
    const data = await res.json();
    const oa = data?.best_oa_location?.url_for_pdf || data?.best_oa_location?.url || undefined;
    return oa;
  } catch {
    return undefined;
  }
}


