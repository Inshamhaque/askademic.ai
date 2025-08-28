export interface NormalizedSource {
  title: string;
  url: string;
  content: string;
  source_type?: string;
  relevance_score?: number;
  pdf_url?: string;
  doi?: string;
}

export interface SourceProvider {
  name: string;
  fetch: (query: string, limit?: number) => Promise<NormalizedSource[]>;
}


