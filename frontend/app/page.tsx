'use client'

import { useState, useEffect, useRef } from 'react'
import { MessageList } from '../components/ui/message-list'
import { FileUploader, UploadedFile } from '../components/ui/file-uploader'
import { ChatInput } from '../components/ui/chat-input'
import { ConnectionStatus } from '../components/connection-status'
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

  // 发送消息（带重试机制）
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

    // 重试逻辑
    const maxRetries = 3
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`尝试发送请求 (${attempt}/${maxRetries})...`)
        
        // 准备请求数据
        const formData = new FormData()
        formData.append('prompt', message)
        formData.append('session_id', currentSessionId)
        
        // 添加文件（如果有）
        uploadedFiles.forEach(uploadedFile => {
          formData.append('files', uploadedFile.file)
        })

        // 使用fetch with timeout
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 60000) // 60秒超时

        const response = await fetch(API_CONFIG.getAnalyzeUrl(), {
          method: 'POST',
          body: formData,
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const result = await response.json()
        console.log('API 响应成功:', result)

        // 检查是否有错误
        if (result.error) {
          throw new Error(result.error)
        }

        // 确定AI回复内容
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
        
        // 成功，退出重试循环
        break

      } catch (error) {
        lastError = error as Error
        console.error(`请求失败 (尝试 ${attempt}/${maxRetries}):`, error)
        
        // 如果不是最后一次尝试，等待后重试
        if (attempt < maxRetries) {
          console.log(`等待 ${attempt * 2} 秒后重试...`)
          await new Promise(resolve => setTimeout(resolve, attempt * 2000))
          continue
        }
        
        // 最后一次尝试失败，显示错误
        let errorContent = ''
        if (lastError) {
          if (lastError.name === 'AbortError') {
            errorContent = '请求超时，服务器可能正在启动中，请稍后再试'
          } else if (lastError.message.includes('Failed to fetch') || lastError.message.includes('NetworkError')) {
            errorContent = '网络连接失败，请检查网络连接或稍后再试'
          } else if (lastError.message.includes('HTTP 5')) {
            errorContent = '服务器内部错误，请稍后再试'
          } else {
            errorContent = lastError.message
          }
        } else {
          errorContent = '未知错误'
        }
        
        // 添加错误消息
        const errorMessage: ChatMessage = {
          id: `msg_${Date.now()}_error`,
          role: 'ai',
          content: `抱歉，发生了错误：${errorContent}${maxRetries > 1 ? `\n\n已尝试 ${maxRetries} 次，如果问题持续存在，请检查后端服务是否正常运行。` : ''}`,
          timestamp: new Date()
        }

        const finalMessages = [...newMessages, errorMessage]
        saveMessages(currentSessionId, finalMessages)
      }
    }
    
    setIsLoading(false)
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
        {/* 连接状态栏 */}
        <div className="p-3 bg-gray-50 border-b border-gray-200">
          <ConnectionStatus />
        </div>
        
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