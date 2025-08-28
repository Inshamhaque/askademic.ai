import { SourceProvider, NormalizedSource } from './SourceProvider.js';
import fetch from 'node-fetch';

const semanticScholarProvider: SourceProvider = {
  name: 'semantic_scholar',
  async fetch(query: string, limit = 10): Promise<NormalizedSource[]> {
    const search = encodeURIComponent(query);
    const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${search}&limit=${limit}&fields=title,abstract,year,authors,url,citationCount,externalIds`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    const papers = (data?.data || []) as any[];
    return papers.map((p) => {
      const doi = p?.externalIds?.DOI || undefined;
      return {
        title: p.title || 'Untitled',
        url: p.url || (doi ? `https://doi.org/${doi}` : ''),
        content: (p.abstract || '').toString(),
        source_type: 'semantic_scholar',
        doi
      } as NormalizedSource;
    });
  }
};

export default semanticScholarProvider;


