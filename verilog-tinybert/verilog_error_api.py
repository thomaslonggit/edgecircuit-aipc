from flask import Flask, request, jsonify
from transformers import BertTokenizer
import numpy as np
import openvino as ov  # 更新导入避免弃用警告
import os
import logging

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 初始化Flask
app = Flask(__name__)

# 加载分词器
TOKENIZER_DIR = os.path.join(os.path.dirname(__file__), 'verilog_error_locator_tinybert')
tokenizer = BertTokenizer.from_pretrained(TOKENIZER_DIR)

# 设备选择和模型加载
def get_available_devices():
    """获取可用的推理设备"""
    core = ov.Core()
    available_devices = core.available_devices
    logger.info(f"Available OpenVINO devices: {available_devices}")
    return available_devices, core

def select_best_device(available_devices):
    """选择最佳推理设备，优先使用NPU"""
    device_priority = ['NPU', 'GPU', 'CPU']
    
    for device in device_priority:
        if device in available_devices:
            logger.info(f"Selected device: {device}")
            return device
    
    # 默认使用CPU
    logger.warning("No preferred device found, falling back to CPU")
    return 'CPU'

def get_npu_config():
    """获取NPU特定的配置"""
    config = {}
    # 移除无效的配置项，使用正确的NPU配置
    # config["PERFORMANCE_HINT"] = "THROUGHPUT"
    # config["INFERENCE_PRECISION_HINT"] = "f16"  # 使用半精度推理
    return config

def load_model_with_device(core, model_path, device):
    """加载模型并编译到指定设备"""
    try:
        model = core.read_model(model_path)
        
        # 针对不同设备进行优化配置
        if device == 'NPU':
            logger.info("Configuring model for NPU...")
            config = get_npu_config()
            
            # 确保模型输入形状是固定的，NPU通常需要静态形状
            # 获取模型的输入形状信息
            for input_node in model.inputs:
                input_shape = input_node.get_partial_shape()
                logger.info(f"Input '{input_node.get_any_name()}' shape: {input_shape}")
                
                # 如果形状是动态的，设置为静态形状
                if input_shape.is_dynamic:
                    # 设置批次大小为16，序列长度为MAX_LEN - 支持最多16行代码一次性推理
                    static_shape = [16, 128]  # [batch_size, sequence_length]
                    model.reshape({input_node.get_any_name(): static_shape})
                    logger.info(f"Reshaped input '{input_node.get_any_name()}' to: {static_shape}")
            
            compiled_model = core.compile_model(model, device, config)
        else:
            compiled_model = core.compile_model(model, device)
            
        logger.info(f"Model successfully compiled on {device}")
        return compiled_model, device
        
    except Exception as e:
        logger.error(f"Failed to compile model on {device}: {str(e)}")
        if device != 'CPU':
            logger.info("Falling back to CPU")
            try:
                compiled_model = core.compile_model(model, 'CPU')
                logger.info("Model successfully compiled on CPU (fallback)")
                return compiled_model, 'CPU'
            except Exception as cpu_error:
                logger.error(f"CPU fallback also failed: {str(cpu_error)}")
                raise cpu_error
        else:
            raise e

# 初始化推理环境
available_devices, core = get_available_devices()
selected_device = select_best_device(available_devices)

# 加载OpenVINO模型
MODEL_PATH = os.path.join(TOKENIZER_DIR, 'model_full.onnx')

try:
    compiled_model, actual_device = load_model_with_device(core, MODEL_PATH, selected_device)
    logger.info(f"Model loaded successfully on {actual_device}")
except Exception as e:
    logger.error(f"Failed to load model: {str(e)}")
    raise e

# 获取输入输出键
input_nodes = compiled_model.inputs
output_node = compiled_model.output(0)

# 动态获取输入键名
input_keys = {}
for input_node in input_nodes:
    input_name = input_node.get_any_name()
    if 'input_ids' in input_name.lower():
        input_keys['input_ids'] = input_name
    elif 'attention_mask' in input_name.lower():
        input_keys['attention_mask'] = input_name
    elif 'token_type_ids' in input_name.lower():
        input_keys['token_type_ids'] = input_name

logger.info(f"Input keys mapping: {input_keys}")

# 最大长度
MAX_LEN = 128

@app.route('/health', methods=['GET'])
def health():
    """健康检查接口，返回当前使用的设备信息"""
    return jsonify({
        'status': 'healthy',
        'device': actual_device,
        'available_devices': available_devices,
        'input_keys': list(input_keys.keys())
    })

