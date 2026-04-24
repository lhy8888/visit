const fs = require('fs').promises;
const path = require('path');
const { closeDatabase, openDatabase } = require('../src/db/sqlite');
const VisitorRepository = require('../src/repositories/VisitorRepository');

describe('SQLite VisitorRepository', () => {
  const testDir = path.join(__dirname, 'sqlite-test-data');
  let dbPath;
  let repository;

  beforeAll(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });

  afterAll(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors in tests.
    }
  });

  afterEach(async () => {
    if (dbPath) {
      closeDatabase(dbPath);
      await fs.rm(dbPath, { force: true }).catch(() => {});
    }
  });

  test('uses SQLite only by default', async () => {
    dbPath = path.join(testDir, `visitor-${Date.now()}-${Math.random().toString(16).slice(2)}.db`);

    repository = new VisitorRepository({ dbPath });

    const created = await repository.create({
      nom: 'Martin',
      prenom: 'Jean',
      societe: 'Tech Solutions',
      email: 'jean.martin@example.com',
      telephone: '0123456789',
      personneVisitee: 'Marie Dubois'
    });

    expect(created.id).toBeTruthy();
    expect(created.heureSortie).toBeNull();

    const visitors = await repository.findAll();
    expect(visitors).toHaveLength(1);
    expect(visitors[0].email).toBe('jean.martin@example.com');
  });

  test('creates the admin_sessions table during SQLite bootstrap', async () => {
    dbPath = path.join(testDir, `visitor-${Date.now()}-${Math.random().toString(16).slice(2)}.db`);

    openDatabase(dbPath);

    const db = openDatabase(dbPath);
    const table = db.prepare(`
      SELECT name
      FROM sqlite_master
      WHERE type = 'table' AND name = 'admin_sessions'
      LIMIT 1
    `).get();

    expect(table).toBeTruthy();
    expect(table.name).toBe('admin_sessions');
  });

  test('updates and checks out a visitor in SQLite', async () => {
    dbPath = path.join(testDir, `visitor-${Date.now()}-${Math.random().toString(16).slice(2)}.db`);
    repository = new VisitorRepository({ dbPath });

    const created = await repository.create({
      nom: 'Smith',
      prenom: 'Anna',
      email: 'anna.smith@example.com',
      personneVisitee: 'Reception'
    });

    const updated = await repository.update(created.id, {
      societe: 'New Company'
    });
    expect(updated.societe).toBe('New Company');

    const checkedOut = await repository.checkOut('anna.smith@example.com');
    expect(checkedOut.heureSortie).toBeTruthy();
    expect(checkedOut.statut).toBe('parti');

    const byId = await repository.findById(created.id);
    expect(byId.heureSortie).toBeTruthy();
  });

  test('deletes all visitors from SQLite', async () => {
    dbPath = path.join(testDir, `visitor-${Date.now()}-${Math.random().toString(16).slice(2)}.db`);
    repository = new VisitorRepository({ dbPath });

    await repository.create({
      nom: 'One',
      prenom: 'Visitor',
      email: 'one@example.com',
      personneVisitee: 'Desk'
    });

    await repository.deleteAll();

    const visitors = await repository.findAll();
    expect(visitors).toHaveLength(0);
  });
});
