#!/usr/bin/env python3
"""
Intel AIPC OpenVINO GenAI API 客户端示例
演示如何调用本地部署的 OpenAI 兼容 API 服务
"""

import json
import requests
import time
from typing import List, Dict

# API 服务器配置
API_BASE_URL = "http://localhost:8000"
API_KEY = "dummy"  # 本地服务暂不需要真实 API Key


def call_chat_completion(
    messages: List[Dict[str, str]],
    model: str = "qwen2.5-7b-int4",
    temperature: float = 0.2,
    max_tokens: int = 640,
    stream: bool = False
) -> str:
    """调用聊天完成 API"""
    
    url = f"{API_BASE_URL}/v1/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {API_KEY}"
    }
    
    data = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": stream
    }
    
    if stream:
        # 流式调用
        response = requests.post(url, headers=headers, json=data, stream=True)
        response.raise_for_status()
        
        print("🔵 助手：", end='', flush=True)
        collected_content = ""
        
        for line in response.iter_lines():
            if line:
                line_str = line.decode('utf-8')
                if line_str.startswith('data: '):
                    data_str = line_str[6:]  # 去除 'data: ' 前缀
                    
                    if data_str == '[DONE]':
                        break
                    
                    try:
                        chunk_data = json.loads(data_str)
                        if chunk_data['choices'][0]['delta'].get('content'):
                            content = chunk_data['choices'][0]['delta']['content']
                            print(content, end='', flush=True)
                            collected_content += content
                    except json.JSONDecodeError:
                        continue
        print()  # 换行
        return collected_content
    else:
        # 非流式调用
        response = requests.post(url, headers=headers, json=data)
        response.raise_for_status()
        
        result = response.json()
        return result['choices'][0]['message']['content']


def list_models() -> List[str]:
    """获取可用模型列表"""
    url = f"{API_BASE_URL}/v1/models"
    response = requests.get(url)
    response.raise_for_status()
    
    result = response.json()
    return [model['id'] for model in result['data']]


def check_health() -> Dict:
    """检查服务健康状态"""
    url = f"{API_BASE_URL}/health"
    response = requests.get(url)
    response.raise_for_status()
    return response.json()


def main():
    """主演示函数"""
    print("🚀 Intel AIPC OpenVINO GenAI API 客户端示例")
    print("=" * 50)
    
    # 1. 检查服务状态
    try:
        health = check_health()
        print(f"🏥 服务状态: {health['status']}")
        print(f"📱 设备: {health['device']}")
        print(f"📂 模型目录: {health['model_dir']}")
        print()
    except Exception as e:
        print(f"❌ 服务连接失败: {e}")
        print("请确保 API 服务器正在运行: python api_server.py")
        return
    
    # 2. 获取模型列表
    try:
        models = list_models()
        print(f"📋 可用模型: {models}")
        print()
    except Exception as e:
        print(f"❌ 获取模型列表失败: {e}")
        return
    
    # 3. 单轮对话示例 (非流式)
    print("🔄 单轮对话示例 (非流式)")
    print("-" * 30)
    
    messages = [
        {"role": "user", "content": "你好！请简单介绍一下你自己。"}
    ]
    
    try:
        start_time = time.time()
        response = call_chat_completion(messages, stream=False)
        end_time = time.time()
        
        print(f"🟢 用户：{messages[0]['content']}")
        print(f"🔵 助手：{response}")
        print(f"⏱️  耗时：{end_time - start_time:.2f}秒")
        print()
    except Exception as e:
        print(f"❌ 请求失败: {e}")
        return
    
    # 4. 多轮对话示例 (流式)
    print("🔄 多轮对话示例 (流式)")
    print("-" * 30)
    
    conversation = [
        {"role": "system", "content": "你是一个有用的AI助手，请简洁地回答问题。"},
        {"role": "user", "content": "什么是人工智能？"},
    ]
    
    try:
        print(f"🟢 用户：{conversation[1]['content']}")
        call_chat_completion(conversation, stream=True, temperature=0.7, max_tokens=200)
        print()
    except Exception as e:
        print(f"❌ 流式请求失败: {e}")
    
    # 5. 交互式对话
    print("💬 交互式对话 (输入 'quit' 退出)")
    print("-" * 30)
    
    chat_history = [
        {"role": "system", "content": "你是一个友好的AI助手。"}
    ]
    
    while True:
        try:
            user_input = input("\n🟢 你：").strip()
            if user_input.lower() in ['quit', 'exit', '退出']:
                break
            
            chat_history.append({"role": "user", "content": user_input})
            
            # 流式响应并收集助手的回复
            assistant_response = call_chat_completion(chat_history, stream=True, temperature=0.3)
            
            # 将助手的回复添加到对话历史中
            if assistant_response:
                chat_history.append({"role": "assistant", "content": assistant_response})
            
        except (EOFError, KeyboardInterrupt):
            break
        except Exception as e:
            print(f"❌ 请求失败: {e}")
    
    print("\n👋 再见！")


if __name__ == "__main__":
    main() 