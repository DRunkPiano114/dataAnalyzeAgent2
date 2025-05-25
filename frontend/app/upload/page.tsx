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
      console.log('API 响应:', data); // 添加日志以便调试
      
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
      
      // 构建摘要文本 - 改善逻辑
      let summaryText = '';
      
      // 优先使用后端返回的summary
      if (data.summary && data.summary.trim()) {
        summaryText = data.summary;
      } else if (data.raw_output && data.raw_output.trim()) {
        summaryText = data.raw_output;
      } else {
        // 如果没有摘要，根据其他数据构建摘要
        if (data.code && result.data && result.data.length > 0) {
          summaryText = `分析完成！生成了Python代码并获得了${result.data.length}行数据结果。`;
        } else if (data.code) {
          summaryText = `分析完成！生成了Python代码，但没有返回数据结果。`;
        } else if (result.data && result.data.length > 0) {
          summaryText = `分析完成！获得了${result.data.length}行数据结果。`;
        } else {
          summaryText = '我已经处理了您的请求。';
        }
      }
      
      // 如果有代码，添加代码显示
      if (data.code && !summaryText.includes('```python')) {
        summaryText += `\n\n💻 **生成的代码:**\n\`\`\`python\n${data.code}\n\`\`\``;
      }
      
      // 如果有数据结果，添加数据说明
      if (result.data && result.data.length > 0 && !summaryText.includes('数据结果')) {
        summaryText += `\n\n📊 **数据结果:** ${result.data.length} 行数据 (见下表)`;
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