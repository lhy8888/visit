# Visitor Register

Lightweight office visitor system for a small office of about 100 people.

## What it does

- Public generic registration link
- Auto-generated `registerNo`, PIN code, and QR token
- Reception check-in by PIN, register number, or QR scan
- Today dashboard for pending, checked-in, and future visitors
- History filtering and CSV export
- SQLite single-file storage
- Session-based admin authentication
- Legacy endpoints kept for migration and tests, marked as deprecated

## Main pages

- `/` Public registration form
- `/result/:registerNo` Registration result page
- `/reception` Front desk check-in page
- `/admin` Admin dashboard

## Quick start

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the app:
   ```bash
   npm start
   ```
3. Open these pages:
   - `http://localhost:3001/`
   - `http://localhost:3001/reception`
   - `http://localhost:3001/admin`

Default admin credentials:

- Username: `admin`
- Password: `123456`

## Data files

- `data/visitor.db` is the SQLite database
- `data/config.json` stores application settings
- `data/visitors.json` is only used for legacy import or backup

## Migration from JSON

If you already have legacy JSON data, import it into SQLite with:

```bash
npm run migrate:json-to-sqlite
```

The migration reads `data/visitors.json` and imports records into `data/visitor.db`.

## API summary

### Public

- `GET /api/public/config`
- `GET /api/welcome-message`
- `POST /api/registrations`
- `GET /api/registrations/:registerNo`

### Reception

- `GET /api/reception/today`
- `POST /api/checkin/by-pin`
- `POST /api/checkin/by-qr`
- `POST /api/checkout/:id`

### Admin

- `POST /api/admin/login`
- `POST /api/admin/logout`
- `GET /api/admin/session`
- `GET /api/admin/dashboard/today`
- `GET /api/admin/visitors`
- `GET /api/admin/stats/summary`
- `GET /api/admin/export.csv`
- `PATCH /api/admin/visitors/:id/void`
- `GET /api/admin/settings`
- `PUT /api/admin/settings`

### Legacy compatibility

These routes still work, but they are deprecated:

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

## Development

- `npm test` runs the full test suite
- `npm run init` initializes the app and seeds the default admin account
- `npm run migrate:json-to-sqlite` imports legacy JSON visitors into SQLite

## Notes

- No external database server is required
- No Docker is required
- Legacy JSON endpoints are kept only for compatibility and gradual migration
