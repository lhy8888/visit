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

## Useful commands

- `npm test` - run the full test suite
- `npm run init` - re-run app initialization

## Notes

- The app stores its main data in `data/visitor.db`
- There is no JSON runtime store; SQLite is the only live datastore
- No external database server or Docker setup is required
