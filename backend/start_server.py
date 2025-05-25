#!/usr/bin/env python3
"""
启动FastAPI服务器的脚本
"""

import uvicorn
import os
from main import app

def start_server():
    """启动FastAPI服务器"""
    print("🚀 启动AI数据分析API服务器...")
    print("📍 服务地址: http://localhost:8000")
    print("📖 API文档: http://localhost:8000/docs")
    print("🔍 健康检查: http://localhost:8000/health")
    print("-" * 50)
    
    # 确保必要的目录存在
    os.makedirs("temp_file", exist_ok=True)
    
    # 启动服务器
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        reload=True,  # 开发模式下自动重载
        log_level="info"
    )

if __name__ == "__main__":
    start_server() 