#!/usr/bin/env python3
"""
Verilog优化API客户端示例
演示如何使用API服务优化Verilog代码
"""

import requests
import json
import time
from typing import Optional, Dict, Any

class VerilogOptimizerClient:
    """Verilog优化API客户端"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        """初始化客户端"""
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
    
    def health_check(self) -> bool:
        """检查API服务健康状态"""
        try:
            response = self.session.get(f"{self.base_url}/health")
            return response.status_code == 200
        except requests.RequestException:
            return False
    
    def optimize_code(
        self,
        verilog_code: str,
        optimization_level: str = "readable",
        n_trials: int = 30,
        top_module: Optional[str] = None,
        timeout: int = 300
    ) -> Dict[str, Any]:
        """
        优化Verilog代码
        
        Args:
            verilog_code: Verilog RTL代码
            optimization_level: 优化等级 (minimal, readable, balanced, yosys_only, aggressive)
            n_trials: 优化试验次数
            top_module: 顶层模块名
            timeout: 超时时间
        
        Returns:
            优化结果字典
        """
        
        # 准备请求数据
        request_data = {
            "verilog_code": verilog_code,
            "optimization_level": optimization_level,
            "n_trials": n_trials,
            "timeout": timeout
        }
        
        if top_module:
            request_data["top_module"] = top_module
        
        # 提交优化任务
        print(f"🚀 提交优化任务 (等级: {optimization_level}, 试验: {n_trials}次)")
        
        try:
            response = self.session.post(
                f"{self.base_url}/optimize",
                json=request_data,
                headers={"Content-Type": "application/json"}
            )
            response.raise_for_status()
            
            job_info = response.json()
            job_id = job_info["job_id"]
            
            print(f"✅ 任务已提交，ID: {job_id}")
            
            # 轮询任务状态
            return self._wait_for_completion(job_id, timeout)
            
        except requests.RequestException as e:
            return {"error": f"请求失败: {str(e)}"}
    
    def optimize_file(
        self,
        file_path: str,
        optimization_level: str = "readable",
        n_trials: int = 30,
        top_module: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        通过文件上传优化Verilog代码
        
        Args:
            file_path: Verilog文件路径
            optimization_level: 优化等级
            n_trials: 优化试验次数
            top_module: 顶层模块名
        
        Returns:
            优化结果字典
        """
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                verilog_code = f.read()
            
            return self.optimize_code(
                verilog_code, optimization_level, n_trials, top_module
            )
            
        except FileNotFoundError:
            return {"error": f"文件不存在: {file_path}"}
        except UnicodeDecodeError:
            return {"error": f"文件编码错误: {file_path}"}
    
    def _wait_for_completion(self, job_id: str, timeout: int) -> Dict[str, Any]:
        """等待任务完成"""
        
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            try:
                # 查询任务状态
                status_response = self.session.get(f"{self.base_url}/status/{job_id}")
                status_response.raise_for_status()
                
                status = status_response.json()
                print(f"📊 状态: {status['status']} - {status['message']}")
                
                if status['status'] == 'completed':
                    # 获取结果
                    result_response = self.session.get(f"{self.base_url}/result/{job_id}")
                    result_response.raise_for_status()
                    return result_response.json()
                
                elif status['status'] == 'failed':
                    result_response = self.session.get(f"{self.base_url}/result/{job_id}")
                    if result_response.status_code == 200:
                        return result_response.json()
                    else:
                        return {"error": f"任务失败: {status['message']}"}
                
                # 等待一段时间再查询
                time.sleep(2)
                
            except requests.RequestException as e:
                return {"error": f"查询状态失败: {str(e)}"}
        
        return {"error": "任务超时"}
    
    def get_job_status(self, job_id: str) -> Dict[str, Any]:
        """获取任务状态"""
        try:
            response = self.session.get(f"{self.base_url}/status/{job_id}")
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            return {"error": f"获取状态失败: {str(e)}"}
    
    def list_jobs(self) -> Dict[str, Any]:
        """列出所有任务"""
        try:
            response = self.session.get(f"{self.base_url}/jobs")
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            return {"error": f"获取任务列表失败: {str(e)}"}

