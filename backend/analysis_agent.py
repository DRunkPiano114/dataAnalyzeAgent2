import pandas as pd
import os
import uuid
import re
from dotenv import load_dotenv
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
    # keep history_messages, file_paths, user_prompt
    return state

# 修改input_node以接受外部传入的文件路径和prompt
# 注意：此函数已不再使用，逻辑已移至run_analysis函数中

#router node
def router_node(state: AgentState) -> AgentState:
    
    prompt = f"""You are a data analysis assistant.
    You will receive a user's question.
    
    Context:
    Determine whether the user's message is:
    - "analysis" (if the user is asking to analyze or query data)
    - "chat" (if it's casual conversation, general questions)

    User message: "{state["user_prompt"]}"

    Respond with either "analysis" or "chat".
    """
    
    result = llm.invoke([HumanMessage(content=prompt)]).content.strip().lower()
    if "analysis" in result:
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
        state["history_messages"].append(AIMessage(raw_output))#raw_output is code here
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

        # 清理数据的辅助函数
        def clean_dataframe_for_json(df):
            """清理DataFrame中的无穷大值和NaN值，使其能够正确序列化为JSON"""
            try:
                df_cleaned = df.copy()
                # 只对数值列进行清理
                numeric_columns = df_cleaned.select_dtypes(include=[float, int]).columns
                for col in numeric_columns:
                    # 替换无穷大值
                    df_cleaned[col] = df_cleaned[col].replace([float('inf'), float('-inf')], None)
                    # 替换NaN值
                    df_cleaned[col] = df_cleaned[col].where(pd.notna(df_cleaned[col]), None)
                return df_cleaned
            except Exception as e:
                # 如果清理失败，返回原始DataFrame并用fillna处理
                return df.fillna("N/A")
        
        # deal with different types of result
        if isinstance(result, pd.DataFrame):
            cleaned_df = clean_dataframe_for_json(result)
            state["analysis_dataframe_dict"] = cleaned_df.to_dict(orient="records")
        elif isinstance(result, pd.Series):
            df = result.reset_index()
            cleaned_df = clean_dataframe_for_json(df)
            state["analysis_dataframe_dict"] = cleaned_df.to_dict(orient="records")
        elif isinstance(result, dict):
            # 处理字典类型的结果
            try:
                # 检查字典中是否包含DataFrame或Series对象
                flattened_data = []
                for key, value in result.items():
                    if isinstance(value, pd.DataFrame):
                        # 如果值是DataFrame，将其转换为记录格式并标记类别
                        df_records = value.to_dict(orient="records")
                        for i, record in enumerate(df_records):
                            for col, cell_value in record.items():
                                flattened_data.append({
                                    "category": str(key),
                                    "metric": str(col),
                                    "value": cell_value
                                })
                    elif isinstance(value, pd.Series):
                        # 如果值是Series，展平它
                        for idx, val in value.items():
                            flattened_data.append({
                                "category": str(key),
                                "metric": str(idx),
                                "value": val
                            })
                    else:
                        # 简单值
                        flattened_data.append({
                            "category": str(key),
                            "metric": "value",
                            "value": value
                        })
                
                if flattened_data:
                    df = pd.DataFrame(flattened_data)
                    cleaned_df = clean_dataframe_for_json(df)
                    state["analysis_dataframe_dict"] = cleaned_df.to_dict(orient="records")
                else:
                    # 如果展平失败，尝试直接转换
                    df = pd.DataFrame([{str(k): str(v) for k, v in result.items()}])
                    cleaned_df = clean_dataframe_for_json(df)
                    state["analysis_dataframe_dict"] = cleaned_df.to_dict(orient="records")
            except Exception as e:
                # 如果都失败了，创建键值对的表格
                df = pd.DataFrame([{"Key": str(k), "Value": str(v)} for k, v in result.items()])
                state["analysis_dataframe_dict"] = df.to_dict(orient="records")
        elif isinstance(result, (tuple, list)):
            try:
                # 尝试创建DataFrame
                if all(not isinstance(i, (list, tuple, dict)) for i in result):
                    # 简单值列表
                    df = pd.DataFrame(result, columns=["value"])
                else:
                    # 复杂结构
                    df = pd.DataFrame(result)
                cleaned_df = clean_dataframe_for_json(df)
                state["analysis_dataframe_dict"] = cleaned_df.to_dict(orient="records")
            except Exception as e:
                # 如果创建DataFrame失败，转换为简单的键值对
                df = pd.DataFrame([{"index": i, "value": str(v)} for i, v in enumerate(result)])
                state["analysis_dataframe_dict"] = df.to_dict(orient="records")
        elif isinstance(result, (int, float, str)):
            # 处理单个值的情况，检查是否为无穷大或NaN
            if isinstance(result, float) and (pd.isna(result) or pd.isinf(result)):
                result = None
            df = pd.DataFrame([{"value": result}])
            state["analysis_dataframe_dict"] = df.to_dict(orient="records")
        elif result is None:
            # 处理None结果，可能是可视化代码没有返回数据
            state["analysis_dataframe_dict"] = [{"message": "分析完成，结果已通过图表显示"}]
        else:
            state["error"] = f"❌ Unsupported result type: {type(result)}"
            return state
    except Exception as e:
        state["error"] = f"❌ Code execution error: {str(e)}"
    return state

#analyze filtered data
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
    if state.get("error"):
        return state
    if not state.get("history_messages"):
        state["error"] = "No history messages provided for chat."
        return state
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
#create graph
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
graph =builder.compile(checkpointer=memory)


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
            - IMPORTANT: DataFrames are ONLY available as a list: dfs = [dfs[0], dfs[1], dfs[2], ...]
            - ALWAYS use dfs[0] for the first DataFrame, dfs[1] for the second, etc.
            - NEVER use variable names like 'df', 'data', 'dataset' - these are NOT defined
            - ONLY use dfs[0], dfs[1], dfs[2], etc. to reference DataFrames
            - The last line MUST assign a meaningful result to a variable named `result`
            - `result` should contain actual data: DataFrame, Series, list, dict, or single value
            - NEVER set result = None
            - Always return actual data that answers the user's question
            - Do NOT execute code, just generate it

            For general conversation:
            - Be friendly, helpful, and maintain context from our conversation history
            - Remember user preferences and previous topics we've discussed

            CORRECT Examples for data analysis:
            ```python
            # Show top 3 highest salaries from first DataFrame
            result = dfs[0].nlargest(3, 'Salary')
            ```

            ```python
            # Calculate summary statistics from second DataFrame
            result = dfs[1]['Salary'].describe()
            ```

            ```python
            # Group and aggregate data from third DataFrame
            result = dfs[2].groupby('Category')['Value'].sum()
            ```

            ```python
            # Work with multiple DataFrames
            merged_data = pd.concat([dfs[0], dfs[1]], ignore_index=True)
            result = merged_data.groupby('Type').count()
            ```

            WRONG Examples (DO NOT USE):
            ```python
            # ❌ WRONG - 'df' is not defined
            result = df.head()
            
            # ❌ WRONG - 'data' is not defined  
            result = data.describe()
            ```

            Remember: ONLY use dfs[0], dfs[1], etc. - no other DataFrame variable names exist!"""
            
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