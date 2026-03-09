"""
OpenClaw 远程管理后端服务
端口: 8999
内置 watchdog: 每 60 秒检测 openclaw gateway，异常自动重启
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from contextlib import asynccontextmanager
import paramiko
import asyncio
import time
import json
import os
import logging
from datetime import datetime

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("openclaw-backend")

# ====== 配置 ======
SSH_HOST = os.getenv("SSH_HOST", "43.156.236.194")
SSH_PORT = int(os.getenv("SSH_PORT", "22"))
SSH_USER = os.getenv("SSH_USER", "root")
SSH_PASS = os.getenv("SSH_PASS", "123456Wen.")
OPENCLAW_CMD = os.getenv("OPENCLAW_CMD", "npx --yes openclaw-cn")
WATCHDOG_INTERVAL = int(os.getenv("WATCHDOG_INTERVAL", "60"))  # 秒
WATCHDOG_ENABLED = os.getenv("WATCHDOG_ENABLED", "true").lower() == "true"


# ====== SSH 工具 ======
def get_ssh():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(
        SSH_HOST, port=SSH_PORT, username=SSH_USER, password=SSH_PASS,
        timeout=30, banner_timeout=30, auth_timeout=30,
    )
    return client


def ssh_run(client: paramiko.SSHClient, cmd: str, timeout: int = 120) -> dict:
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode()
    err = stderr.read().decode()
    code = stdout.channel.recv_exit_status()
    return {"stdout": out.strip(), "stderr": err.strip(), "exit_code": code}


def ssh_exec(cmd: str, timeout: int = 120) -> dict:
    client = get_ssh()
    try:
        return ssh_run(client, cmd, timeout)
    finally:
        client.close()


# ====== Watchdog: openclaw 异常自动重启 ======
watchdog_state = {
    "last_check": None,
    "last_status": None,
    "restart_count": 0,
    "last_restart": None,
    "errors": [],
}


async def watchdog_loop():
    """每 WATCHDOG_INTERVAL 秒检测 openclaw gateway，挂了就自动拉起"""
    logger.info(f"Watchdog started (interval={WATCHDOG_INTERVAL}s)")
    while True:
        await asyncio.sleep(WATCHDOG_INTERVAL)
        try:
            client = get_ssh()
            try:
                port = ssh_run(client, "ss -tlnp | grep 18789", timeout=15)
                online = "18789" in port["stdout"]
                watchdog_state["last_check"] = datetime.now().isoformat()
                watchdog_state["last_status"] = "online" if online else "offline"

                if not online:
                    logger.warning("Watchdog: openclaw gateway offline, restarting...")
                    # 尝试 systemd user service 重启
                    ssh_run(client, "XDG_RUNTIME_DIR=/run/user/0 systemctl --user restart openclaw-gateway 2>&1", timeout=30)
                    await asyncio.sleep(10)

                    # 再检查一次
                    port2 = ssh_run(client, "ss -tlnp | grep 18789", timeout=15)
                    if "18789" in port2["stdout"]:
                        logger.info("Watchdog: openclaw gateway restarted successfully")
                        watchdog_state["last_status"] = "recovered"
                    else:
                        # 备用: 直接用 npx 启动
                        logger.warning("Watchdog: systemd restart failed, trying nohup fallback...")
                        ssh_run(client, "fuser -k 18789/tcp 2>/dev/null; sleep 2", timeout=15)
                        ssh_run(client, f"nohup {OPENCLAW_CMD} gateway run --bind lan --port 18789 > /tmp/openclaw-watchdog.log 2>&1 &", timeout=15)
                        await asyncio.sleep(10)
                        port3 = ssh_run(client, "ss -tlnp | grep 18789", timeout=15)
                        if "18789" in port3["stdout"]:
                            logger.info("Watchdog: openclaw gateway recovered via nohup")
                            watchdog_state["last_status"] = "recovered_nohup"
                        else:
                            logger.error("Watchdog: failed to restart openclaw gateway")
                            watchdog_state["last_status"] = "restart_failed"

                    watchdog_state["restart_count"] += 1
                    watchdog_state["last_restart"] = datetime.now().isoformat()
            finally:
                client.close()
        except Exception as e:
            logger.error(f"Watchdog error: {e}")
            watchdog_state["last_check"] = datetime.now().isoformat()
            watchdog_state["last_status"] = f"error: {str(e)}"
            watchdog_state["errors"].append({
                "time": datetime.now().isoformat(),
                "error": str(e),
            })
            # 只保留最近 20 条错误
            if len(watchdog_state["errors"]) > 20:
                watchdog_state["errors"] = watchdog_state["errors"][-20:]


# ====== FastAPI ======
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"OpenClaw Backend starting on port 8999")
    logger.info(f"SSH target: {SSH_USER}@{SSH_HOST}:{SSH_PORT}")
    task = None
    if WATCHDOG_ENABLED:
        task = asyncio.create_task(watchdog_loop())
    yield
    if task:
        task.cancel()

app = FastAPI(title="OpenClaw 管理后端", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ====== 健康检查 ======
@app.get("/health")
def health():
    return {"status": "ok", "service": "openclaw-backend", "watchdog_enabled": WATCHDOG_ENABLED}


# ====== Watchdog 状态 ======
@app.get("/watchdog")
def watchdog_status():
    return {
        "enabled": WATCHDOG_ENABLED,
        "interval_seconds": WATCHDOG_INTERVAL,
        **watchdog_state,
    }


@app.post("/watchdog/reset")
def watchdog_reset():
    watchdog_state["restart_count"] = 0
    watchdog_state["errors"] = []
    return {"success": True, "message": "Watchdog 计数已重置"}


# ====== Gateway 状态 ======
@app.get("/gateway/status")
def gateway_status():
    client = get_ssh()
    try:
        port = ssh_run(client, "ss -tlnp | grep 18789")
        status = ssh_run(client, f"{OPENCLAW_CMD} gateway status 2>&1")
        ps = ssh_run(client, "ps aux | grep openclaw | grep -v grep | head -5")
        systemd = ssh_run(client, "XDG_RUNTIME_DIR=/run/user/0 systemctl --user status openclaw-gateway 2>&1")

        listening = "18789" in port["stdout"]
        return {
            "online": listening,
            "port_check": port["stdout"],
            "gateway_status": status["stdout"],
            "processes": ps["stdout"],
            "systemd_status": systemd["stdout"],
        }
    finally:
        client.close()


# ====== Gateway 在线探测 (轻量) ======
@app.get("/gateway/ping")
def gateway_ping():
    try:
        result = ssh_exec("ss -tlnp | grep 18789", timeout=10)
        online = "18789" in result["stdout"]
        return {"online": online}
    except Exception as e:
        return {"online": False, "error": str(e)}


# ====== Gateway 启动 ======
@app.post("/gateway/start")
def gateway_start():
    client = get_ssh()
    try:
        ssh_run(client, "XDG_RUNTIME_DIR=/run/user/0 systemctl --user start openclaw-gateway 2>&1")
        time.sleep(5)
        port = ssh_run(client, "ss -tlnp | grep 18789")
        return {"success": "18789" in port["stdout"], "port_check": port["stdout"]}
    finally:
        client.close()


# ====== Gateway 停止 ======
@app.post("/gateway/stop")
def gateway_stop():
    client = get_ssh()
    try:
        ssh_run(client, "XDG_RUNTIME_DIR=/run/user/0 systemctl --user stop openclaw-gateway 2>&1")
        time.sleep(2)
        port = ssh_run(client, "ss -tlnp | grep 18789")
        return {"success": "18789" not in port["stdout"], "port_check": port["stdout"]}
    finally:
        client.close()


# ====== Gateway 重启 ======
@app.post("/gateway/restart")
def gateway_restart():
    client = get_ssh()
    try:
        ssh_run(client, "XDG_RUNTIME_DIR=/run/user/0 systemctl --user restart openclaw-gateway 2>&1")
        time.sleep(8)
        port = ssh_run(client, "ss -tlnp | grep 18789")
        status = ssh_run(client, "XDG_RUNTIME_DIR=/run/user/0 systemctl --user status openclaw-gateway 2>&1")
        return {
            "success": "18789" in port["stdout"],
            "port_check": port["stdout"],
            "systemd_status": status["stdout"],
        }
    finally:
        client.close()


# ====== 查看日志 ======
class LogsQuery(BaseModel):
    lines: int = 50

@app.get("/gateway/logs")
def gateway_logs(lines: int = 50):
    client = get_ssh()
    try:
        journal = ssh_run(client, f"XDG_RUNTIME_DIR=/run/user/0 journalctl --user -u openclaw-gateway --no-pager -n {lines} --output=cat 2>&1")
        file_log = ssh_run(client, f"tail -{lines} /tmp/clawdbot/clawdbot-$(date +%Y-%m-%d).log 2>/dev/null || echo '无日志文件'")
        return {
            "journal": journal["stdout"],
            "file_log": file_log["stdout"],
        }
    finally:
        client.close()


# ====== 查看配置 ======
@app.get("/config")
def get_config():
    result = ssh_exec("cat ~/.openclaw/openclaw.json 2>/dev/null")
    if result["stdout"]:
        try:
            return {"config": json.loads(result["stdout"])}
        except json.JSONDecodeError:
            return {"config_raw": result["stdout"]}
    raise HTTPException(status_code=404, detail="配置文件不存在")


# ====== 查看 gateway 配置 ======
@app.get("/config/gateway")
def get_gateway_config():
    result = ssh_exec("cat ~/.openclaw/openclaw.json 2>/dev/null")
    if result["stdout"]:
        try:
            config = json.loads(result["stdout"])
            return {"gateway": config.get("gateway", {})}
        except json.JSONDecodeError:
            pass
    raise HTTPException(status_code=404, detail="配置文件不存在")


# ====== 查看模型配置 ======
@app.get("/config/models")
def get_models_config():
    result = ssh_exec("cat ~/.openclaw/openclaw.json 2>/dev/null")
    if result["stdout"]:
        try:
            config = json.loads(result["stdout"])
            return {
                "models": config.get("models", {}),
                "default_model": config.get("agents", {}).get("defaults", {}).get("model", {}),
            }
        except json.JSONDecodeError:
            pass
    raise HTTPException(status_code=404, detail="配置文件不存在")


# ====== 防火墙状态 ======
@app.get("/firewall")
def firewall_status():
    client = get_ssh()
    try:
        ufw = ssh_run(client, "ufw status 2>&1")
        iptables = ssh_run(client, "iptables -L INPUT -n --line-numbers 2>&1 | head -30")
        port = ssh_run(client, "ss -tlnp | grep 18789")
        return {
            "ufw": ufw["stdout"],
            "iptables": iptables["stdout"],
            "port_18789_listening": "18789" in port["stdout"],
        }
    finally:
        client.close()


# ====== 开放防火墙端口 ======
@app.post("/firewall/open")
def firewall_open():
    client = get_ssh()
    try:
        ssh_run(client, "ufw allow 18789/tcp 2>&1")
        ssh_run(client, "iptables -I INPUT -p tcp --dport 18789 -j ACCEPT 2>&1")
        ufw = ssh_run(client, "ufw status 2>&1")
        return {"success": True, "ufw": ufw["stdout"]}
    finally:
        client.close()


# ====== 会话记录 ======
@app.get("/sessions")
def list_sessions(limit: int = 10):
    result = ssh_exec(f"ls -t ~/.openclaw/agents/main/sessions/*.jsonl 2>/dev/null | head -{limit}")
    files = [f for f in result["stdout"].split("\n") if f.strip()]
    return {"sessions": files, "count": len(files)}


@app.get("/sessions/latest")
def latest_session(lines: int = 20):
    client = get_ssh()
    try:
        latest = ssh_run(client, "ls -t ~/.openclaw/agents/main/sessions/*.jsonl 2>/dev/null | head -1")
        if not latest["stdout"]:
            return {"file": None, "content": "无会话记录"}
        content = ssh_run(client, f'tail -{lines} "{latest["stdout"]}"')
        return {"file": latest["stdout"], "content": content["stdout"]}
    finally:
        client.close()


# ====== 服务器信息 ======
@app.get("/server/info")
def server_info():
    client = get_ssh()
    try:
        ip = ssh_run(client, "curl -s ifconfig.me 2>&1")
        uptime = ssh_run(client, "uptime")
        mem = ssh_run(client, "free -h | head -2")
        disk = ssh_run(client, "df -h / | tail -1")
        node = ssh_run(client, "node --version 2>&1")
        return {
            "public_ip": ip["stdout"],
            "uptime": uptime["stdout"],
            "memory": mem["stdout"],
            "disk": disk["stdout"],
            "node_version": node["stdout"],
        }
    finally:
        client.close()


# ====== 执行自定义命令 (谨慎使用) ======
class ExecCommand(BaseModel):
    command: str
    timeout: int = 60

@app.post("/exec")
def exec_command(body: ExecCommand):
    result = ssh_exec(body.command, timeout=body.timeout)
    return result


# ====== 入口 ======
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8999)
