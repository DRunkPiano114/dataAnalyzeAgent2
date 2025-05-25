'use client';

import React, { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  ChatBubbleLeftRightIcon, 
  TrashIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { ChatSession } from '@/types/chat';
import { 
  getAllSessions, 
  createNewSession, 
  deleteSession, 
  getCurrentSessionId, 
  setCurrentSessionId 
} from '@/utils/chatStorage';

interface SidebarProps {
  currentSessionId: string | null;
  onSessionChange: (sessionId: string) => void;
  onNewChat: () => void;
  className?: string;
  triggerRefresh?: number;
}

export default function Sidebar({ 
  currentSessionId, 
  onSessionChange, 
  onNewChat,
  className = '',
  triggerRefresh = 0
}: SidebarProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // 检测移动端
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setIsCollapsed(true);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 加载会话列表
  useEffect(() => {
    loadSessions();
  }, [triggerRefresh]);

  // 定期更新时间显示
  useEffect(() => {
    const interval = setInterval(() => {
      loadSessions(); // 重新加载会话列表以更新时间显示
    }, 60000); // 每分钟更新一次

    return () => clearInterval(interval);
  }, []);

  const loadSessions = () => {
    const allSessions = getAllSessions();
    setSessions(allSessions);
  };

  const handleNewChat = () => {
    const newSession = createNewSession();
    setCurrentSessionId(newSession.id);
    setSessions(prev => [newSession, ...prev]);
    onSessionChange(newSession.id);
    onNewChat();
    
    // 移动端自动收起侧边栏
    if (isMobile) {
      setIsCollapsed(true);
    }
  };

  const handleSessionClick = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    onSessionChange(sessionId);
    
    // 移动端自动收起侧边栏
    if (isMobile) {
      setIsCollapsed(true);
    }
  };

  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (window.confirm('确定要删除这个聊天吗？')) {
      deleteSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      
      // 如果删除的是当前会话，创建新会话
      if (sessionId === currentSessionId) {
        handleNewChat();
      }
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = diffMs / (1000 * 60);
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffHours / 24;

    if (diffMinutes < 1) {
      return '刚刚';
    } else if (diffMinutes < 60) {
      return `${Math.floor(diffMinutes)}分钟前`;
    } else if (diffHours < 24) {
      return `${Math.floor(diffHours)}小时前`;
    } else if (diffDays < 7) {
      return `${Math.floor(diffDays)}天前`;
    } else if (diffDays < 30) {
      return `${Math.floor(diffDays / 7)}周前`;
    } else {
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric'
      });
    }
  };

  if (isCollapsed) {
    return (
      <>
        {/* 移动端遮罩层 */}
        {isMobile && !isCollapsed && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setIsCollapsed(true)}
          />
        )}
        
        {/* 折叠状态的按钮 */}
        <button
          onClick={() => setIsCollapsed(false)}
          className="fixed top-4 left-4 z-50 p-2 bg-white border border-gray-300 rounded-lg shadow-lg hover:bg-gray-50 transition-colors"
        >
          <Bars3Icon className="h-5 w-5 text-gray-600" />
        </button>
      </>
    );
  }

  return (
    <>
      {/* 移动端遮罩层 */}
      {isMobile && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsCollapsed(true)}
        />
      )}
      
      {/* 侧边栏 */}
      <div className={`
        ${isMobile ? 'fixed' : 'relative'} 
        top-0 left-0 h-full w-64 bg-gray-900 text-white flex flex-col z-50
        ${className}
      `}>
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold">聊天记录</h2>
          {isMobile && (
            <button
              onClick={() => setIsCollapsed(true)}
              className="p-1 rounded hover:bg-gray-800 transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* 新建聊天按钮 */}
        <div className="p-4">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center gap-3 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors group"
          >
            <PlusIcon className="h-5 w-5" />
            <span>新建聊天</span>
          </button>
        </div>

        {/* 聊天列表 */}
        <div className="flex-1 overflow-y-auto">
          {sessions.length === 0 ? (
            <div className="p-4 text-center text-gray-400">
              <ChatBubbleLeftRightIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>还没有聊天记录</p>
              <p className="text-sm mt-1">开始你的第一个对话吧</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => handleSessionClick(session.id)}
                  className={`
                    group relative p-3 rounded-lg cursor-pointer transition-colors
                    ${session.id === currentSessionId 
                      ? 'bg-gray-700 border border-gray-600' 
                      : 'hover:bg-gray-800'
                    }
                  `}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm truncate mb-1">
                        {session.title}
                      </h3>
                      {session.preview && (
                        <p className="text-xs text-gray-400 truncate mb-1">
                          {session.preview}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{formatDate(session.updatedAt)}</span>
                        <span>•</span>
                        <span>{session.messageCount} 条消息</span>
                      </div>
                    </div>
                    
                    {/* 删除按钮 */}
                    <button
                      onClick={(e) => handleDeleteSession(session.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-600 rounded transition-all"
                      title="删除聊天"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 底部信息 */}
        <div className="p-4 border-t border-gray-700">
          <div className="text-xs text-gray-400 text-center">
            <p>数据保存在本地浏览器</p>
            <p className="mt-1">共 {sessions.length} 个聊天</p>
          </div>
        </div>
      </div>
    </>
  );
} 