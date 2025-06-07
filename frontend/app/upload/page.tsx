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
      console.log('API response:', data); // log for debugging
      
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
      
      // Build summary text
      let summaryText = '';
      
      // Prefer the summary returned by the backend
      if (data.summary && data.summary.trim()) {
        summaryText = data.summary;
      } else if (data.raw_output && data.raw_output.trim()) {
        summaryText = data.raw_output;
      } else {
        // If no summary is provided, build one from other data
        if (data.code && result.data && result.data.length > 0) {
          summaryText = `Analysis complete! Generated Python code and obtained ${result.data.length} rows of data.`;
        } else if (data.code) {
          summaryText = `Analysis complete! Generated Python code but no data was returned.`;
        } else if (result.data && result.data.length > 0) {
          summaryText = `Analysis complete! Obtained ${result.data.length} rows of data.`;
        } else {
          summaryText = 'Your request has been processed.';
        }
      }
      
      // Include code if present
      if (data.code && !summaryText.includes('```python')) {
        summaryText += `\n\n💻 **Generated Code:**\n\`\`\`python\n${data.code}\n\`\`\``;
      }
      
      // Include data info if present
      if (result.data && result.data.length > 0 && !summaryText.includes('Data Result')) {
        summaryText += `\n\n📊 **Data Result:** ${result.data.length} rows (see table below)`;
      }
      
      result.summary = summaryText;
      
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