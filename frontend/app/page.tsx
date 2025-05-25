'use client'

import { useState, useEffect, useRef } from 'react'
import { MessageList } from '../components/ui/message-list'
import { FileUploader, UploadedFile } from '../components/ui/file-uploader'
import { ChatInput } from '../components/ui/chat-input'
import Sidebar from '../components/sidebar'
import { ChatMessage } from '@/types/chat'
import { 
  getCurrentSessionId, 
  setCurrentSessionId, 
  createNewSession,
  getSessionMessages,
  saveSessionMessages 
} from '@/utils/chatStorage'
import { API_CONFIG } from '@/utils/config'

export default function Home() {
  // 会话管理
  const [currentSessionId, setCurrentSessionIdState] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  
  // UI状态
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [sidebarRefreshTrigger, setSidebarRefreshTrigger] = useState(0)
  
  // 滚动引用
  const scrollRef = useRef<HTMLDivElement>(null)

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isLoading])

  // 初始化会话
  useEffect(() => {
    let sessionId = getCurrentSessionId()
    
    if (!sessionId) {
      // 如果没有当前会话，创建新会话
      const newSession = createNewSession()
      sessionId = newSession.id
      setCurrentSessionId(sessionId)
    }
    
    setCurrentSessionIdState(sessionId)
    loadSessionMessages(sessionId)
  }, [])

  // 加载会话消息
  const loadSessionMessages = (sessionId: string) => {
    const sessionMessages = getSessionMessages(sessionId)
    setMessages(sessionMessages)
  }

  // 保存消息到存储
  const saveMessages = (sessionId: string, newMessages: ChatMessage[]) => {
    saveSessionMessages(sessionId, newMessages)
    setMessages(newMessages)
    // 触发侧边栏刷新以更新消息统计和时间
    setSidebarRefreshTrigger(prev => prev + 1)
  }

  // 切换会话
  const handleSessionChange = (sessionId: string) => {
    if (currentSessionId !== sessionId) {
      setCurrentSessionIdState(sessionId)
      loadSessionMessages(sessionId)
      // 切换会话时清除已上传的文件
      setUploadedFiles([])
    }
  }

  // 新建聊天
  const handleNewChat = () => {
    // 创建新会话
    const newSession = createNewSession()
    setCurrentSessionId(newSession.id)
    setCurrentSessionIdState(newSession.id)
    
    // 清除当前状态
    setMessages([])
    setUploadedFiles([])
    setIsLoading(false)
    
    // 触发侧边栏刷新
    setSidebarRefreshTrigger(prev => prev + 1)
  }

  // 添加文件
  const handleFilesAdd = (files: File[]) => {
    const newUploadedFiles: UploadedFile[] = files.map(file => ({
      id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      file,
      name: file.name,
      size: formatFileSize(file.size),
      type: file.type
    }))
    setUploadedFiles(prev => [...prev, ...newUploadedFiles])
  }

  // 移除文件
  const handleFileRemove = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id))
  }

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // 发送消息
  const handleSendMessage = async (message: string) => {
    if (!currentSessionId) return

    // 添加用户消息
    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}_user`,
      role: 'user',
      content: message,
      timestamp: new Date(),
      files: uploadedFiles.length > 0 ? uploadedFiles.map(f => f.name) : undefined
    }

    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setIsLoading(true)

    try {
      // 准备请求数据
      const formData = new FormData()
      formData.append('prompt', message)
      formData.append('session_id', currentSessionId)
      
      // 添加文件（如果有）
      uploadedFiles.forEach(uploadedFile => {
        formData.append('files', uploadedFile.file)
      })

      // 使用部署的后端API地址
      const response = await fetch(API_CONFIG.getAnalyzeUrl(), {
        method: 'POST',
        body: formData,
        // 添加超时处理
        signal: AbortSignal.timeout(60000) // 60秒超时
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}, message: ${response.statusText}`)
      }

      const result = await response.json()
      console.log('API 响应:', result) // 添加日志以便调试

      // 检查是否有错误
      if (result.error) {
        throw new Error(result.error)
      }

      // 确定AI回复内容的优先级：summary > raw_output > 默认消息
      let aiContent = ''
      if (result.summary && result.summary.trim()) {
        aiContent = result.summary
      } else if (result.raw_output && result.raw_output.trim()) {
        aiContent = result.raw_output
      } else if (result.status === 'error') {
        aiContent = `抱歉，处理您的请求时出现了问题。${result.error || '请稍后再试。'}`
      } else {
        aiContent = '我已经处理了您的请求，但没有生成具体的回复内容。'
      }

      // 添加AI回复
      const aiMessage: ChatMessage = {
        id: `msg_${Date.now()}_ai`,
        role: 'ai',
        content: aiContent,
        timestamp: new Date(),
        data: result.data && Array.isArray(result.data) && result.data.length > 0 ? result.data : undefined
      }

      const finalMessages = [...newMessages, aiMessage]
      saveMessages(currentSessionId, finalMessages)

      // 清除上传的文件
      setUploadedFiles([])

    } catch (error) {
      console.error('Error sending message:', error)
      
      let errorContent = ''
      if (error instanceof Error) {
        if (error.name === 'TimeoutError') {
          errorContent = '请求超时，请检查网络连接或稍后再试'
        } else if (error.message.includes('Failed to fetch')) {
          errorContent = '网络连接失败，请检查您的网络连接'
        } else {
          errorContent = error.message
        }
      } else {
        errorContent = '未知错误'
      }
      
      // 添加错误消息
      const errorMessage: ChatMessage = {
        id: `msg_${Date.now()}_error`,
        role: 'ai',
        content: `抱歉，发生了错误：${errorContent}`,
        timestamp: new Date()
      }

      const finalMessages = [...newMessages, errorMessage]
      saveMessages(currentSessionId, finalMessages)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="h-screen flex bg-gray-50">
      {/* 左侧边栏 */}
      <Sidebar
        currentSessionId={currentSessionId}
        onSessionChange={handleSessionChange}
        onNewChat={handleNewChat}
        triggerRefresh={sidebarRefreshTrigger}
      />

      {/* 主聊天区域 */}
      <div className="flex-1 flex flex-col">
        {/* 聊天消息区域 */}
        <div className="flex-1 overflow-hidden">
          <MessageList 
            messages={messages} 
            isLoading={isLoading}
            scrollRef={scrollRef}
          />
        </div>

        {/* 底部输入区域 */}
        <div className="border-t border-gray-200 bg-white">
          {/* 输入框和文件上传 */}
          <div className="p-4">
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <ChatInput 
                  onSendMessage={handleSendMessage} 
                  disabled={isLoading}
                />
              </div>
              <div className="flex-shrink-0">
                <FileUploader 
                  files={uploadedFiles}
                  onFilesAdd={handleFilesAdd}
                  onFileRemove={handleFileRemove}
                  compact={true}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 