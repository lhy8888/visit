# Restart Procedure

Use this procedure when you need to restart the Node app during local development or deployment.

## Stop the app

- If the app runs in a terminal, press `Ctrl+C`
- If it runs as a background process, stop that process with your service manager

## Start the app again

```bash
npm start
```

## Check that it is up

```bash
curl http://localhost:3001/health
```

## Useful notes

- The app uses `data/visitor.db` for SQLite storage
- `visitors.json` is backup-only by default and does not stay mirrored unless `VISITOR_JSON_COMPAT_MODE=1`
- If you changed environment variables or migration files, restart the app after the change
- If you imported old JSON data, rerun `npm run migrate:json-to-sqlite` only once unless you want to import again

## Common issues

- Port already in use: stop the old Node process first
- Missing data directory: run `npm install` or `npm run init`
- Database locked: make sure only one app process is using `data/visitor.db`
