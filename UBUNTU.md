# Ubuntu Deployment

Visitor Access installs to a fixed path on Ubuntu:

- Application: `/opt/visitor-access`
- Config: `/etc/visitor-access/visitor-access.env`
- Data: `/var/lib/visitor-access/data`
- Logs: `/var/log/visitor-access/app.log`

## 1. Install

```bash
curl -fsSL https://raw.githubusercontent.com/lhy8888/visit/main/scripts/ubuntu/bootstrap.sh | sudo bash
```

## 2. Update

```bash
sudo bash /opt/visitor-access/scripts/ubuntu/update.sh
```

## 3. Uninstall

Remove the service only:

```bash
sudo bash /opt/visitor-access/scripts/ubuntu/uninstall.sh
```

Remove the service and all stored data:

```bash
sudo bash /opt/visitor-access/scripts/ubuntu/uninstall.sh --purge
```

Use `--purge` only when you want to delete the SQLite database, logs, and uploads too.

## Notes

- The installer clones the GitHub repository into `/opt/visitor-access`
- It creates a `systemd` service named `visitor-access`
- For changes to runtime settings, edit `/etc/visitor-access/visitor-access.env` and restart the service
