
export interface ChatMessage {
  sender: "user" | "pam";
  content: string;
  timestamp: Date;
}

export interface PamAssistantProps {
  user: {
    name: string;
    avatar: string;
  };
}
