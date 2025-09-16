export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  userQuery?: string;
  timestamp: Date;
  ragResults?: RAGResult[];
  formResults?: FormResult[];
  formSchema?: any;
  formState?: Array<{ name: string; value: string }>;
  continuingApplicationId?: string;
}

export type ResponseType = 'smart' | 'ragLink' | 'ragForm';

export type LoadingState =
  | 'understanding'
  | 'finding'
  | 'found'
  | 'generating'
  | 'chat'
  | 'agency'
  | 'retrieving_links'
  | 'retrieving_forms'
  | null;

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

// Added to support AgencyDetection component props
export interface AgencyDetection {
  needs_agency?: boolean;
  agency: string;
  category?: string;
  reasoning?: string;
}

export interface Country {
  name: string;
  flag: string;
}

export interface Language {
  name: string;
  code: string;
  flag: string;
}

export interface Settings {
  maxTokens: number;
  temperature: number;
  thinkingMode: 'on' | 'off';
}

export interface ChatTitle {
  id: string;
  title: string;
  createdAt: Date;
}