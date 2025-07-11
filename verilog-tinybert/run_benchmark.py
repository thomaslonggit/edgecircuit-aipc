#!/usr/bin/env python3
"""
Quick benchmark runner for Verilog Error Locator Model
=====================================================

This script provides pre-configured benchmark scenarios for common use cases.
"""

import os
import sys
import subprocess
import argparse

def run_benchmark(config_name: str, iterations: int = 100):
    """Run benchmark with predefined configurations"""
    
    configs = {
        'quick': {
            'iterations': 50,
            'description': 'Quick benchmark with fewer iterations for fast testing'
        },
        'standard': {
            'iterations': 100,
            'description': 'Standard benchmark with balanced iterations'
        },
        'thorough': {
            'iterations': 300,
            'description': 'Thorough benchmark with many iterations for accurate results'
        },
        'stress': {
            'iterations': 1000,
            'description': 'Stress test with maximum iterations'
        }
    }
    
    if config_name not in configs:
        print(f"Error: Unknown configuration '{config_name}'")
        print("Available configurations:")
        for name, config in configs.items():
            print(f"  {name}: {config['description']}")
        return 1
    
    config = configs[config_name]
    actual_iterations = iterations if iterations != 100 else config['iterations']
    
    print(f"Running {config_name} benchmark...")
    print(f"Description: {config['description']}")
    print(f"Iterations: {actual_iterations}")
    print("-" * 50)
    
    # Run the benchmark
    cmd = [
        sys.executable, 
        'benchmark_model.py',
        '--iterations', str(actual_iterations),
        '--output', f'benchmark_{config_name}_results.json'
    ]
    
    try:
        result = subprocess.run(cmd, check=True)
        print(f"\nBenchmark completed successfully!")
        print(f"Results saved to: benchmark_{config_name}_results.json")
        return 0
    except subprocess.CalledProcessError as e:
        print(f"Benchmark failed with error: {e}")
        return 1

def main():
    parser = argparse.ArgumentParser(description='Run predefined benchmark configurations')
    parser.add_argument('config', choices=['quick', 'standard', 'thorough', 'stress'],
                        help='Benchmark configuration to run')
    parser.add_argument('--iterations', type=int, default=100,
                        help='Override default iterations for the configuration')
    
    args = parser.parse_args()
    
    return run_benchmark(args.config, args.iterations)

if __name__ == "__main__":
    sys.exit(main()) 