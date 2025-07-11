#!/usr/bin/env python3
"""
简单的API测试脚本 - 不依赖额外库
"""

import urllib.request
import urllib.parse
import json
import time

def test_api():
    """测试API基本功能"""
    base_url = "http://localhost:8000"
    
    print("🧪 简单API测试")
    print("=============")
    
    try:
        # 1. 健康检查
        print("🔍 检查API服务...")
        health_url = f"{base_url}/health"
        with urllib.request.urlopen(health_url) as response:
            health_data = json.loads(response.read().decode())
            if health_data.get("status") == "healthy":
                print("✅ API服务正常")
            else:
                print("❌ API服务状态异常")
                return False
    
    except Exception as e:
        print(f"❌ 无法连接API服务: {e}")
        print("请确保服务已启动: ./start.sh")
        return False
    
    try:
        # 2. 测试优化功能
        print("\n🚀 测试优化功能...")
        
        # 准备测试数据
        test_data = {
            "verilog_code": "module test(input a, output b); assign b = a; endmodule",
            "optimization_level": "readable",
            "n_trials": 5,
            "timeout": 60
        }
        
        # 发送POST请求
        optimize_url = f"{base_url}/optimize"
        json_data = json.dumps(test_data).encode('utf-8')
        
        req = urllib.request.Request(
            optimize_url,
            data=json_data,
            headers={'Content-Type': 'application/json'}
        )
        
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode())
            
        job_id = result.get("job_id")
        if not job_id:
            print(f"❌ 未获取到job_id: {result}")
            return False
            
        print(f"✅ 任务提交成功，ID: {job_id}")
        
        # 3. 监控任务状态
        print("⏳ 等待任务完成...")
        max_wait = 60
        start_time = time.time()
        
        while time.time() - start_time < max_wait:
            status_url = f"{base_url}/status/{job_id}"
            
            try:
                with urllib.request.urlopen(status_url) as response:
                    status_data = json.loads(response.read().decode())
                    
                status = status_data.get("status")
                message = status_data.get("message")
                
                print(f"📊 状态: {status} - {message}")
                
                if status == "completed":
                    # 获取结果
                    result_url = f"{base_url}/result/{job_id}"
                    with urllib.request.urlopen(result_url) as response:
                        result_data = json.loads(response.read().decode())
                    
                    print("✅ 优化完成!")
                    
                    # 显示结果
                    if result_data.get("optimized_code"):
                        print("\n📄 优化后代码:")
                        print("-" * 40)
                        print(result_data["optimized_code"])
                    
                    if result_data.get("optimization_stats"):
                        stats = result_data["optimization_stats"]
                        print(f"\n📈 统计:")
                        print(f"   策略: {stats.get('strategy_used')}")
                        print(f"   执行时间: {result_data.get('execution_time', 0):.1f}秒")
                    
                    return True
                    
                elif status == "failed":
                    print("❌ 优化失败")
                    return False
                    
            except Exception as e:
                print(f"❌ 查询状态失败: {e}")
                return False
            
            time.sleep(3)
        
        print("❌ 任务超时")
        return False
        
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        return False

if __name__ == "__main__":
    success = test_api()
    
    if success:
        print("\n🎉 所有测试通过!")
        print("📚 API文档: http://localhost:8000/docs")
    else:
        print("\n❌ 测试失败")
        print("💡 故障排除:")
        print("1. 确保API服务运行: ./start.sh")
        print("2. 检查服务日志")
        print("3. 验证网络连接") 