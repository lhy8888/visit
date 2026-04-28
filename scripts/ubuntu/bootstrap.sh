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
  sudo bash scripts/ubuntu/bootstrap.sh [--repo URL] [--branch NAME] [--dir PATH] [--force]

Examples:
  sudo bash scripts/ubuntu/bootstrap.sh --repo https://github.com/lhy8888/visit.git
  curl -fsSL https://raw.githubusercontent.com/lhy8888/visit/main/scripts/ubuntu/bootstrap.sh | sudo bash -s -- --repo https://github.com/lhy8888/visit.git
EOF
}

require_root
require_command git
require_command node
require_command npm
require_command systemctl

REPO_URL="${VISITOR_ACCESS_REPO_URL:-${DEFAULT_REPO_URL}}"
BRANCH="${VISITOR_ACCESS_BRANCH:-${DEFAULT_BRANCH}}"
APP_DIR="${VISITOR_ACCESS_APP_DIR:-${DEFAULT_APP_DIR}}"
FORCE=0
POSITIONAL_REPO_URL=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo)
      if [[ $# -lt 2 ]]; then
        echo "--repo requires a repository URL" >&2
        exit 1
      fi
      REPO_URL="${2:-}"
      shift 2
      ;;
    --branch)
      if [[ $# -lt 2 ]]; then
        echo "--branch requires a branch name" >&2
        exit 1
      fi
      BRANCH="${2:-}"
      shift 2
      ;;
    --dir)
      if [[ $# -lt 2 ]]; then
        echo "--dir requires a directory path" >&2
        exit 1
      fi
      APP_DIR="${2:-}"
      shift 2
      ;;
    --force)
      FORCE=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      if [[ -z "${POSITIONAL_REPO_URL}" ]]; then
        POSITIONAL_REPO_URL="$1"
        shift
      else
        echo "Unknown argument: $1" >&2
        usage >&2
        exit 1
      fi
      ;;
  esac
done

if [[ -n "${POSITIONAL_REPO_URL}" ]]; then
  REPO_URL="${POSITIONAL_REPO_URL}"
fi

if [[ -d "${APP_DIR}/.git" ]]; then
  echo "Updating existing checkout at ${APP_DIR}"
  git -C "${APP_DIR}" fetch origin --prune
  git -C "${APP_DIR}" checkout "${BRANCH}"
  git -C "${APP_DIR}" pull --ff-only origin "${BRANCH}"
elif [[ -e "${APP_DIR}" ]]; then
  if [[ "${FORCE}" -ne 1 ]]; then
    echo "Target directory already exists and is not a git checkout: ${APP_DIR}" >&2
    echo "Use --force to remove it before cloning." >&2
    exit 1
  fi

  rm -rf "${APP_DIR}"
  mkdir -p "$(dirname "${APP_DIR}")"
  git clone --branch "${BRANCH}" "${REPO_URL}" "${APP_DIR}"
else
  mkdir -p "$(dirname "${APP_DIR}")"
  git clone --branch "${BRANCH}" "${REPO_URL}" "${APP_DIR}"
fi

if [[ ! -f "${APP_DIR}/package.json" ]]; then
  echo "Repository checkout is missing package.json: ${APP_DIR}" >&2
  exit 1
fi

echo "Starting application install from ${REPO_URL}..."
VISITOR_ACCESS_APP_DIR="${APP_DIR}" bash "${APP_DIR}/scripts/ubuntu/install.sh"
