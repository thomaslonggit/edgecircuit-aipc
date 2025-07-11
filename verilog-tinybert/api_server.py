#!/usr/bin/env python3
# Copyright (C) 2024-2025 Intel
# SPDX-License-Identifier: Apache-2.0

import asyncio
import json
import queue
import threading
import time
import uuid
from typing import Dict, List, Optional, Union, AsyncGenerator
from contextlib import asynccontextmanager

import openvino_genai as ov_genai
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field


# ==== 复用 stream.py 的配置 ====
MODEL_DIR = r".\qwen2.5-ov-int4"
DEVICE = "AUTO:NPU,GPU"
MAX_NEW_TOKENS = 640
# ===============================

# 全局变量存储模型管线
pipe: Optional[ov_genai.LLMPipeline] = None


class ChatMessage(BaseModel):
    role: str = Field(..., description="消息角色: system, user, assistant")
    content: str = Field(..., description="消息内容")


class ChatCompletionRequest(BaseModel):
    model: str = Field(default="qwen2.5-7b-int4", description="模型名称")
    messages: List[ChatMessage] = Field(..., description="对话消息列表")
    temperature: Optional[float] = Field(default=0.2, ge=0, le=2, description="采样温度")
    max_tokens: Optional[int] = Field(default=MAX_NEW_TOKENS, gt=0, description="最大生成token数")
    stream: Optional[bool] = Field(default=False, description="是否流式返回")
    top_p: Optional[float] = Field(default=1.0, ge=0, le=1, description="核采样参数")


class ChatCompletionChoice(BaseModel):
    index: int
    message: ChatMessage
    finish_reason: Optional[str] = None


class ChatCompletionResponse(BaseModel):
    id: str
    object: str = "chat.completion"
    created: int
    model: str
    choices: List[ChatCompletionChoice]
    usage: Dict[str, int] = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}


class ChatCompletionStreamChoice(BaseModel):
    index: int
    delta: Dict[str, Optional[str]]
    finish_reason: Optional[str] = None


class ChatCompletionStreamResponse(BaseModel):
    id: str
    object: str = "chat.completion.chunk"
    created: int
    model: str
    choices: List[ChatCompletionStreamChoice]


