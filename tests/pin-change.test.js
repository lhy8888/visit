const request = require('supertest');
const path = require('path');
const fs = require('fs').promises;

process.env.NODE_ENV = 'test';
const testDataDir = path.join(__dirname, 'pin-change-test-data');
process.env.DATA_DIR = testDataDir;
process.env.VISITORS_FILE = path.join(testDataDir, 'visitors.json');
process.env.CONFIG_FILE = path.join(testDataDir, 'config.json');
process.env.DB_FILE = path.join(testDataDir, 'visitor.db');

const ConfigRepository = require('../src/repositories/ConfigRepository');
const Config = require('../src/models/Config');
const { closeDatabase } = require('../src/db/sqlite');
const app = require('../server');

describe('PIN change compatibility tests', () => {
  let configRepo;
  let adminAgent;
  const originalPin = '123456';
  const defaultPinHash = Config.hashPin(originalPin);

  beforeAll(async () => {
    await fs.mkdir(testDataDir, { recursive: true });
  });

  beforeEach(async () => {
    configRepo = new ConfigRepository();
    await configRepo.resetToDefaults();

    adminAgent = request.agent(app);
    await adminAgent
      .post('/api/admin/login')
      .send({
        username: 'admin',
        password: '123456'
      })
      .expect(200);

    await new Promise((resolve) => setTimeout(resolve, 200));
  });

  afterAll(async () => {
    await new ConfigRepository().resetToDefaults();
    closeDatabase(process.env.DB_FILE);
    await fs.rm(testDataDir, { recursive: true, force: true });
  });

  test('changes the PIN with a valid 4 digit code', async () => {
    const newPin = '1234';
    const response = await adminAgent
      .post('/api/admin/change-pin')
      .send({ newPin })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Code PIN mis à jour avec succès');

    const config = await configRepo.getConfig();
    expect(config.verifyPin(newPin)).toBe(true);
    expect(config.pinCodeHash).not.toBe(defaultPinHash);
  });

  test('changes the PIN with a valid 6 digit code', async () => {
    const newPin = '654321';
    const response = await adminAgent
      .post('/api/admin/change-pin')
      .send({ newPin })
      .expect(200);

    expect(response.body.success).toBe(true);
    const config = await configRepo.getConfig();
    expect(config.verifyPin(newPin)).toBe(true);
  });

  test('rejects a PIN that is too short', async () => {
    const response = await adminAgent
      .post('/api/admin/change-pin')
      .send({ newPin: '123' })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error.message).toContain('Le code PIN doit contenir entre 4 et 6 chiffres');
  });

  test('rejects a PIN that is too long', async () => {
    const response = await adminAgent
      .post('/api/admin/change-pin')
      .send({ newPin: '1234567' })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error.message).toContain('Le code PIN doit contenir entre 4 et 6 chiffres');
  });

  test('rejects a PIN with non numeric characters', async () => {
    const response = await adminAgent
      .post('/api/admin/change-pin')
      .send({ newPin: '12a4' })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error.message).toContain('Le code PIN ne peut contenir que des chiffres');
  });

  test('rejects a missing PIN value', async () => {
    const response = await adminAgent
      .post('/api/admin/change-pin')
      .send({})
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error.message).toContain('Le nouveau code PIN est requis');
  });
});
