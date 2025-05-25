// API Configuration
export const API_CONFIG = {
  // 后端部署地址
  BASE_URL: 'https://dataanalyzeagent2.onrender.com',
  
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
  }
}

export default API_CONFIG 