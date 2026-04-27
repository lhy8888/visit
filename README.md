# Visitor Access

A lightweight, self-hosted visitor management system for small offices, reception desks, shared workspaces, schools, labs, and private business sites.

Visitor Access replaces paper sign-in sheets and scattered Excel records with a simple browser-based workflow: visitors pre-register through a public link, receive a visitor number, PIN, and QR code, then check in at reception when they arrive.

It is designed for teams that want a practical visitor system without buying a complex enterprise platform or operating a separate database server.

## Why Visitor Access

Most small offices do not need a heavy visitor management suite. They need a clean, reliable way to answer a few everyday questions:

- Who is expected today?
- Who has already arrived?
- Who is still waiting to check in?
- Who visited last week, last month, or this year?
- Can reception export the visitor log when needed?

Visitor Access focuses on exactly that.

## Key features

### Public visitor registration

Share one generic registration link with guests, contractors, interviewees, delivery partners, or customers. Visitors fill in their details before arrival using the browser on their own phone or computer.

After submission, the system creates a visitor pass with:

- a unique visitor number
- a short PIN code
- a QR code for reception check-in
- the planned visit date and host name

The visitor pass is shown immediately after submission. It is intended as a convenience page for the visitor to save, print, or show at reception.

### Reception check-in

Reception staff can check visitors in quickly by:

- entering the PIN
- entering the visitor number
- scanning the QR code with a tablet or front-desk device

The reception page shows a live view of today's expected visitors, checked-in visitors, and future registrations.

### Admin dashboard

The admin dashboard gives front desk or office managers a simple operational view:

- today's visitor queue
- visitor history search
- status filtering
- summary statistics
- Excel export for reporting and audit records
- configurable site title, welcome message, logo, PIN length, and check-in options

### Simple deployment

Visitor Access is built for self-hosted deployment:

- no external database server
- no Docker requirement
- SQLite single-file storage
- browser-based user interface
- suitable for Windows or Linux server deployment

The application stores live data in a local SQLite database file, making backup and migration straightforward.

## Typical use cases

Visitor Access is suitable for:

- offices with around 20 to 200 staff
- front desks that currently use paper forms or Excel sheets
- companies that need a simple visitor log
- internal server deployment inside a company network
- reception tablets or iPads used as check-in stations
- sites that want a lightweight visitor system before investing in enterprise access-control integration

## Visitor journey

1. A visitor opens the public registration page in their browser.
2. The visitor enters their name, company, contact details, host name, visit purpose, and planned visit date.
3. The system creates a visitor number, PIN, and QR code.
4. The visitor saves or shows the visitor pass page.
5. The visitor arrives at reception.
6. Reception checks the visitor in by PIN, visitor number, or QR scan.
7. The visitor appears in the checked-in list.
8. Reception or admin users can search, filter, and export records later.

## Main pages

| Page | Purpose |
| --- | --- |
| `/` | Public visitor registration form |
| `/result/:registerNo` | Visitor pass page shown after registration |
| `/reception` | Front desk check-in page |
| `/admin` | Admin dashboard and reporting |

## Quick start

### Requirements

- Node.js `22.13.0` or newer
- Windows, Linux, or macOS server/PC to run the application
- A modern web browser such as Chrome, Edge, Safari, or Firefox to open the visitor, reception, and admin pages

The application itself does not include a custom browser. Users and reception staff access it through a normal web browser.

### Install and run

```bash
npm install
npm start
```

Then open:

- Public registration: `http://localhost:3001/`
- Reception desk: `http://localhost:3001/reception`
- Admin dashboard: `http://localhost:3001/admin`

Default admin account:

```text
Username: admin
Password: 123456
```

Change the default admin password before using the system in a real office environment.

## Data and backup

Visitor Access uses SQLite as its live datastore.

- Database file: `data/visitor.db`
- Public and admin settings are stored in SQLite
- No MySQL, PostgreSQL, Redis, or external database service is required

For backup, stop the application or ensure no writes are in progress, then copy the `data/visitor.db` file to a secure location.

## Export and reporting

The admin dashboard can export visitor records to Excel for:

- monthly visitor reports
- annual visitor logs
- compliance checks
- reception handover records
- internal audit support

Visitor records can be filtered by date range, status, and keyword before export.

## Security notes

Visitor Access includes basic security controls suitable for a lightweight internal office system:

- admin username/password login
- session cookie based admin access
- input validation
- request rate limiting
- local SQLite storage
- no PIN-only admin login

For public internet exposure, place the application behind HTTPS and your normal firewall, reverse proxy, or access-control layer.

## Configuration

Admin users can manage common site settings from the dashboard, including:

- site title
- welcome message
- logo path
- PIN length
- data retention period
- QR check-in availability
- PIN check-in availability

## API overview

Most users do not need the API directly. The main supported API groups are:

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

## Project positioning

Visitor Access is intentionally small and focused. It is not an enterprise access-control platform, HR system, or full security suite. It is a practical self-hosted visitor registration and reception check-in system for organizations that need something cleaner than paper or Excel, but simpler than a large commercial platform.
