#!/usr/bin/env python3
"""
Verilog Error Locator Model Performance Benchmark Script
========================================================

This script performs comprehensive performance testing of the Verilog error locator model
including inference rate, latency, throughput, and memory usage across different devices.
"""

import os
import sys
import time
import json
import logging
import psutil
import numpy as np
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from transformers import BertTokenizer
import openvino as ov
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading
from contextlib import contextmanager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('benchmark_results.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

@dataclass
class BenchmarkResult:
    """Data class to store benchmark results"""
    device: str
    batch_size: int
    total_samples: int
    total_time: float
    avg_latency: float
    throughput: float
    memory_usage: Dict[str, float]
    error_count: int
    success_rate: float

class ModelBenchmark:
    """Model performance benchmark class"""
    
    def __init__(self, model_dir: str = "verilog_error_locator_tinybert"):
        self.model_dir = model_dir
        self.tokenizer = None
        self.compiled_models = {}
        self.max_len = 128
        self.load_tokenizer()
        self.sample_data = self.generate_sample_data()
        
    def load_tokenizer(self):
        """Load the tokenizer"""
        try:
            self.tokenizer = BertTokenizer.from_pretrained(self.model_dir)
            logger.info("Tokenizer loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load tokenizer: {e}")
            raise
    
    def get_available_devices(self) -> Tuple[List[str], ov.Core]:
        """Get available OpenVINO devices"""
        core = ov.Core()
        available_devices = core.available_devices
        logger.info(f"Available OpenVINO devices: {available_devices}")
        return available_devices, core
    
    def setup_models(self) -> Dict[str, ov.CompiledModel]:
        """Setup models for all available devices"""
        available_devices, core = self.get_available_devices()
        model_path = os.path.join(self.model_dir, "model_full.onnx")
        
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model file not found: {model_path}")
        
        # Load base model
        model = core.read_model(model_path)
        compiled_models = {}
        
        # Test devices in priority order
        test_devices = ['NPU', 'GPU', 'CPU']
        
        for device in test_devices:
            if device in available_devices:
                try:
                    logger.info(f"Setting up model for {device}...")
                    
                    if device == 'NPU':
                        # NPU specific configuration
                        config = {}
                        # Set static shapes for NPU
                        npu_model = core.read_model(model_path)
                        for input_node in npu_model.inputs:
                            if input_node.get_partial_shape().is_dynamic:
                                static_shape = [16, 128]  # Max batch size for NPU
                                npu_model.reshape({input_node.get_any_name(): static_shape})
                        
                        compiled_models[device] = core.compile_model(npu_model, device, config)
                    else:
                        compiled_models[device] = core.compile_model(model, device)
                    
                    logger.info(f"Model successfully compiled on {device}")
                    
                except Exception as e:
                    logger.warning(f"Failed to compile model on {device}: {e}")
                    continue
        
        if not compiled_models:
            raise RuntimeError("No devices available for model compilation")
        
        self.compiled_models = compiled_models
        return compiled_models
    
    def generate_sample_data(self) -> List[str]:
        """Generate sample Verilog code for testing"""
        samples = [
            # Valid Verilog code
            "module test_module(input clk, input rst, output reg [7:0] out);",
            "always @(posedge clk or posedge rst) begin",
            "    if (rst) out <= 8'b0;",
            "    else out <= out + 1;",
            "end",
            "endmodule",
            
            # Code with potential errors
            "module error_test(input clk, input rst, output reg [7:0] out)",  # Missing semicolon
            "always @(posedge clk or posedge rst",  # Missing closing parenthesis
            "    if (rst) out <= 8'b0",  # Missing semicolon
            "    else out <= out + 1",  # Missing semicolon
            "end",
            "endmodule",
            
            # Mixed complexity samples
            "wire [31:0] data_in, data_out;",
            "reg [7:0] counter;",
            "parameter WIDTH = 8;",
            "localparam DEPTH = 1024;",
            "assign data_out = data_in << counter;",
            
            # Complex logic
            "always_comb begin",
            "    case (state)",
            "        IDLE: next_state = START;",
            "        START: next_state = ACTIVE;",
            "        ACTIVE: next_state = IDLE;",
            "        default: next_state = IDLE;",
            "    endcase",
            "end",
        ]
        
        # Expand samples to create more test data
        extended_samples = []
        for i in range(10):  # Create multiple copies with variations
            for sample in samples:
                extended_samples.append(sample)
                # Add some variations
                extended_samples.append(f"    {sample}")  # Indented version
                extended_samples.append(f"{sample} // Comment")  # With comment
        
        return extended_samples
    
    def prepare_inputs(self, samples: List[str], batch_size: int) -> Dict[str, np.ndarray]:
        """Prepare input tensors for inference"""
        # Take samples up to batch_size
        batch_samples = samples[:batch_size]
        if len(batch_samples) < batch_size:
            # Repeat samples to fill batch
            batch_samples.extend(samples * ((batch_size - len(batch_samples)) // len(samples) + 1))
            batch_samples = batch_samples[:batch_size]
        
        # Tokenize
        inputs = self.tokenizer(
            batch_samples,
            padding='max_length',
            truncation=True,
            max_length=self.max_len,
            return_tensors='np'
        )
        
        # Convert to int32
        for key in inputs:
            inputs[key] = inputs[key].astype(np.int32)
        
        return inputs
    
    @contextmanager
    def monitor_memory(self):
        """Context manager to monitor memory usage"""
        process = psutil.Process()
        memory_before = process.memory_info()
        
        yield
        
        memory_after = process.memory_info()
        memory_diff = {
            'rss_mb': (memory_after.rss - memory_before.rss) / 1024 / 1024,
            'vms_mb': (memory_after.vms - memory_before.vms) / 1024 / 1024,
            'current_rss_mb': memory_after.rss / 1024 / 1024,
            'current_vms_mb': memory_after.vms / 1024 / 1024
        }
        
        self.memory_usage = memory_diff
    
    def run_single_benchmark(self, device: str, batch_size: int, num_iterations: int = 100) -> BenchmarkResult:
        """Run benchmark for a single device and batch size"""
        logger.info(f"Running benchmark: {device}, batch_size={batch_size}, iterations={num_iterations}")
        
        compiled_model = self.compiled_models[device]
        
        # Get input node names
        input_keys = {}
        for input_node in compiled_model.inputs:
            input_name = input_node.get_any_name()
            if 'input_ids' in input_name.lower():
                input_keys['input_ids'] = input_name
            elif 'attention_mask' in input_name.lower():
                input_keys['attention_mask'] = input_name
            elif 'token_type_ids' in input_name.lower():
                input_keys['token_type_ids'] = input_name
        
        # Prepare test data
        inputs = self.prepare_inputs(self.sample_data, batch_size)
        
        # Handle NPU batch size constraints
        if device == 'NPU' and batch_size > 16:
            logger.warning(f"NPU batch size {batch_size} > 16, adjusting to 16")
            batch_size = 16
            inputs = self.prepare_inputs(self.sample_data, batch_size)
        
        # Prepare inference inputs
        inference_inputs = {}
        for key, input_name in input_keys.items():
            if key in inputs:
                input_data = inputs[key]
                
                # For NPU, pad to fixed batch size
                if device == 'NPU' and input_data.shape[0] < 16:
                    padding_size = 16 - input_data.shape[0]
                    padding_shape = list(input_data.shape)
                    padding_shape[0] = padding_size
                    padding = np.zeros(padding_shape, dtype=input_data.dtype)
                    input_data = np.concatenate([input_data, padding], axis=0)
                
                inference_inputs[input_name] = input_data
        
        # Warm up
        logger.info("Warming up...")
        for _ in range(5):
            try:
                compiled_model(inference_inputs)
            except Exception as e:
                logger.warning(f"Warmup failed: {e}")
        
        # Benchmark
        latencies = []
        errors = 0
        
        with self.monitor_memory():
            total_start = time.time()
            
            for i in range(num_iterations):
                start_time = time.time()
                
                try:
                    output = compiled_model(inference_inputs)
                    end_time = time.time()
                    latencies.append(end_time - start_time)
                    
                except Exception as e:
                    errors += 1
                    logger.warning(f"Inference {i+1} failed: {e}")
                    continue
                
                # Progress logging
                if (i + 1) % 20 == 0:
                    logger.info(f"Completed {i+1}/{num_iterations} iterations")
            
            total_time = time.time() - total_start
        
        # Calculate metrics
        successful_inferences = len(latencies)
        total_samples = successful_inferences * batch_size
        
        if successful_inferences == 0:
            logger.error(f"All inferences failed for {device}")
            return BenchmarkResult(
                device=device,
                batch_size=batch_size,
                total_samples=0,
                total_time=total_time,
                avg_latency=float('inf'),
                throughput=0,
                memory_usage=getattr(self, 'memory_usage', {}),
                error_count=errors,
                success_rate=0.0
            )
        
        avg_latency = np.mean(latencies)
        throughput = total_samples / total_time  # samples per second
        success_rate = successful_inferences / num_iterations
        
        result = BenchmarkResult(
            device=device,
            batch_size=batch_size,
            total_samples=total_samples,
            total_time=total_time,
            avg_latency=avg_latency,
            throughput=throughput,
            memory_usage=getattr(self, 'memory_usage', {}),
            error_count=errors,
            success_rate=success_rate
        )
        
        logger.info(f"Benchmark completed: {device} - "
                   f"Throughput: {throughput:.2f} samples/sec, "
                   f"Avg Latency: {avg_latency*1000:.2f}ms, "
                   f"Success Rate: {success_rate*100:.1f}%")
        
        return result
    
    def run_comprehensive_benchmark(self, iterations: int = 100) -> Dict[str, List[BenchmarkResult]]:
        """Run comprehensive benchmark across all devices and batch sizes"""
        logger.info("Starting comprehensive benchmark...")
        
        # Setup models
        self.setup_models()
        
        # Define test configurations
        batch_sizes = [1, 2, 4, 8, 16, 32, 64]  # NPU will be limited to 16
        results = {}
        
        for device in self.compiled_models.keys():
            logger.info(f"Benchmarking device: {device}")
            results[device] = []
            
            for batch_size in batch_sizes:
                # Skip large batch sizes for NPU
                if device == 'NPU' and batch_size > 16:
                    continue
                
                try:
                    result = self.run_single_benchmark(device, batch_size, iterations)
                    results[device].append(result)
                    
                    # Small delay between tests
                    time.sleep(1)
                    
                except Exception as e:
                    logger.error(f"Benchmark failed for {device}, batch_size={batch_size}: {e}")
                    continue
        
        return results
    
    def save_results(self, results: Dict[str, List[BenchmarkResult]], filename: str = "benchmark_results.json"):
        """Save benchmark results to JSON file"""
        serializable_results = {}
        
        for device, device_results in results.items():
            serializable_results[device] = []
            for result in device_results:
                serializable_results[device].append({
                    'device': result.device,
                    'batch_size': result.batch_size,
                    'total_samples': result.total_samples,
                    'total_time': result.total_time,
                    'avg_latency': result.avg_latency,
                    'throughput': result.throughput,
                    'memory_usage': result.memory_usage,
                    'error_count': result.error_count,
                    'success_rate': result.success_rate
                })
        
        with open(filename, 'w') as f:
            json.dump(serializable_results, f, indent=2)
        
        logger.info(f"Results saved to {filename}")
    
    def print_summary(self, results: Dict[str, List[BenchmarkResult]]):
        """Print benchmark summary"""
        print("\n" + "="*80)
        print("BENCHMARK SUMMARY")
        print("="*80)
        
        for device, device_results in results.items():
            print(f"\n{device} Results:")
            print("-" * 50)
            print(f"{'Batch Size':<12} {'Throughput':<15} {'Avg Latency':<15} {'Success Rate':<15}")
            print(f"{'(samples)':<12} {'(samples/sec)':<15} {'(ms)':<15} {'(%)':<15}")
            print("-" * 50)
            
            for result in device_results:
                print(f"{result.batch_size:<12} "
                      f"{result.throughput:<15.2f} "
                      f"{result.avg_latency*1000:<15.2f} "
                      f"{result.success_rate*100:<15.1f}")
            
            # Find best performance
            if device_results:
                best_throughput = max(device_results, key=lambda x: x.throughput)
                print(f"\nBest throughput: {best_throughput.throughput:.2f} samples/sec "
                      f"(batch_size={best_throughput.batch_size})")
        
        # Cross-device comparison
        print(f"\n{'CROSS-DEVICE COMPARISON':<30}")
        print("-" * 50)
        
        all_best = []
        for device, device_results in results.items():
            if device_results:
                best = max(device_results, key=lambda x: x.throughput)
                all_best.append(best)
        
        all_best.sort(key=lambda x: x.throughput, reverse=True)
        
        for i, result in enumerate(all_best, 1):
            print(f"{i}. {result.device:<8} - {result.throughput:.2f} samples/sec "
                  f"(batch_size={result.batch_size})")

def main():
    """Main function"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Benchmark Verilog Error Locator Model')
    parser.add_argument('--iterations', type=int, default=100,
                        help='Number of iterations per test (default: 100)')
    parser.add_argument('--model-dir', type=str, default='verilog_error_locator_tinybert',
                        help='Model directory path')
    parser.add_argument('--output', type=str, default='benchmark_results.json',
                        help='Output file for results')
    
    args = parser.parse_args()
    
    # Create benchmark instance
    benchmark = ModelBenchmark(args.model_dir)
    
    try:
        # Run comprehensive benchmark
        results = benchmark.run_comprehensive_benchmark(args.iterations)
        
        # Save and display results
        benchmark.save_results(results, args.output)
        benchmark.print_summary(results)
        
        print(f"\nBenchmark completed! Results saved to {args.output}")
        print(f"Detailed logs saved to benchmark_results.log")
        
    except Exception as e:
        logger.error(f"Benchmark failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 