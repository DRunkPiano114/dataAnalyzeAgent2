export interface ChatSession {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  preview?: string; // 最后一条消息的预览
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
  files?: string[];
  data?: any[];
}

export interface ChatSessionWithMessages extends ChatSession {
  messages: ChatMessage[];
} 