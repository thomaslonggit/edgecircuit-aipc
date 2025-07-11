#!/usr/bin/env python3
# Copyright (C) 2024-2025 Intel
# SPDX-License-Identifier: Apache-2.0

import openvino_genai as ov_genai
import time
import statistics
import json
from typing import List, Dict, Tuple
from datetime import datetime
import argparse
import sys

# ==== 配置参数 ====
MODEL_DIR = r".\qwen2.5-ov-int4"
CACHE_DIR = "./ov_cache"

# 测试配置
TEST_PROMPTS = [
    "请介绍一下人工智能的发展历程和未来趋势。",
    "解释什么是深度学习，以及它在计算机视觉中的应用。",
    "描述一下量子计算的基本原理和潜在应用场景。",
    "分析区块链技术的优势和局限性。",
    "请写一段关于环境保护重要性的文章。",
    "解释机器学习中的监督学习和无监督学习的区别。",
    "介绍云计算的服务模式和部署模式。",
    "分析5G技术对物联网发展的推动作用。"
]

DEVICES = ["CPU", "GPU", "NPU"]
MAX_NEW_TOKENS = 512
WARMUP_ROUNDS = 2
TEST_ROUNDS = 5

class TokenCounter:
    """Token计数器，用于统计生成的token数量"""
    def __init__(self):
        self.count = 0
    
    def __call__(self, subword: str) -> ov_genai.StreamingStatus:
        self.count += 1
        return ov_genai.StreamingStatus.RUNNING

class BenchmarkResult:
    """测试结果数据类"""
    def __init__(self):
        self.device = ""
        self.prompt_index = 0
        self.prompt = ""
        self.tokens_generated = 0
        self.time_taken = 0.0
        self.tokens_per_second = 0.0
        self.first_token_latency = 0.0

