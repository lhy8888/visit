#!/usr/bin/env bash
set -euo pipefail

readonly SERVICE_NAME="visitor-access"
readonly DEFAULT_REPO_URL="https://github.com/lhy8888/visit.git"
readonly DEFAULT_BRANCH="main"
readonly DEFAULT_APP_DIR="/opt/visitor-access"

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

usage() {
  cat <<'EOF'
Usage:
  curl -fsSL https://raw.githubusercontent.com/lhy8888/visit/main/scripts/ubuntu/bootstrap.sh | sudo bash
EOF
}

require_root
require_command git
require_command node
require_command npm
require_command systemctl

if [[ $# -gt 0 ]]; then
  echo "This installer uses a fixed GitHub repository and a fixed install path." >&2
  usage >&2
  exit 1
fi

APP_DIR="${DEFAULT_APP_DIR}"
BRANCH="${DEFAULT_BRANCH}"
REPO_URL="${DEFAULT_REPO_URL}"

if [[ -d "${APP_DIR}/.git" ]]; then
  echo "Updating existing checkout at ${APP_DIR}"
  git -C "${APP_DIR}" fetch origin --prune
  git -C "${APP_DIR}" checkout "${BRANCH}"
  git -C "${APP_DIR}" pull --ff-only origin "${BRANCH}"
elif [[ -e "${APP_DIR}" ]]; then
  echo "Target directory already exists and is not a git checkout: ${APP_DIR}" >&2
  echo "Remove it first, or run the purge uninstall command and retry." >&2
  exit 1
else
  mkdir -p "$(dirname "${APP_DIR}")"
  git clone --branch "${BRANCH}" "${REPO_URL}" "${APP_DIR}"
fi

if [[ ! -f "${APP_DIR}/package.json" ]]; then
  echo "Repository checkout is missing package.json: ${APP_DIR}" >&2
  exit 1
fi

echo "Starting application install from the fixed GitHub repository..."
VISITOR_ACCESS_APP_DIR="${APP_DIR}" bash "${APP_DIR}/scripts/ubuntu/install.sh"
