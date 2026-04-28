#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common.sh"

require_root
require_command node
require_command npm
require_command systemctl
require_command useradd
require_command groupadd

APP_DIR="${VISITOR_ACCESS_APP_DIR:-$(repo_root)}"
CONFIG_DIR="${VISITOR_ACCESS_CONFIG_DIR:-${DEFAULT_CONFIG_DIR}}"
DATA_DIR="${VISITOR_ACCESS_DATA_DIR:-${DEFAULT_DATA_DIR}}"
LOG_DIR="${VISITOR_ACCESS_LOG_DIR:-${DEFAULT_LOG_DIR}}"
UPLOAD_DIR="${VISITOR_ACCESS_UPLOAD_DIR:-${DEFAULT_UPLOAD_DIR}}"
PORT="${VISITOR_ACCESS_PORT:-${DEFAULT_PORT}}"
ADMIN_DEFAULT_USERNAME="${ADMIN_DEFAULT_USERNAME:-admin}"
ADMIN_DEFAULT_PASSWORD="${ADMIN_DEFAULT_PASSWORD:-}"
RECEPTION_SESSION_SECRET="${RECEPTION_SESSION_SECRET:-}"
CORS_ORIGINS="${CORS_ORIGINS:-}"
ENV_FILE="${CONFIG_DIR}/${SERVICE_NAME}.env"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
NPM_BIN="$(command -v npm)"

if [[ ! -f "${APP_DIR}/package.json" ]]; then
  echo "Could not find package.json at ${APP_DIR}" >&2
  echo "Run this from the repository root or set VISITOR_ACCESS_APP_DIR." >&2
  exit 1
fi

if [[ -z "${ADMIN_DEFAULT_PASSWORD}" || "${ADMIN_DEFAULT_PASSWORD}" == "123456" ]]; then
  ADMIN_DEFAULT_PASSWORD="$(node -e "console.log(require('crypto').randomBytes(12).toString('hex'))")"
  GENERATED_PASSWORD=1
else
  GENERATED_PASSWORD=0
fi

if [[ -z "${RECEPTION_SESSION_SECRET}" ]]; then
  RECEPTION_SESSION_SECRET="$(generate_hex_secret)"
fi

mkdir -p "${CONFIG_DIR}" "${DATA_DIR}" "${LOG_DIR}" "${UPLOAD_DIR}"

if ! getent group "${SERVICE_NAME}" >/dev/null 2>&1; then
  groupadd --system "${SERVICE_NAME}"
fi

if ! id -u "${SERVICE_NAME}" >/dev/null 2>&1; then
  useradd \
    --system \
    --gid "${SERVICE_NAME}" \
    --home-dir "${DATA_DIR}" \
    --shell /usr/sbin/nologin \
    "${SERVICE_NAME}"
fi

chown -R "${SERVICE_NAME}:${SERVICE_NAME}" "${DATA_DIR}" "${LOG_DIR}" "${UPLOAD_DIR}"

{
  write_env_value "NODE_ENV" "production"
  write_env_value "PORT" "${PORT}"
  write_env_value "DATA_DIR" "${DATA_DIR}"
  write_env_value "DB_FILE" "${DATA_DIR}/visitor.db"
  write_env_value "UPLOAD_DIR" "${UPLOAD_DIR}"
  write_env_value "LOG_FILE" "${LOG_DIR}/app.log"
  write_env_value "ADMIN_DEFAULT_USERNAME" "${ADMIN_DEFAULT_USERNAME}"
  write_env_value "ADMIN_DEFAULT_PASSWORD" "${ADMIN_DEFAULT_PASSWORD}"
  write_env_value "RECEPTION_SESSION_SECRET" "${RECEPTION_SESSION_SECRET}"
  write_env_value "ADMIN_SESSION_TTL_HOURS" "${ADMIN_SESSION_TTL_HOURS:-12}"
  write_env_value "RECEPTION_SESSION_TTL_HOURS" "${RECEPTION_SESSION_TTL_HOURS:-12}"
  write_env_value "CORS_ORIGINS" "${CORS_ORIGINS}"
} > "${ENV_FILE}"

chmod 600 "${ENV_FILE}"

pushd "${APP_DIR}" >/dev/null
export NODE_ENV=production
export PORT="${PORT}"
export DATA_DIR="${DATA_DIR}"
export DB_FILE="${DATA_DIR}/visitor.db"
export UPLOAD_DIR="${UPLOAD_DIR}"
export LOG_FILE="${LOG_DIR}/app.log"
export ADMIN_DEFAULT_USERNAME="${ADMIN_DEFAULT_USERNAME}"
export ADMIN_DEFAULT_PASSWORD="${ADMIN_DEFAULT_PASSWORD}"
export RECEPTION_SESSION_SECRET="${RECEPTION_SESSION_SECRET}"
export ADMIN_SESSION_TTL_HOURS="${ADMIN_SESSION_TTL_HOURS:-12}"
export RECEPTION_SESSION_TTL_HOURS="${RECEPTION_SESSION_TTL_HOURS:-12}"
export CORS_ORIGINS="${CORS_ORIGINS}"

echo "Installing application dependencies..."
"${NPM_BIN}" ci --omit=dev --no-audit --no-fund
popd >/dev/null

chown -R "${SERVICE_NAME}:${SERVICE_NAME}" "${DATA_DIR}" "${LOG_DIR}" "${UPLOAD_DIR}"

cat > "${SERVICE_FILE}" <<EOF
[Unit]
Description=Visitor Access
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${SERVICE_NAME}
Group=${SERVICE_NAME}
WorkingDirectory=${APP_DIR}
EnvironmentFile=${ENV_FILE}
ExecStart=${NPM_BIN} start
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now "${SERVICE_NAME}"

echo
echo "Visitor Access installed successfully."
echo "Service name: ${SERVICE_NAME}"
echo "Admin URL: http://localhost:${PORT}/admin"

if [[ "${GENERATED_PASSWORD}" -eq 1 ]]; then
  echo "Initial admin password: ${ADMIN_DEFAULT_PASSWORD}"
else
  echo "Initial admin password was taken from ADMIN_DEFAULT_PASSWORD."
fi

echo "Environment file: ${ENV_FILE}"
echo "Service file: ${SERVICE_FILE}"