class DeviceBenchmark:
    """设备性能测试类"""
    
    def __init__(self, device: str):
        self.device = device
        self.results: List[BenchmarkResult] = []
        
    def setup_pipeline(self) -> ov_genai.LLMPipeline:
        """初始化推理管线"""
        try:
            print(f"🔧 正在初始化 {self.device} 设备...")
            
            # 根据设备选择不同的配置
            if self.device == "CPU":
                device_str = "CPU"
                hint = "THROUGHPUT"
            elif self.device == "GPU":
                device_str = "GPU"
                hint = "THROUGHPUT"
            elif self.device == "NPU":
                device_str = "NPU"
                hint = "LATENCY"
            else:
                raise ValueError(f"不支持的设备: {self.device}")
            
            pipe = ov_genai.LLMPipeline(
                MODEL_DIR,
                device_str,
                PERFORMANCE_HINT=hint,
                CACHE_DIR=CACHE_DIR
            )
            
            print(f"✅ {self.device} 设备初始化成功")
            return pipe
            
        except Exception as e:
            print(f"❌ {self.device} 设备初始化失败: {e}")
            return None
    
    def run_single_test(self, pipe: ov_genai.LLMPipeline, prompt: str, prompt_index: int) -> BenchmarkResult:
        """运行单次测试"""
        result = BenchmarkResult()
        result.device = self.device
        result.prompt_index = prompt_index
        result.prompt = prompt
        
        # 创建token计数器
        token_counter = TokenCounter()
        
        # 生成配置
        gen_cfg = ov_genai.GenerationConfig(
            max_new_tokens=MAX_NEW_TOKENS,
            temperature=0.1,  # 低温度保证结果一致性
            do_sample=False   # 确定性生成
        )
        
        # 记录开始时间
        start_time = time.perf_counter()
        first_token_time = None
        
        def streaming_callback(subword: str) -> ov_genai.StreamingStatus:
            nonlocal first_token_time
            if first_token_time is None:
                first_token_time = time.perf_counter()
            return token_counter(subword)
        
        # 执行推理
        try:
            pipe.generate(prompt, gen_cfg, streaming_callback)
            end_time = time.perf_counter()
            
            # 计算结果
            result.tokens_generated = token_counter.count
            result.time_taken = end_time - start_time
            result.first_token_latency = (first_token_time - start_time) if first_token_time else 0
            result.tokens_per_second = result.tokens_generated / result.time_taken if result.time_taken > 0 else 0
            
        except Exception as e:
            print(f"❌ 测试失败: {e}")
            result.tokens_per_second = 0
            
        return result
    
    def run_warmup(self, pipe: ov_genai.LLMPipeline):
        """运行预热测试"""
        print(f"🔥 {self.device} 预热中...")
        for i in range(WARMUP_ROUNDS):
            prompt = TEST_PROMPTS[i % len(TEST_PROMPTS)]
            self.run_single_test(pipe, prompt, -1)  # 预热不记录结果
        print(f"✅ {self.device} 预热完成")
    
    def run_benchmark(self) -> bool:
        """运行完整的基准测试"""
        print(f"\n{'='*60}")
        print(f"🚀 开始测试 {self.device} 设备性能")
        print(f"{'='*60}")
        
        # 初始化管线
        pipe = self.setup_pipeline()
        if pipe is None:
            return False
        
        try:
            # 预热
            self.run_warmup(pipe)
            
            # 正式测试
            print(f"📊 开始正式测试...")
            for round_num in range(TEST_ROUNDS):
                print(f"  轮次 {round_num + 1}/{TEST_ROUNDS}")
                
                for prompt_idx, prompt in enumerate(TEST_PROMPTS):
                    print(f"    测试用例 {prompt_idx + 1}/{len(TEST_PROMPTS)}: {prompt[:30]}...")
                    
                    result = self.run_single_test(pipe, prompt, prompt_idx)
                    self.results.append(result)
                    
                    print(f"      生成 {result.tokens_generated} tokens, "
                          f"用时 {result.time_taken:.2f}s, "
                          f"速度 {result.tokens_per_second:.2f} tokens/s")
            
            print(f"✅ {self.device} 测试完成")
            return True
            
        except Exception as e:
            print(f"❌ {self.device} 测试过程中发生错误: {e}")
            return False
        finally:
            # 清理资源
            del pipe
    
    def get_statistics(self) -> Dict:
        """计算统计数据"""
        if not self.results:
            return {}
        
        throughputs = [r.tokens_per_second for r in self.results if r.tokens_per_second > 0]
        latencies = [r.first_token_latency for r in self.results if r.first_token_latency > 0]
        
        if not throughputs:
            return {}
        
        return {
            "device": self.device,
            "total_tests": len(self.results),
            "successful_tests": len(throughputs),
            "throughput": {
                "mean": statistics.mean(throughputs),
                "median": statistics.median(throughputs),
                "std": statistics.stdev(throughputs) if len(throughputs) > 1 else 0,
                "min": min(throughputs),
                "max": max(throughputs)
            },
            "first_token_latency": {
                "mean": statistics.mean(latencies) if latencies else 0,
                "median": statistics.median(latencies) if latencies else 0,
                "std": statistics.stdev(latencies) if len(latencies) > 1 else 0,
                "min": min(latencies) if latencies else 0,
                "max": max(latencies) if latencies else 0
            }
        }

