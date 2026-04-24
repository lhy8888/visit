const request = require('supertest');
const path = require('path');
const fs = require('fs');

process.env.NODE_ENV = 'test';
const testDataDir = path.join(__dirname, 'logo-upload-test-data');
process.env.DATA_DIR = testDataDir;
process.env.VISITORS_FILE = path.join(testDataDir, 'visitors.json');
process.env.CONFIG_FILE = path.join(testDataDir, 'config.json');
process.env.DB_FILE = path.join(testDataDir, 'visitor.db');

const { closeDatabase } = require('../src/db/sqlite');
const app = require('../server');

describe('Logo upload', () => {
  let adminAgent;
  const pngPath = path.join(__dirname, 'test-logo.png');
  const jpgPath = path.join(__dirname, 'test-logo.jpg');

  beforeAll(async () => {
    fs.mkdirSync(testDataDir, { recursive: true });
    fs.writeFileSync(pngPath, Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
      0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
      0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
      0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
      0x42, 0x60, 0x82
    ]));
    fs.writeFileSync(jpgPath, Buffer.from([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46,
      0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
      0x00, 0x48, 0x00, 0x00, 0xFF, 0xD9
    ]));
  });

  beforeEach(async () => {
    adminAgent = request.agent(app);
    await adminAgent
      .post('/api/admin/login')
      .send({
        username: 'admin',
        password: '123456'
      })
      .expect(200);
  });

  afterAll(async () => {
    closeDatabase(process.env.DB_FILE);

    [pngPath, jpgPath].forEach((filePath) => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });

    fs.rmSync(testDataDir, { recursive: true, force: true });
  });

  test('legacy logo upload endpoint is removed for PNG uploads', async () => {
    const response = await adminAgent
      .put('/api/admin/logo')
      .send({ logo: 'legacy-placeholder' })
      .expect(404);

    expect(response.body.success).toBe(false);
  });

  test('legacy logo upload endpoint is removed for JPG uploads', async () => {
    const response = await adminAgent
      .put('/api/admin/logo')
      .send({ logo: 'legacy-placeholder' })
      .expect(404);

    expect(response.body.success).toBe(false);
  });

  test('legacy logo upload endpoint is removed without a file', async () => {
    const response = await adminAgent
      .put('/api/admin/logo')
      .send({})
      .expect(404);

    expect(response.body.success).toBe(false);
  });
});
