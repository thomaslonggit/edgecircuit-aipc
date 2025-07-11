#!/usr/bin/env python3
"""
测试Verilog优化API的优化总结功能
"""
import requests
import time
import json

def test_optimization_summary():
    """测试优化总结功能"""
    
    # API配置
    api_url = "http://localhost:8001"
    
    # 测试用的Verilog代码 - 一个有冗余信号的模块
    test_verilog = """
module test_adder (
    input [7:0] a,
    input [7:0] b,
    input cin,
    output [7:0] sum,
    output cout
);
    wire [7:0] temp_wire1;
    wire [7:0] temp_wire2; 
    wire unused_wire;
    wire [7:0] intermediate;
    
    assign temp_wire1 = a;
    assign temp_wire2 = b;
    assign intermediate = temp_wire1 + temp_wire2;
    assign {cout, sum} = intermediate + cin;
    
endmodule
"""
    
    print("🧪 测试Verilog优化API的优化总结功能")
    print("=" * 50)
    
    # 检查API服务
    try:
        response = requests.get(f"{api_url}/health")
        if response.status_code != 200:
            print("❌ API服务不可用")
            return
        print("✅ API服务正常")
    except Exception as e:
        print(f"❌ 无法连接到API服务: {e}")
        return
    
    # 提交优化任务
    print("\n🚀 提交优化任务...")
    optimize_data = {
        "verilog_code": test_verilog,
        "optimization_level": "readable",
        "n_trials": 15
    }
    
    try:
        response = requests.post(f"{api_url}/optimize", json=optimize_data)
        if response.status_code != 200:
            print(f"❌ 提交任务失败: {response.text}")
            return
        
        job_info = response.json()
        job_id = job_info["job_id"]
        print(f"✅ 任务已提交，ID: {job_id}")
        
    except Exception as e:
        print(f"❌ 提交任务出错: {e}")
        return
    
    # 等待任务完成
    print("\n⏳ 等待任务完成...")
    while True:
        try:
            response = requests.get(f"{api_url}/status/{job_id}")
            if response.status_code != 200:
                print(f"❌ 查询状态失败: {response.text}")
                return
            
            status = response.json()
            print(f"📊 状态: {status['status']} - {status['message']}")
            
            if status['status'] in ['completed', 'failed']:
                break
                
            time.sleep(2)
            
        except Exception as e:
            print(f"❌ 查询状态出错: {e}")
            return
    
    # 获取优化结果
    print("\n📋 获取优化结果...")
    try:
        response = requests.get(f"{api_url}/result/{job_id}")
        if response.status_code != 200:
            print(f"❌ 获取结果失败: {response.text}")
            return
        
        result = response.json()
        
        if result['status'] != 'completed':
            print(f"❌ 优化失败: {result.get('error_details', '未知错误')}")
            return
        
        print("✅ 优化成功完成!")
        
        # 显示优化总结
        if result.get('optimization_summary'):
            print("\n" + "="*60)
            print("📊 优化总结报告")
            print("="*60)
            print(result['optimization_summary'])
            print("="*60)
        else:
            print("⚠️ 没有找到优化总结")
        
        # 显示详细统计
        if result.get('optimization_stats'):
            print("\n📈 详细统计信息:")
            stats = result['optimization_stats']
            print(f"  执行时间: {stats.get('execution_time', 0):.2f}秒")
            print(f"  使用策略: {stats.get('strategy_used', 'unknown')}")
            print(f"  试验次数: {stats.get('trials_completed', 0)}")
            
            if 'original_stats' in stats and 'optimized_stats' in stats:
                orig = stats['original_stats']
                opt = stats['optimized_stats']
                print(f"  代码行数: {orig['total_lines']} → {opt['total_lines']} (减少 {stats.get('line_reduction', 0)})")
                print(f"  信号线数: {orig['wire_count']} → {opt['wire_count']} (减少 {stats.get('wire_reduction', 0)})")
        
        # 显示代码对比（简要）
        print("\n📄 代码对比:")
        print("原始代码行数:", len(test_verilog.splitlines()))
        if result.get('optimized_code'):
            print("优化后行数:", len(result['optimized_code'].splitlines()))
            print("📝 优化后代码预览（前10行）:")
            print("-" * 40)
            for i, line in enumerate(result['optimized_code'].splitlines()[:10], 1):
                print(f"{i:2d}: {line}")
            if len(result['optimized_code'].splitlines()) > 10:
                print("    ... (更多代码)")
        
        print("\n✅ 测试完成!")
        
    except Exception as e:
        print(f"❌ 获取结果出错: {e}")

if __name__ == "__main__":
    test_optimization_summary() 