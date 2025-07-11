import random
import json
import copy

# 原始Verilog源文件
verilog_src = '''module counter (
  input clk,
  input rstn,
  output reg [3:0] out
);
  always @ (posedge clk) begin
    if (!rstn)
      out <= 0;
    else
      out <= out + 1;
  end
endmodule
'''

# 原始Testbench
verilog_tb = '''module tb_counter;
  reg clk;
  reg rstn;
  wire [3:0] out;

  counter c0 (
    .clk(clk),
    .rstn(rstn),
    .out(out)
  );

  always #5 clk = ~clk;

  initial begin
    clk <= 0;
    rstn <= 0;
    #20 rstn <= 1;
    #80 rstn <= 0;
    #50 rstn <= 1;
    #20 $finish;
  end
endmodule
'''

# 原始xdc文件
xdc_src = '''set_property PACKAGE_PIN W5 [get_ports clk]
set_property IOSTANDARD LVCMOS33 [get_ports clk]
set_property PACKAGE_PIN V6 [get_ports rstn]
set_property IOSTANDARD LVCMOS33 [get_ports rstn]
set_property PACKAGE_PIN U7 [get_ports {out[0]}]
set_property IOSTANDARD LVCMOS33 [get_ports {out[0]}]
set_property PACKAGE_PIN U8 [get_ports {out[1]}]
set_property IOSTANDARD LVCMOS33 [get_ports {out[1]}]
set_property PACKAGE_PIN V7 [get_ports {out[2]}]
set_property IOSTANDARD LVCMOS33 [get_ports {out[2]}]
set_property PACKAGE_PIN W6 [get_ports {out[3]}]
set_property IOSTANDARD LVCMOS33 [get_ports {out[3]}]
'''

# 错误类型定义
verilog_errors = [
    {
        'type': '缺少分号',
        'desc': '在某行末尾删除分号',
        'func': lambda lines, idx: (lines[:idx] + [lines[idx].replace(';', '', 1)] + lines[idx+1:] if ';' in lines[idx] else lines, lines[idx].find(';')+1 if ';' in lines[idx] else 1)
    },
    {
        'type': '缺少endmodule',
        'desc': '删除最后一个endmodule',
        'func': lambda lines, idx: (lines[:idx]+lines[idx+1:], 1)
    },
    {
        'type': '拼写错误',
        'desc': '将module拼写为modul',
        'func': lambda lines, idx: (lines[:idx] + [lines[idx].replace('module', 'modul', 1)] + lines[idx+1:], lines[idx].find('module')+1)
    },
    {
        'type': '端口名错误',
        'desc': '将out拼写为ot',
        'func': lambda lines, idx: (lines[:idx] + [lines[idx].replace('out', 'ot', 1)] + lines[idx+1:], lines[idx].find('out')+1)
    },
    {
        'type': '括号不匹配',
        'desc': '删除一对括号',
        'func': lambda lines, idx: (lines[:idx] + [lines[idx].replace('(', '', 1)] + lines[idx+1:], lines[idx].find('(')+1)
    },
    {
        'type': '缺少begin',
        'desc': '删除begin',
        'func': lambda lines, idx: (lines[:idx] + [lines[idx].replace('begin', '', 1)] + lines[idx+1:], lines[idx].find('begin')+1)
    },
    {
        'type': '缺少end',
        'desc': '删除end',
        'func': lambda lines, idx: (lines[:idx] + [lines[idx].replace('end', '', 1)] + lines[idx+1:], lines[idx].find('end')+1)
    },
    {
        'type': '信号类型错误',
        'desc': '将reg改为wire',
        'func': lambda lines, idx: (lines[:idx] + [lines[idx].replace('reg', 'wire', 1)] + lines[idx+1:], lines[idx].find('reg')+1)
    },
]

xdc_errors = [
    {
        'type': 'xdc格式错误',
        'desc': '缺少左中括号',
        'func': lambda lines, idx: (lines[:idx] + [lines[idx].replace('[', '', 1)] + lines[idx+1:], lines[idx].find('[')+1)
    },
    {
        'type': 'xdc格式错误',
        'desc': 'set_property拼写错误',
        'func': lambda lines, idx: (lines[:idx] + [lines[idx].replace('set_property', 'set_propery', 1)] + lines[idx+1:], lines[idx].find('set_property')+1)
    },
    {
        'type': '端口名错误',
        'desc': '端口名拼写错误',
        'func': lambda lines, idx: (lines[:idx] + [lines[idx].replace('clk', 'clkk', 1)] + lines[idx+1:], lines[idx].find('clk')+1)
    },
    {
        'type': 'xdc格式错误',
        'desc': '缺少右中括号',
        'func': lambda lines, idx: (lines[:idx] + [lines[idx].replace(']', '', 1)] + lines[idx+1:], lines[idx].find(']')+1)
    },
]

# 生成错误样本
samples = []

# 三个文件的内容
files = [
    ('counter.v', verilog_src, verilog_errors),
    ('tb_counter.v', verilog_tb, verilog_errors),
    ('counter.xdc', xdc_src, xdc_errors)
]

random.seed(42)

for i in range(150):
    # 随机选择文件和错误类型
    fname, src, err_list = random.choice(files)
    lines = src.split('\n')
    # 只选非空行
    valid_lines = [idx for idx, l in enumerate(lines) if l.strip()]
    line_idx = random.choice(valid_lines)
    err = random.choice(err_list)
    # 应用错误
    try:
        new_lines, col = err['func'](copy.deepcopy(lines), line_idx)
        if new_lines == lines:
            # 没有实际改动，跳过
            continue
        error_code = '\n'.join(new_lines)
        samples.append({
            'filename': fname,
            'original_code': src,
            'error_code': error_code,
            'error_type': err['type'],
            'error_description': f"{err['desc']}，第{line_idx+1}行，第{col}列",
            'line': line_idx+1,
            'column': col
        })
    except Exception as e:
        continue
    if len(samples) >= 150:
        break

# 输出到json
with open('verilog_error_samples_new.json', 'w', encoding='utf-8') as f:
    json.dump(samples, f, ensure_ascii=False, indent=2)

print('已生成 verilog_error_samples_new.json，包含150个带错样本。') 