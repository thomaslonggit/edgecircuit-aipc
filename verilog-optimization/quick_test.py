#!/usr/bin/env python3
"""
快速测试Verilog优化API服务
"""

import requests
import time
import json

def test_api():
    """测试API服务"""
    base_url = "http://localhost:8000"
    
    print("🧪 快速测试Verilog优化API")
    print("========================")
    
    # 1. 健康检查
    print("🔍 检查服务状态...")
    try:
        response = requests.get(f"{base_url}/health", timeout=5)
        if response.status_code == 200:
            print("✅ API服务正常运行")
        else:
            print("❌ API服务状态异常")
            return False
    except requests.RequestException:
        print("❌ 无法连接API服务，请确保服务已启动")
        print("启动命令: ./start.sh")
        return False
    
    # 2. 测试优化功能
    print("\n🚀 测试优化功能...")
    
    test_verilog = """
module simple_test (
    input [7:0] a, b,
    output [7:0] sum
);
    assign sum = a + b;
endmodule
"""
    
    # 提交优化任务
    optimize_request = {
        "verilog_code": test_verilog,
        "optimization_level": "readable",
        "n_trials": 10,  # 快速测试
        "timeout": 60
    }
    
    try:
        response = requests.post(
            f"{base_url}/optimize",
            json=optimize_request,
            timeout=10
        )
        
        if response.status_code != 200:
            print(f"❌ 提交任务失败: {response.text}")
            return False
            
        job_info = response.json()
        job_id = job_info["job_id"]
        print(f"✅ 任务提交成功，ID: {job_id}")
        
        # 等待任务完成
        print("⏳ 等待优化完成...")
        max_wait = 120  # 最多等待2分钟
        start_time = time.time()
        
        while time.time() - start_time < max_wait:
            status_response = requests.get(f"{base_url}/status/{job_id}")
            if status_response.status_code == 200:
                status = status_response.json()
                print(f"📊 状态: {status['status']} - {status['message']}")
                
                if status['status'] == 'completed':
                    # 获取结果
                    result_response = requests.get(f"{base_url}/result/{job_id}")
                    if result_response.status_code == 200:
                        result = result_response.json()
                        print("✅ 优化完成!")
                        
                        if result.get('optimization_stats'):
                            stats = result['optimization_stats']
                            print(f"📈 统计信息:")
                            print(f"   策略: {stats.get('strategy_used')}")
                            print(f"   原始行数: {stats.get('original_lines')}")
                            print(f"   优化行数: {stats.get('optimized_lines')}")
                            print(f"   执行时间: {result.get('execution_time', 0):.1f}秒")
                        
                        if result.get('optimized_code'):
                            print(f"\n📄 优化后代码预览:")
                            lines = result['optimized_code'].splitlines()
                            for i, line in enumerate(lines[:10], 1):
                                print(f"   {i:2d}: {line}")
                            if len(lines) > 10:
                                print(f"   ... (还有{len(lines)-10}行)")
                        
                        return True
                    else:
                        print("❌ 获取结果失败")
                        return False
                        
                elif status['status'] == 'failed':
                    print("❌ 优化失败")
                    result_response = requests.get(f"{base_url}/result/{job_id}")
                    if result_response.status_code == 200:
                        error_details = result_response.json().get('error_details')
                        if error_details:
                            print(f"错误详情: {error_details}")
                    return False
            
            time.sleep(3)  # 等待3秒再查询
        
        print("❌ 优化超时")
        return False
        
    except requests.RequestException as e:
        print(f"❌ 请求失败: {e}")
        return False

def main():
    """主函数"""
    success = test_api()
    
    if success:
        print("\n🎉 所有测试通过！")
        print("📚 查看完整API文档: http://localhost:8000/docs")
        print("🔧 使用示例:")
        print("   curl -X POST http://localhost:8000/optimize \\")
        print("     -H \"Content-Type: application/json\" \\")
        print("     -d '{\"verilog_code\":\"module test...\", \"optimization_level\":\"readable\"}'")
    else:
        print("\n❌ 测试失败，请检查:")
        print("1. API服务是否启动: ./start.sh")
        print("2. 依赖是否安装: ./simple_install.sh")
        print("3. 查看服务日志了解详细错误")

if __name__ == "__main__":
    main() 