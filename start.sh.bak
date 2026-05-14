#!/bin/bash
# ============================================================
#  MuYunAPI 一键启动脚本（Linux / PM2）
#
#  功能：
#    1. 自动检查并安装依赖
#    2. 构建前端
#    3. 通过 PM2 管理主服务 + 更新服务器
#    4. 支持热重载（exit 42/43 自动重启）
#
#  用法：
#    ./start.sh              # 首次启动
#    ./start.sh --no-build  # 仅启动，跳过依赖检查和构建
#
#  PM2 命令参考：
#    pm2 list               查看进程
#    pm2 logs               查看日志
#    pm2 restart muyu-server # 重启主服务
#    pm2 restart muyu-update # 重启更新服务器
#    pm2 delete all         停止所有
# ============================================================

set -e

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONT_DIR="$SCRIPT_DIR/client"
SRV_DIR="$SCRIPT_DIR/server"
UPD_DIR="$SCRIPT_DIR/update-server"

NO_BUILD=false
[[ "$1" == "--no-build" ]] && NO_BUILD=true

log()  { echo -e "${GREEN}[MuYunAPI]${NC} $1"; }
warn() { echo -e "${YELLOW}[MuYunAPI]${NC} $1"; }
info() { echo -e "${CYAN}[MuYunAPI]${NC} $1"; }
err()  { echo -e "${RED}[MuYunAPI]${NC} $1"; }

# ── PM2 检查 ────────────────────────────────────────────────────────────────
check_pm2() {
  if ! command -v pm2 &> /dev/null; then
    warn "PM2 未安装，正在安装..."
    npm install -g pm2
    log "PM2 安装完成"
  fi
}

# ── 依赖安装 & 前端构建 ───────────────────────────────────────────────────
setup() {
  if [ "$NO_BUILD" = true ]; then
    info "跳过构建（--no-build）"
    return
  fi

  echo ""
  info "━━━ 环境检查与构建 ━━━"

  # 前端
  if [ -d "$FRONT_DIR/node_modules" ]; then
    log "[1/3] ✓ 前端依赖已安装"
  else
    info "[1/3] → 安装前端依赖..."
    cd "$FRONT_DIR" && npm install && cd "$SCRIPT_DIR"
    log "[1/3] ✓ 前端依赖安装完成"
  fi

  if [ -f "$FRONT_DIR/dist/index.html" ]; then
    log "[2/3] ✓ 前端已构建"
  else
    info "[2/3] → 构建前端..."
    cd "$FRONT_DIR" && npm run build && cd "$SCRIPT_DIR"
    log "[2/3] ✓ 前端构建完成"
  fi

  # 后端
  if [ -d "$SRV_DIR/node_modules" ]; then
    log "[3/4] ✓ 后端依赖已安装"
  else
    info "[3/4] → 安装后端依赖..."
    cd "$SRV_DIR" && npm install && cd "$SCRIPT_DIR"
    log "[3/4] ✓ 后端依赖安装完成"
  fi

  # 更新服务器
  if [ -d "$UPD_DIR/node_modules" ]; then
    log "[4/4] ✓ 更新服务器依赖已安装"
  else
    info "[4/4] → 安装更新服务器依赖..."
    cd "$UPD_DIR" && npm install && cd "$SCRIPT_DIR"
    log "[4/4] ✓ 更新服务器依赖安装完成"
  fi

  echo ""
}

# ── 启动服务 ────────────────────────────────────────────────────────────────
start_services() {
  echo ""
  info "━━━ 启动服务（PM2） ━━━"

  check_pm2

  # 更新服务器
  pm2 start "$UPD_DIR/index.js" \
    --name muyu-update \
    --cwd "$UPD_DIR" \
    --exp-backoff-restart-delay=3000 \
    || warn "muyu-update 已存在，跳过"

  # 主服务
  pm2 start "$SRV_DIR/index.js" \
    --name muyu-server \
    --cwd "$SRV_DIR" \
    --exp-backoff-restart-delay=3000 \
    || warn "muyu-server 已存在，跳过"

  # 保存进程列表，开机自启
  pm2 save

  echo ""
  info "━━━ 服务状态 ━━━"
  pm2 list

  echo ""
  log "✅ 启动完成！"
  echo ""
  info "   主服务:       http://localhost:3000"
  info "   更新服务器:   http://localhost:3001"
  echo ""
  info "   pm2 list              查看状态"
  info "   pm2 logs              查看日志"
  info "   pm2 restart all       重启所有"
  info "   pm2 delete all       停止所有"
  echo ""
  info "   热重载: 更新后服务自动重启，无需手动操作"
  echo ""
}

# ── 主入口 ─────────────────────────────────────────────────────────────────
main() {
  echo ""
  echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}║       MuYunAPI Linux 启动脚本          ║${NC}"
  echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
  echo ""

  setup
  start_services
}

main "$@"
