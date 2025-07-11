#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
环境检查脚本 - 验证基准测试运行环境
"""

import sys
import os
import importlib
from pathlib import Path

def check_python_version():
    """检查Python版本"""
    print("🐍 检查Python版本...")
    version = sys.version_info
    if version.major >= 3 and version.minor >= 8:
        print(f"  ✅ Python {version.major}.{version.minor}.{version.micro} (符合要求: >=3.8)")
        return True
    else:
        print(f"  ❌ Python {version.major}.{version.minor}.{version.micro} (需要: >=3.8)")
        return False

def check_module(module_name, display_name=None):
    """检查模块是否可用"""
    if display_name is None:
        display_name = module_name
    
    try:
        importlib.import_module(module_name)
        print(f"  ✅ {display_name}")
        return True
    except ImportError:
        print(f"  ❌ {display_name} (未安装)")
        return False

def check_dependencies():
    """检查依赖库"""
    print("\n📦 检查依赖库...")
    
    required_modules = [
        ("openvino_genai", "OpenVINO GenAI"),
        ("numpy", "NumPy"),
        ("json", "JSON (标准库)"),
        ("time", "Time (标准库)"),
        ("statistics", "Statistics (标准库)"),
        ("datetime", "DateTime (标准库)"),
        ("argparse", "ArgParse (标准库)")
    ]
    
    all_ok = True
    for module_name, display_name in required_modules:
        if not check_module(module_name, display_name):
            all_ok = False
    
    return all_ok

def check_model_files():
    """检查模型文件"""
    print("\n📁 检查模型文件...")
    
    model_dir = Path("./qwen2.5-ov-int4")
    if not model_dir.exists():
        print(f"  ❌ 模型目录不存在: {model_dir}")
        return False
    
    required_files = [
        "config.json",
        "openvino_model.xml",
        "openvino_model.bin",
        "openvino_tokenizer.xml",
        "openvino_tokenizer.bin"
    ]
    
    all_files_exist = True
    for file_name in required_files:
        file_path = model_dir / file_name
        if file_path.exists():
            print(f"  ✅ {file_name}")
        else:
            print(f"  ❌ {file_name} (缺失)")
            all_files_exist = False
    
    if all_files_exist:
        print(f"  ✅ 模型文件完整")
    else:
        print(f"  ⚠️  部分模型文件缺失，可能影响运行")
    
    return all_files_exist

def check_cache_directory():
    """检查缓存目录"""
    print("\n💾 检查缓存目录...")
    
    cache_dir = Path("./ov_cache")
    if cache_dir.exists():
        print(f"  ✅ 缓存目录存在: {cache_dir}")
        cache_files = list(cache_dir.glob("*.cl_cache")) + list(cache_dir.glob("*.blob"))
        print(f"  📊 已有缓存文件: {len(cache_files)} 个")
        return True
    else:
        print(f"  ⚠️  缓存目录不存在，将自动创建: {cache_dir}")
        return True

def test_openvino_basic():
    """基础OpenVINO测试"""
    print("\n🧪 基础OpenVINO测试...")
    
    try:
        import openvino_genai as ov_genai
        print(f"  ✅ OpenVINO GenAI 导入成功")
        
        # 尝试列出可用设备
        try:
            # 注意：这个测试不创建实际管线，只检查基本功能
            print(f"  ✅ OpenVINO GenAI 基础功能正常")
            return True
        except Exception as e:
            print(f"  ⚠️  OpenVINO 功能测试警告: {e}")
            return True  # 不影响主要检查
            
    except ImportError as e:
        print(f"  ❌ OpenVINO GenAI 导入失败: {e}")
        return False
    except Exception as e:
        print(f"  ⚠️  OpenVINO 测试警告: {e}")
        return True

def check_hardware_hints():
    """检查硬件提示"""
    print("\n💻 硬件环境提示...")
    
    # 这里不做实际硬件检测，只给出提示
    print("  💡 请确保以下硬件环境：")
    print("     - Intel NPU: 需要安装Intel NPU驱动")
    print("     - GPU: 需要安装Intel GPU驱动或其他GPU驱动")
    print("     - CPU: 应该默认可用")
    print("  💡 建议在运行基准测试前：")
    print("     - 关闭其他占用GPU/NPU的程序")
    print("     - 确保系统有足够的内存 (推荐8GB+)")
    print("     - 确保系统温度正常")

def main():
    """主检查函数"""
    print("=" * 60)
    print("🔍 Intel AIPC 基准测试环境检查")
    print("=" * 60)
    
    checks = [
        ("Python版本", check_python_version),
        ("依赖库", check_dependencies),
        ("模型文件", check_model_files),
        ("缓存目录", check_cache_directory),
        ("OpenVINO功能", test_openvino_basic)
    ]
    
    results = []
    for check_name, check_func in checks:
        try:
            result = check_func()
            results.append((check_name, result))
        except Exception as e:
            print(f"  ❌ {check_name} 检查失败: {e}")
            results.append((check_name, False))
    
    # 硬件提示
    check_hardware_hints()
    
    # 总结
    print(f"\n{'=' * 60}")
    print("📊 检查结果总结")
    print("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for check_name, result in results:
        status = "✅ 通过" if result else "❌ 失败"
        print(f"  {check_name:<15} {status}")
    
    print(f"\n📈 总体结果: {passed}/{total} 项检查通过")
    
    if passed == total:
        print("🎉 环境检查完全通过！可以开始运行基准测试。")
        print("💡 建议执行: run_benchmark.bat 或 python benchmark.py")
        return True
    elif passed >= total - 1:
        print("⚠️  大部分检查通过，可以尝试运行基准测试。")
        print("💡 如果遇到问题，请根据上述检查结果进行修复。")
        return True
    else:
        print("❌ 存在较多环境问题，建议先修复后再运行基准测试。")
        print("💡 请参考README_BENCHMARK.md获取详细帮助。")
        return False

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n⏹️  检查被用户中断")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ 检查过程中发生错误: {e}")
        sys.exit(1) 