from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from typing import List
import shutil
import os
import uuid
import logging
from analysis_agent import run_analysis
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="AI Data Analysis API", version="1.0.0")

# 配置CORS - 专门为Vercel前端部署优化
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://*.vercel.app",  # Vercel部署的域名
        "https://*.vercel.com",  # Vercel自定义域名
        "https://dataanalyzeagent2.onrender.com",  # 后端自身
        "*"  # 开发环境兼容
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# 确保temp_file目录存在
TEMP_DIR = "temp_file"
os.makedirs(TEMP_DIR, exist_ok=True)

@app.post("/analyze")
async def analyze_files(
    files: List[UploadFile] = File(default=[]),
    prompt: str = Form(default="请分析数据"),
    session_id: str = Form(default="")
):
    """
    分析多个上传的文件
    
    Args:
        files: 上传的文件列表 (支持 CSV, XLSX，可选)
        prompt: 分析指令
        session_id: 会话ID，用于保持对话历史连续性
        
    Returns:
        分析结果的JSON响应
    """
    logger.info(f"收到分析请求: prompt='{prompt}', session_id='{session_id}', files_count={len(files) if files else 0}")
    
    try:
        file_paths = []
        
        # 如果没有提供session_id，生成一个新的
        if not session_id:
            session_id = str(uuid.uuid4())
            logger.info(f"生成新的session_id: {session_id}")
        
        # 如果有文件，处理文件上传
        if files and len(files) > 0 and files[0].filename:  # 检查是否真的有文件
            logger.info(f"处理 {len(files)} 个文件")
            
            # 验证文件数量
            if len(files) > 10:  # 限制最大文件数量
                raise HTTPException(status_code=400, detail="最多支持上传10个文件")
            
            # 处理每个上传的文件
            for i, file in enumerate(files):
                # 验证文件类型
                if not file.filename:
                    continue  # 跳过空文件
                
                file_ext = file.filename.split('.')[-1].lower()
                if file_ext not in ['csv', 'xlsx', 'xls']:
                    raise HTTPException(
                        status_code=400, 
                        detail=f"不支持的文件类型: {file.filename}. 仅支持 CSV, XLSX, XLS 文件"
                    )
                
                # 生成唯一文件名，保留原始扩展名
                unique_filename = f"{uuid.uuid4().hex}.{file_ext}"
                file_path = os.path.join(TEMP_DIR, unique_filename)
                
                # 保存文件
                try:
                    with open(file_path, "wb") as buffer:
                        shutil.copyfileobj(file.file, buffer)
                    file_paths.append(file_path)
                    logger.info(f"文件保存成功: {file.filename} -> {file_path}")
                except Exception as e:
                    logger.error(f"保存文件失败: {file.filename}, 错误: {str(e)}")
                    # 清理已保存的文件
                    for path in file_paths:
                        if os.path.exists(path):
                            os.remove(path)
                    raise HTTPException(status_code=500, detail=f"保存文件失败: {str(e)}")
        
        # 调用分析函数（现在支持空文件列表和会话ID）
        try:
            logger.info(f"开始分析: files={file_paths}, prompt='{prompt}'")
            analysis_result = run_analysis(file_paths, prompt, session_id)
            logger.info(f"分析完成: status={analysis_result.get('status', 'unknown')}")
            
            # 分析完成后清理临时文件
            for file_path in file_paths:
                try:
                    if os.path.exists(file_path):
                        os.remove(file_path)
                        logger.info(f"临时文件已清理: {file_path}")
                except Exception as e:
                    logger.warning(f"清理临时文件失败 {file_path}: {e}")
            
            # 在响应中包含session_id，让前端能够维护会话
            analysis_result["session_id"] = session_id
            
            return JSONResponse(content=analysis_result)
            
        except Exception as e:
            logger.error(f"分析失败: {str(e)}")
            # 发生错误时也要清理文件
            for file_path in file_paths:
                try:
                    if os.path.exists(file_path):
                        os.remove(file_path)
                except:
                    pass
            raise HTTPException(status_code=500, detail=f"分析失败: {str(e)}")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"服务器内部错误: {str(e)}")
        raise HTTPException(status_code=500, detail=f"服务器内部错误: {str(e)}")

@app.get("/")
async def root():
    """健康检查端点"""
    return {"message": "AI Data Analysis API is running", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    """健康检查端点"""
    return {"status": "healthy", "temp_dir": TEMP_DIR}

@app.get("/test")
async def test_endpoint():
    """测试端点"""
    return {"message": "Test endpoint is working", "timestamp": str(uuid.uuid4())}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)