// PM2 ecosystem config for BT Panel Node.js project management
module.exports = {
  apps: [{
    name: "openclaw-backend",
    script: "python3",
    args: "-m uvicorn app:app --host 127.0.0.1 --port 8999",
    cwd: "/www/wwwroot/openclaw",
    interpreter: "none",
    env: {
      SSH_HOST: "43.156.236.194",
      SSH_PORT: "22",
      SSH_USER: "root",
      SSH_PASS: "123456Wen.",
      OPENCLAW_CMD: "npx --yes openclaw-cn",
      WATCHDOG_ENABLED: "true",
      WATCHDOG_INTERVAL: "60",
    },
    max_restarts: 100,
    restart_delay: 5000,
    autorestart: true,
    watch: false,
    log_date_format: "YYYY-MM-DD HH:mm:ss",
    error_file: "/www/wwwlogs/openclaw-backend-error.log",
    out_file: "/www/wwwlogs/openclaw-backend-out.log",
    merge_logs: true,
  }]
};
