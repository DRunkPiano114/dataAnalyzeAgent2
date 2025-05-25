from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from typing import List
import shutil
import os
import uuid
from analysis_agent import run_analysis
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="AI Data Analysis API", version="1.0.0")

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境中应限制为具体的域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
    try:
        file_paths = []
        
        # 如果没有提供session_id，生成一个新的
        if not session_id:
            session_id = str(uuid.uuid4())
        
        # 如果有文件，处理文件上传
        if files and len(files) > 0 and files[0].filename:  # 检查是否真的有文件
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
                except Exception as e:
                    # 清理已保存的文件
                    for path in file_paths:
                        if os.path.exists(path):
                            os.remove(path)
                    raise HTTPException(status_code=500, detail=f"保存文件失败: {str(e)}")
        
        # 调用分析函数（现在支持空文件列表和会话ID）
        try:
            analysis_result = run_analysis(file_paths, prompt, session_id)
            
            # 分析完成后清理临时文件
            for file_path in file_paths:
                try:
                    if os.path.exists(file_path):
                        os.remove(file_path)
                except Exception as e:
                    print(f"警告：清理临时文件失败 {file_path}: {e}")
            
            # 在响应中包含session_id，让前端能够维护会话
            analysis_result["session_id"] = session_id
            
            return JSONResponse(content=analysis_result)
            
        except Exception as e:
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
        raise HTTPException(status_code=500, detail=f"服务器内部错误: {str(e)}")

@app.get("/")
async def root():
    """健康检查端点"""
    return {"message": "AI Data Analysis API is running", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    """健康检查端点"""
    return {"status": "healthy", "temp_dir": TEMP_DIR}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)