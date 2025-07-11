import json
import torch
from torch.utils.data import Dataset, DataLoader, random_split
from transformers import BertTokenizer, BertForSequenceClassification
from transformers.trainer import Trainer
from transformers.training_args import TrainingArguments
from sklearn.metrics import accuracy_score, precision_recall_fscore_support
import argparse

parser = argparse.ArgumentParser()
parser.add_argument('--data', type=str, default='verilog_error_samples.json', help='数据文件名')
parser.add_argument('--test', action='store_true', help='只评估模型')
args = parser.parse_args()

# 1. 读取数据
with open(args.data, 'r', encoding='utf-8') as f:
    data = json.load(f)

samples = []
for item in data:
    lines = item['error_code'].split('\n')
    labels = [1 if i+1 == item['line'] else 0 for i in range(len(lines))]
    for i, line in enumerate(lines):
        if line.strip() == '':
            continue
        samples.append({'text': line, 'label': labels[i], 'file': item['filename'], 'gt_line': item['line'], 'all_lines': lines, 'error_type': item.get('error_type', ''), 'error_desc': item.get('error_description', '')})

# 2. 分词器
tokenizer = BertTokenizer.from_pretrained('huawei-noah/TinyBERT_General_6L_768D')

# 3. 数据集定义
class VerilogDataset(Dataset):
    def __init__(self, samples, tokenizer, max_length=128):
        self.samples = samples
        self.tokenizer = tokenizer
        self.max_length = max_length

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        item = self.samples[idx]
        encoding = self.tokenizer(
            item['text'],
            truncation=True,
            padding='max_length',
            max_length=self.max_length,
            return_tensors='pt'
        )
        return {
            'input_ids': encoding['input_ids'].squeeze(),
            'attention_mask': encoding['attention_mask'].squeeze(),
            'labels': torch.tensor(item['label'], dtype=torch.long)
        }

dataset = VerilogDataset(samples, tokenizer)

# 4. 加载模型
model = BertForSequenceClassification.from_pretrained('verilog_error_locator_tinybert', num_labels=2)

if args.test:
    # 评估模式
    model.eval()
    dataloader = DataLoader(dataset, batch_size=1)
    pred_lines = {}
    gt_lines = {}
    idx = 0
    for batch in dataloader:
        with torch.no_grad():
            outputs = model(input_ids=batch['input_ids'], attention_mask=batch['attention_mask'])
            logits = outputs.logits
            pred = torch.argmax(logits, dim=1).item()
            label = batch['labels'].item()
            sample = samples[idx]
            file = sample['file']
            if file not in pred_lines:
                pred_lines[file] = []
                gt_lines[file] = []
            if pred == 1:
                pred_lines[file].append(idx)
            if label == 1:
                gt_lines[file].append(idx)
            idx += 1
    # 输出每个文件的预测与建议
    for file in pred_lines:
        pred_line_nums = [samples[i]['gt_line'] for i in pred_lines[file]]
        gt_line_nums = [samples[i]['gt_line'] for i in gt_lines[file]]
        print(f'文件: {file}')
        print(f'  真实错误行为: {gt_line_nums}')
        print(f'  模型预测错误行为: {pred_line_nums}')
        if set(gt_line_nums) == set(pred_line_nums):
            print('  预测正确！')
        else:
            print('  预测错误！')
            # 输出真实错误行内容
            for idx in gt_lines[file]:
                print(f'    真实错误行内容: {samples[idx]["text"]}')
            # 输出模型预测的错误行内容
            for idx in pred_lines[file]:
                print(f'    模型预测错误行内容: {samples[idx]["text"]}')
            print('  建议: 请检查模型预测的错误行与真实错误行的差异，并参考真实错误行内容进行修正。')
        print('-'*40)
    exit(0)

# 非test模式才训练和保存
# 5. 训练参数
training_args = TrainingArguments(
    output_dir='./results',
    num_train_epochs=80,
    per_device_train_batch_size=16,
    logging_dir='./logs',
)

# 6. Trainer
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=dataset,
)

# 7. 开始训练
trainer.train()

# 8. 保存模型
trainer.save_model('./verilog_error_locator_tinybert')
tokenizer.save_pretrained('./verilog_error_locator_tinybert')

# 保存为 .ckpt 文件
torch.save(model, './verilog_error_locator_tinybert/model_full.ckpt')

print("训练完成，模型已保存到 ./verilog_error_locator_tinybert")
