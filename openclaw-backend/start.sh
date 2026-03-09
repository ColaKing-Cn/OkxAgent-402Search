#!/bin/bash
# OpenClaw 管理后端启动脚本

# 加载环境变量
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# 安装依赖
pip install -r requirements.txt -q

# 启动服务
echo "Starting OpenClaw Backend on port 8999..."
uvicorn app:app --host 0.0.0.0 --port 8999
