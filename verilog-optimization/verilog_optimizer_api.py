#!/usr/bin/env python3
"""
Verilog优化API服务
运行在Ubuntu 22.04上的REST API服务，提供Verilog代码优化功能
"""

import os
import tempfile
import shutil
import asyncio
import time
from pathlib import Path
from typing import Optional, Dict, Any, List
from enum import Enum
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, BackgroundTasks, UploadFile, File
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel, Field, field_validator
import uvicorn

# 导入我们的优化器
from vop import OptimizationStrategy

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('verilog_optimizer_api.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# 全局变量存储临时任务
active_jobs: Dict[str, Dict] = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    logger.info("🚀 Verilog优化API服务启动")
    # 启动时的初始化
    yield
    # 关闭时的清理
    logger.info("🛑 Verilog优化API服务关闭")

app = FastAPI(
    title="Verilog Logic Optimizer API",
    description="基于贝叶斯优化的Verilog RTL逻辑优化服务",
    version="1.0.0",
    lifespan=lifespan
)

# 请求模型
class OptimizationLevel(str, Enum):
    """优化等级枚举"""
    minimal = "minimal"       # 最小优化，保持结构（默认）
    readable = "readable"     # 可读优化，清理代码
    balanced = "balanced"     # 平衡优化
    yosys_only = "yosys_only" # 纯Yosys优化
    aggressive = "aig"        # 激进优化（AIG方法）

class OptimizationRequest(BaseModel):
    """优化请求模型"""
    verilog_code: str = Field(..., description="Verilog RTL代码", min_length=10)
    top_module: Optional[str] = Field(None, description="顶层模块名（自动检测）")
    optimization_level: OptimizationLevel = Field(
        OptimizationLevel.readable, 
        description="优化等级，默认readable（轻量级，可读性好）"
    )
    n_trials: int = Field(30, description="优化试验次数", ge=5, le=500)
    seq_length: int = Field(6, description="优化序列长度", ge=2, le=12)
    delay_weight: float = Field(0.1, description="延迟权重", ge=0.0, le=1.0)
    timeout: int = Field(300, description="超时时间（秒）", ge=30, le=3600)
    
    @field_validator('verilog_code')
    @classmethod
    def validate_verilog_code(cls, v: str) -> str:
        """验证Verilog代码"""
        if 'module' not in v.lower():
            raise ValueError('Verilog代码必须包含module定义')
        return v

class OptimizationResponse(BaseModel):
    """优化响应模型"""
    job_id: str = Field(..., description="任务ID")
    status: str = Field(..., description="任务状态: pending, running, completed, failed")
    message: str = Field(..., description="状态消息")
    optimized_code: Optional[str] = Field(None, description="优化后的Verilog代码")
    baseline_code: Optional[str] = Field(None, description="基线代码（如果有）")
    optimization_stats: Optional[Dict[str, Any]] = Field(None, description="优化统计信息")
    optimization_summary: Optional[str] = Field(None, description="优化总结报告")
    execution_time: Optional[float] = Field(None, description="执行时间（秒）")
    error_details: Optional[str] = Field(None, description="错误详情")

class JobStatus(BaseModel):
    """任务状态模型"""
    job_id: str
    status: str
    progress: Optional[int] = Field(None, description="进度百分比")
    message: str
    created_at: str
    updated_at: str

# 工具函数
def generate_job_id() -> str:
    """生成任务ID"""
    import uuid
    return f"job_{int(time.time())}_{str(uuid.uuid4())[:8]}"

def analyze_verilog_code(verilog_code: str) -> Dict[str, Any]:
    """分析Verilog代码的统计信息"""
    lines = verilog_code.splitlines()
    
    # 基础统计
    total_lines = len(lines)
    non_empty_lines = len([line for line in lines if line.strip()])
    comment_lines = len([line for line in lines if line.strip().startswith('//')])
    code_lines = non_empty_lines - comment_lines
    
    # 信号统计
    wire_count = verilog_code.count('wire ')
    reg_count = verilog_code.count('reg ')
    input_count = verilog_code.count('input ')
    output_count = verilog_code.count('output ')
    
    # 逻辑门统计
    and_gates = verilog_code.count(' and ') + verilog_code.count('&')
    or_gates = verilog_code.count(' or ') + verilog_code.count('|')  
    not_gates = verilog_code.count(' not ') + verilog_code.count('~')
    assign_count = verilog_code.count('assign ')
    
    # 模块信息
    module_count = verilog_code.count('module ')
    always_blocks = verilog_code.count('always ')
    
    return {
        'total_lines': total_lines,
        'code_lines': code_lines,
        'comment_lines': comment_lines,
        'wire_count': wire_count,
        'reg_count': reg_count,
        'input_count': input_count,
        'output_count': output_count,
        'and_gates': and_gates,
        'or_gates': or_gates,
        'not_gates': not_gates,
        'assign_count': assign_count,
        'module_count': module_count,
        'always_blocks': always_blocks
    }

def generate_optimization_summary(
    original_code: str,
    optimized_code: str,
    strategy: str,
    execution_time: float,
    n_trials: int
) -> str:
    """生成优化总结报告"""
    
    # 分析原始代码和优化后代码
    orig_stats = analyze_verilog_code(original_code)
    opt_stats = analyze_verilog_code(optimized_code)
    
    # 计算改进百分比
    def calc_improvement(original, optimized):
        if original == 0:
            return 0
        return round(((original - optimized) / original) * 100, 1)
    
    # 生成总结
    summary_lines = []
    summary_lines.append("🎯 **优化总结报告**")
    summary_lines.append("=" * 40)
    
    # 策略说明
    strategy_goals = {
        'minimal': '最小化修改，保持原始RTL结构，适用于需要保持代码可读性的场景',
        'readable': '清理和优化代码结构，去除冗余信号，提高可读性，适合日常开发',
        'balanced': '在面积和可读性之间取得平衡，适合生产环境',
        'yosys_only': '使用纯Yosys优化，避免门级分解，保持高层次结构',
        'aig': '激进的面积优化，转换为最小的与非门结构，适合面积敏感应用'
    }
    
    goal = strategy_goals.get(strategy, '执行指定优化策略')
    summary_lines.append(f"📋 **优化策略**: {strategy.upper()}")
    summary_lines.append(f"🎯 **优化目标**: {goal}")
    summary_lines.append(f"⚡ **执行时间**: {execution_time:.2f}秒 ({n_trials}次试验)")
    summary_lines.append("")
    
    # 代码结构对比
    summary_lines.append("📊 **代码结构对比**")
    summary_lines.append("```")
    summary_lines.append(f"{'指标':<15} {'优化前':<10} {'优化后':<10} {'变化':<10} {'改进':<8}")
    summary_lines.append("-" * 55)
    
    metrics = [
        ('总行数', orig_stats['total_lines'], opt_stats['total_lines']),
        ('代码行数', orig_stats['code_lines'], opt_stats['code_lines']),
        ('wire信号', orig_stats['wire_count'], opt_stats['wire_count']),
        ('reg信号', orig_stats['reg_count'], opt_stats['reg_count']),
        ('assign语句', orig_stats['assign_count'], opt_stats['assign_count']),
        ('always块', orig_stats['always_blocks'], opt_stats['always_blocks'])
    ]
    
    for metric, orig, opt in metrics:
        change = orig - opt
        improvement = calc_improvement(orig, opt)
        change_str = f"{change:+d}" if change != 0 else "0"
        improvement_str = f"{improvement:+.1f}%" if improvement != 0 else "0%"
        summary_lines.append(f"{metric:<15} {orig:<10} {opt:<10} {change_str:<10} {improvement_str:<8}")
    
    summary_lines.append("```")
    summary_lines.append("")
    
    # 主要改进
    summary_lines.append("✨ **主要改进**")
    improvements = []
    
    line_reduction = orig_stats['total_lines'] - opt_stats['total_lines']
    if line_reduction > 0:
        improvements.append(f"• 减少了 {line_reduction} 行代码 ({calc_improvement(orig_stats['total_lines'], opt_stats['total_lines'])}%)")
    
    wire_reduction = orig_stats['wire_count'] - opt_stats['wire_count']
    if wire_reduction > 0:
        improvements.append(f"• 消除了 {wire_reduction} 个冗余信号线")
    
    assign_change = orig_stats['assign_count'] - opt_stats['assign_count']
    if assign_change > 0:
        improvements.append(f"• 简化了 {assign_change} 个assign语句")
    elif assign_change < 0:
        improvements.append(f"• 展开了复杂逻辑，增加了 {abs(assign_change)} 个assign语句")
    
    # 根据策略添加特定改进说明
    if strategy == 'minimal':
        improvements.append("• 保持了原始RTL结构的完整性")
        improvements.append("• 最小化了对原代码的修改")
    elif strategy == 'readable':
        improvements.append("• 提高了代码的可读性和维护性")
        improvements.append("• 清理了冗余的中间信号")
    elif strategy == 'balanced':
        improvements.append("• 在面积和可读性之间取得了良好平衡")
    elif strategy == 'yosys_only':
        improvements.append("• 避免了门级分解，保持了高层次抽象")
    elif strategy == 'aig':
        improvements.append("• 实现了最大程度的面积优化")
        improvements.append("• 转换为最小的逻辑门表示")
    
    if not improvements:
        improvements.append("• 代码结构已经比较优化，无需大幅修改")
    
    for improvement in improvements:
        summary_lines.append(improvement)
    
    summary_lines.append("")
    
    # 建议
    summary_lines.append("💡 **建议**")
    if strategy == 'minimal' and (line_reduction > 5 or wire_reduction > 3):
        summary_lines.append("• 可以尝试 'readable' 策略获得更好的清理效果")
    elif strategy == 'readable' and line_reduction < 2:
        summary_lines.append("• 原代码已经比较简洁，考虑使用 'balanced' 策略")
    elif strategy == 'balanced':
        summary_lines.append("• 如需更激进优化，可尝试 'aig' 策略")
        summary_lines.append("• 如需保持可读性，建议使用 'readable' 策略")
    
    if execution_time > 60:
        summary_lines.append("• 优化时间较长，可以减少试验次数以加快处理")
    
    summary_lines.append("• 建议在仿真环境中验证优化后的功能正确性")
    
    return "\n".join(summary_lines)

async def run_optimization_async(
    job_id: str,
    verilog_code: str,
    top_module: Optional[str],
    optimization_level: OptimizationLevel,
    n_trials: int,
    seq_length: int,
    delay_weight: float,
    timeout: int
):
    """异步运行优化任务"""
    start_time = time.time()
    
    try:
        # 更新任务状态
        active_jobs[job_id]['status'] = 'running'
        active_jobs[job_id]['message'] = '开始优化...'
        active_jobs[job_id]['updated_at'] = time.strftime('%Y-%m-%d %H:%M:%S')
        
        logger.info(f"开始优化任务 {job_id}, 策略: {optimization_level}, 试验次数: {n_trials}")
        
        # 创建临时目录和文件
        with tempfile.TemporaryDirectory(prefix=f"verilog_opt_{job_id}_") as temp_dir:
            temp_dir_path = Path(temp_dir)
            input_file = temp_dir_path / "input.v"
            output_dir = temp_dir_path / "output"
            
            # 写入Verilog文件
            input_file.write_text(verilog_code)
            
            # 执行优化
            active_jobs[job_id]['message'] = f'执行{optimization_level.value}优化中...'
            
            try:
                # 这里需要在子进程中运行，因为原函数是同步的
                import subprocess
                import json
                
                # 创建优化命令
                cmd = [
                    "python", "vop.py",
                    str(input_file),
                    "--strategy", optimization_level.value,
                    "--n-trials", str(n_trials),
                    "--seq-len", str(seq_length),
                    "--delay-w", str(delay_weight),
                    "--out-dir", str(output_dir)
                ]
                
                if top_module:
                    cmd.extend(["--top", top_module])
                
                # 运行优化
                result = subprocess.run(
                    cmd, 
                    capture_output=True, 
                    text=True, 
                    timeout=timeout,
                    cwd=Path(__file__).parent
                )
                
                if result.returncode != 0:
                    raise Exception(f"优化失败: {result.stderr}")
                
                # 读取优化结果
                optimized_code = None
                baseline_code = None
                
                # 查找输出文件
                possible_output_files = [
                    output_dir / "best_opt.v",
                    output_dir / "baseline_readable.v",
                    output_dir / "baseline_minimal.v"
                ]
                
                for output_file in possible_output_files:
                    if output_file.exists():
                        if "best_opt" in output_file.name:
                            optimized_code = output_file.read_text()
                        elif "baseline" in output_file.name:
                            baseline_code = output_file.read_text()
                
                if not optimized_code and baseline_code:
                    optimized_code = baseline_code  # 使用基线作为备用
                
                if not optimized_code:
                    raise Exception("没有找到优化输出文件")
                
                # 分析优化效果
                execution_time = time.time() - start_time
                
                # 使用新的详细分析功能
                orig_stats = analyze_verilog_code(verilog_code)
                opt_stats = analyze_verilog_code(optimized_code)
                
                # 生成增强的统计信息
                optimization_stats = {
                    # 基本对比
                    "original_stats": orig_stats,
                    "optimized_stats": opt_stats,
                    
                    # 关键指标
                    "line_reduction": orig_stats['total_lines'] - opt_stats['total_lines'],
                    "line_reduction_percent": round(((orig_stats['total_lines'] - opt_stats['total_lines']) / orig_stats['total_lines'] * 100), 2) if orig_stats['total_lines'] > 0 else 0,
                    "wire_reduction": orig_stats['wire_count'] - opt_stats['wire_count'],
                    "wire_reduction_percent": round(((orig_stats['wire_count'] - opt_stats['wire_count']) / orig_stats['wire_count'] * 100), 2) if orig_stats['wire_count'] > 0 else 0,
                    
                    # 执行信息
                    "strategy_used": optimization_level.value,
                    "trials_completed": n_trials,
                    "execution_time": execution_time
                }
                
                # 生成优化总结
                optimization_summary = generate_optimization_summary(
                    verilog_code,
                    optimized_code,
                    optimization_level.value,
                    execution_time,
                    n_trials
                )
                
                # 更新任务状态为完成
                active_jobs[job_id].update({
                    'status': 'completed',
                    'message': '优化完成',
                    'optimized_code': optimized_code,
                    'baseline_code': baseline_code,
                    'optimization_stats': optimization_stats,
                    'optimization_summary': optimization_summary,
                    'execution_time': execution_time,
                    'updated_at': time.strftime('%Y-%m-%d %H:%M:%S')
                })
                
                logger.info(f"任务 {job_id} 完成，用时 {execution_time:.2f} 秒")
                
            except subprocess.TimeoutExpired:
                raise Exception(f"优化超时（{timeout}秒）")
            except Exception as e:
                raise Exception(f"优化执行错误: {str(e)}")
                
    except Exception as e:
        error_msg = str(e)
        logger.error(f"任务 {job_id} 失败: {error_msg}")
        
        # 更新任务状态为失败
        active_jobs[job_id].update({
            'status': 'failed',
            'message': '优化失败',
            'error_details': error_msg,
            'execution_time': time.time() - start_time,
            'updated_at': time.strftime('%Y-%m-%d %H:%M:%S')
        })

# API端点
@app.get("/")
async def root():
    """API根端点"""
    return {
        "service": "Verilog Logic Optimizer API",
        "version": "1.0.0",
        "description": "基于贝叶斯优化的Verilog RTL逻辑优化服务",
        "endpoints": {
            "optimize": "POST /optimize - 提交优化任务",
            "status": "GET /status/{job_id} - 查询任务状态",
            "result": "GET /result/{job_id} - 获取优化结果",
            "jobs": "GET /jobs - 查看所有任务",
            "health": "GET /health - 健康检查"
        }
    }

@app.get("/health")
async def health_check():
    """健康检查"""
    return {
        "status": "healthy",
        "timestamp": time.strftime('%Y-%m-%d %H:%M:%S'),
        "active_jobs": len(active_jobs)
    }

@app.post("/optimize", response_model=Dict[str, str])
async def optimize_verilog(
    request: OptimizationRequest,
    background_tasks: BackgroundTasks
):
    """提交Verilog优化任务"""
    
    job_id = generate_job_id()
    
    # 创建任务记录
    active_jobs[job_id] = {
        'job_id': job_id,
        'status': 'pending',
        'message': '任务已提交，等待执行',
        'created_at': time.strftime('%Y-%m-%d %H:%M:%S'),
        'updated_at': time.strftime('%Y-%m-%d %H:%M:%S'),
        'request_params': request.dict()
    }
    
    # 添加后台任务
    background_tasks.add_task(
        run_optimization_async,
        job_id,
        request.verilog_code,
        request.top_module,
        request.optimization_level,
        request.n_trials,
        request.seq_length,
        request.delay_weight,
        request.timeout
    )
    
    logger.info(f"创建优化任务 {job_id}")
    
    return {
        "job_id": job_id,
        "message": "优化任务已提交",
        "status_url": f"/status/{job_id}",
        "result_url": f"/result/{job_id}"
    }

@app.get("/status/{job_id}", response_model=JobStatus)
async def get_job_status(job_id: str):
    """查询任务状态"""
    if job_id not in active_jobs:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    job = active_jobs[job_id]
    return JobStatus(
        job_id=job_id,
        status=job['status'],
        message=job['message'],
        created_at=job['created_at'],
        updated_at=job['updated_at']
    )

@app.get("/result/{job_id}", response_model=OptimizationResponse)
async def get_optimization_result(job_id: str):
    """获取优化结果"""
    if job_id not in active_jobs:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    job = active_jobs[job_id]
    
    return OptimizationResponse(
        job_id=job_id,
        status=job['status'],
        message=job['message'],
        optimized_code=job.get('optimized_code'),
        baseline_code=job.get('baseline_code'),
        optimization_stats=job.get('optimization_stats'),
        optimization_summary=job.get('optimization_summary'),
        execution_time=job.get('execution_time'),
        error_details=job.get('error_details')
    )

@app.get("/jobs")
async def list_jobs():
    """列出所有任务"""
    return {
        "total_jobs": len(active_jobs),
        "jobs": [
            {
                "job_id": job_id,
                "status": job['status'],
                "created_at": job['created_at'],
                "updated_at": job['updated_at']
            }
            for job_id, job in active_jobs.items()
        ]
    }

@app.delete("/job/{job_id}")
async def delete_job(job_id: str):
    """删除任务记录"""
    if job_id not in active_jobs:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    del active_jobs[job_id]
    return {"message": f"任务 {job_id} 已删除"}

@app.post("/optimize/file")
async def optimize_verilog_file(
    file: UploadFile = File(...),
    optimization_level: OptimizationLevel = OptimizationLevel.readable,
    n_trials: int = 30,
    top_module: Optional[str] = None,
    background_tasks: BackgroundTasks = None
):
    """通过文件上传优化Verilog"""
    
    # 检查文件类型
    if not file.filename.endswith(('.v', '.sv', '.verilog')):
        raise HTTPException(status_code=400, detail="只支持.v, .sv, .verilog文件")
    
    # 读取文件内容
    try:
        content = await file.read()
        verilog_code = content.decode('utf-8')
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="文件编码错误，请使用UTF-8编码")
    
    # 创建优化请求
    request = OptimizationRequest(
        verilog_code=verilog_code,
        top_module=top_module,
        optimization_level=optimization_level,
        n_trials=n_trials
    )
    
    return await optimize_verilog(request, background_tasks)

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Verilog优化API服务")
    parser.add_argument("--host", default="0.0.0.0", help="服务地址")
    parser.add_argument("--port", type=int, default=8001, help="服务端口")
    parser.add_argument("--workers", type=int, default=1, help="工作进程数")
    parser.add_argument("--reload", action="store_true", help="开发模式（自动重载）")
    
    args = parser.parse_args()
    
    print(f"🚀 启动Verilog优化API服务")
    print(f"📍 地址: http://{args.host}:{args.port}")
    print(f"📚 文档: http://{args.host}:{args.port}/docs")
    
    uvicorn.run(
        "verilog_optimizer_api:app",
        host=args.host,
        port=args.port,
        workers=args.workers,
        reload=args.reload
    ) 