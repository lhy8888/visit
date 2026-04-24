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
- If you changed environment variables or migration files, restart the app after the change
- There is no JSON mirror or import step in the normal runtime

## Common issues

- Port already in use: stop the old Node process first
- Missing data directory: run `npm install` or `npm run init`
- Database locked: make sure only one app process is using `data/visitor.db`
