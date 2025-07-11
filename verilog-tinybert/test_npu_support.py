import openvino as ov  # 更新导入避免弃用警告
import requests
import time
import json

def test_openvino_devices():
    """测试OpenVINO设备可用性"""
    print("=== OpenVINO设备检测 ===")
    core = ov.Core()
    available_devices = core.available_devices
    print(f"可用设备: {available_devices}")
    
    # 详细检查每个设备
    for device in available_devices:
        try:
            # 尝试获取设备信息
            if device == 'NPU':
                print(f"✅ {device} 设备可用")
                # 检查NPU版本信息
                try:
                    device_name = core.get_property(device, "FULL_DEVICE_NAME")
                    print(f"   设备名称: {device_name}")
                except:
                    print(f"   设备名称: 无法获取")
            elif device == 'GPU':
                print(f"✅ {device} 设备可用")
                try:
                    device_name = core.get_property(device, "FULL_DEVICE_NAME")
                    print(f"   设备名称: {device_name}")
                except:
                    print(f"   设备名称: 无法获取")
            else:
                print(f"✅ {device} 设备可用")
        except Exception as e:
            print(f"❌ {device} 设备检测失败: {str(e)}")
    
    # 检查NPU是否可用
    if 'NPU' in available_devices:
        print("\n✅ NPU设备可用")
        return True
    else:
        print("\n❌ NPU设备不可用")
        print("可能的原因:")
        print("1. 硬件不支持NPU")
        print("2. NPU驱动未安装")
        print("3. OpenVINO版本不支持NPU")
        print("4. NPU设备被其他程序占用")
        return False

