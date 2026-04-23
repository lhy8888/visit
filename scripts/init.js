#!/usr/bin/env node

/**
 * Initial setup script for the visitor management app.
 * Creates folders, copies sample JSON files, and primes SQLite.
 */

const fs = require('fs');
const path = require('path');
const { openDatabase, closeDatabase } = require('../src/db/sqlite');
const AdminUserRepository = require('../src/repositories/AdminUserRepository');

console.log('Initializing visitor management app...\n');

const dataDir = path.join(__dirname, '..', 'data');
const logsDir = path.join(__dirname, '..', 'logs');
const imagesDir = path.join(__dirname, '..', 'public', 'images');

const configFile = path.join(dataDir, 'config.json');
const visitorsFile = path.join(dataDir, 'visitors.json');
const configExample = path.join(dataDir, 'config.example.json');
const visitorsExample = path.join(dataDir, 'visitors.example.json');

function ensureDirectoryExists(dirPath, description) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created folder: ${description} (${dirPath})`);
  } else {
    console.log(`Folder already exists: ${description} (${dirPath})`);
  }
}

function copyExampleFile(examplePath, targetPath, description) {
  if (fs.existsSync(targetPath)) {
    console.log(`File already exists: ${description} (${path.basename(targetPath)})`);
    return;
  }

  if (fs.existsSync(examplePath)) {
    fs.copyFileSync(examplePath, targetPath);
    console.log(`Created file: ${description} (${path.basename(targetPath)})`);
    return;
  }

  console.log(`Missing example file: ${examplePath}`);
}

function createDefaultLogoPlaceholder() {
  const logoPath = path.join(imagesDir, 'logo.png');
  if (fs.existsSync(logoPath)) {
    console.log('Logo already exists.');
    return;
  }

  const placeholderPath = path.join(imagesDir, '.gitkeep');
  fs.writeFileSync(placeholderPath, '# Placeholder for uploaded images\n');
  console.log('Created placeholder for public/images');
  console.log('Add your company logo as public/images/logo.png');
}

try {
  console.log('Creating folders...');
  ensureDirectoryExists(dataDir, 'Data folder');
  ensureDirectoryExists(logsDir, 'Logs folder');
  ensureDirectoryExists(imagesDir, 'Images folder');

  console.log('\nCopying sample files...');
  copyExampleFile(configExample, configFile, 'Main configuration');
  copyExampleFile(visitorsExample, visitorsFile, 'Legacy visitors snapshot');

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
  console.log('1. Edit data/config.json');
  console.log('2. Add your logo to public/images/logo.png');
  console.log('3. SQLite database visitor.db is ready in data/');
  console.log('4. Start the app with npm start');
  console.log('5. Default admin account: admin / 123456');
  console.log('6. You can still change the legacy PIN in admin settings');
} catch (error) {
  console.error('Initialization failed:', error.message);
  process.exit(1);
}
