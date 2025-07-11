# Intel AIPC 模型性能基准测试工具

这是一个专门用于测试Qwen2.5模型在不同硬件设备上性能的压力测试工具。

## 🎯 功能特点

- **多设备支持**: 支持CPU、GPU、NPU三种设备
- **全面指标**: 测量吞吐率、首token延迟、稳定性等关键指标
- **智能对比**: 自动生成性能排行榜和推荐方案
- **详细报告**: 生成JSON格式的详细测试报告
- **灵活配置**: 支持自定义测试参数

## 📊 测试指标

- **吞吐率** (tokens/s): 平均每秒生成的token数量
- **首token延迟** (ms): 生成第一个token的时间
- **稳定性**: 通过多轮测试的标准差评估
- **成功率**: 测试成功完成的比例

## 🚀 快速开始

### 方法1: 使用批处理脚本 (推荐)

```bash
# 双击运行或在命令行执行
run_benchmark.bat
```

然后根据菜单选择测试类型：
1. 完整测试 (所有设备)
2. 单独测试NPU
3. 单独测试GPU  
4. 单独测试CPU
5. 自定义测试
6. 快速测试

### 方法2: 直接运行Python脚本

```bash
# 完整测试
python benchmark.py

# 测试特定设备
python benchmark.py --devices NPU GPU

# 自定义参数
python benchmark.py --devices NPU --tokens 1024 --rounds 3
```

## ⚙️ 命令行参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `--devices` | list | CPU GPU NPU | 要测试的设备列表 |
| `--tokens` | int | 512 | 最大生成token数 |
| `--rounds` | int | 5 | 测试轮次 |

## 📋 测试配置

### 默认配置
- **测试用例**: 8个不同类型的中文prompt
- **预热轮次**: 2轮 (不计入统计)
- **正式测试**: 5轮
- **每轮token数**: 512个
- **采样策略**: 确定性生成 (temperature=0.1)

### 硬件优化策略
- **NPU**: 使用LATENCY优化 (低延迟优先)
- **GPU**: 使用THROUGHPUT优化 (高吞吐优先)  
- **CPU**: 使用THROUGHPUT优化 (高吞吐优先)

## 📄 输出报告

### 控制台输出
测试过程中会实时显示：
- 设备初始化状态
- 每轮测试进度
- 实时性能数据
- 最终性能排行榜

### JSON报告文件
自动生成时间戳命名的JSON文件，包含：
- 测试环境信息
- 详细统计数据
- 原始测试结果

示例文件名: `benchmark_report_20241220_143052.json`

## 📊 性能评估标准

### 优秀性能指标 (参考)
- **NPU**: > 50 tokens/s
- **GPU**: > 30 tokens/s  
- **CPU**: > 10 tokens/s

### 首token延迟 (参考)
- **优秀**: < 200ms
- **良好**: 200-500ms
- **一般**: 500-1000ms
- **较差**: > 1000ms

## 🔧 环境要求

- Python 3.8+
- OpenVINO GenAI
- 预转换的INT4模型文件
- 对应的硬件驱动 (NPU/GPU)

## 💡 使用建议

### 测试前准备
1. 确保所有驱动程序已安装
2. 关闭其他占用GPU/NPU的程序
3. 确保模型文件路径正确

### 测试策略
1. **首次测试**: 运行快速测试验证环境
2. **完整评估**: 运行所有设备的完整测试
3. **深度分析**: 针对最佳设备进行更多轮次测试

### 结果分析
- 重点关注平均吞吐率和稳定性
- 比较不同设备的首token延迟
- 考虑功耗和发热情况

## ⚠️ 注意事项

1. **测试时间**: 完整测试可能需要15-30分钟
2. **系统负载**: 测试期间避免运行其他重负载程序
3. **温度管理**: 长时间测试可能导致硬件过热
4. **驱动兼容**: 确保NPU和GPU驱动版本兼容

## 🐛 常见问题

### Q: NPU初始化失败
A: 检查NPU驱动是否正确安装，尝试重启系统

### Q: GPU测试速度很慢
A: 检查GPU内存是否充足，关闭其他占用GPU的程序

### Q: 测试被中断
A: 使用Ctrl+C安全中断，程序会自动清理资源

### Q: 结果差异很大
A: 这是正常现象，多运行几轮取平均值

## 📞 技术支持

如果遇到问题，请检查：
1. 模型文件是否完整
2. 依赖库是否正确安装
3. 硬件驱动是否最新版本
4. 系统资源是否充足 