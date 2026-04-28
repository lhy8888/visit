#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common.sh"

require_root
require_command systemctl

APP_DIR="${VISITOR_ACCESS_APP_DIR:-$(repo_root)}"
CONFIG_DIR="${VISITOR_ACCESS_CONFIG_DIR:-${DEFAULT_CONFIG_DIR}}"
DATA_DIR="${VISITOR_ACCESS_DATA_DIR:-${DEFAULT_DATA_DIR}}"
LOG_DIR="${VISITOR_ACCESS_LOG_DIR:-${DEFAULT_LOG_DIR}}"
UPLOAD_DIR="${VISITOR_ACCESS_UPLOAD_DIR:-${DEFAULT_UPLOAD_DIR}}"
ENV_FILE="${CONFIG_DIR}/${SERVICE_NAME}.env"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
PURGE_DATA=0

for arg in "$@"; do
  case "${arg}" in
    --purge)
      PURGE_DATA=1
      ;;
    *)
      echo "Unknown argument: ${arg}" >&2
      echo "Usage: sudo bash scripts/ubuntu/uninstall.sh [--purge]" >&2
      exit 1
      ;;
  esac
done

if systemctl list-unit-files --type=service | grep -q "^${SERVICE_NAME}\.service"; then
  systemctl stop "${SERVICE_NAME}" || true
  systemctl disable "${SERVICE_NAME}" || true
fi

rm -f "${SERVICE_FILE}"
rm -f "${ENV_FILE}"
systemctl daemon-reload

if [[ "${PURGE_DATA}" -eq 1 ]]; then
  rm -rf "${APP_DIR}"
  rm -rf "${DATA_DIR}" "${LOG_DIR}" "${UPLOAD_DIR}"
  if id -u "${SERVICE_NAME}" >/dev/null 2>&1; then
    userdel "${SERVICE_NAME}" || true
  fi
  if getent group "${SERVICE_NAME}" >/dev/null 2>&1; then
    groupdel "${SERVICE_NAME}" || true
  fi
  echo "Application data, logs, uploads, and system user removed."
else
  echo "Service removed. Data was kept in:"
  echo "  ${APP_DIR}"
  echo "  ${DATA_DIR}"
  echo "  ${LOG_DIR}"
  echo "  ${UPLOAD_DIR}"
  echo "Use --purge to remove those directories as well."
fi

echo "Visitor Access uninstalled from systemd."
echo "Application checkout path: ${APP_DIR}"
