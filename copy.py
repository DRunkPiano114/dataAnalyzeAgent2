import pandas as pd
import os
import uuid
import re
from dotenv import load_dotenv
from io import  StringIO
from typing import Dict, Optional, List, Literal
from pydantic import SecretStr
from langchain_openai import ChatOpenAI
from langchain_experimental.agents import create_pandas_dataframe_agent
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver
from langchain_core.messages import (
    AIMessage,
    HumanMessage,
    SystemMessage,
    trim_messages,
)
from langchain_core.messages.utils import count_tokens_approximately
load_dotenv()

# Define the state
class AgentState(Dict):
    route: Literal["analysis", "chat"]
    history_messages: Optional[List[Dict]] = None # store all messages
    file_paths: Optional[List[str]] = None # store all file paths
    user_prompt: Optional[str] = None # user prompt
    raw_output: Optional[str] = None#LLM output
    exec_code: Optional[str] = None#code after analysis
    analysis_dataframe_dict: Optional[Dict] = None#dataframe after analysis
    filtered_data_summary: Optional[str] = None#summary of filtered data
    error: Optional[str] = None#error message

api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    raise ValueError("OPENAI_API_KEY environment variable is not set")
llm = ChatOpenAI(model="gpt-4o-mini", api_key=SecretStr(api_key))

#clean up node
def clean_up_node(state: AgentState) -> AgentState:
    state["raw_output"] = None
    state["exec_code"] = None
    state["analysis_dataframe_dict"] = None
    state["filtered_data_summary"] = None
    state["error"] = None
    # 保留 history_messages, file_paths, user_prompt
    return state

# 修改input_node以接受外部传入的文件路径和prompt
# 注意：此函数已不再使用，逻辑已移至run_analysis函数中

#router node
def router_node(state: AgentState) -> AgentState:
    # 检查是否有文件
    has_files = state.get("file_paths") and len(state["file_paths"]) > 0
    
    prompt = f"""You are a data analysis assistant.
    You will receive a user's question.
    
    Context: The user {'has uploaded files' if has_files else 'has not uploaded any files'}.
    
    Determine whether the user's message is:
    - "analysis" (if the user is asking to analyze or query data AND files are available)
    - "chat" (if it's casual conversation, general questions, or if no files are available)

    User message: "{state["user_prompt"]}"

    Respond with either "analysis" or "chat".
    """
    
    result = llm.invoke([HumanMessage(content=prompt)]).content.strip().lower()
    if "analysis" in result and has_files:
        state["route"] = "analysis"
    else:
        state["route"] = "chat"
    return state

def extract_code_blocks(text:str):
    code_blocks = re.findall(r"```(?:python)?\n(.*?)```", text, re.DOTALL)
    return code_blocks[0] if code_blocks else ""

def analysis_node(state: AgentState) -> AgentState:
    if state.get("error"):
        return state
    
    # 检查是否有文件路径
    if not state.get("file_paths") or len(state["file_paths"]) == 0:
        state["error"] = "No files provided for analysis. Please upload files first or use chat mode for general questions."
        return state
    
    dfs = []
    for file_path in state["file_paths"]:
            if file_path.endswith(".csv"):
                df = pd.read_csv(file_path)
            elif file_path.endswith(".xlsx"):
                df = pd.read_excel(file_path)
            else:
                raise ValueError(f"Unsupported file type: {file_path}")
            dfs.append(df)
  
    agent = create_pandas_dataframe_agent(
        llm, dfs, verbose=True, allow_dangerous_code=True,
        agent_type="openai-tools", return_intermediate_steps=True,
    )
    
    try:
        invoke_result = agent.invoke(state["history_messages"])
        raw_output = invoke_result["output"]
        state["raw_output"] = raw_output

        # trim history messages
        state["history_messages"].append(AIMessage(raw_output))#raw output is code
        state["history_messages"] = trim_messages(
            state["history_messages"],
            strategy="last",
            max_tokens=30000,
            token_counter=count_tokens_approximately
            ) 
        
        state["exec_code"] = extract_code_blocks(raw_output)
    except Exception as e:
        state["error"] = f"analysis failed: {str(e)}"
    return state

