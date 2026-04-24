const MIN_SUPPORTED_NODE_VERSION = '22.13.0';

function parseVersion(version) {
  const parts = String(version || '').split('.').map((part) => Number.parseInt(part, 10));
  if (parts.length < 3 || parts.some((part) => Number.isNaN(part))) {
    throw new Error(`Invalid Node.js version: ${version}`);
  }

  return {
    major: parts[0],
    minor: parts[1],
    patch: parts[2]
  };
}

function compareVersions(leftVersion, rightVersion) {
  const left = parseVersion(leftVersion);
  const right = parseVersion(rightVersion);

  if (left.major !== right.major) {
    return left.major - right.major;
  }

  if (left.minor !== right.minor) {
    return left.minor - right.minor;
  }

  return left.patch - right.patch;
}

function assertNodeRuntime(options = {}) {
  const minVersion = options.minVersion || MIN_SUPPORTED_NODE_VERSION;
  const featureName = options.featureName || 'node:sqlite';
  const currentVersion = process.versions.node;

  if (compareVersions(currentVersion, minVersion) < 0) {
    throw new Error(
      `Node.js ${minVersion} or newer is required because this application uses ${featureName}. ` +
      `Current version: ${process.version}.`
    );
  }
}

module.exports = {
  assertNodeRuntime,
  compareVersions,
  MIN_SUPPORTED_NODE_VERSION,
  parseVersion
};