class ModelInfo(BaseModel):
    id: str
    object: str = "model"
    created: int
    owned_by: str = "intel-openvino"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用启动和关闭时的资源管理"""
    global pipe
    
    # 启动时加载模型
    print(f"🚀 正在加载模型: {MODEL_DIR}")
    print(f"📱 使用设备: {DEVICE}")
    
    try:
        pipe = ov_genai.LLMPipeline(
            MODEL_DIR,
            DEVICE,
            PERFORMANCE_HINT="LATENCY",
            CACHE_DIR="./ov_cache"
        )
        print("✅ 模型加载成功!")
    except Exception as e:
        print(f"❌ 模型加载失败: {e}")
        raise
    
    yield
    
    # 关闭时清理资源
    if pipe:
        print("🧹 清理模型资源...")


# 创建 FastAPI 应用
app = FastAPI(
    title="Intel AIPC OpenVINO GenAI API Server",
    description="基于 OpenVINO GenAI 的 OpenAI 兼容 API 服务",
    version="1.0.0",
    lifespan=lifespan
)


def messages_to_prompt(messages: List[ChatMessage]) -> str:
    """将 OpenAI 格式的消息转换为单个 prompt"""
    prompt_parts = []
    
    for msg in messages:
        if msg.role == "system":
            prompt_parts.append(f"System: {msg.content}")
        elif msg.role == "user":
            prompt_parts.append(f"User: {msg.content}")
        elif msg.role == "assistant":
            prompt_parts.append(f"Assistant: {msg.content}")
    
    prompt_parts.append("Assistant:")
    return "\n".join(prompt_parts)


class AsyncStreamHandler:
    """异步流式处理器，用于在同步的OpenVINO生成中实现真正的流式输出"""
    def __init__(self, request_id: str, created: int, model: str):
        self.request_id = request_id
        self.created = created
        self.model = model
        self.queue = queue.Queue()
        self.finished = False
    
    def stream_callback(self, subword: str) -> ov_genai.StreamingStatus:
        """OpenVINO的流式回调函数，每生成一个subword就调用"""
        self.queue.put(subword)
        return ov_genai.StreamingStatus.RUNNING
    
    def finish_generation(self):
        """标记生成完成"""
        self.finished = True
        self.queue.put(None)  # 发送结束信号
    
    async def get_stream_chunks(self) -> AsyncGenerator[str, None]:
        """异步生成流式响应块"""
        while True:
            try:
                # 非阻塞获取队列中的内容
                subword = self.queue.get(timeout=0.1)
                
                if subword is None:  # 结束信号
                    break
                
                # 创建流式响应块
                chunk = ChatCompletionStreamResponse(
                    id=self.request_id,
                    created=self.created,
                    model=self.model,
                    choices=[
                        ChatCompletionStreamChoice(
                            index=0,
                            delta={"content": subword},
                            finish_reason=None
                        )
                    ]
                )
                yield f"data: {chunk.model_dump_json()}\n\n"
                
            except queue.Empty:
                # 队列为空，等待一小段时间
                await asyncio.sleep(0.01)
                if self.finished and self.queue.empty():
                    break
                continue
        
        # 发送结束标志
        final_chunk = ChatCompletionStreamResponse(
            id=self.request_id,
            created=self.created,
            model=self.model,
            choices=[
                ChatCompletionStreamChoice(
                    index=0,
                    delta={},
                    finish_reason="stop"
                )
            ]
        )
        yield f"data: {final_chunk.model_dump_json()}\n\n"
        yield "data: [DONE]\n\n"


def run_generation_in_thread(pipe, prompt, gen_cfg, stream_handler):
    """在单独线程中运行生成，避免阻塞主线程"""
    try:
        pipe.start_chat()
        pipe.generate(prompt, gen_cfg, stream_handler.stream_callback)
    finally:
        pipe.finish_chat()
        stream_handler.finish_generation()


async def generate_stream_response(
    request: ChatCompletionRequest,
    request_id: str,
    created: int
) -> AsyncGenerator[str, None]:
    """生成流式响应"""
    global pipe
    
    if not pipe:
        raise HTTPException(status_code=500, detail="模型未加载")
    
    # 配置生成参数
    gen_cfg = ov_genai.GenerationConfig(
        max_new_tokens=request.max_tokens,
        temperature=request.temperature,
        top_p=request.top_p,
    )
    
    # 转换消息为 prompt
    prompt = messages_to_prompt(request.messages)
    
    # 创建异步流式处理器
    stream_handler = AsyncStreamHandler(request_id, created, request.model)
    
    # 在单独线程中运行生成，避免阻塞
    generation_thread = threading.Thread(
        target=run_generation_in_thread,
        args=(pipe, prompt, gen_cfg, stream_handler)
    )
    generation_thread.start()
    
    # 异步生成流式响应
    async for chunk in stream_handler.get_stream_chunks():
        yield chunk
    
    # 等待生成线程完成
    generation_thread.join()


@app.post("/v1/chat/completions")
async def create_chat_completion(request: ChatCompletionRequest):
    """创建聊天完成 (兼容 OpenAI API)"""
    global pipe
    
    if not pipe:
        raise HTTPException(status_code=500, detail="模型未加载")
    
    # 生成请求ID和时间戳
    request_id = f"chatcmpl-{uuid.uuid4().hex[:8]}"
    created = int(time.time())
    
    try:
        if request.stream:
            # 流式响应
            return StreamingResponse(
                generate_stream_response(request, request_id, created),
                media_type="text/plain",
                headers={"Cache-Control": "no-cache"}
            )
        else:
            # 非流式响应
            gen_cfg = ov_genai.GenerationConfig(
                max_new_tokens=request.max_tokens,
                temperature=request.temperature,
                top_p=request.top_p,
            )
            
            prompt = messages_to_prompt(request.messages)
            
            # 生成响应
            pipe.start_chat()
            try:
                result = pipe.generate(prompt, gen_cfg)
                response_content = result
            finally:
                pipe.finish_chat()
            
            # 构造响应
            response = ChatCompletionResponse(
                id=request_id,
                created=created,
                model=request.model,
                choices=[
                    ChatCompletionChoice(
                        index=0,
                        message=ChatMessage(role="assistant", content=response_content),
                        finish_reason="stop"
                    )
                ]
            )
            
            return response
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"生成失败: {str(e)}")


@app.get("/v1/models")
async def list_models():
    """列出可用模型"""
    return {
        "object": "list",
        "data": [
            ModelInfo(
                id="qwen2.5-7b-int4",
                created=int(time.time()),
                owned_by="intel-openvino"
            )
        ]
    }


@app.get("/health")
async def health_check():
    """健康检查"""
    global pipe
    return {
        "status": "healthy" if pipe else "unhealthy",
        "model_loaded": pipe is not None,
        "device": DEVICE,
        "model_dir": MODEL_DIR
    }


@app.get("/")
async def root():
    """根路径信息"""
    return {
        "message": "Intel AIPC OpenVINO GenAI API Server",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }


if __name__ == "__main__":
    import uvicorn
    
    print("🚀 启动 Intel AIPC OpenVINO GenAI API 服务器...")
    print("📖 API 文档: http://localhost:8000/docs")
    print("🏥 健康检查: http://localhost:8000/health")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    ) 