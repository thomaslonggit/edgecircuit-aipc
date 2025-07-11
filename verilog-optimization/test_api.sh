#!/bin/bash

# Verilog优化API测试脚本
echo "🧪 Verilog优化API测试脚本"
echo "=========================="

# 配置
API_URL="http://localhost:8001"
VERILOG_CODE='module test_module (input [7:0] a, b, output [7:0] sum); assign sum = a + b; endmodule'

# 检查API服务是否运行
echo "🔍 检查API服务状态..."
if ! curl -s "${API_URL}/health" | grep -q "healthy"; then
    echo "❌ API服务不可用，请先启动服务："
    echo "   python3 verilog_optimizer_api.py"
    exit 1
fi
echo "✅ API服务正常"

# 测试根端点
echo ""
echo "📍 测试根端点..."
curl -s "${API_URL}/" | jq '.'

# 提交优化任务
echo ""
echo "🚀 提交优化任务..."

# 构建JSON数据
JSON_DATA="{\"verilog_code\": \"${VERILOG_CODE}\", \"optimization_level\": \"readable\", \"n_trials\": 10}"

JOB_RESPONSE=$(curl -s -X POST "${API_URL}/optimize" \
    -H "Content-Type: application/json" \
    -d "${JSON_DATA}")

echo "📤 提交响应:"
echo "$JOB_RESPONSE" | jq '.'

# 提取任务ID
JOB_ID=$(echo "$JOB_RESPONSE" | jq -r '.job_id')

if [ "$JOB_ID" == "null" ]; then
    echo "❌ 未能获取任务ID"
    exit 1
fi

echo "✅ 任务ID: $JOB_ID"

# 轮询任务状态
echo ""
echo "📊 监控任务状态..."
while true; do
    STATUS_RESPONSE=$(curl -s "${API_URL}/status/${JOB_ID}")
    STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.status')
    MESSAGE=$(echo "$STATUS_RESPONSE" | jq -r '.message')
    
    echo "📈 状态: $STATUS - $MESSAGE"
    
    if [ "$STATUS" == "completed" ] || [ "$STATUS" == "failed" ]; then
        break
    fi
    
    sleep 2
done

# 获取最终结果
echo ""
echo "📊 获取最终结果..."
RESULT_RESPONSE=$(curl -s "${API_URL}/result/${JOB_ID}")
echo "$RESULT_RESPONSE" | jq '.'

# 如果优化成功，显示优化后的代码
if [ "$STATUS" == "completed" ]; then
    echo ""
    echo "📄 优化后的Verilog代码:"
    echo "========================"
    echo "$RESULT_RESPONSE" | jq -r '.optimized_code'
fi

# 列出所有任务
echo ""
echo "📋 所有任务列表:"
curl -s "${API_URL}/jobs" | jq '.'

echo ""
echo "✅ 测试完成！" 