class BenchmarkRunner:
    """基准测试运行器"""
    
    def __init__(self, devices: List[str] = None):
        self.devices = devices or DEVICES
        self.device_benchmarks: Dict[str, DeviceBenchmark] = {}
        self.start_time = None
        self.end_time = None
    
    def run_all_tests(self):
        """运行所有设备的测试"""
        print("🎯 Intel AIPC 模型性能基准测试")
        print(f"📅 测试时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"🔧 模型路径: {MODEL_DIR}")
        print(f"🎛️  最大token数: {MAX_NEW_TOKENS}")
        print(f"🔄 预热轮次: {WARMUP_ROUNDS}")
        print(f"📊 测试轮次: {TEST_ROUNDS}")
        print(f"📝 测试用例数: {len(TEST_PROMPTS)}")
        
        self.start_time = time.time()
        
        for device in self.devices:
            benchmark = DeviceBenchmark(device)
            success = benchmark.run_benchmark()
            
            if success:
                self.device_benchmarks[device] = benchmark
            else:
                print(f"⚠️  {device} 设备测试跳过")
        
        self.end_time = time.time()
    
    def generate_report(self) -> Dict:
        """生成测试报告"""
        report = {
            "test_info": {
                "timestamp": datetime.now().isoformat(),
                "model_path": MODEL_DIR,
                "max_new_tokens": MAX_NEW_TOKENS,
                "warmup_rounds": WARMUP_ROUNDS,
                "test_rounds": TEST_ROUNDS,
                "test_prompts_count": len(TEST_PROMPTS),
                "total_duration": self.end_time - self.start_time if self.end_time and self.start_time else 0
            },
            "device_results": {}
        }
        
        for device, benchmark in self.device_benchmarks.items():
            stats = benchmark.get_statistics()
            if stats:
                report["device_results"][device] = stats
        
        return report
    
    def print_summary(self):
        """打印测试总结"""
        print(f"\n{'='*80}")
        print("📊 测试结果总结")
        print(f"{'='*80}")
        
        if not self.device_benchmarks:
            print("❌ 没有成功完成的测试")
            return
        
        # 设备性能排序
        device_performance = []
        for device, benchmark in self.device_benchmarks.items():
            stats = benchmark.get_statistics()
            if stats and stats.get("throughput"):
                device_performance.append((device, stats["throughput"]["mean"]))
        
        device_performance.sort(key=lambda x: x[1], reverse=True)
        
        # 打印详细结果
        print(f"{'设备':<8} {'平均吞吐率':<15} {'中位数吞吐率':<15} {'首token延迟':<15} {'标准差':<10}")
        print("-" * 80)
        
        for device, benchmark in self.device_benchmarks.items():
            stats = benchmark.get_statistics()
            if stats and stats.get("throughput"):
                tp = stats["throughput"]
                lat = stats["first_token_latency"]
                print(f"{device:<8} {tp['mean']:<15.2f} {tp['median']:<15.2f} "
                      f"{lat['mean']*1000:<15.1f} {tp['std']:<10.2f}")
        
        # 推荐方案
        print(f"\n🏆 性能排行榜:")
        for i, (device, throughput) in enumerate(device_performance, 1):
            print(f"  {i}. {device}: {throughput:.2f} tokens/s")
        
        if device_performance:
            best_device = device_performance[0][0]
            print(f"\n💡 推荐方案: {best_device} (最高吞吐率: {device_performance[0][1]:.2f} tokens/s)")
        
        # 保存详细报告
        report = self.generate_report()
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_file = f"benchmark_report_{timestamp}.json"
        
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        
        print(f"\n📄 详细报告已保存到: {report_file}")

def main():
    parser = argparse.ArgumentParser(description='Intel AIPC 模型性能基准测试')
    parser.add_argument('--devices', nargs='+', choices=['CPU', 'GPU', 'NPU'], 
                       default=['CPU', 'GPU', 'NPU'], help='要测试的设备列表')
    parser.add_argument('--tokens', type=int, default=512, help='最大生成token数')
    parser.add_argument('--rounds', type=int, default=5, help='测试轮次')
    
    args = parser.parse_args()
    
    global MAX_NEW_TOKENS, TEST_ROUNDS
    MAX_NEW_TOKENS = args.tokens
    TEST_ROUNDS = args.rounds
    
    try:
        runner = BenchmarkRunner(args.devices)
        runner.run_all_tests()
        runner.print_summary()
        
    except KeyboardInterrupt:
        print("\n⏹️  测试被用户中断")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ 测试过程中发生错误: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 