#!/usr/bin/env python3
"""
快速测试 Intel AIPC OpenVINO GenAI API 服务
"""

import requests
import json
import sys
import time

API_BASE_URL = "http://localhost:8000"

def test_health():
    """测试健康检查"""
    print("🔍 测试健康检查...")
    try:
        response = requests.get(f"{API_BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 健康检查通过")
            print(f"   状态: {data['status']}")
            print(f"   模型已加载: {data['model_loaded']}")
            print(f"   设备: {data['device']}")
            return True
        else:
            print(f"❌ 健康检查失败: HTTP {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ 健康检查失败: {e}")
        return False

def test_models():
    """测试模型列表"""
    print("\n📋 测试模型列表...")
    try:
        response = requests.get(f"{API_BASE_URL}/v1/models", timeout=5)
        if response.status_code == 200:
            data = response.json()
            models = [model['id'] for model in data['data']]
            print(f"✅ 模型列表获取成功: {models}")
            return True
        else:
            print(f"❌ 模型列表获取失败: HTTP {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ 模型列表获取失败: {e}")
        return False

def test_chat_completion():
    """测试聊天完成"""
    print("\n💬 测试聊天完成...")
    
    data = {
        "model": "qwen2.5-7b-int4",
        "messages": [
            {"role": "user", "content": "请用一句话介绍什么是人工智能"}
        ],
        "temperature": 0.2,
        "max_tokens": 50,
        "stream": False
    }
    
    try:
        start_time = time.time()
        response = requests.post(
            f"{API_BASE_URL}/v1/chat/completions",
            headers={"Content-Type": "application/json"},
            json=data,
            timeout=30
        )
        end_time = time.time()
        
        if response.status_code == 200:
            result = response.json()
            content = result['choices'][0]['message']['content']
            print(f"✅ 聊天完成测试成功")
            print(f"   请求: {data['messages'][0]['content']}")
            print(f"   回复: {content}")
            print(f"   耗时: {end_time - start_time:.2f}秒")
            return True
        else:
            print(f"❌ 聊天完成测试失败: HTTP {response.status_code}")
            print(f"   响应: {response.text}")
            return False
    except Exception as e:
        print(f"❌ 聊天完成测试失败: {e}")
        return False

def test_stream():
    """测试流式响应"""
    print("\n🌊 测试流式响应...")
    
    data = {
        "model": "qwen2.5-7b-int4",
        "messages": [
            {"role": "user", "content": "数到5"}
        ],
        "temperature": 0.1,
        "max_tokens": 30,
        "stream": True
    }
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/v1/chat/completions",
            headers={"Content-Type": "application/json"},
            json=data,
            stream=True,
            timeout=30
        )
        
        if response.status_code == 200:
            print("✅ 流式响应测试开始")
            print("   响应内容: ", end='', flush=True)
            
            for line in response.iter_lines():
                if line:
                    line_str = line.decode('utf-8')
                    if line_str.startswith('data: '):
                        data_str = line_str[6:]
                        
                        if data_str == '[DONE]':
                            break
                        
                        try:
                            chunk_data = json.loads(data_str)
                            if chunk_data['choices'][0]['delta'].get('content'):
                                content = chunk_data['choices'][0]['delta']['content']
                                print(content, end='', flush=True)
                        except json.JSONDecodeError:
                            continue
            
            print("\n✅ 流式响应测试完成")
            return True
        else:
            print(f"❌ 流式响应测试失败: HTTP {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ 流式响应测试失败: {e}")
        return False

def main():
    """主测试函数"""
    print("🚀 Intel AIPC OpenVINO GenAI API 测试")
    print("=" * 50)
    
    # 运行所有测试
    tests = [
        ("健康检查", test_health),
        ("模型列表", test_models),
        ("聊天完成", test_chat_completion),
        ("流式响应", test_stream),
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        if test_func():
            passed += 1
        time.sleep(1)  # 测试间隔
    
    print("\n" + "=" * 50)
    print(f"📊 测试结果: {passed}/{total} 通过")
    
    if passed == total:
        print("🎉 所有测试通过！API 服务运行正常。")
        return True
    else:
        print("⚠️  部分测试失败，请检查服务配置。")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 