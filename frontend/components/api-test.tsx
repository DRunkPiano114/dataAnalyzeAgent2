'use client'

import { useState } from 'react'
import { API_CONFIG } from '@/utils/config'

export function ApiTest() {
  const [status, setStatus] = useState<string>('未测试')
  const [isLoading, setIsLoading] = useState(false)

  const testConnection = async () => {
    setIsLoading(true)
    setStatus('测试中...')
    
    try {
      // 测试健康检查端点
      const response = await fetch(API_CONFIG.getHealthUrl(), {
        method: 'GET',
      })
      
      if (response.ok) {
        const data = await response.json()
        setStatus(`✅ 连接成功！服务器状态：${data.status}`)
      } else {
        setStatus(`❌ 连接失败！状态码：${response.status}`)
      }
    } catch (error) {
      setStatus(`❌ 连接错误：${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-4 border rounded-lg bg-white shadow-sm">
      <h3 className="text-lg font-semibold mb-2">API连接测试</h3>
      <p className="text-sm text-gray-600 mb-2">
        后端地址：{API_CONFIG.BASE_URL}
      </p>
      <button
        onClick={testConnection}
        disabled={isLoading}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {isLoading ? '测试中...' : '测试连接'}
      </button>
      <div className="mt-2 text-sm">
        状态：{status}
      </div>
    </div>
  )
} 