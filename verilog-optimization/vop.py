#!/usr/bin/env python3
"""
bo_logic_opt.py – Bayesian‑Optimisation Logic Optimiser (Ubuntu 22.04‑friendly)
--------------------------------------------------------------------------
* Accepts a Verilog RTL file (or falls back to a built‑in 8‑bit accumulator).
* Uses **Yosys 0.20+** to emit optimized netlists with multiple strategies.
* Runs **Optuna** (TPE = Bayesian Opt) to search optimization sequences.
* Outputs the best sequence, QoR, and readable optimised Verilog.

Quick start (fresh Ubuntu 22.04):
```bash
sudo apt update && sudo apt install -y git build-essential python3-venv \
    yosys verilator libreadline-dev libncurses5-dev
# Build modern ABC:
 git clone https://github.com/berkeley-abc/abc && cd abc && make -j$(nproc) && \
 sudo cp abc /usr/local/bin && cd ..

python3 -m venv venv && source venv/bin/activate
pip install --upgrade pip optuna

python bo_logic_opt.py            # run built‑in sample
python bo_logic_opt.py my.v --top my_top -n 100 -l 8 --strategy readable
```
"""
from __future__ import annotations

import argparse
import re
import subprocess
import tempfile
from pathlib import Path
from typing import List, Optional
from enum import Enum

import optuna

class OptimizationStrategy(Enum):
    AIG_BASED = "aig"          # Original AIG-based (compact but unreadable)
    READABLE = "readable"       # Preserve high-level structures  
    BALANCED = "balanced"       # Balance between size and readability
    YOSYS_ONLY = "yosys_only"   # Use only Yosys optimizations
    MINIMAL = "minimal"         # Minimal optimization, preserve RTL structure

# ───────────────────────── Built‑in sample RTL ────────────────────────────
SAMPLE_RTL = """
module sample_adder (
    input  [7:0] a,
    input  [7:0] b,
    input  [7:0] c,
    output [7:0] sum,
    output [7:0] product_low
);
    assign sum = a + b + c;
    assign product_low = (a * b) & 8'hFF;
endmodule
"""

# ───────────────────────── Configuration ─────────────────────────────────
PASS_CANDIDATES = [
    "",  # NOP placeholder
    "balance", "rewrite", "rewrite -z",
    "resub", "resub -K 6",
    "dc2", "dch", "resyn2",
]

# Enhanced pass candidates for readable optimization
YOSYS_PASS_CANDIDATES = [
    "",  # NOP placeholder
    "opt",
    "opt_expr",
    "opt_merge", 
    "opt_clean",
    "opt_dff",      # 优化触发器（如果有）
    "alumacc",      # Recognize arithmetic patterns
    "share",        # Share resources
    "wreduce",      # Reduce word size
]

# Minimal optimization passes that preserve structure
MINIMAL_PASS_CANDIDATES = [
    "",             # NOP placeholder
    "opt_expr",     # 表达式优化
    "opt_clean",    # 清理未使用信号
    "wreduce",      # 位宽约简
    "opt_merge",    # 合并相同逻辑
]

DELAY_WEIGHT_DEFAULT = 0.1
ABC_TIMEOUT = 60  # sec per call

# ───────────────────────── Shell helper ─────────────────────────────────

def sh(cmd: str, timeout: int = ABC_TIMEOUT) -> str:
    """Run *cmd* in shell, return stdout, raise on error (stdout attached)."""
    proc = subprocess.run(cmd, shell=True, stdout=subprocess.PIPE,
                          stderr=subprocess.STDOUT, timeout=timeout, text=True)
    if proc.returncode:
        raise RuntimeError(f"Command failed: {cmd}\n---\n{proc.stdout}")
    return proc.stdout

# ───────────────────────── Different synthesis strategies ──────────────────

def yosys_to_aig(verilog: str, out_aig: str, top: Optional[str] = None):
    """Original AIG-based synthesis (compact but unreadable)"""
    if not Path(verilog).exists():
        raise FileNotFoundError(verilog)
    top_cmd = f"-top {top}" if top else ""
    yosys_script = (
        f"read_verilog {verilog}; "
        f"hierarchy -check {top_cmd}; "
        f"synth -flatten -noabc {top_cmd}; "   # generic synth, keep gates
        f"opt; clean; aigmap; opt; clean; "     # map to $and/$not only
        f"write_aiger {out_aig}"
    )
    sh(f"yosys -q -p \"{yosys_script}\"")

