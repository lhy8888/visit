# Migration Notes

The app now uses SQLite as the only live datastore.

## What changed

- Main storage is `data/visitor.db`
- Public registration creates a pre-registration
- Reception check-in uses PIN, register number, or QR
- Admin auth uses session cookies
- Public and admin settings read from SQLite `app_settings`

## Legacy routes

Some old routes may still exist behind deprecation handling for backward compatibility, but the supported paths are the new SQLite-backed ones.

## Primary routes

- `POST /api/registrations`
- `GET /api/registrations/:registerNo`
- `GET /api/reception/today`
- `POST /api/checkin/by-pin`
- `POST /api/checkin/by-qr`
- `POST /api/checkout/:id`
- `GET /api/admin/dashboard/today`
- `GET /api/admin/visitors`
- `GET /api/admin/stats/summary`
- `GET /api/admin/export.xlsx`
- `GET /api/admin/export.xlsx`
- `GET /api/admin/settings`
- `PUT /api/admin/settings`

## Admin login

- New login uses username and password
- Default account: `admin / 123456`
- Session cookie name: `visitor_admin_session`

## Rollback

If you need to roll back application code, restore the previous commit. The live data store remains SQLite.
