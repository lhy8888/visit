# Migration and Upgrade Notes

Visitor Access now uses SQLite as its only live datastore.

This document is for maintainers upgrading from the earlier JSON-based visitor register implementation. New installations do not need to use the legacy JSON workflow.

## Current storage model

The current application stores live data in:

```text
data/visitor.db
```

The SQLite database stores:

- visitor registrations
- check-in and check-out status
- admin users
- admin sessions
- public and admin settings

Runtime visitor data is no longer designed around a live JSON file.

## What changed from the old version

Earlier versions worked more like a direct arrival/departure log. The current version is a visitor pre-registration and reception check-in system.

Major changes:

- public form creates a pre-registration instead of an immediate arrival record
- each visitor receives a visitor number, PIN, and QR code
- reception can check in visitors by PIN, visitor number, or QR
- admin login uses username/password and session cookies
- public and admin settings are stored in SQLite
- Excel export replaces manual spreadsheet-style record keeping
- legacy admin compatibility routes have been removed from the normal route surface

## Supported primary routes

Public and visitor-facing routes:

- `POST /api/registrations`
- `GET /api/registrations/:registerNo`
- `GET /api/public/config`
- `GET /api/welcome-message`

Reception routes:

- `GET /api/reception/today`
- `POST /api/checkin/by-pin`
- `POST /api/checkin/by-qr`
- `POST /api/checkout/:id`

Admin routes:

- `POST /api/admin/login`
- `POST /api/admin/logout`
- `GET /api/admin/session`
- `GET /api/admin/dashboard/today`
- `GET /api/admin/visitors`
- `GET /api/admin/stats/summary`
- `GET /api/admin/export.xlsx`
- `PATCH /api/admin/visitors/:id/void`
- `GET /api/admin/settings`
- `PUT /api/admin/settings`

## Admin login

The supported admin login model is:

```text
username + password + session cookie
```

Default development account:

```text
admin / 123456
```

The earlier PIN-only admin login flow is not part of the supported runtime model.

## JSON data migration

If you have an old `visitors.json` file from an earlier version, migrate the data into SQLite before using the new system.

Recommended approach:

1. Back up the existing project folder.
2. Back up the old `data/visitors.json` file.
3. Install the current application version.
4. Run the available migration script if your branch still contains it.
5. Verify the imported records in the admin dashboard.
6. Keep the old JSON file only as an archive backup.

New installations should not create or rely on a live JSON visitor store.

## Backup and restore

For normal backup:

1. Stop the application, or ensure no write operation is in progress.
2. Copy `data/visitor.db` to secure backup storage.
3. Keep backups protected because they may contain personal visitor information.

For restore:

1. Stop the application.
2. Replace `data/visitor.db` with the backup file.
3. Start the application.
4. Verify the admin dashboard and recent visitor records.

## Upgrade checklist

After upgrading, check:

- public registration page opens correctly
- visitor pass page shows visitor number, PIN, and QR code
- reception page can check in a visitor by PIN or number
- admin login works with username/password
- admin dashboard loads today's visitors
- Excel export downloads correctly
- public settings show the expected title, logo, and welcome message

## Rollback

If you need to roll back application code, restore the previous application commit and a matching database backup.

SQLite database files may evolve with schema migrations, so keep a backup before upgrading production data.
