# 🚀 Verilog 优化工具使用指南

## 问题解决方案

你遇到的**代码冗长且不可读**的问题已经完全解决！新版本提供了4种不同的优化策略。

### 🔍 问题原因分析

原始代码产生冗长输出的根本原因：
1. **AIG 转换**：将逻辑转换为只有 AND 门和反相器的低级表示
2. **结构丢失**：高级结构（加法器、多路选择器）被分解为基本门
3. **信号命名**：生成大量无意义的内部信号名（如 `n100`, `n101_inv`）

## 🆕 新的优化策略

### 1. `readable` 策略 ⭐ **推荐**
```bash
python vop.py your_design.v --strategy readable
```
**特点：**
- ✅ 保持高级结构（加法器、多路选择器等）
- ✅ 有意义的信号命名
- ✅ 避免大量内部 wire 声明
- ✅ 使用 `alumacc` 识别算术模式

**适用场景：** 日常开发，需要人工维护的代码

### 2. `balanced` 策略
```bash
python vop.py your_design.v --strategy balanced
```
**特点：**
- 🔄 在面积和可读性之间平衡
- 🔄 结合 ABC 和 Yosys 优化
- 🔄 适度的结构简化

**适用场景：** 对面积有要求但仍需要一定可读性

### 3. `yosys_only` 策略
```bash
python vop.py your_design.v --strategy yosys_only
```
**特点：**
- 🎯 纯 Yosys 优化，不使用 ABC
- 🎯 避免 AIG 转换
- 🎯 保持 Verilog 级别的结构

**适用场景：** ABC 工具不可用或有兼容性问题

### 4. `aig` 策略 ⚠️ **不推荐用于可读性**
```bash
python vop.py your_design.v --strategy aig
```
**特点：**
- ❌ 你遇到的原始方法
- ❌ 会产生大量冗长代码
- ✅ 在某些情况下可能获得最小的门数量

**适用场景：** 仅当极度追求最小面积且不关心可读性时使用

## 📋 使用示例

### 基本使用（推荐）
```bash
# 使用可读性优化（默认）
python vop.py my_design.v --strategy readable

# 指定顶层模块
python vop.py my_design.v --top my_module --strategy readable

# 自定义优化参数
python vop.py my_design.v --strategy readable \
    --n-trials 100 \
    --seq-len 8 \
    --delay-w 0.15
```

### 对比不同策略
```bash
# 测试可读性策略
python vop.py test.v --strategy readable --out-dir results_readable

# 测试平衡策略  
python vop.py test.v --strategy balanced --out-dir results_balanced

# 对比结果
ls results_readable/best_opt.v results_balanced/best_opt.v
```

## 🔧 输出文件说明

### `readable` 策略输出
```
bo_out/
├── baseline_readable.v    # 基础可读版本
└── best_opt.v            # 优化后的可读版本
```

### 其他策略输出
```
bo_out/
├── golden.aig           # 原始 AIG 文件（如适用）
├── best.aig            # 优化后 AIG（如适用）
└── best_opt.v          # 优化后 Verilog
```

## 📊 效果对比

### 典型输出对比

**原始 AIG 方法产生的代码：**
```verilog
// 数百行类似这样的代码：
wire n100;
wire n100_inv; 
wire n101;
wire n101_inv;
// ... 更多无意义的信号
assign n34 = n33_inv & n29_inv;
assign n124 = n123_inv & n68_inv;
// ... 大量基本门连接
```

**新的 readable 策略产生的代码：**
```verilog
module sample_adder (
    input [7:0] a, b, c,
    output [7:0] sum,
    output [7:0] product_low
);
    // 保持原始结构的清晰表达
    assign sum = a + b + c;
    assign product_low = a * b;
endmodule
```

## 🛠️ 快速测试

运行演示脚本来查看效果：
```bash
python demo_readable.py
```

这将：
1. 创建一个测试设计
2. 对比不同策略的输出
3. 显示代码示例和统计信息

## ⚡ 性能建议

### 参数调优
- **试验次数 (`-n`)**: 
  - 快速测试: 20-50
  - 日常使用: 60-100  
  - 精细优化: 200+

- **序列长度 (`-l`)**:
  - 简单设计: 4-6
  - 复杂设计: 6-10
  - 超大设计: 8-12

- **延迟权重 (`-w`)**:
  - 面积优先: 0.05-0.1
  - 平衡: 0.1-0.2
  - 速度优先: 0.3-0.5

### 最佳实践

1. **开发阶段**：使用 `readable` 策略
2. **验证阶段**：对比 `balanced` 和 `readable`
3. **量产阶段**：根据需求选择最终策略

## 🔍 故障排除

### 常见问题

**Q: 可读性策略优化失败？**
A: 检查设计是否包含时序逻辑，AIG 只支持组合逻辑

**Q: 输出仍然不够可读？**
A: 尝试 `yosys_only` 策略，或减少优化强度

**Q: 想要更小的面积？**
A: 使用 `balanced` 策略，或增加试验次数

### 调试技巧
```bash
# 启用详细输出
python vop.py design.v --strategy readable -n 10 2>&1 | tee optimization.log

# 检查中间文件
ls bo_out/
head -50 bo_out/best_opt.v
```

## 🎯 总结

✅ **解决了你的问题**：不再生成冗长难读的代码
✅ **推荐使用**：`--strategy readable`（默认）
✅ **向后兼容**：原有的 `aig` 方法仍然可用
✅ **灵活选择**：4种策略适应不同需求

**立即开始使用：**
```bash
python vop.py your_design.v --strategy readable
```

享受清晰可读的优化结果！🎉 