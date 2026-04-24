# Installation Guide

This project runs as a simple Node app with a local SQLite database.

## Requirements

- Node.js 22.13.0 or newer
- npm
- A modern browser

## Install

```bash
npm install
```

The postinstall step creates the data directories, initializes the SQLite database, and seeds the default admin account.

## Start

```bash
npm start
```

Open:

- `http://localhost:3001/`
- `http://localhost:3001/reception`
- `http://localhost:3001/admin`

## Default admin

- Username: `admin`
- Password: `123456`
- Admin login is session-based and uses username/password only.

Change this password after the first login.

## Optional migration from legacy JSON

If you already have old visitor data in `data/visitors.json`, import it into SQLite:

```bash
npm run migrate:json-to-sqlite
```

## Useful commands

- `npm test` - run the full test suite
- `npm run init` - re-run app initialization
- `npm run migrate:json-to-sqlite` - import legacy JSON data into SQLite

## Notes

- The app stores its main data in `data/visitor.db`
- `data/visitors.json` is migration/backup only unless `VISITOR_JSON_COMPAT_MODE=1`
- No external database server or Docker setup is required
