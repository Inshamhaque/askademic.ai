import { SourceProvider, NormalizedSource } from './SourceProvider.js';
import fetch from 'node-fetch';

const wikipediaProvider: SourceProvider = {
  name: 'wikipedia',
  async fetch(query: string, limit = 5): Promise<NormalizedSource[]> {
    const q = encodeURIComponent(query);
    const res = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${q}&utf8=&format=json&srlimit=${limit}`);
    if (!res.ok) return [];
    const data = await res.json();
    const pages = (data?.query?.search || []) as any[];
    const results: NormalizedSource[] = [];
    for (const p of pages) {
      const pageTitle = p.title;
      const pageRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&prop=extracts|info&inprop=url&explaintext=1&format=json&titles=${encodeURIComponent(pageTitle)}`);
      const pageData = await pageRes.json();
      const pagesObj = pageData?.query?.pages || {};
      const firstKey = Object.keys(pagesObj)[0];
      const page = firstKey ? pagesObj[firstKey] : null;
      if (!page) continue;
      results.push({
        title: page.title,
        url: page.fullurl,
        content: (page.extract || '').toString(),
        source_type: 'wikipedia'
      });
    }
    return results;
  }
};

export default wikipediaProvider;


