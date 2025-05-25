'use client';

import React from 'react';
import { Bot, User } from 'lucide-react';
import { DataTable } from './data-table';
import { ChatMessage } from '@/types/chat';

interface MessageListProps {
  messages: ChatMessage[];
  isLoading?: boolean;
  scrollRef?: React.RefObject<HTMLDivElement>;
}

export function MessageList({ messages, isLoading, scrollRef }: MessageListProps) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {messages.length === 0 && !isLoading ? (
          <div className="text-center text-gray-500 py-16">
            <Bot className="mx-auto h-16 w-16 text-gray-300 mb-6" />
            <p className="text-lg">Start a conversation by uploading files and sending a message!</p>
            <p className="text-sm text-gray-400 mt-2">Upload CSV or Excel files and ask questions about your data</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex w-full ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`
                  ${message.role === 'user' ? 'max-w-[75%] ml-8' : 'max-w-[85%]'} 
                  rounded-2xl overflow-hidden shadow-sm
                  ${message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-200'
                  }
                `}
              >
                <div className="px-6 py-4">
                  {/* Role Label */}
                  <div className="flex items-center space-x-2 mb-3">
                    {message.role === 'user' ? (
                      <User className="w-4 h-4" />
                    ) : (
                      <Bot className="w-4 h-4" />
                    )}
                    <span className={`text-xs font-medium uppercase tracking-wide ${
                      message.role === 'user' ? 'text-blue-100' : 'text-gray-600'
                    }`}>
                      {message.role === 'user' ? 'You' : 'AI Assistant'}
                    </span>
                  </div>

                  {/* Message Content */}
                  <div className={`text-base leading-relaxed ${
                    message.role === 'user' ? 'text-white' : 'text-gray-800'
                  }`}>
                    <pre className="whitespace-pre-wrap font-sans break-words">
                      {message.content}
                    </pre>
                  </div>

                  {/* Attached Files */}
                  {message.files && message.files.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-opacity-20">
                      <p className={`text-xs mb-2 ${
                        message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        Attached files:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {message.files.map((fileName, index) => (
                          <span
                            key={index}
                            className={`
                              px-3 py-1 rounded-full text-xs
                              ${message.role === 'user'
                                ? 'bg-blue-500 bg-opacity-50 text-blue-100'
                                : 'bg-gray-100 text-gray-600'
                              }
                            `}
                          >
                            {fileName}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Timestamp */}
                  <div className={`text-xs mt-3 ${
                    message.role === 'user' ? 'text-blue-100' : 'text-gray-400'
                  }`}>
                    {message.timestamp.toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </div>

                {/* Data Table - only for AI messages with data */}
                {message.role === 'ai' && message.data && message.data.length > 0 && (
                  <div className="border-t border-gray-200">
                    <DataTable 
                      data={message.data} 
                      title="Analysis Results"
                    />
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex w-full justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl px-6 py-4 shadow-sm max-w-[85%]">
              <div className="flex items-center space-x-2 mb-3">
                <Bot className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wide text-gray-600">
                  AI Assistant
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-sm text-gray-500">AI is thinking...</span>
              </div>
            </div>
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={scrollRef} />
      </div>
    </div>
  );
} 