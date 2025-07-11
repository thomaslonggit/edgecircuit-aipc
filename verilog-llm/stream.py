#!/usr/bin/env python3
# Copyright (C) 2024-2025 Intel
# SPDX-License-Identifier: Apache-2.0

import openvino_genai as ov_genai

# ==== 请根据需要修改这 3 行 ====
MODEL_DIR      = r".\qwen2.5-ov-int4"      # 本地 INT4-OV 目录或 HF ID
DEVICE         = "AUTO:NPU,GPU"            # 先 NPU，不行就 GPU
MAX_NEW_TOKENS = 640                       # 每轮最多生成 token 数
# =================================

def streamer(subword: str) -> ov_genai.StreamingStatus:
    """每收到一个 sub-word 就立即打印。"""
    print(subword, end='', flush=True)
    return ov_genai.StreamingStatus.RUNNING   # 不打断生成

def main():
    # 1) 初始化管线
    pipe = ov_genai.LLMPipeline(
        MODEL_DIR,
        DEVICE,
        PERFORMANCE_HINT="LATENCY",
        CACHE_DIR="./ov_cache"               # 可选：KV-cache 放 SSD
    )

    # 2) 配置生成参数
    gen_cfg = ov_genai.GenerationConfig(
        max_new_tokens=MAX_NEW_TOKENS,
        temperature=0.2,                     # 你想改别的采样参数，直接加
    )

    # 3) 进入多轮对话循环
    pipe.start_chat()                       # 创建会话并启用 KV-cache
    try:
        while True:
            try:
                prompt = input("\n🟢 你：")
            except (EOFError, KeyboardInterrupt):
                break

            print("🔵 助手：", end='', flush=True)
            pipe.generate(prompt, gen_cfg, streamer)   # ← 流式回调
            print("\n────────────")
    finally:
        pipe.finish_chat()                  # 清理资源

if __name__ == "__main__":
    main()
