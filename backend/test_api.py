#!/usr/bin/env python3
"""
测试多文件上传API的脚本
支持本地和远程服务器测试
"""

import requests
import json
import os
import sys
from urllib.parse import urljoin

def get_base_url():
    """获取API基础URL，优先级：命令行参数 > 环境变量 > 默认本地地址"""
    
    # 检查命令行参数
    if len(sys.argv) > 1:
        base_url = sys.argv[1]
        if not base_url.startswith('http'):
            base_url = f"https://{base_url}"
        return base_url
    
    # 检查环境变量
    base_url = os.getenv('API_BASE_URL')
    if base_url:
        return base_url
    
    # 默认本地地址
    return "http://localhost:8000"

def test_analyze_api(base_url):
    """测试/analyze端点"""
    
    # API端点
    url = urljoin(base_url, "/analyze")
    
    # 测试用例1：创建一些测试CSV文件
    test_data1 = """Name,Age,City,Salary
张三,25,北京,8000
李四,30,上海,12000
王五,28,广州,9500
赵六,35,深圳,15000
小红,23,纽约,10000
"""

    test_data2 = """Product,Sales,Region
产品A,100000,北方
产品B,150000,南方
产品C,80000,东方
产品D,120000,西方"""

    # 创建临时测试文件
    with open("test_employees.csv", "w", encoding="utf-8") as f:
        f.write(test_data1)
    
    with open("test_sales.csv", "w", encoding="utf-8") as f:
        f.write(test_data2)
    
    try:
        # 准备文件上传
        files = [
            ('files', ('test_employees.csv', open('test_employees.csv', 'rb'), 'text/csv')),
            ('files', ('test_sales.csv', open('test_sales.csv', 'rb'), 'text/csv')),
        ]
        
        data = {
            'prompt': '请分析这两个数据表，展示salary大于一万的人'
        }
        
        print("发送请求到:", url)
        print("上传文件: test_employees.csv, test_sales.csv")
        print("分析指令:", data['prompt'])
        print("-" * 50)
        
        # 发送请求，增加超时设置
        response = requests.post(url, files=files, data=data, timeout=60)
        
        # 关闭文件
        for _, file_tuple in files:
            if len(file_tuple) > 1 and hasattr(file_tuple[1], 'close'):
                file_tuple[1].close()
        
        # 检查响应
        print(f"响应状态码: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ 请求成功!")
            print("\n📊 分析结果:")
            print(json.dumps(result, ensure_ascii=False, indent=2))
        else:
            print("❌ 请求失败!")
            print("错误信息:", response.text)
            
    except requests.exceptions.Timeout:
        print("❌ 请求超时！服务器可能需要更长时间处理")
    except requests.exceptions.ConnectionError:
        print("❌ 连接错误！请检查服务器地址是否正确")
    except Exception as e:
        print(f"❌ 测试过程中发生错误: {e}")
    
    finally:
        # 清理测试文件
        for file in ["test_employees.csv", "test_sales.csv"]:
            if os.path.exists(file):
                os.remove(file)
                print(f"清理测试文件: {file}")

def test_health_check(base_url):
    """测试健康检查端点"""
    health_url = urljoin(base_url, "/health")
    try:
        response = requests.get(health_url, timeout=10)
        print(f"健康检查状态码: {response.status_code}")
        if response.status_code == 200:
            print("✅ 健康检查结果:", response.json())
        else:
            print("❌ 健康检查失败:", response.text)
    except requests.exceptions.Timeout:
        print("❌ 健康检查超时")
    except requests.exceptions.ConnectionError:
        print("❌ 无法连接到服务器")
    except Exception as e:
        print(f"❌ 健康检查错误: {e}")

if __name__ == "__main__":
    print("🚀 开始测试多文件上传API")
    
    # 获取API基础URL
    base_url = get_base_url()
    print(f"🌐 测试服务器: {base_url}")
    
    print("=" * 60)
    
    # 测试健康检查
    print("1. 测试健康检查...")
    test_health_check(base_url)
    print()
    
    # 测试分析API
    print("2. 测试多文件分析...")
    test_analyze_api(base_url)
    
    print("\n" + "=" * 60)
    print("测试完成!")
    
    # 显示使用说明
    print("\n📖 使用说明:")
    print("  测试本地服务: python test_api.py")
    print("  测试Render部署: python test_api.py your-app-name.onrender.com")
    print("  使用环境变量: API_BASE_URL=https://your-app.onrender.com python test_api.py") 