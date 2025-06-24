
export interface ChatMessage {
  sender: "user" | "pam";
  content: string;
  timestamp: Date;
  knowledgeUsed?: string[];
}

export interface WebSocketMessage {
  id: string;
  role: 'user' | 'assistant' | 'error';
  content: string;
  timestamp: number;
  type?: string;
  message?: string;
  status?: string;
  actions?: any[];
  user_id?: string;
  context?: any;
}

export interface PamAssistantProps {
  user: {
    name: string;
    avatar: string;
  };
}
