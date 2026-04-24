#!/usr/bin/env node

const { assertNodeRuntime } = require('../src/utils/runtime');

try {
  assertNodeRuntime();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
