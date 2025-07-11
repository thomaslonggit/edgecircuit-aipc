import openvino_genai as ov_genai
local_path = r"./qwen2.5-ov-int4"

pipe = ov_genai.LLMPipeline(
    local_path,
    "AUTO:NPU,GPU"
)

print(pipe.generate("The sun is yellow because", max_new_tokens=640))

print(pipe.generate("详细介绍下如何微调qwen，什么是qlora", max_new_tokens=640))