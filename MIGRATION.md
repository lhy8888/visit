# Migration Guide

This guide explains the move from the old JSON-based visitor store to the new SQLite-backed system.

## What changed

- Main storage moved from `data/visitors.json` to `data/visitor.db`
- Public registration now creates a pre-registration instead of immediate arrival
- Reception check-in uses PIN, register number, or QR
- Admin auth now uses session cookies
- Legacy JSON routes still exist, but they are deprecated

## Migration steps

1. Back up your existing data directory.
2. Make sure dependencies are installed:
   ```bash
   npm install
   ```
3. Import the old JSON snapshot:
   ```bash
   npm run migrate:json-to-sqlite
   ```
4. Restart the app:
   ```bash
   npm start
   ```

## What the migration script does

- Reads `data/visitors.json`
- Creates or opens `data/visitor.db`
- Inserts the legacy visitor records into SQLite
- Leaves the old JSON file untouched as a backup snapshot

## Legacy compatibility

The following old routes are kept for compatibility and tests, but they are deprecated:

- `POST /api/check-in`
- `POST /api/check-out`
- `GET /api/admin/stats`
- `GET /api/admin/visitors/current`
- `GET /api/admin/visitors/history`
- `POST /api/admin/clear-visitors`
- `POST /api/admin/generate-test-visitors`
- `POST /api/admin/anonymize`
- `GET /api/admin/config`
- `PUT /api/admin/config`
- `POST /api/admin/change-pin`
- `PUT /api/admin/logo`
- `GET /api/admin/security`

## New primary routes

- `POST /api/registrations`
- `GET /api/registrations/:registerNo`
- `GET /api/reception/today`
- `POST /api/checkin/by-pin`
- `POST /api/checkin/by-qr`
- `POST /api/checkout/:id`
- `GET /api/admin/dashboard/today`
- `GET /api/admin/visitors`
- `GET /api/admin/stats/summary`
- `GET /api/admin/export.csv`
- `GET /api/admin/settings`
- `PUT /api/admin/settings`

## Admin login

- New login uses username and password
- Default account: `admin / 123456`
- Session cookie name: `visitor_admin_session`

## Rollback

If you need to roll back, keep the old `data/visitors.json` backup and point the app back to it only for archival or inspection. The new code path expects SQLite.