def test_api_health():
    """测试API健康状态"""
    print("\n=== API健康检查 ===")
    try:
        response = requests.get('http://localhost:5000/health', timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ API运行正常")
            print(f"当前使用设备: {data['device']}")
            print(f"可用设备: {data['available_devices']}")
            if 'input_keys' in data:
                print(f"模型输入键: {data['input_keys']}")
            return True, data['device']
        else:
            print(f"❌ API健康检查失败: {response.status_code}")
            return False, None
    except Exception as e:
        print(f"❌ 无法连接到API: {str(e)}")
        print("请确保API服务正在运行 (python verilog_error_api.py)")
        return False, None

def test_inference_performance(device_name):
    """测试推理性能"""
    print(f"\n=== {device_name}推理性能测试 ===")
    
    # 测试用的Verilog代码（单行测试）
    test_code_simple = """module test_module (
    input clk,
    input reset,
    output reg [7:0] counter
);

always @(posedge clk or posedge reset) begin
    if (reset)
        counter <= 8'b0;
    else
        counter <= counter + 1;
end

always @(posedge clk
    counter <= counter + 2;

endmodule"""

    # 多行测试代码
    test_codes = [
        # 单行错误测试
        "always @(posedge clk",
        
        # 多行测试
        test_code_simple,
        
        # 复杂模块测试
        """module complex_test (
    input wire clk,
    input wire rst_n,
    input wire [7:0] data_in,
    output reg [7:0] data_out
);

reg [7:0] internal_reg;

always @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
        internal_reg <= 8'b0;
        data_out <= 8'b0;
    end else begin
        internal_reg <= data_in;
        data_out <= internal_reg;
    end

// 语法错误：缺少结束
always @(posedge clk
    internal_reg <= data_in + 1;

endmodule"""
    ]

    try:
        print("开始性能测试...")
        all_times = []
        
        for i, test_code in enumerate(test_codes):
            print(f"\n--- 测试用例 {i+1} ---")
            times = []
            
            # 执行多次推理测试
            for j in range(3):
                start_time = time.time()
                response = requests.post(
                    'http://localhost:5000/check',
                    json={'code': test_code},
                    timeout=30
                )
                end_time = time.time()
                
                if response.status_code == 200:
                    data = response.json()
                    inference_time = end_time - start_time
                    times.append(inference_time)
                    all_times.append(inference_time)
                    
                    if j == 0:  # 只显示第一次的结果
                        print(f"检测到 {len(data['errors'])} 个错误:")
                        for error in data['errors'][:3]:  # 只显示前3个错误
                            print(f"  行 {error['line']}, 列 {error['column']}: {error['content'].strip()}")
                        if len(data['errors']) > 3:
                            print(f"  ... 还有 {len(data['errors']) - 3} 个错误")
                        
                        if 'inference_time_ms' in data:
                            print(f"模型推理时间: {data['inference_time_ms']} ms")
                        if 'device_used' in data:
                            print(f"使用设备: {data['device_used']}")
                        if 'lines_processed' in data:
                            print(f"处理行数: {data['lines_processed']}")
                else:
                    print(f"❌ 推理请求失败: {response.status_code}")
                    print(f"错误信息: {response.text}")
                    return False
            
            # 计算单个测试用例的性能统计
            if times:
                avg_time = sum(times) / len(times)
                print(f"测试用例 {i+1} 平均响应时间: {avg_time:.3f}s")
        
        # 计算总体性能统计
        if all_times:
            avg_time = sum(all_times) / len(all_times)
            min_time = min(all_times)
            max_time = max(all_times)
            
            print(f"\n=== 总体性能统计 ({len(all_times)} 次测试) ===")
            print(f"平均响应时间: {avg_time:.3f}s")
            print(f"最快响应时间: {min_time:.3f}s")
            print(f"最慢响应时间: {max_time:.3f}s")
            
            if device_name == 'NPU':
                print("✅ NPU推理测试成功!")
                if avg_time < 0.1:
                    print("🚀 NPU性能优秀! (平均响应时间 < 100ms)")
                elif avg_time < 0.5:
                    print("👍 NPU性能良好! (平均响应时间 < 500ms)")
            
            return True
        else:
            print("❌ 没有成功的测试结果")
            return False
        
    except Exception as e:
        print(f"❌ 推理测试失败: {str(e)}")
        return False

def test_model_compatibility():
    """测试模型和NPU的兼容性"""
    print("\n=== 模型兼容性检测 ===")
    try:
        # 检查模型文件
        model_path = "./verilog_error_locator_tinybert/model_full.onnx"
        if not os.path.exists(model_path):
            print(f"❌ 模型文件不存在: {model_path}")
            return False
        
        print(f"✅ 模型文件存在: {model_path}")
        
        # 尝试加载模型到NPU
        core = ov.Core()
        if 'NPU' in core.available_devices:
            try:
                model = core.read_model(model_path)
                print(f"✅ 模型成功读取")
                
                # 检查模型输入
                print("模型输入信息:")
                for input_node in model.inputs:
                    print(f"  - {input_node.get_any_name()}: {input_node.get_partial_shape()}")
                
                # 尝试编译到NPU
                compiled_model = core.compile_model(model, 'NPU')
                print("✅ 模型成功编译到NPU")
                return True
                
            except Exception as e:
                print(f"❌ NPU模型编译失败: {str(e)}")
                return False
        else:
            print("❌ NPU设备不可用，跳过兼容性测试")
            return False
            
    except Exception as e:
        print(f"❌ 兼容性测试失败: {str(e)}")
        return False

def main():
    print("AI PC NPU支持测试工具 v2.0")
    print("=" * 50)
    
    # 1. 检测OpenVINO设备
    npu_available = test_openvino_devices()
    
    # 2. 模型兼容性测试
    if npu_available:
        import os
        model_compatible = test_model_compatibility()
    else:
        model_compatible = False
    
    # 3. 测试API健康状态
    api_healthy, device = test_api_health()
    
    if not api_healthy:
        print("\n请先启动API服务:")
        print("python verilog_error_api.py")
        return
    
    # 4. 测试推理性能
    performance_ok = test_inference_performance(device)
    
    # 5. 总结
    print("\n" + "=" * 50)
    print("📊 测试总结:")
    print(f"🔧 OpenVINO版本: {ov.__version__}")
    print(f"🎯 当前推理设备: {device}")
    
    if npu_available and device == 'NPU' and performance_ok:
        print("🎉 NPU功能完全正常，已成功运行在NPU上!")
        print("💡 建议: 在生产环境中使用当前配置")
    elif npu_available and device != 'NPU':
        print("⚠️  NPU硬件可用但未使用，请检查模型兼容性")
        print("💡 建议: 检查错误日志，尝试重启API服务")
    elif device == 'GPU':
        print("⚠️  NPU不可用，当前使用GPU加速")
        print("💡 建议: 检查NPU驱动和OpenVINO配置")
    elif device == 'CPU':
        print("⚠️  硬件加速不可用，当前使用CPU")
        print("💡 建议: 安装GPU/NPU驱动获得更好性能")
    
    if not performance_ok:
        print("❌ 性能测试失败，请检查API服务状态")

if __name__ == '__main__':
    main() 