@app.route('/check', methods=['POST'])
def check():
    try:
        data = request.get_json(force=True)
        code = data.get('code', '')
        if not code:
            return jsonify({'error': 'No code provided'}), 400
            
        # 与训练时保持完全一致的数据准备方式
        lines = code.split('\n')  # 按换行符分割，与训练一致
        
        # 准备样本列表，与训练时的数据处理完全一致
        line_samples = []
        line_mapping = []  # 保存原始行号映射
        
        for i, line in enumerate(lines):
            if line.strip() == '':  # 与训练时一致：跳过空行
                continue
            line_samples.append(line)  # 每行作为独立样本，与训练一致
            line_mapping.append(i + 1)  # 保存原始行号(1-based)
        
        if not line_samples:
            return jsonify({'errors': []})
        
        import time
        start_time = time.time()
        
        # 批量处理，与训练时的batch处理保持一致
        inputs = tokenizer(line_samples, padding='max_length', truncation=True, max_length=MAX_LEN, return_tensors='np')
        
        # 对于NPU，需要处理固定批次大小的限制
        if actual_device == 'NPU':
            MAX_BATCH_SIZE = 16
            current_batch_size = inputs['input_ids'].shape[0]
            
            if current_batch_size > MAX_BATCH_SIZE:
                # 如果超过NPU批次限制，分批处理
                logger.info(f"NPU: Processing {current_batch_size} lines in batches of {MAX_BATCH_SIZE}")
                
                all_preds = []
                for i in range(0, current_batch_size, MAX_BATCH_SIZE):
                    batch_end = min(i + MAX_BATCH_SIZE, current_batch_size)
                    
                    # 准备当前批次
                    batch_inputs = {}
                    for key, input_name in input_keys.items():
                        if key in inputs:
                            batch_data = inputs[key][i:batch_end].astype(np.int32)
                            
                            # 如果批次不足MAX_BATCH_SIZE，padding到固定大小
                            if batch_data.shape[0] < MAX_BATCH_SIZE:
                                padding_size = MAX_BATCH_SIZE - batch_data.shape[0]
                                padding_shape = list(batch_data.shape)
                                padding_shape[0] = padding_size
                                padding = np.zeros(padding_shape, dtype=batch_data.dtype)
                                batch_data = np.concatenate([batch_data, padding], axis=0)
                            
                            batch_inputs[input_name] = batch_data
                    
                    # 批次推理
                    batch_logits = compiled_model(batch_inputs)[output_node]
                    batch_preds = np.argmax(batch_logits, axis=1)
                    
                    # 只保留实际数据的结果，忽略padding
                    actual_batch_size = batch_end - i
                    all_preds.extend(batch_preds[:actual_batch_size])
                
                preds = np.array(all_preds)
                
            else:
                # 单批次处理，但需要padding到固定大小
                inference_inputs = {}
                for key, input_name in input_keys.items():
                    if key in inputs:
                        input_data = inputs[key].astype(np.int32)
                        
                        # padding到固定批次大小
                        if input_data.shape[0] < MAX_BATCH_SIZE:
                            padding_size = MAX_BATCH_SIZE - input_data.shape[0]
                            padding_shape = list(input_data.shape)
                            padding_shape[0] = padding_size
                            padding = np.zeros(padding_shape, dtype=input_data.dtype)
                            input_data = np.concatenate([input_data, padding], axis=0)
                        
                        inference_inputs[input_name] = input_data
                
                # 推理
                logits = compiled_model(inference_inputs)[output_node]
                all_preds = np.argmax(logits, axis=1)
                # 只取实际样本的结果
                preds = all_preds[:current_batch_size]
        
        else:
            # CPU/GPU：正常批量处理
            inference_inputs = {}
            for key, input_name in input_keys.items():
                if key in inputs:
                    input_data = inputs[key].astype(np.int32)
                    inference_inputs[input_name] = input_data
            
            # 批量推理
            logits = compiled_model(inference_inputs)[output_node]
            preds = np.argmax(logits, axis=1)
        
        # 收集错误行
        error_lines = []
        for idx, pred in enumerate(preds):
            if pred == 1:
                line_content = line_samples[idx]
                col = (len(line_content) - len(line_content.lstrip())) + 1 if line_content.strip() else 1
                error_lines.append({
                    'line': line_mapping[idx],  # 原始行号
                    'column': col, 
                    'content': line_content
                })
        
        inference_time = time.time() - start_time
        
        result = {
            'errors': error_lines,
            'inference_time_ms': round(inference_time * 1000, 2),
            'device_used': actual_device,
            'lines_processed': len(line_samples),  # 实际处理的非空行数
            'processing_mode': 'batch',  # 与训练一致的批量处理
            'total_lines': len(lines)  # 总行数（包括空行）
        }
            
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error during inference: {str(e)}")
        return jsonify({'error': f'Inference failed: {str(e)}'}), 500

if __name__ == '__main__':
    import time
    logger.info(f"Starting Verilog Error API on {actual_device}")
    app.run(host='0.0.0.0', port=5000, debug=False)  # NPU环境建议关闭debug模式 