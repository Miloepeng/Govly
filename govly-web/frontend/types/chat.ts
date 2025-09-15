export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  userQuery?: string;
  timestamp: Date;
  ragResults?: RAGResult[];
  formResults?: FormResult[];
}

export interface RAGResult {
  title: string;
  content: string;
  url: string;
  similarity: number;
}

export interface FormResult {
  id: number;
  title: string;
  description?: string;
  url: string;
} 