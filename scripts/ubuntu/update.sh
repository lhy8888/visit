#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common.sh"

require_root
require_command node
require_command npm
require_command systemctl
require_command git

APP_DIR="${VISITOR_ACCESS_APP_DIR:-$(repo_root)}"
ENV_FILE="${VISITOR_ACCESS_CONFIG_DIR:-${DEFAULT_CONFIG_DIR}}/${SERVICE_NAME}.env"
NPM_BIN="$(command -v npm)"

if [[ ! -d "${APP_DIR}/.git" ]]; then
  echo "The application directory does not appear to be a git checkout: ${APP_DIR}" >&2
  exit 1
fi

if systemctl is-active --quiet "${SERVICE_NAME}"; then
  systemctl stop "${SERVICE_NAME}"
fi

if [[ -f "${ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
fi

pushd "${APP_DIR}" >/dev/null
echo "Pulling latest changes..."
git pull --ff-only

export NODE_ENV="${NODE_ENV:-production}"
export PORT="${PORT:-${DEFAULT_PORT}}"
export DATA_DIR="${DATA_DIR:-${DEFAULT_DATA_DIR}}"
export DB_FILE="${DB_FILE:-${DATA_DIR}/visitor.db}"
export UPLOAD_DIR="${UPLOAD_DIR:-${DEFAULT_UPLOAD_DIR}}"
export LOG_FILE="${LOG_FILE:-${DEFAULT_LOG_DIR}/app.log}"
export ADMIN_DEFAULT_USERNAME="${ADMIN_DEFAULT_USERNAME:-admin}"
export ADMIN_DEFAULT_PASSWORD="${ADMIN_DEFAULT_PASSWORD:-123456}"
export RECEPTION_SESSION_SECRET="${RECEPTION_SESSION_SECRET:-}"
export ADMIN_SESSION_TTL_HOURS="${ADMIN_SESSION_TTL_HOURS:-12}"
export RECEPTION_SESSION_TTL_HOURS="${RECEPTION_SESSION_TTL_HOURS:-12}"
export CORS_ORIGINS="${CORS_ORIGINS:-}"

echo "Refreshing dependencies..."
"${NPM_BIN}" ci --omit=dev --no-audit --no-fund
popd >/dev/null

chown -R "${SERVICE_NAME}:${SERVICE_NAME}" "${DATA_DIR}" "${LOG_DIR}" "${UPLOAD_DIR}"

systemctl start "${SERVICE_NAME}"

echo
echo "Visitor Access updated successfully."
echo "Service restarted: ${SERVICE_NAME}"
