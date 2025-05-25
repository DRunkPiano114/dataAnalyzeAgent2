'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FileUploader, UploadedFile } from './file-uploader';
import { MessageList } from './message-list';
import { ChatMessage } from '@/types/chat';
import { ChatInput } from './chat-input';

interface ChatBoxProps {
  onSendMessage: (message: string, files: UploadedFile[]) => Promise<string | {
    summary?: string;
    text?: string;
    data?: any[];
    [key: string]: any;
  }>;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export function ChatBox({ onSendMessage }: ChatBoxProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到最新消息
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFilesAdd = (newFiles: File[]) => {
    const uploadedFiles: UploadedFile[] = newFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      name: file.name,
      size: formatFileSize(file.size),
      type: file.type
    }));

    setFiles(prev => [...prev, ...uploadedFiles]);
  };

  const handleFileRemove = (id: string) => {
    setFiles(prev => prev.filter(file => file.id !== id));
  };

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;

    // Create user message
    const userMessage: ChatMessage = {
      id: Math.random().toString(36).substr(2, 9),
      role: 'user',
      content: message,
      timestamp: new Date(),
      files: files.length > 0 ? files.map(f => f.name) : undefined
    };

    // Add user message to chat immediately
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Call the parent component's send message handler and get response
      const response = await onSendMessage(message, files);
      
      // Parse the response to extract text and data
      let aiContent = '';
      let aiData: any[] | undefined = undefined;
      
      if (typeof response === 'string') {
        aiContent = response;
      } else if (typeof response === 'object' && response !== null) {
        // If response is an object with separate fields
        aiContent = response.summary || response.text || JSON.stringify(response, null, 2);
        aiData = response.data || undefined;
      }
      
      // Add AI response to chat immediately
      const aiMessage: ChatMessage = {
        id: Math.random().toString(36).substr(2, 9),
        role: 'ai',
        content: aiContent,
        timestamp: new Date(),
        data: aiData
      };
      
      // Use functional update to ensure we get the latest state
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      // Add error message
      const errorMessage: ChatMessage = {
        id: Math.random().toString(36).substr(2, 9),
        role: 'ai',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col max-w-6xl mx-auto">
      {/* Header - 简化并缩小 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-800">AI Chat Assistant</h1>
        <p className="text-sm text-gray-600">Upload files and chat with AI</p>
      </div>

      {/* Main Chat Area - 大幅扩展 */}
      <div className="flex-1 bg-gray-50 overflow-hidden flex flex-col">
        {/* Messages Area - 占据大部分空间 */}
        <div className="flex-1 overflow-hidden">
          <MessageList 
            messages={messages} 
            isLoading={isLoading}
            scrollRef={messagesEndRef}
          />
        </div>

        {/* Bottom Section - 输入区域和文件上传 */}
        <div className="bg-white border-t border-gray-200">
          {/* File Upload Area - 紧凑设计 */}
          {(files.length > 0 || messages.length === 0) && (
            <div className="px-6 py-3 border-b border-gray-100 bg-gray-50">
              <FileUploader
                files={files}
                onFilesAdd={handleFilesAdd}
                onFileRemove={handleFileRemove}
                compact={true}
              />
            </div>
          )}

          {/* Chat Input */}
          <div className="px-6 py-4">
            <ChatInput
              onSendMessage={handleSendMessage}
              disabled={isLoading}
              placeholder={files.length > 0 ? "Ask a question about your files..." : "Upload files and ask a question..."}
            />
          </div>
        </div>
      </div>
    </div>
  );
} 