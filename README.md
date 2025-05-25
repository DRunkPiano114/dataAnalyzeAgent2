# AI Data Analysis Agent

一个基于AI的数据分析聊天应用，支持上传CSV/Excel文件并进行智能数据分析。

## 功能特性

- 📊 支持CSV和Excel文件上传
- 🤖 AI驱动的数据分析和查询
- 💬 对话式交互界面
- 📈 数据可视化（图表展示）
- 💾 会话历史记录
- 📱 响应式设计，支持移动端

## 技术栈

### 后端
- FastAPI - Web框架
- LangChain - AI代理框架
- Pandas - 数据处理
- OpenAI GPT - 语言模型
- Python 3.8+

### 前端
- Next.js 14 - React框架
- TypeScript - 类型安全
- Tailwind CSS - 样式框架
- Recharts - 数据可视化

## 部署说明

### 后端部署 (Render)

1. 确保 `backend/requirements.txt` 包含所有依赖：
```txt
fastapi==0.115.11
uvicorn==0.34.1
python-multipart==0.0.20
pandas==2.2.3
tabulate==0.9.0
langchain==0.3.25
langchain-openai==0.2.14
langchain-experimental==0.3.4
langchain-core==0.3.59
langgraph==0.3.31
langgraph-checkpoint==2.0.24
openai==1.75.0
python-dotenv==1.1.0
pydantic==2.11.3
typing-extensions==4.13.2
openpyxl==3.1.5
requests==2.32.3
```

2. 在Render上创建新的Web Service
3. 连接GitHub仓库
4. 设置构建命令：`pip install -r backend/requirements.txt`
5. 设置启动命令：`cd backend && python main.py`
6. 添加环境变量：
   - `OPENAI_API_KEY`: 你的OpenAI API密钥

### 前端部署 (Vercel)

1. 在Vercel上导入GitHub仓库
2. 设置根目录为 `frontend`
3. 添加环境变量：
   - `NEXT_PUBLIC_API_URL`: 后端API地址 (例如: https://your-backend.onrender.com)

## 本地开发

### 后端设置

1. 进入后端目录：
```bash
cd backend
```

2. 安装依赖：
```bash
pip install -r requirements.txt
```

3. 创建 `.env` 文件：
```env
OPENAI_API_KEY=your_openai_api_key_here
```

4. 启动服务器：
```bash
python main.py
```

### 前端设置

1. 进入前端目录：
```bash
cd frontend
```

2. 安装依赖：
```bash
npm install
```

3. 创建 `.env.local` 文件：
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

4. 启动开发服务器：
```bash
npm run dev
```

## 使用方法

1. 访问前端应用
2. 点击"Add files"上传CSV或Excel文件
3. 在聊天框中输入你的问题，例如：
   - "分析这个数据集的基本统计信息"
   - "找出销售额最高的前10个产品"
   - "显示按月份分组的趋势"
4. AI将分析数据并提供结果和可视化图表

## 故障排除

### 常见问题

1. **"Missing optional dependency 'tabulate'"错误**
   - 确保 `requirements.txt` 中包含 `tabulate==0.9.0`
   - 重新部署后端服务

2. **CORS错误**
   - 检查前端的 `NEXT_PUBLIC_API_URL` 环境变量是否正确
   - 确保后端CORS配置允许前端域名

3. **文件上传失败**
   - 检查文件格式是否为CSV或Excel
   - 确保文件大小不超过限制

4. **API调用超时**
   - 检查网络连接
   - 确认后端服务是否正常运行

## 环境变量

### 后端
- `OPENAI_API_KEY`: OpenAI API密钥（必需）

### 前端
- `NEXT_PUBLIC_API_URL`: 后端API地址（必需）

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request！ 