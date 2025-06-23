export interface Product {
  id: string;
  name: string;
  description?: string;
  openai_vector_store_id?: string;
}

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  threadId?: string;
  productId?: string;
  type?: 'text' | 'error' | 'system' | 'loading';
  metadata?: {
    model?: string;
    tokens?: number;
    processingTime?: number;
  };
}

export interface ChatSession {
  id: string;
  title: string;
  productId: string;
  productName: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  lastMessage?: string;
  threadId?: string;
  isFavorite?: boolean;
  isArchived?: boolean;
}

export type ChatStatus =
  | 'initializing'
  | 'idle'
  | 'ready'
  | 'loading'
  | 'sending'
  | 'receiving'
  | 'error'
  | 'typing'
  | 'product_load_error'
  | 'product_selected_no_chat'
  | 'ready_with_product'
  | 'sending_to_backend'
  | 'backend_processing_delay'
  | 'backend_error'
  | 'assistant_responding';

export interface ChatPreferences {
  theme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'medium' | 'large';
  soundEnabled: boolean;
  showTimestamps: boolean;
  showTypingIndicators: boolean;
  autoScrollEnabled: boolean;
  enterToSend: boolean;
}

export interface ConversationTemplate {
  id: string;
  title: string;
  description: string;
  prompt: string;
  category: string;
  productTypes?: string[];
  tags: string[];
}

export interface ChatError {
  code: string;
  message: string;
  details?: string;
  timestamp: Date;
}

export interface SearchFilter {
  query?: string;
  productId?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  sender?: 'user' | 'assistant';
  hasAttachments?: boolean;
}

export interface ExportOptions {
  format: 'json' | 'markdown' | 'pdf' | 'txt';
  includeMetadata: boolean;
  includeTimestamps: boolean;
  sessionIds: string[];
} 