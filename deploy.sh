#!/bin/bash
# =============================================================
# AI 廣告素材產生器 - 一鍵部署到 Google Apps Script
# =============================================================
#
# 前置需求：
#   npm install -g @google/clasp
#   clasp login   (會開啟瀏覽器登入 Google 帳號)
#
# 使用方式：
#   chmod +x deploy.sh
#   ./deploy.sh          # 首次部署（建立新專案）
#   ./deploy.sh update   # 更新已存在的專案
# =============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")/apps-script" && pwd)"

# 檢查 clasp 是否已安裝
if ! command -v clasp &> /dev/null; then
  echo "❌ 找不到 clasp，請先安裝："
  echo "   npm install -g @google/clasp"
  echo ""
  echo "   安裝後執行 clasp login 登入 Google 帳號"
  exit 1
fi

cd "$SCRIPT_DIR"

if [ "$1" = "update" ]; then
  # ---- 更新模式 ----
  if [ ! -f .clasp.json ]; then
    echo "❌ 找不到 .clasp.json，請先執行 ./deploy.sh 建立專案"
    exit 1
  fi

  echo "📤 推送程式碼到 Apps Script..."
  clasp push --force

  echo "🚀 建立新的部署版本..."
  DEPLOY_ID=$(clasp deployments 2>/dev/null | grep -oP '(?<=- )\S+(?= @)' | tail -1)

  if [ -n "$DEPLOY_ID" ]; then
    clasp deploy --deploymentId "$DEPLOY_ID" --description "更新 $(date '+%Y-%m-%d %H:%M')"
  else
    clasp deploy --description "更新 $(date '+%Y-%m-%d %H:%M')"
  fi

  echo ""
  echo "✅ 更新完成！"
  clasp open --webapp

else
  # ---- 首次部署模式 ----
  if [ -f .clasp.json ]; then
    echo "⚠️  已存在 .clasp.json，如要更新請執行："
    echo "   ./deploy.sh update"
    echo ""
    read -p "要建立全新專案嗎？(y/N) " confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
      exit 0
    fi
    rm .clasp.json
  fi

  echo "📦 建立新的 Apps Script 專案..."
  clasp create --type webapp --title "AI 廣告素材產生器"

  echo "📤 推送程式碼..."
  clasp push --force

  echo "🚀 部署為 Web App..."
  clasp deploy --description "初始部署 $(date '+%Y-%m-%d %H:%M')"

  echo ""
  echo "============================================"
  echo "✅ 部署完成！"
  echo "============================================"
  echo ""
  echo "接下來需要手動設定存取權限："
  echo "1. 執行 clasp open 開啟 Apps Script 編輯器"
  echo "2. 點選「部署」>「管理部署」"
  echo "3. 編輯部署，將存取權限改為「所有人」"
  echo "4. 複製 Web App URL 即可使用"
  echo ""

  clasp open
fi
