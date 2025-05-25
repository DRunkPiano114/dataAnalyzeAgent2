'use client';

import React from 'react';
import { ChatBox } from '@/components/ui/chat-box';
import { UploadedFile } from '@/components/ui/file-uploader';
import { API_CONFIG } from '@/utils/config';

export default function UploadPage() {
  const handleSendMessage = async (message: string, files: UploadedFile[]): Promise<{
    summary: string;
    data?: any[];
    code?: string;
  }> => {
    try {
      const formData = new FormData();
      
      // 添加所有文件到FormData，使用 'files' 作为字段名（支持多个文件）
      // 即使没有文件也要发送空的files字段
      if (files && files.length > 0) {
        files.forEach((uploadedFile) => {
          formData.append('files', uploadedFile.file);
        });
      }
      
      // 添加分析指令
      formData.append('prompt', message);
      
      // 使用部署的后端API地址
      const response = await fetch(API_CONFIG.getAnalyzeUrl(), {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      // 构建返回对象
      const result: {
        summary: string;
        data?: any[];
        code?: string;
      } = {
        summary: '',
        data: data.data && data.data.length > 0 ? data.data : undefined,
        code: data.code || undefined
      };
      
      // 构建摘要文本
      let summaryText = '';
      
      if (data.summary) {
        // 如果是纯聊天响应（没有分析数据），直接显示摘要
        if (!data.data && !data.code) {
          summaryText = data.summary;
        } else {
          summaryText += `📊 **Analysis Summary:**\n${data.summary}\n\n`;
        }
      }
      
      if (data.code) {
        summaryText += `💻 **Generated Code:**\n\`\`\`python\n${data.code}\n\`\`\`\n\n`;
      }
      
      if (result.data && result.data.length > 0) {
        summaryText += `📋 **Data Results:** ${result.data.length} rows of data (see table below)`;
      }
      
      result.summary = summaryText || '✅ Analysis completed successfully.';
      
      return result;
      
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  };

  return (
    <div className="w-full h-screen bg-gray-50">
      <ChatBox onSendMessage={handleSendMessage} />
    </div>
  );
}