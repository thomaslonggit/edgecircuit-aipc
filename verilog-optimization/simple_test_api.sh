#!/bin/bash

echo "🧪 简化API测试脚本"
echo "=================="

API_URL="http://localhost:8000"

# 1. 健康检查
echo "🔍 健康检查..."
curl -s "${API_URL}/health" | grep -q "healthy"
if [ $? -eq 0 ]; then
    echo "✅ API服务正常"
else
    echo "❌ API服务不可用"
    exit 1
fi

# 2. 提交简单任务
echo ""
echo "🚀 提交优化任务..."

# 使用简单的单行Verilog代码
SIMPLE_CODE="module test(input a, output b); assign b = a; endmodule"

# 使用curl提交任务
RESPONSE=$(curl -s -X POST "${API_URL}/optimize" \
    -H "Content-Type: application/json" \
    -d "{\"verilog_code\": \"${SIMPLE_CODE}\", \"optimization_level\": \"readable\", \"n_trials\": 5}")

echo "📤 服务器响应:"
echo "$RESPONSE"

# 检查是否成功获取job_id
JOB_ID=$(echo "$RESPONSE" | grep -o '"job_id":"[^"]*"' | cut -d'"' -f4)

if [ -n "$JOB_ID" ]; then
    echo "✅ 任务提交成功，ID: $JOB_ID"
    
    # 等待并检查结果
    echo "⏳ 等待任务完成..."
    sleep 10
    
    # 获取结果
    RESULT=$(curl -s "${API_URL}/result/${JOB_ID}")
    echo "📊 任务结果:"
    echo "$RESULT"
else
    echo "❌ 任务提交失败"
fi

echo ""
echo "✅ 测试完成" 