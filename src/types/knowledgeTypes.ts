
export interface UserKnowledgeBucket {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserKnowledgeDocument {
  id: string;
  bucket_id: string;
  user_id: string;
  filename: string;
  file_path: string;
  content_type?: string;
  file_size?: number;
  extracted_text?: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  metadata: Record<string, any>;
  created_at: string;
}

export interface UserKnowledgeChunk {
  id: string;
  document_id: string;
  user_id: string;
  chunk_index: number;
  content: string;
  token_count?: number;
  embedding?: number[];
  chunk_metadata: Record<string, any>;
  created_at: string;
}

export interface KnowledgeSearchResult {
  chunk_id: string;
  content: string;
  document_name: string;
  relevance_score: number;
  chunk_metadata: Record<string, any>;
}

export interface EnhancedPamMemory {
  region?: string;
  travel_style?: string;
  vehicle_type?: string;
  preferences?: any;
  personal_knowledge?: {
    relevant_chunks: KnowledgeSearchResult[];
    knowledge_summary: string;
    total_documents: number;
  };
}