def print_optimization_result(result: Dict[str, Any]):
    """打印优化结果"""
    
    if "error" in result:
        print(f"❌ 错误: {result['error']}")
        return
    
    print(f"\n{'='*60}")
    print(f"📊 优化结果 (任务ID: {result['job_id']})")
    print(f"{'='*60}")
    
    if result['status'] == 'completed':
        print("✅ 优化完成!")
        
        if result.get('execution_time'):
            print(f"⏱️  执行时间: {result['execution_time']:.2f} 秒")
        
        if result.get('optimization_stats'):
            stats = result['optimization_stats']
            print(f"\n📈 优化统计:")
            print(f"   策略: {stats.get('strategy_used', 'N/A')}")
            print(f"   原始行数: {stats.get('original_lines', 'N/A')}")
            print(f"   优化行数: {stats.get('optimized_lines', 'N/A')}")
            print(f"   行数减少: {stats.get('line_reduction', 'N/A')}")
            print(f"   原始wire数: {stats.get('original_wires', 'N/A')}")
            print(f"   优化wire数: {stats.get('optimized_wires', 'N/A')}")
            print(f"   wire减少: {stats.get('wire_reduction', 'N/A')}")
        
        if result.get('optimized_code'):
            print(f"\n📄 优化后代码:")
            print("-" * 40)
            print(result['optimized_code'][:500] + "..." if len(result['optimized_code']) > 500 else result['optimized_code'])
    
    elif result['status'] == 'failed':
        print("❌ 优化失败!")
        if result.get('error_details'):
            print(f"错误详情: {result['error_details']}")
    
    else:
        print(f"📊 当前状态: {result['status']}")
        print(f"📝 消息: {result['message']}")

def main():
    """主函数示例"""
    
    # 示例Verilog代码
    sample_verilog = """
module test_adder (
    input [7:0] a, b, c,
    input sel,
    output [7:0] sum,
    output [7:0] mux_out
);
    // 可以被优化的表达式
    wire [7:0] temp1 = a + b;
    wire [7:0] temp2 = a + b;  // 冗余
    
    assign sum = temp1 + c;
    assign mux_out = sel ? temp1 : temp2;  // 可以简化
endmodule
"""
    
    # 创建客户端
    client = VerilogOptimizerClient("http://localhost:8000")
    
    # 检查服务状态
    print("🔍 检查API服务状态...")
    if not client.health_check():
        print("❌ API服务不可用，请确保服务已启动")
        print("启动命令: python3 verilog_optimizer_api.py")
        return
    
    print("✅ API服务正常")
    
    # 示例1: 使用默认参数（readable策略）
    print(f"\n{'='*60}")
    print("📝 示例1: 默认优化（readable策略）")
    print(f"{'='*60}")
    
    result1 = client.optimize_code(sample_verilog)
    print_optimization_result(result1)
    
    # 示例2: 使用minimal策略
    print(f"\n{'='*60}")
    print("📝 示例2: 最小优化（minimal策略）")
    print(f"{'='*60}")
    
    result2 = client.optimize_code(
        sample_verilog,
        optimization_level="minimal",
        n_trials=20
    )
    print_optimization_result(result2)
    
    # 示例3: 对比不同策略
    print(f"\n{'='*60}")
    print("📝 示例3: 策略对比")
    print(f"{'='*60}")
    
    strategies = ["minimal", "readable", "balanced"]
    
    for strategy in strategies:
        print(f"\n🔧 测试策略: {strategy}")
        result = client.optimize_code(
            sample_verilog,
            optimization_level=strategy,
            n_trials=15  # 快速测试
        )
        
        if result.get('optimization_stats'):
            stats = result['optimization_stats']
            print(f"   行数: {stats.get('original_lines')} → {stats.get('optimized_lines')}")
            print(f"   Wire数: {stats.get('original_wires')} → {stats.get('optimized_wires')}")
            print(f"   用时: {result.get('execution_time', 0):.1f}s")
    
    # 列出所有任务
    print(f"\n📋 任务列表:")
    jobs = client.list_jobs()
    if "jobs" in jobs:
        for job in jobs["jobs"][-3:]:  # 显示最近3个任务
            print(f"   {job['job_id']}: {job['status']} ({job['created_at']})")

if __name__ == "__main__":
    main() 