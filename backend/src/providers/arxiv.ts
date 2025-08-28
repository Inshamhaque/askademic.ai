import { SourceProvider, NormalizedSource } from './SourceProvider.js';
import fetch from 'node-fetch';

const parseArxivAtom = async (text: string): Promise<NormalizedSource[]> => {
  const entries: NormalizedSource[] = [];
  const parser = /<entry>[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<summary>([\s\S]*?)<\/summary>[\s\S]*?<id>([\s\S]*?)<\/id>[\s\S]*?<published>([\s\S]*?)<\/published>[\s\S]*?<\/entry>/gi;
  let match: RegExpExecArray | null;
  while ((match = parser.exec(text))) {
    const title = match[1].replace(/\s+/g, ' ').trim();
    const summary = match[2].replace(/\s+/g, ' ').trim();
    const url = match[3].trim();
    entries.push({ title, url, content: summary, source_type: 'arxiv' });
  }
  return entries;
};

const arxivProvider: SourceProvider = {
  name: 'arxiv',
  async fetch(query: string, limit = 10) {
    const search = encodeURIComponent(query);
    const res = await fetch(`http://export.arxiv.org/api/query?search_query=all:${search}&start=0&max_results=${limit}`);
    const text = await res.text();
    return parseArxivAtom(text).slice(0, limit);
  }
};

export default arxivProvider;


