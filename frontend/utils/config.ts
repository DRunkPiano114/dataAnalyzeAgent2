// API Configuration for Production Deployment
export const API_CONFIG = {
  // 主要后端地址 - 支持环境变量覆盖
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'https://dataanalyzeagent2.onrender.com',
  
  // 备用后端地址（如果主地址失败）
  FALLBACK_URL: 'https://dataanalyzeagent2.onrender.com',
  
  // Get the full analyze endpoint URL
  getAnalyzeUrl: () => {
    return `${API_CONFIG.BASE_URL}/analyze`
  },
  
  // Get health check URL
  getHealthUrl: () => {
    return `${API_CONFIG.BASE_URL}/health`
  },
  
  // Get test URL
  getTestUrl: () => {
    return `${API_CONFIG.BASE_URL}/test`
  },
  
  // 获取带重试机制的请求配置
  getRequestConfig: () => {
    return {
      timeout: 30000, // 30秒超时
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }
    }
  }
}

export default API_CONFIG 