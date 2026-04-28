# Visitor Access

Lightweight self-hosted visitor management for small offices and front desks.

## What it does

- One public visitor registration link
- Auto-generated visitor number, PIN code, and QR code
- Reception iPad page for PIN / QR check-in and direct walk-in registration
- Admin dashboard for today, history, summary stats, and Excel export
- SQLite single-file storage
- Session-based admin authentication
- 1-year data retention by default
- No live JSON datastore

## Main pages

- `/` Public visitor registration
- `/result/:registerNo` Visitor pass page after submission
- `/reception` Front desk iPad page
- `/admin` Admin dashboard

## Quick start

### Requirements

- Node.js `22.13.0` or newer
- npm
- A modern web browser

### Install and run

```bash
npm install
npm start
```

Then open:

- `http://localhost:3001/`
- `http://localhost:3001/reception`
- `http://localhost:3001/admin`

Default admin account:

- Username: `admin`
- Password: `123456`

Change the default password before using the system in a real office.

## Data and backup

- Database file: `data/visitor.db`
- Public and admin settings are stored in SQLite `app_settings`
- No MySQL, PostgreSQL, Redis, or external database server is required

For backup, stop the app or ensure no writes are in progress, then copy `data/visitor.db` to a secure location.

## Export and reporting

The admin dashboard can export visitor records to Excel for:

- monthly visitor reports
- annual visitor logs
- compliance checks
- reception handover records
- internal audit support

Visitor records can be filtered by date range, status, and keyword before export.

## Security notes

Visitor Access includes basic controls suitable for a lightweight internal office system:

- admin username/password login
- session cookie based admin access
- input validation
- local SQLite storage
- no PIN-only admin login

For internet exposure, place the app behind HTTPS and your normal firewall, reverse proxy, or WAF.

## Configuration

Admin users can manage common site settings from the dashboard, including:

- site title
- welcome message
- logo path
- PIN length
- data retention period
- QR check-in availability
- PIN check-in availability

The default retention period is 1 year.

## API overview

Most users do not need the API directly. The supported API groups are:

- public registration APIs
- reception check-in APIs
- authenticated admin dashboard APIs
- Excel export API

For integration work, inspect the route files under `src/routes/`.

## Development

```bash
npm test
npm run dev
```

Useful scripts:

- `npm start` - start the application
- `npm run dev` - start with nodemon
- `npm test` - run the test suite
- `npm run init` - initialize data folders and seed the default admin account

## Windows installer

To build the Windows installer locally:

```bash
npm run dist:win
```

The packaged installer is designed for GitHub Releases and produces a `Visit-Access-Setup-<version>.exe` file.
For development or internal use, `npm install` + `npm start` is still the simplest path.

## Ubuntu deployment

If you want to run Visitor Access on Ubuntu as a `systemd` service, use the Ubuntu guide:

- [UBUNTU.md](./UBUNTU.md)

The recommended install is a single fixed-path GitHub bootstrap:

```bash
curl -fsSL https://raw.githubusercontent.com/lhy8888/visit/main/scripts/ubuntu/bootstrap.sh | sudo bash
```

After installation, the app lives in `/opt/visitor-access`.

Use these fixed-path commands for maintenance:

```bash
sudo bash /opt/visitor-access/scripts/ubuntu/update.sh
sudo bash /opt/visitor-access/scripts/ubuntu/uninstall.sh
sudo bash /opt/visitor-access/scripts/ubuntu/uninstall.sh --purge
```

## Project positioning

Visitor Access is intentionally small and focused. It is not an enterprise access-control platform, HR system, or full security suite. It is a practical self-hosted visitor registration and reception check-in system for organizations that want something cleaner than paper or Excel, but simpler than a large commercial platform.
