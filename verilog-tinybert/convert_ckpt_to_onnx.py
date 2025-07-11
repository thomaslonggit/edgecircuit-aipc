import torch
from transformers import BertForSequenceClassification

# 直接用 transformers 的 from_pretrained 加载
model = BertForSequenceClassification.from_pretrained('verilog_error_locator_tinybert', num_labels=2)
model.eval()

# 构造一个示例输入（BERT输入通常为 [batch, seq_len]，这里假设最大长度128）
dummy_input = {
    "input_ids": torch.ones(1, 128, dtype=torch.long),
    "attention_mask": torch.ones(1, 128, dtype=torch.long)
}

# 导出为ONNX
torch.onnx.export(
    model,
    (dummy_input["input_ids"], dummy_input["attention_mask"]),
    "verilog_error_locator_tinybert/model_full.onnx",
    input_names=["input_ids", "attention_mask"],
    output_names=["logits"],
    opset_version=14,
    dynamic_axes={"input_ids": {0: "batch_size", 1: "seq_len"},
                  "attention_mask": {0: "batch_size", 1: "seq_len"},
                  "logits": {0: "batch_size"}}
)

print("ONNX 导出完成！") 