#!/bin/bash
# ============================================================
# OpenClaw Backend 一键部署脚本
# 功能:
#   1. 安装 Python 依赖
#   2. 用 PM2 管理进程 (异常自动重启)
#   3. 在宝塔面板创建网站 + Nginx 反向代理 (支持域名绑定)
# ============================================================

set -e

APP_DIR="/www/wwwroot/openclaw"
DOMAIN="${1:-openclaw.local}"  # 第一个参数为域名，默认 openclaw.local
PORT=8999

echo "============================================"
echo "  OpenClaw Backend 部署"
echo "  目录: $APP_DIR"
echo "  端口: $PORT"
echo "  域名: $DOMAIN"
echo "============================================"

# ---- 1. 安装 Python 依赖 ----
echo ""
echo "[1/5] 安装 Python 依赖..."
cd "$APP_DIR"
pip3 install -r requirements.txt -q 2>/dev/null || pip install -r requirements.txt -q

# ---- 2. 停止旧进程 ----
echo "[2/5] 停止旧进程..."
pm2 delete openclaw-backend 2>/dev/null || true
fuser -k $PORT/tcp 2>/dev/null || true
sleep 1

# ---- 3. PM2 启动 (自动重启) ----
echo "[3/5] PM2 启动服务..."
if [ -f ecosystem.config.js ]; then
    pm2 start ecosystem.config.js
else
    pm2 start "python3 -m uvicorn app:app --host 127.0.0.1 --port $PORT" \
        --name openclaw-backend \
        --cwd "$APP_DIR" \
        --max-restarts 100 \
        --restart-delay 5000 \
        -o /www/wwwlogs/openclaw-backend-out.log \
        -e /www/wwwlogs/openclaw-backend-error.log
fi

pm2 save
echo "  PM2 进程已启动并保存"

# ---- 4. 创建宝塔网站 + Nginx 反向代理 ----
echo "[4/5] 配置 Nginx 反向代理..."

# 创建网站目录
mkdir -p /www/wwwroot/$DOMAIN

# 写入 nginx 配置
NGINX_CONF="/www/server/panel/vhost/nginx/${DOMAIN}.conf"
cat > "$NGINX_CONF" << NGINXEOF
server {
    listen 80;
    server_name ${DOMAIN};
    index index.html;
    root /www/wwwroot/${DOMAIN};

    # SSL (宝塔面板配置 SSL 后会自动添加)
    #include /www/server/panel/vhost/nginx/ssl/${DOMAIN}/*.conf;

    # 反向代理到 openclaw-backend
    location / {
        proxy_pass http://127.0.0.1:${PORT};
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_connect_timeout 60s;
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
    }

    # 日志
    access_log /www/wwwlogs/${DOMAIN}.log;
    error_log /www/wwwlogs/${DOMAIN}.error.log;
}
NGINXEOF

echo "  Nginx 配置已写入: $NGINX_CONF"

# 写入宝塔面板网站数据 (让面板能识别这个站点)
# 宝塔用 sqlite 数据库管理站点
python3 << 'PYEOF'
import sqlite3, time, os, json

db_path = "/www/server/panel/data/default.db"
domain = os.environ.get("BT_DOMAIN", "openclaw.local")
path = f"/www/wwwroot/{domain}"

conn = sqlite3.connect(db_path)
c = conn.cursor()

# 检查是否已存在
c.execute("SELECT id FROM sites WHERE name=?", (domain,))
if c.fetchone():
    print(f"  站点 {domain} 已存在于宝塔面板")
else:
    now = int(time.time())
    # 插入站点记录
    c.execute("""
        INSERT INTO sites (name, path, status, ps, addtime, edate, type_id)
        VALUES (?, ?, '1', 'OpenClaw Backend API', ?, '0000-00-00', 0)
    """, (domain, path, now))
    site_id = c.lastrowid

    # 插入域名绑定
    c.execute("""
        INSERT INTO binding (pid, domain, port, addtime)
        VALUES (?, ?, '80', ?)
    """, (site_id, domain, now))

    conn.commit()
    print(f"  站点 {domain} 已添加到宝塔面板 (id={site_id})")

conn.close()
PYEOF

# 测试并重载 nginx
nginx -t 2>&1 && nginx -s reload
echo "  Nginx 已重载"

# ---- 5. 验证 ----
echo "[5/5] 验证服务..."
sleep 3
pm2 list | grep openclaw-backend

echo ""
echo "============================================"
echo "  部署完成"
echo "============================================"
echo "  PM2 进程: openclaw-backend (异常自动重启)"
echo "  本地访问: http://127.0.0.1:${PORT}"
echo "  域名访问: http://${DOMAIN}"
echo "  API 文档: http://${DOMAIN}/docs"
echo ""
echo "  宝塔面板中可看到站点: ${DOMAIN}"
echo "  可在面板中配置 SSL / 域名解析"
echo ""
echo "  常用命令:"
echo "    pm2 logs openclaw-backend   # 查看日志"
echo "    pm2 restart openclaw-backend # 重启"
echo "    pm2 stop openclaw-backend    # 停止"
echo "============================================"
