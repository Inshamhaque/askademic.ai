import { SourceProvider, NormalizedSource } from './SourceProvider.js';
import fetch from 'node-fetch';

const pubmedProvider: SourceProvider = {
  name: 'pubmed',
  async fetch(query: string, limit = 10): Promise<NormalizedSource[]> {
    const q = encodeURIComponent(query);
    // ESearch to get IDs
    const idsRes = await fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&retmax=${limit}&term=${q}`);
    const idsJson = await idsRes.json();
    const ids: string[] = idsJson?.esearchresult?.idlist || [];
    if (ids.length === 0) return [];
    // ESummary for metadata including title
    const sumRes = await fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=${ids.join(',')}`);
    const sumJson = await sumRes.json();
    const result: NormalizedSource[] = [];
    for (const id of ids) {
      const item = sumJson?.result?.[id];
      if (!item) continue;
      const title: string = item?.title || 'Untitled';
      // Try EFetch for abstract
      let abstract = '';
      try {
        const fetchRes = await fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&retmode=xml&id=${id}`);
        const xml = await fetchRes.text();
        const m = xml.match(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/i);
        abstract = m ? m[1].replace(/<[^>]+>/g, ' ').trim() : '';
      } catch {}
      result.push({
        title,
        url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
        content: abstract,
        source_type: 'pubmed'
      });
    }
    return result;
  }
};

export default pubmedProvider;


