#!/bin/bash
# ============================================================
#  MuYunAPI 更新服务器启动脚本（Linux / PM2）
#
#  功能：
#    1. 自动检查并安装依赖
#    2. 通过 PM2 启动更新服务器
#    3. 支持热重载（exit 42 自动重启）
#
#  用法：
#    ./update_start.sh              # 启动
#    ./update_start.sh --no-build  # 仅启动，跳过依赖检查
# ============================================================

set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UPD_DIR="$SCRIPT_DIR/update-server"

NO_BUILD=false
[[ "$1" == "--no-build" ]] && NO_BUILD=true

log()  { echo -e "${GREEN}[UpdateServer]${NC} $1"; }
warn() { echo -e "${YELLOW}[UpdateServer]${NC} $1"; }
info() { echo -e "${CYAN}[UpdateServer]${NC} $1"; }

check_pm2() {
  if ! command -v pm2 &> /dev/null; then
    warn "PM2 未安装，正在安装..."
    npm install -g pm2
    log "PM2 安装完成"
  fi
}

setup() {
  if [ "$NO_BUILD" = true ]; then
    info "跳过依赖检查（--no-build）"
    return
  fi

  if [ -d "$UPD_DIR/node_modules" ]; then
    log "✓ 更新服务器依赖已安装"
  else
    info "→ 安装更新服务器依赖..."
    cd "$UPD_DIR" && npm install && cd "$SCRIPT_DIR"
    log "✓ 更新服务器依赖安装完成"
  fi
}

start() {
  check_pm2

  pm2 start "$UPD_DIR/index.js" \
    --name muyu-update \
    --cwd "$UPD_DIR" \
    --exp-backoff-restart-delay=3000 \
    || warn "muyu-update 已存在，跳过"

  pm2 save

  echo ""
  log "✅ 更新服务器启动完成！"
  echo ""
  info "   访问地址:   http://localhost:3001"
  info "   管理后台:   http://localhost:3001"
  info "   默认账号:   admin / admin123"
  echo ""
  info "   pm2 logs muyu-update   查看日志"
  info "   pm2 restart muyu-update  重启"
  echo ""
}

main() {
  echo ""
  echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}║     MuYunAPI 更新服务器启动脚本        ║${NC}"
  echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
  echo ""

  setup
  start
}

main "$@"
