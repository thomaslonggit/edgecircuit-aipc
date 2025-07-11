#!/usr/bin/env python3
"""
可读性优化演示
演示如何生成可读的优化Verilog代码
"""

import tempfile
from pathlib import Path
import subprocess

# 测试设计 - 包含常见的数字逻辑结构
DEMO_DESIGN = """
module arithmetic_demo (
    input [7:0] a, b, c,
    input [1:0] sel,
    input clk, rst,
    output reg [7:0] result,
    output [7:0] sum,
    output [7:0] product_low
);
    // 组合逻辑
    assign sum = a + b + c;
    assign product_low = (a * b) & 8'hFF;
    
    // 简单的状态机逻辑（组合部分）
    wire [7:0] mux_out;
    assign mux_out = (sel == 2'b00) ? a :
                     (sel == 2'b01) ? b :
                     (sel == 2'b10) ? c : 8'h00;
    
    // 注意：这里只展示组合逻辑，因为AIG不支持时序逻辑
    // 在实际使用中，您需要将时序逻辑部分分离出来
endmodule
"""

def create_test_file():
    """创建临时测试文件"""
    tmp_dir = Path(tempfile.mkdtemp(prefix="vop_demo_"))
    test_file = tmp_dir / "demo.v"
    test_file.write_text(DEMO_DESIGN)
    return test_file

def run_optimization(verilog_file, strategy, trials=20):
    """运行优化"""
    output_dir = f"demo_out_{strategy}"
    cmd = [
        "python", "vop.py",
        str(verilog_file),
        "--strategy", strategy,
        "--n-trials", str(trials),
        "--out-dir", output_dir,
        "--top", "arithmetic_demo"
    ]
    
    print(f"🚀 运行 {strategy} 优化...")
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        return result.returncode == 0, output_dir, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return False, output_dir, "", "超时"

def analyze_result(output_dir, strategy):
    """分析优化结果"""
    output_path = Path(output_dir)
    
    # 查找输出文件
    possible_files = [
        output_path / "best_opt.v",
        output_path / "baseline_readable.v"
    ]
    
    result_file = None
    for f in possible_files:
        if f.exists():
            result_file = f
            break
    
    if not result_file:
        return None
    
    content = result_file.read_text()
    
    # 统计特征
    lines = len(content.splitlines())
    wires = content.count('wire ')
    assigns = content.count('assign ')
    
    # 检查是否保留了有意义的信号名
    meaningful_signals = sum([
        'sum' in content,
        'product' in content,
        'mux' in content,
        content.count('_') < content.count(' ')  # 少用下划线通常意味着更可读
    ])
    
    print(f"\n📊 {strategy} 策略结果:")
    print(f"   📄 文件: {result_file.name}")
    print(f"   📏 行数: {lines}")
    print(f"   🔗 Wire声明: {wires}")
    print(f"   ➡️  Assign语句: {assigns}")
    print(f"   📖 可读性评分: {meaningful_signals}/4")
    
    if lines < 100 and wires < 50:
        print(f"   ✅ 结果简洁易读")
    elif lines > 300 or wires > 200:
        print(f"   ⚠️  结果冗长，可读性较差")
    else:
        print(f"   📖 结果中等复杂度")
    
    return {
        'lines': lines,
        'wires': wires,
        'assigns': assigns,
        'readability_score': meaningful_signals,
        'file': result_file
    }

def show_code_sample(file_path, max_lines=20):
    """显示代码示例"""
    if not file_path or not Path(file_path).exists():
        return
    
    content = Path(file_path).read_text()
    lines = content.splitlines()
    
    print(f"\n📄 代码示例 (前{min(max_lines, len(lines))}行):")
    print("─" * 50)
    for i, line in enumerate(lines[:max_lines], 1):
        print(f"{i:3d}: {line}")
    
    if len(lines) > max_lines:
        print(f"... (还有 {len(lines) - max_lines} 行)")

def main():
    print("🎯 Verilog优化策略演示")
    print("=" * 60)
    
    # 创建测试文件
    test_file = create_test_file()
    print(f"📝 创建测试文件: {test_file}")
    
    # 测试不同策略
    strategies = [
        ("readable", "可读性优化"),
        ("aig", "传统AIG方法（会产生冗长代码）")
    ]
    
    results = {}
    
    for strategy, description in strategies:
        print(f"\n🔧 {description}")
        print("-" * 40)
        
        success, output_dir, stdout, stderr = run_optimization(test_file, strategy)
        
        if success:
            result = analyze_result(output_dir, strategy)
            results[strategy] = result
            
            # 显示代码示例
            if result and result['file']:
                show_code_sample(result['file'], 15)
        else:
            print(f"❌ {strategy} 优化失败:")
            print(f"   {stderr}")
    
    # 对比结果
    print("\n" + "=" * 60)
    print("📈 策略对比:")
    print("-" * 60)
    
    if 'readable' in results and 'aig' in results:
        readable_result = results['readable']
        aig_result = results['aig']
        
        print(f"可读性策略: {readable_result['lines']} 行, {readable_result['wires']} 个wire")
        print(f"AIG策略:   {aig_result['lines']} 行, {aig_result['wires']} 个wire")
        
        if readable_result['lines'] < aig_result['lines']:
            print("✅ 可读性策略生成了更简洁的代码!")
        
        if readable_result['readability_score'] > aig_result['readability_score']:
            print("✅ 可读性策略保留了更多有意义的信号名!")
    
    print("\n💡 使用建议:")
    print("✅ 对于新项目，推荐使用: python vop.py your_design.v --strategy readable")
    print("🔍 如需最小面积，可尝试: python vop.py your_design.v --strategy balanced")
    print("⚠️  避免使用 aig 策略，除非只关心门数量而不关心可读性")
    
    # 清理
    test_file.unlink()
    print(f"\n🧹 清理临时文件: {test_file}")

if __name__ == "__main__":
    main() 