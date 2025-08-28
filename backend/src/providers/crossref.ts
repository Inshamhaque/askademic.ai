import { SourceProvider, NormalizedSource } from './SourceProvider.js';
import fetch from 'node-fetch';

const crossrefProvider: SourceProvider = {
  name: 'crossref',
  async fetch(query: string, limit = 10): Promise<NormalizedSource[]> {
    const q = encodeURIComponent(query);
    const url = `https://api.crossref.org/works?query=${q}&rows=${limit}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Askademic.ai/1.0 (mailto:hello@askademic.ai)' } });
    if (!res.ok) return [];
    const data = await res.json();
    const items = (data?.message?.items || []) as any[];
    return items.map((it) => {
      const doi = it.DOI || undefined;
      const title = Array.isArray(it.title) ? it.title[0] : it.title || 'Untitled';
      const url = doi ? `https://doi.org/${doi}` : (it.URL || '');
      const abstract: string = (it.abstract || '').toString().replace(/<[^>]+>/g, ' ').trim();
      return {
        title,
        url,
        content: abstract,
        source_type: 'crossref',
        doi
      } as NormalizedSource;
    });
  }
};

export default crossrefProvider;


