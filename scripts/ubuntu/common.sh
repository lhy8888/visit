#!/usr/bin/env bash
set -euo pipefail

readonly SERVICE_NAME="visitor-access"
readonly DEFAULT_PORT="3001"
readonly DEFAULT_DATA_DIR="/var/lib/visitor-access/data"
readonly DEFAULT_LOG_DIR="/var/log/visitor-access"
readonly DEFAULT_UPLOAD_DIR="/var/lib/visitor-access/uploads"
readonly DEFAULT_CONFIG_DIR="/etc/visitor-access"

repo_root() {
  local script_dir
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  cd "${script_dir}/../.." && pwd
}

require_root() {
  if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
    echo "Please run this command with sudo or as root." >&2
    exit 1
  fi
}

require_command() {
  local command_name="$1"
  if ! command -v "${command_name}" >/dev/null 2>&1; then
    echo "Required command not found: ${command_name}" >&2
    exit 1
  fi
}

ensure_parent_dir() {
  local target_path="$1"
  mkdir -p "$(dirname "${target_path}")"
}

generate_hex_secret() {
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
}

escape_env_value() {
  local value="${1:-}"
  value="${value//\\/\\\\}"
  value="${value//\"/\\\"}"
  printf '"%s"' "${value}"
}

write_env_value() {
  local key="$1"
  local value="$2"
  printf '%s=%s\n' "${key}" "$(escape_env_value "${value}")"
}
