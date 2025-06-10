export interface NewsArticle {
  url: string;
  title: string;
  content: string;
  summary: string;
  extractedAt: Date;
}

export interface ExtractRequest {
  url: string;
}

export interface ExtractResponse {
  success: boolean;
  title?: string;
  content?: string;
  error?: string;
}

export interface SummaryRequest {
  title: string;
  content: string;
}

export interface SummaryResponse {
  success: boolean;
  summary?: string;
  error?: string;
}