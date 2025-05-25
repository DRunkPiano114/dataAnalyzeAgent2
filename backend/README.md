# AI数据分析API - 多文件上传支持

基于FastAPI构建的智能数据分析后端，支持多文件上传和AI驱动的数据分析。

## 功能特性

- ✅ **多文件上传**: 支持同时上传多个CSV/XLSX文件（最多10个）
- ✅ **智能分析**: 使用LangChain和OpenAI GPT模型进行数据分析
- ✅ **文件类型支持**: CSV, XLSX, XLS格式
- ✅ **自动清理**: 分析完成后自动清理临时文件
- ✅ **错误处理**: 完善的错误处理和状态反馈
- ✅ **CORS支持**: 支持跨域请求

## 安装和启动

### 1. 安装依赖

```bash
cd backend
pip install -r requirements.txt
```

### 2. 配置环境变量

创建 `.env` 文件并添加您的OpenAI API密钥：

```bash
OPENAI_API_KEY=your_openai_api_key_here
```

### 3. 启动服务器

```bash
# 方法1: 直接运行
python start_server.py

# 方法2: 使用uvicorn
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

服务启动后可通过以下地址访问：
- API服务: http://localhost:8000
- API文档: http://localhost:8000/docs
- 健康检查: http://localhost:8000/health

## API端点

### POST `/analyze`

分析上传的多个文件

**请求参数:**
- `files: List[UploadFile]` - 上传的文件列表（必需）
- `prompt: str` - 分析指令（可选，默认为"请分析数据"）

**支持的文件格式:**
- CSV (.csv)
- Excel (.xlsx, .xls)

**请求示例:**

```python
import requests

url = "http://localhost:8000/analyze"

# 准备文件
files = [
    ('files', ('data1.csv', open('data1.csv', 'rb'), 'text/csv')),
    ('files', ('data2.xlsx', open('data2.xlsx', 'rb'), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')),
]

data = {
    'prompt': '请分析这些数据的趋势和关联关系'
}

response = requests.post(url, files=files, data=data)
result = response.json()
```

**响应格式:**

```json
{
  "status": "success",
  "summary": "数据分析的自然语言总结",
  "data": [...],  // 分析结果数据
  "code": "# 执行的Python代码",
  "error": null
}
```

### GET `/health`

健康检查端点

**响应格式:**
```json
{
  "status": "healthy",
  "temp_dir": "temp_file"
}
```

## 使用限制

- **文件数量**: 最多同时上传10个文件
- **文件类型**: 仅支持CSV、XLSX、XLS格式
- **文件大小**: 受FastAPI默认限制约束
- **临时存储**: 文件在分析完成后自动删除

## 测试

使用提供的测试脚本验证API功能：

```bash
python test_api.py
```

测试脚本会：
1. 检查健康状态
2. 创建测试CSV文件
3. 上传文件并请求分析
4. 显示分析结果
5. 清理测试文件

## 技术架构

- **Web框架**: FastAPI
- **AI引擎**: LangChain + OpenAI GPT
- **数据处理**: Pandas
- **图工作流**: LangGraph
- **文件处理**: 临时文件系统存储

## 文件流程

1. **上传**: 接收多个文件并保存到`temp_file/`目录
2. **验证**: 检查文件类型和数量限制
3. **分析**: 使用LangGraph工作流进行数据分析
4. **响应**: 返回结构化的分析结果
5. **清理**: 自动删除临时文件

## 错误处理

API提供详细的错误信息：

- `400`: 文件验证失败（类型不支持、数量超限等）
- `500`: 服务器内部错误（分析失败、文件保存失败等）

## 注意事项

1. **OpenAI API密钥**: 确保设置了有效的OPENAI_API_KEY环境变量
2. **文件权限**: 确保应用有权限创建和删除temp_file目录中的文件
3. **内存使用**: 大文件可能消耗较多内存，建议监控资源使用情况
4. **安全性**: 生产环境中应限制CORS允许的域名

## 开发者指南

### 添加新的文件类型支持

在`main.py`中修改文件类型验证：

```python
if file_ext not in ['csv', 'xlsx', 'xls', 'new_format']:
    # 添加新格式处理逻辑
```

在`analysis_agent.py`中添加对应的文件读取逻辑：

```python
elif file_path.endswith(".new_format"):
    df = pd.read_newformat(file_path)  # 添加新的读取方法
```

### 自定义分析逻辑

修改`analysis_agent.py`中的系统提示和工作流节点来定制分析行为。

---

如有问题或建议，请联系开发团队！ 