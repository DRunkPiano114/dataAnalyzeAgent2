'use client'

import { useState } from 'react'
import { API_CONFIG } from '@/utils/config'

export function ApiTest() {
  const [status, setStatus] = useState<string>('Not tested')
  const [isLoading, setIsLoading] = useState(false)

  const testConnection = async () => {
    setIsLoading(true)
    setStatus('Testing...')
    
    try {
      // Test the health endpoint
      const response = await fetch(API_CONFIG.getHealthUrl(), {
        method: 'GET',
      })
      
      if (response.ok) {
        const data = await response.json()
        setStatus(`✅ Connection successful! Server status: ${data.status}`)
      } else {
        setStatus(`❌ Connection failed! Status code: ${response.status}`)
      }
    } catch (error) {
      setStatus(`❌ Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-4 border rounded-lg bg-white shadow-sm">
      <h3 className="text-lg font-semibold mb-2">API Connection Test</h3>
      <p className="text-sm text-gray-600 mb-2">
        Backend URL: {API_CONFIG.BASE_URL}
      </p>
      <button
        onClick={testConnection}
        disabled={isLoading}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {isLoading ? 'Testing...' : 'Test Connection'}
      </button>
      <div className="mt-2 text-sm">
        Status: {status}
      </div>
    </div>
  )
} 