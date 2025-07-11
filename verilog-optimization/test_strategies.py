#!/usr/bin/env python3
"""
测试不同优化策略的效果对比
"""

import subprocess
import tempfile
from pathlib import Path

# 创建一个测试用的Verilog设计
TEST_DESIGN = """
module test_design (
    input [7:0] a, b, c, d,
    input sel,
    output [7:0] sum,
    output [7:0] product,
    output [7:0] mux_out
);
    // 算术运算
    assign sum = a + b + c;
    assign product = (a * b) & 8'hFF;
    
    // 多路选择器
    assign mux_out = sel ? (c + d) : (c - d);
endmodule
"""

def run_strategy(verilog_file: str, strategy: str, output_dir: str):
    """运行特定策略的优化"""
    cmd = [
        "python", "vop.py", 
        verilog_file, 
        "--strategy", strategy,
        "--n-trials", "10",  # 快速测试
        "--out-dir", output_dir
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        return result.returncode == 0, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return False, "", "Timeout"

def analyze_output(file_path: str):
    """分析输出文件的特征"""
    if not Path(file_path).exists():
        return {"lines": 0, "wires": 0, "assigns": 0, "readable": False}
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    lines = len(content.splitlines())
    wires = content.count('wire ')
    assigns = content.count('assign ')
    
    # 简单的可读性评估
    has_meaningful_names = 'sum' in content or 'product' in content
    low_wire_count = wires < 50
    readable = has_meaningful_names and low_wire_count
    
    return {
        "lines": lines,
        "wires": wires, 
        "assigns": assigns,
        "readable": readable,
        "size_kb": len(content) / 1024
    }

def main():
    # 创建测试文件
    with tempfile.NamedTemporaryFile(mode='w', suffix='.v', delete=False) as f:
        f.write(TEST_DESIGN)
        test_file = f.name
    
    strategies = ["readable", "aig", "balanced", "yosys_only"]
    results = {}
    
    print("🧪 测试不同优化策略...")
    print("=" * 60)
    
    for strategy in strategies:
        print(f"\n🔄 测试策略: {strategy}")
        output_dir = f"test_out_{strategy}"
        
        success, stdout, stderr = run_strategy(test_file, strategy, output_dir)
        
        if success:
            output_file = Path(output_dir) / "best_opt.v"
            if not output_file.exists():
                output_file = Path(output_dir) / "baseline_readable.v"
            
            analysis = analyze_output(str(output_file))
            results[strategy] = analysis
            
            print(f"✅ 成功 - {analysis['lines']} 行, {analysis['wires']} 个wire")
            if analysis['readable']:
                print(f"   📖 可读性: 良好")
            else:
                print(f"   📖 可读性: 较差")
        else:
            print(f"❌ 失败: {stderr}")
            results[strategy] = None
    
    # 汇总比较
    print("\n" + "=" * 60)
    print("📊 结果汇总:")
    print("-" * 60)
    print(f"{'策略':<12} {'行数':<8} {'Wire数':<8} {'大小(KB)':<10} {'可读性':<8}")
    print("-" * 60)
    
    for strategy, result in results.items():
        if result:
            readable = "良好" if result['readable'] else "较差"
            print(f"{strategy:<12} {result['lines']:<8} {result['wires']:<8} "
                  f"{result['size_kb']:<10.2f} {readable:<8}")
        else:
            print(f"{strategy:<12} {'失败':<8} {'-':<8} {'-':<10} {'-':<8}")
    
    print("\n💡 建议:")
    if 'readable' in results and results['readable']:
        print("✅ 推荐使用 'readable' 策略获得最佳可读性")
    if 'aig' in results and results['aig']:
        if results['aig']['wires'] > 100:
            print("⚠️  'aig' 策略产生了大量内部信号，建议避免使用")
    
    # 清理测试文件
    Path(test_file).unlink()

if __name__ == "__main__":
    main() 