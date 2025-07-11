#!/usr/bin/env python3
"""
对比不同优化策略的效果
"""

import subprocess
import tempfile
from pathlib import Path
import shutil

# 更复杂的测试设计，有明显的优化空间
COMPLEX_DESIGN = """
module complex_test (
    input [7:0] a, b, c, d,
    input [2:0] sel,
    output [7:0] sum,
    output [7:0] product,
    output [7:0] mux_out,
    output [7:0] combo
);
    // 可以被优化的冗余表达式
    wire [7:0] temp1 = a + b;
    wire [7:0] temp2 = a + b;  // 重复的表达式
    wire [7:0] temp3 = c + d;
    
    assign sum = temp1 + temp3;  // 可以简化为 a + b + c + d
    assign product = (a * b) & 8'hFF;
    
    // 可以被优化的多路选择器
    assign mux_out = (sel == 3'b000) ? a :
                     (sel == 3'b001) ? b :
                     (sel == 3'b010) ? c :
                     (sel == 3'b011) ? d :
                     (sel == 3'b100) ? temp1 :  // 可以直接用 a+b
                     (sel == 3'b101) ? temp2 :  // 重复的 a+b
                     (sel == 3'b110) ? temp3 :
                     8'h00;
    
    // 可以被位宽优化的表达式
    assign combo = ({8{sel[0]}} & a) | ({8{sel[1]}} & b) | ({8{sel[2]}} & c);
endmodule
"""

def run_strategy_test(verilog_file: str, strategy: str, trials: int = 20):
    """运行特定策略的优化并返回结果信息"""
    output_dir = f"compare_out_{strategy}"
    
    # 清理旧的输出目录
    if Path(output_dir).exists():
        shutil.rmtree(output_dir)
    
    cmd = [
        "python", "vop.py",
        verilog_file,
        "--strategy", strategy,
        "--n-trials", str(trials),
        "--out-dir", output_dir,
        "--top", "complex_test"
    ]
    
    print(f"🔧 测试 {strategy} 策略...")
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        
        if result.returncode == 0:
            # 查找输出文件
            output_path = Path(output_dir)
            possible_files = [
                output_path / "best_opt.v",
                output_path / "baseline_readable.v",
                output_path / "baseline_minimal.v"
            ]
            
            result_file = None
            for f in possible_files:
                if f.exists():
                    result_file = f
                    break
            
            if result_file:
                content = result_file.read_text()
                return {
                    'success': True,
                    'file': result_file,
                    'content': content,
                    'lines': len(content.splitlines()),
                    'wires': content.count('wire '),
                    'assigns': content.count('assign '),
                    'stdout': result.stdout
                }
        
        return {
            'success': False,
            'error': result.stderr,
            'stdout': result.stdout
        }
        
    except subprocess.TimeoutExpired:
        return {'success': False, 'error': '超时'}

def analyze_optimization(original_content: str, optimized_content: str, strategy: str):
    """分析优化效果"""
    print(f"\n📊 {strategy} 策略分析:")
    print("-" * 50)
    
    orig_lines = len(original_content.splitlines())
    opt_lines = len(optimized_content.splitlines())
    orig_wires = original_content.count('wire ')
    opt_wires = optimized_content.count('wire ')
    orig_assigns = original_content.count('assign ')
    opt_assigns = optimized_content.count('assign ')
    
    print(f"📏 行数:      {orig_lines} → {opt_lines} ({opt_lines-orig_lines:+d})")
    print(f"🔗 Wire数:    {orig_wires} → {opt_wires} ({opt_wires-orig_wires:+d})")
    print(f"➡️  Assign数: {orig_assigns} → {opt_assigns} ({opt_assigns-orig_assigns:+d})")
    
    # 检查特定的优化效果
    if 'temp1' in original_content and 'temp1' not in optimized_content:
        print("✅ 消除了冗余的temp1信号")
    if 'temp2' in original_content and 'temp2' not in optimized_content:
        print("✅ 消除了重复的temp2信号")
    if original_content.count('a + b') > optimized_content.count('a + b'):
        print("✅ 优化了重复的加法表达式")
    
    # 检查可读性
    if opt_wires < 20 and 'complex_test' in optimized_content:
        print("📖 保持了良好的可读性")
    elif opt_wires > 100:
        print("⚠️  生成了大量内部信号，可读性较差")
    
    return {
        'line_reduction': orig_lines - opt_lines,
        'wire_reduction': orig_wires - opt_wires,
        'assign_change': opt_assigns - orig_assigns
    }