#execute code
def execute_code_node(state: AgentState) -> AgentState:
    if state.get("error"):
        return state
    if not state.get("exec_code"):
        return state
    
    # 检查是否有文件路径
    if not state.get("file_paths") or len(state["file_paths"]) == 0:
        state["error"] = "No files available for code execution."
        return state
    
    dfs = []
    for file_path in state["file_paths"]:
            if file_path.endswith(".csv"):
                df = pd.read_csv(file_path)
            elif file_path.endswith(".xlsx"):
                df = pd.read_excel(file_path)
            dfs.append(df)
            
    exec_env = {"dfs": dfs, "pd": pd}

    try:
        exec(state["exec_code"], exec_env)

        if "result" not in exec_env:
            state["error"] = "❌ No variable named `result` was defined in the executed code."
            return state

        result = exec_env["result"]

        # deal with different types of result
        if isinstance(result, pd.DataFrame):
            state["analysis_dataframe_dict"] = result.to_dict(orient="records")
        elif isinstance(result, pd.Series):
            df = result.reset_index()
            state["analysis_dataframe_dict"] = df.to_dict(orient="records")
        elif isinstance(result, (tuple, list)):
            df = pd.DataFrame(result, columns=["value"]) if all(not isinstance(i, (list, tuple, dict)) for i in result) else pd.DataFrame(result)
            state["analysis_dataframe_dict"] = df.to_dict(orient="records")
        elif isinstance(result, (int, float, str)):
            df = pd.DataFrame([{"value": result}])
            state["analysis_dataframe_dict"] = df.to_dict(orient="records")
        else:
            state["error"] = f"❌ Unsupported result type: {type(result)}"
            return state
    except Exception as e:
        state["error"] = f"❌ Code execution error: {str(e)}"
    return state

#analysis filtered data
def analysis_filtered_data_node(state: AgentState) -> AgentState:
    if state.get("error"):
        return state
    
    system_prompt = f"""You are a data analysis assistant. You will receive:
    1. A user's question.
    2. A table that is the result of a Python data analysis.
    Your task is to interpret the table and write a clear, concise natural language summary that answers the user's question.

    Guidelines:
    - Focus on key insights from the table (e.g., trends, top performers, comparisons).
    - Keep your summary to 2-3 sentences.
    - If the table is empty or inconclusive, explain that no results were found.

    Now summarize the following result.
    """
    
    result = llm.invoke([SystemMessage(system_prompt), 
                         HumanMessage(state["user_prompt"]+ f"\n\nanalysis_dataframe: {pd.DataFrame(state['analysis_dataframe_dict'])}")
        ]).content
    state["filtered_data_summary"] = result
    state["history_messages"][-1].content += "\n\n" + result
    return state

#chat node
def chat_node(state: AgentState) -> AgentState:
    result = llm.invoke(state["history_messages"]).content
    state["filtered_data_summary"] = result
    state["raw_output"] = result
    state["history_messages"].append(AIMessage(result))
    return state

#output node
def output_node(state: AgentState) -> AgentState:
    print("="*100)
    if state.get("analysis_dataframe_dict"):
        print(pd.DataFrame(state['analysis_dataframe_dict']))
    print(state['filtered_data_summary'])
    print("="*100)
    return state

