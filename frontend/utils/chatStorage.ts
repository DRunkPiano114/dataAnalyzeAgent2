import { ChatSession, ChatSessionWithMessages, ChatMessage } from '@/types/chat';

const STORAGE_KEYS = {
  SESSIONS: 'chat_sessions',
  CURRENT_SESSION: 'current_session_id',
  MESSAGES_PREFIX: 'chat_messages_'
};

// 生成会话标题
function generateSessionTitle(firstMessage: string): string {
  const words = firstMessage.split(' ').slice(0, 6).join(' ');
  return words.length > 50 ? words.substring(0, 50) + '...' : words;
}

// 获取所有会话
export function getAllSessions(): ChatSession[] {
  try {
    const sessions = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    if (!sessions) return [];
    
    return JSON.parse(sessions).map((session: any) => ({
      ...session,
      createdAt: new Date(session.createdAt),
      updatedAt: new Date(session.updatedAt)
    }));
  } catch (error) {
    console.error('Error loading sessions:', error);
    return [];
  }
}

// 保存会话列表
function saveSessions(sessions: ChatSession[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
  } catch (error) {
    console.error('Error saving sessions:', error);
  }
}

// 创建新会话
export function createNewSession(): ChatSession {
  const newSession: ChatSession = {
    id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    title: 'New Chat',
    createdAt: new Date(),
    updatedAt: new Date(),
    messageCount: 0
  };
  
  const sessions = getAllSessions();
  sessions.unshift(newSession); // 添加到开头
  saveSessions(sessions);
  
  return newSession;
}

// 获取当前会话ID
export function getCurrentSessionId(): string | null {
  return localStorage.getItem(STORAGE_KEYS.CURRENT_SESSION);
}

// 设置当前会话ID
export function setCurrentSessionId(sessionId: string): void {
  localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION, sessionId);
}

// 获取会话消息
export function getSessionMessages(sessionId: string): ChatMessage[] {
  try {
    const messages = localStorage.getItem(STORAGE_KEYS.MESSAGES_PREFIX + sessionId);
    if (!messages) return [];
    
    return JSON.parse(messages).map((msg: any) => ({
      ...msg,
      timestamp: new Date(msg.timestamp)
    }));
  } catch (error) {
    console.error('Error loading messages:', error);
    return [];
  }
}

// 保存会话消息
export function saveSessionMessages(sessionId: string, messages: ChatMessage[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.MESSAGES_PREFIX + sessionId, JSON.stringify(messages));
    
    // 更新会话信息
    const sessions = getAllSessions();
    const sessionIndex = sessions.findIndex(s => s.id === sessionId);
    
    if (sessionIndex !== -1) {
      const session = sessions[sessionIndex];
      session.messageCount = messages.length;
      session.updatedAt = new Date();
      
      // 更新标题（如果还是默认标题且有消息）
      if (session.title === 'New Chat' && messages.length > 0) {
        const firstUserMessage = messages.find(m => m.role === 'user');
        if (firstUserMessage) {
          session.title = generateSessionTitle(firstUserMessage.content);
        }
      }
      
      // 更新预览
      if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        session.preview = lastMessage.content.substring(0, 100);
      }
      
      saveSessions(sessions);
    }
  } catch (error) {
    console.error('Error saving messages:', error);
  }
}

// 获取完整会话（包含消息）
export function getSessionWithMessages(sessionId: string): ChatSessionWithMessages | null {
  const sessions = getAllSessions();
  const session = sessions.find(s => s.id === sessionId);
  
  if (!session) return null;
  
  return {
    ...session,
    messages: getSessionMessages(sessionId)
  };
}

// 删除会话
export function deleteSession(sessionId: string): void {
  try {
    // 删除消息
    localStorage.removeItem(STORAGE_KEYS.MESSAGES_PREFIX + sessionId);
    
    // 从会话列表中删除
    const sessions = getAllSessions();
    const filteredSessions = sessions.filter(s => s.id !== sessionId);
    saveSessions(filteredSessions);
    
    // 如果删除的是当前会话，清除当前会话ID
    if (getCurrentSessionId() === sessionId) {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION);
    }
  } catch (error) {
    console.error('Error deleting session:', error);
  }
}

// 清除所有数据
export function clearAllData(): void {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(STORAGE_KEYS.MESSAGES_PREFIX) || 
          key === STORAGE_KEYS.SESSIONS || 
          key === STORAGE_KEYS.CURRENT_SESSION) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error('Error clearing data:', error);
  }
} 