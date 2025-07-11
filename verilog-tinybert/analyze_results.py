#!/usr/bin/env python3
"""
Benchmark Results Analysis Script
================================

This script demonstrates how to analyze and visualize benchmark results
from the Verilog Error Locator model performance tests.
"""

import json
import sys
import argparse
from typing import Dict, List, Any
import matplotlib.pyplot as plt
import pandas as pd

def load_results(filename: str) -> Dict[str, List[Dict[str, Any]]]:
    """Load benchmark results from JSON file"""
    try:
        with open(filename, 'r') as f:
            results = json.load(f)
        return results
    except FileNotFoundError:
        print(f"Error: Results file '{filename}' not found")
        print("Please run the benchmark first using: python benchmark_model.py")
        sys.exit(1)
    except json.JSONDecodeError:
        print(f"Error: Invalid JSON in '{filename}'")
        sys.exit(1)

def analyze_performance(results: Dict[str, List[Dict[str, Any]]]):
    """Analyze performance metrics across devices"""
    print("Performance Analysis")
    print("=" * 50)
    
    # Find best performing configuration for each device
    best_configs = {}
    for device, device_results in results.items():
        if device_results:
            best = max(device_results, key=lambda x: x['throughput'])
            best_configs[device] = best
    
    # Sort by throughput
    sorted_devices = sorted(best_configs.items(), key=lambda x: x[1]['throughput'], reverse=True)
    
    print("\nBest Performance by Device:")
    print("-" * 40)
    for device, config in sorted_devices:
        print(f"{device:8} - {config['throughput']:8.2f} samples/sec "
              f"(batch_size={config['batch_size']}, "
              f"latency={config['avg_latency']*1000:.1f}ms)")
    
    # Performance ratios
    if len(sorted_devices) > 1:
        baseline = sorted_devices[-1][1]['throughput']  # Slowest device
        print(f"\nPerformance Ratios (vs {sorted_devices[-1][0]}):")
        print("-" * 40)
        for device, config in sorted_devices:
            ratio = config['throughput'] / baseline
            print(f"{device:8} - {ratio:.2f}x faster")

def analyze_scaling(results: Dict[str, List[Dict[str, Any]]]):
    """Analyze batch size scaling characteristics"""
    print(f"\nBatch Size Scaling Analysis")
    print("=" * 50)
    
    for device, device_results in results.items():
        if not device_results:
            continue
            
        print(f"\n{device} Scaling:")
        print("-" * 30)
        
        # Sort by batch size
        sorted_results = sorted(device_results, key=lambda x: x['batch_size'])
        
        prev_throughput = None
        for result in sorted_results:
            batch_size = result['batch_size']
            throughput = result['throughput']
            
            scaling_info = ""
            if prev_throughput:
                scaling_factor = throughput / prev_throughput
                scaling_info = f"(+{scaling_factor:.2f}x)"
            
            print(f"  Batch {batch_size:2d}: {throughput:8.2f} samples/sec {scaling_info}")
            prev_throughput = throughput

def analyze_efficiency(results: Dict[str, List[Dict[str, Any]]]):
    """Analyze efficiency metrics"""
    print(f"\nEfficiency Analysis")
    print("=" * 50)
    
    for device, device_results in results.items():
        if not device_results:
            continue
            
        print(f"\n{device} Efficiency:")
        print("-" * 30)
        
        # Calculate samples per second per sample in batch
        for result in device_results:
            batch_size = result['batch_size']
            throughput = result['throughput']
            efficiency = throughput / batch_size  # Throughput per sample
            
            memory_used = result.get('memory_usage', {}).get('current_rss_mb', 0)
            
            print(f"  Batch {batch_size:2d}: {efficiency:6.2f} samples/sec/sample, "
                  f"Memory: {memory_used:6.1f}MB")

def create_performance_chart(results: Dict[str, List[Dict[str, Any]]], output_file: str = "performance_chart.png"):
    """Create performance visualization chart"""
    try:
        plt.figure(figsize=(12, 8))
        
        # Plot 1: Throughput vs Batch Size
        plt.subplot(2, 2, 1)
        for device, device_results in results.items():
            if device_results:
                batch_sizes = [r['batch_size'] for r in device_results]
                throughputs = [r['throughput'] for r in device_results]
                plt.plot(batch_sizes, throughputs, marker='o', label=device)
        
        plt.xlabel('Batch Size')
        plt.ylabel('Throughput (samples/sec)')
        plt.title('Throughput vs Batch Size')
        plt.legend()
        plt.grid(True, alpha=0.3)
        
        # Plot 2: Latency vs Batch Size
        plt.subplot(2, 2, 2)
        for device, device_results in results.items():
            if device_results:
                batch_sizes = [r['batch_size'] for r in device_results]
                latencies = [r['avg_latency'] * 1000 for r in device_results]  # Convert to ms
                plt.plot(batch_sizes, latencies, marker='s', label=device)
        
        plt.xlabel('Batch Size')
        plt.ylabel('Average Latency (ms)')
        plt.title('Latency vs Batch Size')
        plt.legend()
        plt.grid(True, alpha=0.3)
        
        # Plot 3: Memory Usage vs Batch Size
        plt.subplot(2, 2, 3)
        for device, device_results in results.items():
            if device_results:
                batch_sizes = [r['batch_size'] for r in device_results]
                memory_usage = [r.get('memory_usage', {}).get('current_rss_mb', 0) for r in device_results]
                plt.plot(batch_sizes, memory_usage, marker='^', label=device)
        
        plt.xlabel('Batch Size')
        plt.ylabel('Memory Usage (MB)')
        plt.title('Memory Usage vs Batch Size')
        plt.legend()
        plt.grid(True, alpha=0.3)
        
        # Plot 4: Efficiency (samples/sec per batch element)
        plt.subplot(2, 2, 4)
        for device, device_results in results.items():
            if device_results:
                batch_sizes = [r['batch_size'] for r in device_results]
                efficiency = [r['throughput'] / r['batch_size'] for r in device_results]
                plt.plot(batch_sizes, efficiency, marker='d', label=device)
        
        plt.xlabel('Batch Size')
        plt.ylabel('Efficiency (samples/sec/sample)')
        plt.title('Processing Efficiency')
        plt.legend()
        plt.grid(True, alpha=0.3)
        
        plt.tight_layout()
        plt.savefig(output_file, dpi=300, bbox_inches='tight')
        print(f"\nPerformance chart saved to: {output_file}")
        
    except ImportError:
        print("Warning: matplotlib not available, skipping chart generation")
        print("Install matplotlib with: pip install matplotlib")

