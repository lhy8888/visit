#!/usr/bin/env node

/**
 * One-time migration script from legacy visitors.json to SQLite.
 */

const fs = require('fs').promises;
const { assertNodeRuntime } = require('../src/utils/runtime');
assertNodeRuntime();
const config = require('../src/config/config');
const VisitorRepository = require('../src/repositories/VisitorRepository');

async function readLegacyVisitors(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    if (!raw.trim()) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error(`Expected an array in ${filePath}`);
    }

    return parsed;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }

    throw error;
  }
}

async function main() {
  const sourcePath = config.VISITORS_FILE;
  const visitors = await readLegacyVisitors(sourcePath);

  if (visitors === null) {
    console.log(`No legacy snapshot found at ${sourcePath}. Nothing to migrate.`);
    return;
  }

  const repository = new VisitorRepository({
    dbPath: config.DB_FILE,
    legacyFilePath: null
  });

  await repository.deleteAll();

  let imported = 0;
  for (const visitor of visitors) {
    await repository.create(visitor);
    imported += 1;
  }

  console.log(`Imported ${imported} visitors into ${config.DB_FILE}`);
}

main().catch((error) => {
  console.error('Migration failed:', error.message);
  process.exitCode = 1;
});
