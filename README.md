# AI Data Analysis Agent

一个基于AI的数据分析聊天应用，支持上传CSV/Excel文件并进行智能数据分析。

[在线Demo](https://data-analyze-agent2.vercel.app/)

## test case
![testcase1](assets/images/demo1.png)
![testcase2](assets/images/demo3.png)

## graph可视化
![graph可视化](assets/images/visualized_graph.png)

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

1. **网络连接失败 - "Failed to fetch"**
   - **问题**: 前端无法连接到后端API
   - **原因**: 
     - Render服务可能处于冷启动状态（睡眠模式）
     - 网络超时
     - CORS配置问题
   - **解决方案**:
     - 等待1-2分钟让Render服务完全启动
     - 检查后端健康状态：访问 `https://dataanalyzeagent2.onrender.com/health`
     - 前端会自动重试3次，每次间隔递增
     - 查看浏览器控制台的详细错误信息

2. **"Missing optional dependency 'tabulate'"错误**
   - **解决方案**: 确保 `requirements.txt` 中包含 `tabulate==0.9.0`，已在最新版本中修复

3. **Render服务冷启动问题**
   - **现象**: 首次访问或长时间未使用后连接失败
   - **解决方案**: 
     - 等待30-60秒让服务完全启动
     - 可以先访问后端健康检查端点预热服务
     - 考虑升级到Render付费计划避免冷启动

4. **Vercel部署后环境变量未生效**
   - **检查步骤**:
     - 确认在Vercel项目设置中添加了 `NEXT_PUBLIC_API_URL`
     - 变量值应为: `https://dataanalyzeagent2.onrender.com`
     - 修改环境变量后需要重新部署

5. **CORS错误**
   - **现象**: 浏览器控制台显示CORS策略错误
   - **解决方案**: 后端已配置支持Vercel域名，如果仍有问题请检查域名配置

### 部署检查清单

#### Render后端部署
- [ ] 仓库已连接到Render
- [ ] 构建命令: `pip install -r backend/requirements.txt`
- [ ] 启动命令: `cd backend && python main.py`
- [ ] 环境变量 `OPENAI_API_KEY` 已设置
- [ ] 服务类型选择 "Web Service"
- [ ] Python版本: 3.8+

#### Vercel前端部署
- [ ] 仓库已导入到Vercel
- [ ] 根目录设置为 `frontend`
- [ ] 环境变量 `NEXT_PUBLIC_API_URL` 已设置为后端地址
- [ ] 自动部署已启用

### 测试步骤

1. **后端健康检查**:
   ```bash
   curl https://dataanalyzeagent2.onrender.com/health
   ```
   应返回: `{"status": "healthy", "temp_dir": "temp_file"}`

2. **前端连接测试**:
   - 打开前端应用
   - 查看页面顶部的连接状态指示器
   - 绿色表示连接正常，红色表示连接失败

3. **功能测试**:
   - 尝试发送简单消息（无文件）: "你好"
   - 上传CSV文件并询问: "分析这个数据"

## 环境变量

### 后端
- `OPENAI_API_KEY`: OpenAI API密钥（必需）

### 前端
- `NEXT_PUBLIC_API_URL`: 后端API地址（必需）

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request！ 