def show_code_comparison(original: str, optimized: str, strategy: str, max_lines: int = 20):
    """显示代码对比"""
    print(f"\n📄 {strategy} 策略代码对比:")
    print("=" * 60)
    
    orig_lines = original.splitlines()
    opt_lines = optimized.splitlines()
    
    print("🔹 原始代码 (前15行):")
    print("-" * 30)
    for i, line in enumerate(orig_lines[:15], 1):
        print(f"{i:2d}: {line}")
    
    print(f"\n🔹 {strategy} 优化后 (前15行):")
    print("-" * 30)
    for i, line in enumerate(opt_lines[:15], 1):
        print(f"{i:2d}: {line}")
    
    if len(opt_lines) > 15:
        print(f"... (还有 {len(opt_lines) - 15} 行)")

def main():
    print("🧪 全面对比不同优化策略")
    print("=" * 60)
    
    # 创建测试文件
    with tempfile.NamedTemporaryFile(mode='w', suffix='.v', delete=False) as f:
        f.write(COMPLEX_DESIGN)
        test_file = f.name
    
    print(f"📝 创建复杂测试设计: {test_file}")
    print("包含冗余表达式、重复信号、可优化的多路选择器")
    
    # 测试不同策略
    strategies = [
        ("minimal", "最小优化 - 保持结构"),
        ("readable", "可读优化 - 清理代码"),
        ("aig", "AIG优化 - 最小面积")
    ]
    
    results = {}
    original_content = COMPLEX_DESIGN
    
    for strategy, description in strategies:
        print(f"\n{'='*20} {description} {'='*20}")
        result = run_strategy_test(test_file, strategy, 30)  # 增加试验次数
        
        if result['success']:
            results[strategy] = result
            
            # 分析优化效果
            analysis = analyze_optimization(original_content, result['content'], strategy)
            
            # 显示代码对比
            show_code_comparison(original_content, result['content'], strategy)
            
        else:
            print(f"❌ {strategy} 优化失败:")
            print(f"   错误: {result.get('error', '未知错误')}")
            if 'stdout' in result:
                print(f"   输出: {result['stdout']}")
    
    # 总结对比
    print(f"\n{'='*60}")
    print("📈 策略效果总结:")
    print("=" * 60)
    print(f"{'策略':<12} {'行数':<8} {'Wire数':<8} {'可读性':<10} {'推荐用途':<20}")
    print("-" * 60)
    
    for strategy, result in results.items():
        if result['success']:
            readability = "良好" if result['wires'] < 20 else ("一般" if result['wires'] < 100 else "较差")
            
            use_case = {
                'minimal': '日常开发',
                'readable': '项目维护', 
                'aig': '面积优化'
            }.get(strategy, '未知')
            
            print(f"{strategy:<12} {result['lines']:<8} {result['wires']:<8} {readability:<10} {use_case:<20}")
    
    print("\n💡 使用建议:")
    print("✅ 日常开发: python vop.py design.v --strategy minimal")
    print("🔧 代码清理: python vop.py design.v --strategy readable") 
    print("⚠️  面积优化: python vop.py design.v --strategy aig (但代码难读)")
    
    # 清理
    Path(test_file).unlink()
    print(f"\n🧹 清理测试文件: {test_file}")

if __name__ == "__main__":
    main() 