# Verilog Error Locator Model Benchmark

This repository contains comprehensive benchmarking tools for the Verilog Error Locator model, designed to evaluate performance across different hardware accelerators (NPU, GPU, CPU) and various batch sizes.

## Features

- **Multi-device Support**: Automatically tests on available OpenVINO devices (NPU, GPU, CPU)
- **Comprehensive Metrics**: Measures throughput, latency, memory usage, and success rates
- **Batch Size Testing**: Tests performance across different batch sizes (1, 2, 4, 8, 16, 32, 64)
- **Stress Testing**: Configurable iterations for thorough performance evaluation
- **Detailed Reporting**: JSON results and formatted console output
- **Memory Monitoring**: Tracks memory usage during inference

## Quick Start

### Prerequisites

Install the required dependencies:
```bash
pip install -r requirements.txt
```

### Running Benchmarks

#### Option 1: Use the Quick Runner (Recommended)
```bash
# Quick test (50 iterations)
python run_benchmark.py quick

# Standard benchmark (100 iterations)
python run_benchmark.py standard

# Thorough benchmark (300 iterations)
python run_benchmark.py thorough

# Stress test (1000 iterations)
python run_benchmark.py stress
```

#### Option 2: Direct Benchmark Script
```bash
# Basic benchmark
python benchmark_model.py

# Custom iterations
python benchmark_model.py --iterations 200

# Custom output file
python benchmark_model.py --output my_results.json

# Custom model directory
python benchmark_model.py --model-dir /path/to/model
```

## Benchmark Configurations

| Configuration | Iterations | Use Case |
|---------------|------------|----------|
| `quick`       | 50         | Fast testing during development |
| `standard`    | 100        | Balanced performance evaluation |
| `thorough`    | 300        | Accurate performance measurement |
| `stress`      | 1000       | Maximum load testing |

## Output Files

The benchmark generates several output files:

- `benchmark_results.json`: Detailed JSON results with all metrics
- `benchmark_results.log`: Detailed execution log
- `benchmark_[config]_results.json`: Configuration-specific results

## Metrics Explained

### Throughput (samples/sec)
- Number of Verilog code samples processed per second
- Higher is better
- Indicates overall processing capacity

### Average Latency (ms)
- Average time to process a single batch
- Lower is better
- Important for real-time applications

### Success Rate (%)
- Percentage of successful inferences
- Should be 100% for reliable deployment
- Lower rates indicate instability

### Memory Usage (MB)
- Memory consumption during inference
- Includes RSS (Resident Set Size) and VMS (Virtual Memory Size)
- Important for resource-constrained environments

## Sample Results

```
BENCHMARK SUMMARY
================================================================================

NPU Results:
--------------------------------------------------
Batch Size   Throughput      Avg Latency     Success Rate   
(samples)    (samples/sec)   (ms)            (%)            
--------------------------------------------------
1            145.23          6.88            100.0
2            267.45          7.48            100.0
4            489.12          8.18            100.0
8            712.34          11.23           100.0
16           1024.56         15.62           100.0

Best throughput: 1024.56 samples/sec (batch_size=16)

CROSS-DEVICE COMPARISON
--------------------------------------------------
1. NPU      - 1024.56 samples/sec (batch_size=16)
2. GPU      - 856.78 samples/sec (batch_size=32)
3. CPU      - 234.12 samples/sec (batch_size=8)
```

## Device-Specific Notes

### NPU (Neural Processing Unit)
- **Batch Size Limit**: Maximum 16 samples per batch
- **Memory**: Optimized for low memory usage
- **Performance**: Highest throughput for supported batch sizes
- **Precision**: Supports INT8 quantization

### GPU
- **Batch Size**: Supports larger batches (up to 64)
- **Memory**: Higher memory usage but faster processing
- **Performance**: Good for medium to large batch sizes
- **Precision**: Supports FP16 and FP32

### CPU
- **Batch Size**: Flexible batch sizes
- **Memory**: Moderate memory usage
- **Performance**: Consistent but slower than accelerators
- **Precision**: Full FP32 precision

## Advanced Usage

### Custom Test Data
The benchmark uses generated Verilog code samples. To use custom test data:

1. Modify the `generate_sample_data()` method in `benchmark_model.py`
2. Add your Verilog code samples to the samples list
3. Run the benchmark as usual

### Performance Tuning Tips

1. **For NPU**: Use batch sizes of 8-16 for optimal performance
2. **For GPU**: Experiment with batch sizes 16-32 depending on memory
3. **For CPU**: Smaller batch sizes (1-8) often work best
4. **Memory**: Monitor memory usage to avoid OOM errors

### Troubleshooting

#### Common Issues

1. **Model Not Found**
   ```
   FileNotFoundError: Model file not found: verilog_error_locator_tinybert/model_full.onnx
   ```
   - Solution: Ensure the model directory exists and contains the ONNX model

2. **Device Not Available**
   ```
   No devices available for model compilation
   ```
   - Solution: Install OpenVINO runtime for your target device

3. **Memory Issues**
   ```
   RuntimeError: Out of memory
   ```
   - Solution: Reduce batch size or use CPU device

4. **NPU Compilation Failed**
   ```
   Failed to compile model on NPU
   ```
   - Solution: Check NPU driver installation and model compatibility

## Integration

### API Integration
The benchmark results can be integrated into your CI/CD pipeline:

```bash
# Run benchmark and check performance thresholds
python benchmark_model.py --iterations 100
python check_performance_thresholds.py benchmark_results.json
```

### Monitoring
Use the JSON output to track performance over time:

```python
import json

with open('benchmark_results.json', 'r') as f:
    results = json.load(f)

# Extract key metrics
for device, device_results in results.items():
    best_result = max(device_results, key=lambda x: x['throughput'])
    print(f"{device}: {best_result['throughput']:.2f} samples/sec")
```

## Development

### Adding New Metrics
To add custom metrics:

1. Modify the `BenchmarkResult` dataclass
2. Update the benchmark measurement logic
3. Add to the results serialization

### Custom Devices
To add support for new devices:

1. Add device name to `test_devices` list
2. Add device-specific configuration in `setup_models()`
3. Handle device-specific constraints in `run_single_benchmark()`

## Support

For issues or questions:
1. Check the log file `benchmark_results.log` for detailed error messages
2. Verify all dependencies are installed correctly
3. Ensure your OpenVINO installation supports your target devices

## License

This benchmarking suite is part of the Verilog Error Locator project. 