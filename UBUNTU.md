# Ubuntu Deployment

Visitor Access can run on Ubuntu as a `systemd` service.

## Requirements

- Ubuntu with `systemd`
- Node.js `22.13.0` or newer
- `npm`
- `git`
- `sudo` access

The scripts assume Node and npm are installed system-wide, so `node` and `npm` are available in `/usr/bin` or the current root shell `PATH`.

## Recommended layout

Clone the repository into `/opt/visitor-access`:

```bash
sudo git clone https://github.com/lhy8888/visit.git /opt/visitor-access
cd /opt/visitor-access
```

## Install

If you want to fetch the app from GitHub and install it in one step, run:

```bash
curl -fsSL https://raw.githubusercontent.com/lhy8888/visit/main/scripts/ubuntu/bootstrap.sh | sudo bash -s -- --repo https://github.com/lhy8888/visit.git
```

If you already cloned the repository locally, run:

```bash
sudo bash scripts/ubuntu/install.sh
```

If you prefer npm wrappers:

```bash
sudo npm run ubuntu:bootstrap -- --repo https://github.com/lhy8888/visit.git
sudo npm run ubuntu:install
sudo npm run ubuntu:update
sudo npm run ubuntu:uninstall
```

What the installer does:

- creates the `visitor-access` system user
- creates the data, log, upload, and config directories
- installs Node dependencies with `npm ci --omit=dev`
- initializes SQLite and the default admin account
- creates and enables the `visitor-access` systemd service

The installer prints the initial admin password. If you do not provide one, it generates a random one.
If you need to change any runtime value later, edit `/etc/visitor-access/visitor-access.env` and restart the service.

## Update

Run:

```bash
sudo bash scripts/ubuntu/update.sh
```

The update script:

- stops the service
- pulls the latest `git` changes from the GitHub remote
- reinstalls dependencies
- restarts the service

## Uninstall

Remove the service only:

```bash
sudo bash scripts/ubuntu/uninstall.sh
```

Remove the service and stored data:

```bash
sudo bash scripts/ubuntu/uninstall.sh --purge
```

The default uninstall keeps the cloned application directory, SQLite database, log files, and uploads.

## Service commands

```bash
sudo systemctl status visitor-access
sudo systemctl restart visitor-access
sudo journalctl -u visitor-access -f
```

## Runtime paths

Default Linux paths used by the installer:

- Application: `/opt/visitor-access`
- Data: `/var/lib/visitor-access/data`
- Uploads: `/var/lib/visitor-access/uploads`
- Logs: `/var/log/visitor-access/app.log`
- Config: `/etc/visitor-access/visitor-access.env`

## Notes

- `site title`, `welcome message`, `timezone`, and other settings are managed from `/admin`
- `logo path` is uploaded from the admin settings page, not typed manually
- `npm install` and `npm start` still work for development
- The Ubuntu scripts are for production-style service installation