def yosys_readable_synth(verilog: str, out_v: str, top: Optional[str] = None):
    """Readable synthesis that preserves high-level structures"""
    if not Path(verilog).exists():
        raise FileNotFoundError(verilog)
    top_cmd = f"-top {top}" if top else ""
    yosys_script = (
        f"read_verilog {verilog}; "
        f"hierarchy -check {top_cmd}; "
        f"proc; opt; "                          # Process generation and basic opt
        f"alumacc; opt; "                       # Recognize arithmetic patterns
        f"memory; opt; "                        # Memory optimization
        f"techmap; opt; "                       # Technology mapping
        f"abc -dff; "                           # ABC optimization with flip-flops
        f"opt; clean; "                         # Final cleanup
        f"write_verilog -noattr {out_v}"        # Write without attributes
    )
    sh(f"yosys -q -p \"{yosys_script}\"")

def yosys_balanced_synth(verilog: str, out_v: str, passes: List[str], top: Optional[str] = None):
    """Balanced synthesis with configurable passes"""
    if not Path(verilog).exists():
        raise FileNotFoundError(verilog)
    top_cmd = f"-top {top}" if top else ""
    
    # Build pass sequence
    pass_seq = "; ".join(p for p in passes if p)
    if not pass_seq:
        pass_seq = "opt"
    
    yosys_script = (
        f"read_verilog {verilog}; "
        f"hierarchy -check {top_cmd}; "
        f"proc; "                               # Process generation
        f"{pass_seq}; "                         # Custom optimization passes
        f"alumacc; "                            # Recognize arithmetic
        f"abc -liberty /dev/null; "             # ABC optimization
        f"opt; clean; "                         # Final cleanup
        f"write_verilog -noattr {out_v}"        # Write clean Verilog
    )
    sh(f"yosys -q -p \"{yosys_script}\"")

def yosys_minimal_synth(verilog: str, out_v: str, passes: List[str], top: Optional[str] = None):
    """Minimal synthesis that preserves RTL structure - NO techmap, NO abc"""
    if not Path(verilog).exists():
        raise FileNotFoundError(verilog)
    top_cmd = f"-top {top}" if top else ""
    
    # Build pass sequence
    pass_seq = "; ".join(p for p in passes if p)
    if not pass_seq:
        pass_seq = "opt_expr; opt_clean"  # Basic cleanup only
    
    yosys_script = (
        f"read_verilog {verilog}; "
        f"hierarchy -check {top_cmd}; "
        f"proc; "                               # Process generation only
        f"{pass_seq}; "                         # Minimal optimization passes
        f"opt_clean; "                          # Final cleanup
        f"write_verilog -noattr {out_v}"        # Write clean Verilog (NO techmap, NO abc)
    )
    sh(f"yosys -q -p \"{yosys_script}\"")

# ───────────────────────── Utils ───────────────────────────────────────

def seq_to_cmd(seq: List[str]) -> str:
    return "; ".join(p for p in seq if p)

# ───────────────────────── QoR evaluation with multiple strategies ───────

def evaluate_aig(golden: Path, seq: List[str], w_delay: float, work: Path) -> float:
    """Original AIG-based evaluation"""
    trial = work / "trial.aig"
    try:
        sh(f"abc -q \"read {golden}; {seq_to_cmd(seq)}; write {trial}\"")
        if "UNSAT" in sh(f"abc -q \"cec {golden} {trial}\""):
            return 1e9  # functional mismatch
        
        stats = sh(f"abc -q \"read {trial}; ps\"")
        
        # Debug first failure to see actual ABC output format
        if not hasattr(evaluate_aig, '_printed_stats'):
            print(f"[DEBUG] ABC stats output: {stats}")
            evaluate_aig._printed_stats = True
        
        # Try multiple regex patterns for different ABC output formats
        cells_match = (re.search(r"and\s*=\s*(\d+)", stats) or 
                      re.search(r"(\d+)\s+and", stats) or
                      re.search(r"gates?\s*:\s*(\d+)", stats))
        
        levels_match = (re.search(r"lev\s*=\s*(\d+)", stats) or
                       re.search(r"level\s*=\s*(\d+)", stats) or
                       re.search(r"depth\s*=\s*(\d+)", stats))
        
        if not cells_match or not levels_match:
            return 1e9
            
        cells = int(cells_match.group(1))
        levels = int(levels_match.group(1))
        return cells + w_delay * levels
        
    except Exception as e:
        if not hasattr(evaluate_aig, '_printed_error'):
            print(f"[DEBUG] First ABC failure: {e}")
            evaluate_aig._printed_error = True
        return 1e9

