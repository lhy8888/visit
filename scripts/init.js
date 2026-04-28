#!/usr/bin/env node

/**
 * Initial setup script for the visitor management app.
 * Creates folders and primes SQLite.
 */

const fs = require('fs');
const path = require('path');
const { assertNodeRuntime } = require('../src/utils/runtime');
const config = require('../src/config/config');

assertNodeRuntime();
const { openDatabase, closeDatabase } = require('../src/db/sqlite');
const AdminUserRepository = require('../src/repositories/AdminUserRepository');

console.log('Initializing visitor management app...\n');

const dataDir = config.DATA_DIR;
const logsDir = path.dirname(config.LOG_FILE);
const imagesDir = config.UPLOAD_DIR;

function ensureDirectoryExists(dirPath, description) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created folder: ${description} (${dirPath})`);
  } else {
    console.log(`Folder already exists: ${description} (${dirPath})`);
  }
}

function createDefaultLogoPlaceholder() {
  const logoPath = path.join(imagesDir, 'logo.svg');
  if (fs.existsSync(logoPath)) {
    console.log('Logo already exists.');
    return;
  }

  const logoSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 96" role="img" aria-label="Visitor Access">
  <rect width="320" height="96" rx="20" fill="#eaf1f8"/>
  <circle cx="56" cy="48" r="28" fill="#17324d"/>
  <path d="M40 32h32v8H56l8 24h-8l-8-22-8 22h-8l8-24H40z" fill="#ffffff"/>
  <text x="104" y="44" fill="#17324d" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700">Visitor</text>
  <text x="104" y="68" fill="#5d7187" font-family="Arial, Helvetica, sans-serif" font-size="14">Access</text>
</svg>`;
  fs.writeFileSync(logoPath, logoSvg, 'utf8');
  console.log('Created default logo placeholder at public/images/logo.svg');
}

try {
  console.log('Creating folders...');
  ensureDirectoryExists(dataDir, 'Data folder');
  ensureDirectoryExists(logsDir, 'Logs folder');
  ensureDirectoryExists(imagesDir, 'Images folder');

  console.log('\nInitialising SQLite database...');
  openDatabase();
  const adminRepository = new AdminUserRepository();
  adminRepository.ensureDefaultAdmin();
  closeDatabase();
  console.log('SQLite database ready.');

  console.log('\nSetting up logo placeholder...');
  createDefaultLogoPlaceholder();

  console.log('\nInitialization complete.');
  console.log('\nNext steps:');
  console.log('1. Review settings in the admin panel at /admin');
  console.log(`2. Add your logo to ${path.join(imagesDir, 'logo.svg')}`);
  console.log(`3. SQLite database visitor.db is ready in ${dataDir}/`);
  console.log('4. Start the app with npm start');
  console.log('5. Default admin account: admin / 123456');
} catch (error) {
  console.error('Initialization failed:', error.message);
  process.exit(1);
}