# 创建专门用于API的图构建器，不包含input节点
def create_api_graph():
    builder = StateGraph(AgentState)
    builder.add_node("clean_up", clean_up_node)
    builder.add_node("router", router_node)
    builder.add_node("analysis", analysis_node)
    builder.add_node("execute_code", execute_code_node)
    builder.add_node("analysis_filtered_data", analysis_filtered_data_node)
    builder.add_node("chat", chat_node)
    builder.add_node("output", output_node)

    builder.add_edge(START, "clean_up")
    builder.add_edge("clean_up", "router")
    builder.add_conditional_edges(
        source="router",
        path=lambda state: state["route"],
        path_map={
            "analysis": "analysis",
            "chat": "chat"
        }
    )
    builder.add_edge("chat", "output")
    builder.add_edge("analysis", "execute_code")
    builder.add_edge("execute_code", "analysis_filtered_data")
    builder.add_edge("analysis_filtered_data", "output")
    builder.add_edge("output", END)

    memory = MemorySaver()
    return builder.compile(checkpointer=memory)

# API调用的主函数
def run_analysis(file_paths: List[str], prompt: str, session_id: str = None) -> Dict:
    """
    运行数据分析
    
    Args:
        file_paths: 文件路径列表
        prompt: 用户分析指令
        session_id: 会话ID，用于保持对话历史连续性
        
    Returns:
        包含分析结果的字典
    """
    try:
        # 使用提供的session_id或生成新的
        if session_id:
            config = {"configurable": {"thread_id": session_id}}
        else:
            session_id = str(uuid.uuid4())
            config = {"configurable": {"thread_id": session_id}}
        
        # 创建图
        graph = create_api_graph()
        
        # 尝试获取现有状态，如果不存在则创建新状态
        try:
            # 获取现有的状态快照
            snapshot = graph.get_state(config)
            if snapshot and snapshot.values:
                # 使用现有状态
                state = snapshot.values
                print(f"📚 恢复会话记忆，历史消息数量: {len(state.get('history_messages', []))}")
            else:
                # 创建新状态
                state = AgentState()
                print(f"🆕 创建新会话: {session_id}")
        except Exception as e:
            # 如果获取状态失败，创建新状态
            state = AgentState()
            print(f"⚠️ 无法恢复状态，创建新会话: {e}")
        
        # 设置当前请求的参数
        state["file_paths"] = file_paths
        state["user_prompt"] = prompt
        
        # 如果是新状态或没有历史消息，初始化系统消息
        if not state.get("history_messages"):
            # 使用通用的系统提示，既支持数据分析又支持普通聊天
            system_prompt = """You are a helpful AI assistant with expertise in data analysis. You can:

            1. **Data Analysis**: When users upload CSV or Excel files, you can analyze the data using Python and pandas. Generate Python code to extract insights from datasets.
            2. **General Conversation**: Have friendly conversations on any topic and remember our previous discussion context.

            For data analysis tasks:
            - Assume DataFrames are available as dfs = [dfs[0], dfs[1], dfs[2] ...] 
            - Use `dfs[i]` to indicate which DataFrame you're working with
            - The last line must assign a DataFrame to a variable named `result`
            - Do NOT execute code, just generate it

            For general conversation:
            - Be friendly, helpful, and maintain context from our conversation history
            - Remember user preferences and previous topics we've discussed

            Example data analysis:
            ```python
            # Show students with low satisfaction from the first CSV
            result = dfs[0][dfs[0]['Satisfaction'] == 'Low']
            ```

            I'm ready to help with both data analysis and general conversation!"""
            
            state["history_messages"] = [SystemMessage(system_prompt)]
        
        # 添加用户消息到历史
        state["history_messages"].append(HumanMessage(prompt))
        
        # 执行分析
        result_state = graph.invoke(state, config=config)
        
        # 准备返回结果
        response = {
            "status": "success",
            "summary": result_state.get("filtered_data_summary", ""),
            "data": result_state.get("analysis_dataframe_dict", []),
            "code": result_state.get("exec_code", ""),
            "error": result_state.get("error"),
            "session_id": session_id
        }
        
        return response
        
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "summary": "",
            "data": [],
            "code": "",
            "session_id": session_id if session_id else ""
        }