def generate_report(results: Dict[str, List[Dict[str, Any]]], output_file: str = "performance_report.txt"):
    """Generate a comprehensive performance report"""
    with open(output_file, 'w') as f:
        f.write("Verilog Error Locator - Performance Benchmark Report\n")
        f.write("=" * 55 + "\n\n")
        
        # Summary
        f.write("EXECUTIVE SUMMARY\n")
        f.write("-" * 20 + "\n")
        
        total_configs = sum(len(device_results) for device_results in results.values())
        f.write(f"Total configurations tested: {total_configs}\n")
        f.write(f"Devices tested: {', '.join(results.keys())}\n\n")
        
        # Best performance
        best_overall = None
        best_throughput = 0
        
        for device, device_results in results.items():
            if device_results:
                best_device = max(device_results, key=lambda x: x['throughput'])
                if best_device['throughput'] > best_throughput:
                    best_throughput = best_device['throughput']
                    best_overall = (device, best_device)
        
        if best_overall:
            device, config = best_overall
            f.write(f"Best performance: {device} - {config['throughput']:.2f} samples/sec\n")
            f.write(f"Optimal batch size: {config['batch_size']}\n")
            f.write(f"Latency at optimal: {config['avg_latency']*1000:.2f}ms\n\n")
        
        # Detailed results
        f.write("DETAILED RESULTS\n")
        f.write("-" * 20 + "\n\n")
        
        for device, device_results in results.items():
            f.write(f"{device} Results:\n")
            f.write("-" * 15 + "\n")
            
            if not device_results:
                f.write("  No results available\n\n")
                continue
            
            f.write(f"{'Batch':<6} {'Throughput':<12} {'Latency':<10} {'Memory':<8} {'Success':<8}\n")
            f.write(f"{'Size':<6} {'(samp/sec)':<12} {'(ms)':<10} {'(MB)':<8} {'Rate':<8}\n")
            f.write("-" * 50 + "\n")
            
            for result in sorted(device_results, key=lambda x: x['batch_size']):
                f.write(f"{result['batch_size']:<6} "
                       f"{result['throughput']:<12.2f} "
                       f"{result['avg_latency']*1000:<10.2f} "
                       f"{result.get('memory_usage', {}).get('current_rss_mb', 0):<8.1f} "
                       f"{result['success_rate']*100:<8.1f}\n")
            
            f.write("\n")
        
        # Recommendations
        f.write("RECOMMENDATIONS\n")
        f.write("-" * 15 + "\n")
        
        if best_overall:
            device, config = best_overall
            f.write(f"• For maximum throughput: Use {device} with batch size {config['batch_size']}\n")
        
        # Find lowest latency
        lowest_latency = float('inf')
        lowest_latency_config = None
        
        for device, device_results in results.items():
            for result in device_results:
                if result['avg_latency'] < lowest_latency:
                    lowest_latency = result['avg_latency']
                    lowest_latency_config = (device, result)
        
        if lowest_latency_config:
            device, config = lowest_latency_config
            f.write(f"• For lowest latency: Use {device} with batch size {config['batch_size']} "
                   f"({config['avg_latency']*1000:.2f}ms)\n")
        
        # Memory efficiency
        lowest_memory = float('inf')
        lowest_memory_config = None
        
        for device, device_results in results.items():
            for result in device_results:
                memory = result.get('memory_usage', {}).get('current_rss_mb', float('inf'))
                if memory < lowest_memory:
                    lowest_memory = memory
                    lowest_memory_config = (device, result)
        
        if lowest_memory_config:
            device, config = lowest_memory_config
            f.write(f"• For memory efficiency: Use {device} with batch size {config['batch_size']} "
                   f"({config.get('memory_usage', {}).get('current_rss_mb', 0):.1f}MB)\n")
    
    print(f"\nDetailed report saved to: {output_file}")

def main():
    parser = argparse.ArgumentParser(description='Analyze benchmark results')
    parser.add_argument('results_file', help='JSON file containing benchmark results')
    parser.add_argument('--chart', action='store_true', help='Generate performance chart')
    parser.add_argument('--report', action='store_true', help='Generate detailed report')
    parser.add_argument('--all', action='store_true', help='Generate all outputs')
    
    args = parser.parse_args()
    
    # Load results
    results = load_results(args.results_file)
    
    # Perform analysis
    analyze_performance(results)
    analyze_scaling(results)
    analyze_efficiency(results)
    
    # Generate outputs
    if args.chart or args.all:
        create_performance_chart(results)
    
    if args.report or args.all:
        generate_report(results)
    
    print("\nAnalysis complete!")

if __name__ == "__main__":
    main() 