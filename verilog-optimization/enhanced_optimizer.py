#!/usr/bin/env python3
"""
增强版优化器 - 支持自动早停和自适应迭代次数
"""

import optuna
import time
from typing import List, Optional

class SmartOptimizer:
    """智能优化器，支持自动早停"""
    
    def __init__(self, patience: int = 20, min_improvement: float = 0.01):
        """
        patience: 连续多少次试验没有改进就停止
        min_improvement: 最小改进阈值
        """
        self.patience = patience
        self.min_improvement = min_improvement
        self.best_values = []
        self.no_improvement_count = 0
        
    def should_stop(self, current_best: float) -> bool:
        """判断是否应该早停"""
        if len(self.best_values) == 0:
            self.best_values.append(current_best)
            return False
            
        last_best = self.best_values[-1]
        improvement = (last_best - current_best) / max(abs(last_best), 1e-8)
        
        if improvement >= self.min_improvement:
            # 有显著改进
            self.no_improvement_count = 0
            self.best_values.append(current_best)
        else:
            # 没有显著改进
            self.no_improvement_count += 1
            
        return self.no_improvement_count >= self.patience

def optimize_with_early_stopping(objective_func, max_trials: int = 200, 
                                patience: int = 20, timeout: int = 1800):
    """
    带早停的优化
    max_trials: 最大试验次数
    patience: 耐心值（连续无改进次数）
    timeout: 最大运行时间（秒）
    """
    print(f"🚀 开始智能优化 (最大{max_trials}次试验, {patience}次无改进自动停止)")
    
    optimizer = SmartOptimizer(patience=patience)
    study = optuna.create_study(direction="minimize",
                               sampler=optuna.samplers.TPESampler())
    
    start_time = time.time()
    trial_count = 0
    
    def smart_objective(trial):
        nonlocal trial_count
        trial_count += 1
        
        result = objective_func(trial)
        current_best = study.best_value if study.best_trial else float('inf')
        
        # 检查早停条件
        elapsed_time = time.time() - start_time
        
        print(f"试验 {trial_count}/{max_trials}: 当前值={result:.2f}, "
              f"最佳值={current_best:.2f}, 用时={elapsed_time:.1f}s")
        
        # 检查各种停止条件
        if elapsed_time > timeout:
            print(f"⏱️  达到时间限制 ({timeout}s)")
            study.stop()
        elif trial_count >= max_trials:
            print(f"🔢 达到最大试验次数 ({max_trials})")
            study.stop()
        elif optimizer.should_stop(current_best):
            print(f"🎯 连续{patience}次无显著改进，自动停止")
            study.stop()
            
        return result
    
    try:
        study.optimize(smart_objective, n_trials=max_trials, 
                      show_progress_bar=True, timeout=timeout)
    except KeyboardInterrupt:
        print("🛑 用户中断优化")
    
    elapsed_time = time.time() - start_time
    
    print(f"\n📊 优化完成:")
    print(f"   🔢 总试验次数: {trial_count}")
    print(f"   ⏱️  总用时: {elapsed_time:.1f} 秒")
    print(f"   🎯 最佳值: {study.best_value:.4f}")
    print(f"   💡 平均每次试验: {elapsed_time/trial_count:.1f} 秒")
    
    return study

def auto_suggest_trials(design_size: int, time_budget: int = 600) -> int:
    """
    根据设计大小和时间预算自动建议试验次数
    design_size: 设计行数
    time_budget: 时间预算（秒）
    """
    # 估算每次试验的时间（基于设计复杂度）
    if design_size < 50:
        time_per_trial = 2   # 简单设计2秒/次
    elif design_size < 200:
        time_per_trial = 5   # 中等设计5秒/次  
    elif design_size < 500:
        time_per_trial = 10  # 复杂设计10秒/次
    else:
        time_per_trial = 20  # 超大设计20秒/次
    
    suggested_trials = min(200, max(20, time_budget // time_per_trial))
    
    print(f"📋 自动建议:")
    print(f"   📏 设计规模: {design_size} 行")
    print(f"   ⏱️  时间预算: {time_budget} 秒")
    print(f"   🔢 建议试验次数: {suggested_trials}")
    print(f"   ⚡ 预计每次试验: {time_per_trial} 秒")
    
    return suggested_trials

# 使用示例
if __name__ == "__main__":
    print("🧪 智能优化器示例")
    
    # 模拟优化函数
    def dummy_objective(trial):
        import random
        time.sleep(0.1)  # 模拟优化时间
        return random.random() + 0.001 * trial.number  # 随时间递减
    
    # 自动建议试验次数
    design_lines = 150
    suggested = auto_suggest_trials(design_lines, time_budget=300)  # 5分钟预算
    
    # 运行智能优化
    study = optimize_with_early_stopping(
        dummy_objective, 
        max_trials=suggested,
        patience=10,
        timeout=300
    ) 