def evaluate_yosys(verilog: Path, passes: List[str], w_delay: float, work: Path, top: Optional[str] = None) -> float:
    """Evaluate using Yosys-only optimization"""
    try:
        trial_v = work / "trial.v"
        yosys_balanced_synth(str(verilog), str(trial_v), passes, top)
        
        # Get statistics from Yosys
        stats_script = (
            f"read_verilog {trial_v}; "
            f"hierarchy -check; "
            f"stat"
        )
        stats = sh(f"yosys -q -p \"{stats_script}\"")
        
        # Parse Yosys statistics
        cells_match = re.search(r"Number of cells:\s*(\d+)", stats)
        # For delay estimation, count logic levels (approximate)
        levels_match = re.search(r"Estimated number of logic levels:\s*(\d+)", stats)
        
        if not cells_match:
            # Fallback: count basic gates
            and_gates = len(re.findall(r'\$and\b', stats))
            or_gates = len(re.findall(r'\$or\b', stats))
            cells = and_gates + or_gates + 1  # +1 to avoid zero
        else:
            cells = int(cells_match.group(1))
            
        if not levels_match:
            levels = max(1, cells // 10)  # Rough estimate
        else:
            levels = int(levels_match.group(1))
            
        return cells + w_delay * levels
        
    except Exception as e:
        if not hasattr(evaluate_yosys, '_printed_error'):
            print(f"[DEBUG] First Yosys evaluation failure: {e}")
            evaluate_yosys._printed_error = True
        return 1e9

def evaluate_minimal(verilog: Path, passes: List[str], w_delay: float, work: Path, top: Optional[str] = None) -> float:
    """Evaluate using minimal optimization - focus on preserving structure"""
    try:
        trial_v = work / "trial.v"
        yosys_minimal_synth(str(verilog), str(trial_v), passes, top)
        
        # Read the generated Verilog and count lines/complexity
        with open(trial_v, 'r') as f:
            content = f.read()
        
        # Simple metrics for RTL-level optimization
        lines = len(content.splitlines())
        wire_count = content.count('wire ')
        assign_count = content.count('assign ')
        
        # Penalty for wire explosion (sign of gate-level decomposition)
        wire_penalty = max(0, wire_count - 10) * 5  # Heavy penalty for many wires
        
        # Reward for keeping assign statements (sign of RTL preservation)
        assign_reward = max(0, 10 - assign_count) * 2  # Prefer fewer, cleaner assigns
        
        # Basic complexity score
        complexity = lines + wire_penalty + assign_reward
        
        # Add minimal delay estimate (just use line count as proxy)
        levels = max(1, lines // 20)
        
        return complexity + w_delay * levels
        
    except Exception as e:
        if not hasattr(evaluate_minimal, '_printed_error'):
            print(f"[DEBUG] First minimal evaluation failure: {e}")
            evaluate_minimal._printed_error = True
        return 1e9

# ───────────────────────── Enhanced optimization function ──────────────────

def optimise(rtl: Path, top: Optional[str], trials: int, seq_len: int,
             w_delay: float, out_dir: Path, strategy: OptimizationStrategy = OptimizationStrategy.READABLE):
    out_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"[+] Using optimization strategy: {strategy.value}")
    
    if strategy == OptimizationStrategy.AIG_BASED:
        return optimise_aig_based(rtl, top, trials, seq_len, w_delay, out_dir)
    elif strategy == OptimizationStrategy.READABLE:
        return optimise_readable(rtl, top, trials, seq_len, w_delay, out_dir)
    elif strategy == OptimizationStrategy.BALANCED:
        return optimise_balanced(rtl, top, trials, seq_len, w_delay, out_dir)
    elif strategy == OptimizationStrategy.YOSYS_ONLY:
        return optimise_yosys_only(rtl, top, trials, seq_len, w_delay, out_dir)
    elif strategy == OptimizationStrategy.MINIMAL:
        return optimise_minimal(rtl, top, trials, seq_len, w_delay, out_dir)

def optimise_aig_based(rtl: Path, top: Optional[str], trials: int, seq_len: int,
                      w_delay: float, out_dir: Path):
    """Original AIG-based optimization"""
    golden = out_dir / "golden.aig"
    
    # Check ABC installation
    try:
        abc_version = sh("abc -q \"version\"")
        print(f"[+] ABC version: {abc_version.strip()}")
    except Exception as e:
        print(f"✗ ABC not found or not working: {e}")
        print("Please install ABC: https://github.com/berkeley-abc/abc")
        return
    
    print("[+] Yosys: RTL → AIG …")
    yosys_to_aig(str(rtl), str(golden), top)

    print(f"[+] Optuna search: trials={trials}, seq_len={seq_len}")

    def objective(trial):
        seq = [trial.suggest_categorical(f"p{i}", PASS_CANDIDATES) for i in range(seq_len)]
        return evaluate_aig(golden, seq, w_delay, out_dir)

    study = optuna.create_study(direction="minimize",
                                sampler=optuna.samplers.TPESampler())
    study.optimize(objective, n_trials=trials, show_progress_bar=True)

    best_seq = [v for k, v in sorted(study.best_trial.params.items()) if v]
    print(f"\n★ Best cost : {study.best_value}")
    print("★ Best seq  :", seq_to_cmd(best_seq) or "<empty>")

    if study.best_value >= 1e9:
        print("✗ All optimization trials failed! Check ABC installation or try simpler passes.")
        return

    best_aig = out_dir / "best.aig"
    best_v   = out_dir / "best_opt.v"
    sh(f"abc -q \"read {golden}; {seq_to_cmd(best_seq)}; write {best_aig}\"")
    sh(f"yosys -q -p \"read_aiger {best_aig}; write_verilog {best_v}\"")
    print(f"[✓] Optimised Verilog: {best_v}")
    print(f"[!] Warning: AIG-based output may be difficult to read")

def optimise_readable(rtl: Path, top: Optional[str], trials: int, seq_len: int,
                     w_delay: float, out_dir: Path):
    """Optimization focused on readability"""
    print("[+] Readable synthesis optimization...")
    
    # First, create a readable baseline
    baseline_v = out_dir / "baseline_readable.v"
    yosys_readable_synth(str(rtl), str(baseline_v), top)
    
    # Then optimize using Yosys passes
    def objective(trial):
        seq = [trial.suggest_categorical(f"p{i}", YOSYS_PASS_CANDIDATES) for i in range(seq_len)]
        return evaluate_yosys(rtl, seq, w_delay, out_dir, top)

    study = optuna.create_study(direction="minimize",
                                sampler=optuna.samplers.TPESampler())
    study.optimize(objective, n_trials=trials, show_progress_bar=True)

    best_seq = [v for k, v in sorted(study.best_trial.params.items()) if v]
    print(f"\n★ Best cost : {study.best_value}")
    print("★ Best seq  :", seq_to_cmd(best_seq) or "<empty>")

    if study.best_value >= 1e9:
        print("✗ All optimization trials failed!")
        return

    # Generate final optimized readable Verilog
    best_v = out_dir / "best_opt.v"
    yosys_balanced_synth(str(rtl), str(best_v), best_seq, top)
    print(f"[✓] Readable optimised Verilog: {best_v}")
    print(f"[✓] Baseline readable version: {baseline_v}")

def optimise_balanced(rtl: Path, top: Optional[str], trials: int, seq_len: int,
                     w_delay: float, out_dir: Path):
    """Balanced optimization between size and readability"""
    print("[+] Balanced optimization strategy...")
    
    # Use both ABC and Yosys passes
    combined_passes = PASS_CANDIDATES + YOSYS_PASS_CANDIDATES
    
    def objective(trial):
        seq = [trial.suggest_categorical(f"p{i}", combined_passes) for i in range(seq_len)]
        # Try to evaluate with both methods and take the better result
        yosys_score = evaluate_yosys(rtl, seq, w_delay, out_dir, top)
        return yosys_score

    study = optuna.create_study(direction="minimize",
                                sampler=optuna.samplers.TPESampler())
    study.optimize(objective, n_trials=trials, show_progress_bar=True)

    best_seq = [v for k, v in sorted(study.best_trial.params.items()) if v]
    print(f"\n★ Best cost : {study.best_value}")
    print("★ Best seq  :", seq_to_cmd(best_seq) or "<empty>")

    if study.best_value >= 1e9:
        print("✗ All optimization trials failed!")
        return

    best_v = out_dir / "best_opt.v"
    yosys_balanced_synth(str(rtl), str(best_v), best_seq, top)
    print(f"[✓] Balanced optimised Verilog: {best_v}")

def optimise_yosys_only(rtl: Path, top: Optional[str], trials: int, seq_len: int,
                       w_delay: float, out_dir: Path):
    """Pure Yosys optimization without ABC"""
    print("[+] Yosys-only optimization...")
    
    def objective(trial):
        seq = [trial.suggest_categorical(f"p{i}", YOSYS_PASS_CANDIDATES) for i in range(seq_len)]
        return evaluate_yosys(rtl, seq, w_delay, out_dir, top)

    study = optuna.create_study(direction="minimize",
                                sampler=optuna.samplers.TPESampler())
    study.optimize(objective, n_trials=trials, show_progress_bar=True)

    best_seq = [v for k, v in sorted(study.best_trial.params.items()) if v]
    print(f"\n★ Best cost : {study.best_value}")
    print("★ Best seq  :", seq_to_cmd(best_seq) or "<empty>")

    if study.best_value >= 1e9:
        print("✗ All optimization trials failed!")
        return

    best_v = out_dir / "best_opt.v"
    yosys_balanced_synth(str(rtl), str(best_v), best_seq, top)
    print(f"[✓] Yosys-optimised Verilog: {best_v}")

def optimise_minimal(rtl: Path, top: Optional[str], trials: int, seq_len: int,
                    w_delay: float, out_dir: Path):
    """Minimal optimization that preserves RTL structure"""
    print("[+] Minimal optimization - preserving RTL structure...")
    
    # First, create a baseline with zero optimization
    baseline_v = out_dir / "baseline_minimal.v"
    yosys_minimal_synth(str(rtl), str(baseline_v), [""], top)
    print(f"[✓] Baseline (no optimization): {baseline_v}")
    
    # Then try minimal optimizations
    def objective(trial):
        seq = [trial.suggest_categorical(f"p{i}", MINIMAL_PASS_CANDIDATES) for i in range(seq_len)]
        return evaluate_minimal(rtl, seq, w_delay, out_dir, top)

    study = optuna.create_study(direction="minimize",
                                sampler=optuna.samplers.TPESampler())
    study.optimize(objective, n_trials=trials, show_progress_bar=True)

    best_seq = [v for k, v in sorted(study.best_trial.params.items()) if v]
    print(f"\n★ Best cost : {study.best_value}")
    print("★ Best seq  :", seq_to_cmd(best_seq) or "<empty>")

    if study.best_value >= 1e9:
        print("✗ All optimization trials failed! Using baseline.")
        print(f"[✓] Using baseline: {baseline_v}")
        return

    # Generate final optimized minimal Verilog
    best_v = out_dir / "best_opt.v"
    yosys_minimal_synth(str(rtl), str(best_v), best_seq, top)
    print(f"[✓] Minimally optimised Verilog: {best_v}")
    print(f"[i] This should preserve your original RTL structure with minimal changes")

# ───────────────────────── CLI & entry ──────────────────────────────────

def parse_args():
    p = argparse.ArgumentParser(description="Bayesian‑optimise logic synthesis for Verilog designs")
    p.add_argument("verilog", nargs="?", help="Input Verilog (default: built‑in demo)")
    p.add_argument("--top", help="Top module name (if auto fails)")
    p.add_argument("-n", "--n-trials", type=int, default=60)
    p.add_argument("-l", "--seq-len",  type=int, default=6)
    p.add_argument("-w", "--delay-w",  type=float, default=DELAY_WEIGHT_DEFAULT)
    p.add_argument("-o", "--out-dir",  default="bo_out")
    p.add_argument("--strategy", choices=[s.value for s in OptimizationStrategy], 
                   default=OptimizationStrategy.MINIMAL.value,
                   help="Optimization strategy: minimal (preserve RTL), readable (clean), balanced, yosys_only, aig (compact)")
    return p.parse_args()


def main():
    args = parse_args()
    if args.verilog:
        rtl = Path(args.verilog).resolve()
    else:
        tmp = Path(tempfile.mkdtemp(prefix="bo_sample_"))
        rtl = tmp / "sample.v"
        rtl.write_text(SAMPLE_RTL)
        print(f"[i] No RTL provided, using built‑in sample → {rtl}")

    strategy = OptimizationStrategy(args.strategy)
    optimise(rtl, args.top, args.n_trials, args.seq_len,
             args.delay_w, Path(args.out_dir), strategy)


if __name__ == "__main__":
    main()
