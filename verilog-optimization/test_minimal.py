#!/usr/bin/env python3
"""
测试minimal优化策略
"""

import subprocess
import tempfile
from pathlib import Path

# 简单的测试设计
SIMPLE_DESIGN = """
module simple_test (
    input [7:0] a, b, c,
    output [7:0] sum,
    output [7:0] product_low
);
    assign sum = a + b + c;
    assign product_low = (a * b) & 8'hFF;
endmodule
"""

def test_minimal_strategy():
    """测试minimal策略是否保持RTL结构"""
    print("🧪 测试 minimal 优化策略...")
    
    # 创建测试文件
    with tempfile.NamedTemporaryFile(mode='w', suffix='.v', delete=False) as f:
        f.write(SIMPLE_DESIGN)
        test_file = f.name
    
    try:
        # 运行minimal优化
        cmd = [
            "python", "vop.py", 
            test_file,
            "--strategy", "minimal",
            "--n-trials", "5",  # 快速测试
            "--out-dir", "test_minimal_out"
        ]
        
        print("🔧 运行优化...")
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        
        if result.returncode == 0:
            print("✅ 优化成功!")
            
            # 检查输出文件
            output_files = [
                Path("test_minimal_out") / "baseline_minimal.v",
                Path("test_minimal_out") / "best_opt.v"
            ]
            
            for output_file in output_files:
                if output_file.exists():
                    print(f"\n📄 检查文件: {output_file.name}")
                    
                    with open(output_file, 'r') as f:
                        content = f.read()
                    
                    lines = len(content.splitlines())
                    wire_count = content.count('wire ')
                    assign_count = content.count('assign ')
                    
                    print(f"   📏 行数: {lines}")
                    print(f"   🔗 Wire声明: {wire_count}")
                    print(f"   ➡️  Assign语句: {assign_count}")
                    
                    # 检查是否保留了原始结构
                    if 'sum' in content and 'product_low' in content:
                        print("   ✅ 保留了原始信号名")
                    if wire_count < 20:
                        print("   ✅ Wire数量合理")
                    if 'a + b + c' in content or 'a * b' in content:
                        print("   ✅ 保留了高级运算符")
                    
                    # 显示代码示例
                    print(f"\n📄 {output_file.name} 内容预览:")
                    print("─" * 40)
                    for i, line in enumerate(content.splitlines()[:15], 1):
                        print(f"{i:2d}: {line}")
                    if lines > 15:
                        print(f"... (还有 {lines - 15} 行)")
                        
        else:
            print("❌ 优化失败:")
            print(result.stderr)
            
    except subprocess.TimeoutExpired:
        print("❌ 优化超时")
        
    finally:
        # 清理
        Path(test_file).unlink()

if __name__ == "__main__":
    test_minimal_strategy() 