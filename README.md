# paste.md

A web-based pastebin that renders Markdown content. Paste raw Markdown, get a shareable link that renders it beautifully.

Built with Next.js 16, React 19, SQLite, and server-side syntax highlighting via Shiki.

## Features

- GitHub Flavored Markdown (tables, task lists, strikethrough, footnotes)
- Syntax highlighting for code blocks (VS Code-quality, server-rendered)
- Light/dark theme
- Paste expiration (1 hour, 1 day, 1 week, 1 month, or never)
- Rate limiting
- XSS protection via rehype-sanitize and Content Security Policy headers
- Zero client-side JavaScript for paste viewing (Server Components)
- **Marp presentations**: pastes with a `marp: true` frontmatter render as
  interactive slide decks (keyboard + fullscreen navigation). Force a view with
  a URL suffix — `.marp` for slides, `.md` for the document — without changing
  the core `/id` URL format. Link directly to a slide by appending `#<n>`
  (e.g. `/abc123#3` opens on slide 3); the fragment updates as you navigate so
  the current slide is always shareable.
- **Custom paste names**: create a paste at a friendly URL
  (`/<custom-name>`) from the web editor, the JSON API, or `curl`
- **Admin login & internal dashboard**: a custom login page protects the
  internal paste-management dashboard (list, expiration edit, rename,
  delete) with the admin account configured in `admin.json`

## Prerequisites

- Node.js 22+ (uses `better-sqlite3` native module)
- npm

## Local Development

```bash
git clone https://github.com/your-user/paste.md.git
cd paste.md
npm install
npm run dev
```

The app starts at `http://localhost:3000`. The SQLite database is created automatically at `data/paste.db`.

## Deploy to a Linux Server

### Quick Setup (Rocky Linux)

A single script handles the full deployment — Node.js, build, systemd, nginx, firewall, and optional HTTPS:

```bash
# Public-facing server (attempts Let's Encrypt)
sudo bash setup.sh --domain paste.example.com

# Internal/corporate network (self-signed cert, no Let's Encrypt)
sudo bash setup.sh --internal --domain paste.internal.corp

# Internal with corporate CA certificate
sudo bash setup.sh --internal --ssl-cert /path/to/cert.crt --ssl-key /path/to/key.key

# Without a domain (self-signed, serves on the server's IP)
sudo bash setup.sh

# From a git repo instead of a local copy
sudo bash setup.sh --repo https://github.com/your-user/paste.md.git --domain paste.example.com
```

For step-by-step manual instructions, see below.

### Option A: Standalone Node.js (recommended for single-server setups)

#### 1. Prepare the server

```bash
# Install Node.js 22
curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
sudo dnf install -y nodejs

# Build tools for better-sqlite3 native compilation
sudo dnf groupinstall -y "Development Tools"
sudo dnf install -y python3
```

#### 2. Clone and build

```bash
git clone https://github.com/your-user/paste.md.git /opt/paste-md
cd /opt/paste-md
npm ci --include=dev
npm run build
```

#### 3. Create a data directory

The SQLite database lives at `data/paste.db` relative to the working directory. SQLite with WAL mode also creates `paste.db-wal` and `paste.db-shm` sidecar files, so the process needs **write access to both the file and the directory**:

```bash
mkdir -p /opt/paste-md/data
```

> **Note:** Ownership is set in the next step. If you see `SQLITE_READONLY` errors, check that the service user owns the `data/` directory and its contents — see [Troubleshooting](#troubleshooting) below.

#### 4. Create a system user

```bash
sudo useradd --system --no-create-home --shell /sbin/nologin paste-md
sudo chown -R paste-md:paste-md /opt/paste-md
```

#### 5. Create a systemd service

Create `/etc/systemd/system/paste-md.service`:

```ini
[Unit]
Description=paste.md
After=network.target

[Service]
Type=simple
User=paste-md
Group=paste-md
WorkingDirectory=/opt/paste-md
ExecStart=/usr/bin/node node_modules/.bin/next start --port 3000
Restart=on-failure
RestartSec=5

# Environment
Environment=NODE_ENV=production
Environment=PORT=3000

# Hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/paste-md/data
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now paste-md
sudo systemctl status paste-md
```

#### 6. Set up a reverse proxy (nginx)

```bash
sudo dnf install -y nginx
sudo systemctl enable --now nginx

# Allow nginx to proxy to Node.js (SELinux)
sudo setsebool -P httpd_can_network_connect 1

# Open firewall ports
# On Rocky Linux, firewalld may be masked by default — unmask and start it first
sudo systemctl unmask firewalld
sudo systemctl start firewalld
sudo systemctl enable firewalld
sudo firewall-cmd --permanent --add-service=http --add-service=https
sudo firewall-cmd --reload
```

Create `/etc/nginx/conf.d/paste-md.conf`:

```nginx
server {
    listen 80;
    server_name paste.example.com;

    client_max_body_size 2M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo nginx -t
sudo systemctl reload nginx
```

#### 7. Enable HTTPS with Let's Encrypt

```bash
sudo dnf install -y epel-release
sudo dnf install -y certbot python3-certbot-nginx
sudo certbot --nginx -d paste.example.com
```

Certbot sets up auto-renewal via a systemd timer.

---

### Option B: Docker

#### 1. Create a Dockerfile

Create `Dockerfile` in the project root:

```dockerfile
FROM node:22-slim AS base

# Install build tools for better-sqlite3
RUN apt-get update && apt-get install -y build-essential python3 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-slim AS runner
RUN apt-get update && apt-get install -y build-essential python3 && rm -rf /var/lib/apt/lists/*
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public 2>/dev/null || true
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/postcss.config.mjs ./postcss.config.mjs

RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

USER nextjs
EXPOSE 3000

CMD ["node", "node_modules/.bin/next", "start", "--port", "3000"]
```

Create `.dockerignore`:

```
node_modules
.next
data
.git
```

#### 2. Build and run

```bash
docker build -t paste-md .
docker run -d \
  --name paste-md \
  --restart unless-stopped \
  -p 3000:3000 \
  -v paste-md-data:/app/data \
  paste-md
```

The `-v paste-md-data:/app/data` flag persists the SQLite database across container restarts.

#### 3. Docker Compose (alternative)

Create `docker-compose.yml`:

```yaml
services:
  paste-md:
    build: .
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - paste-md-data:/app/data

volumes:
  paste-md-data:
```

```bash
docker compose up -d
```

Then set up nginx and HTTPS the same way as Option A (steps 6-7), pointing to `127.0.0.1:3000`.

---

## Updating

### Standalone

```bash
cd /opt/paste-md
git pull
npm ci --include=dev
npm run build
sudo systemctl restart paste-md
```

### Docker

```bash
docker compose down
git pull
docker compose up -d --build
```

## Backups

The entire application state is a single SQLite file at `data/paste.db`. To back it up safely while the app is running (WAL mode is enabled):

```bash
sqlite3 data/paste.db ".backup '/path/to/backup/paste-$(date +%Y%m%d).db'"
```

Or with a cron job:

```bash
0 3 * * * sqlite3 /opt/paste-md/data/paste.db ".backup '/backups/paste-$(date +\%Y\%m\%d).db'"
```

## Troubleshooting

### `SQLITE_READONLY` — attempt to write a readonly database

SQLite in WAL mode needs write access to the `data/` directory (not just the `.db` file) because it creates `-wal` and `-shm` sidecar files. This error means the Node.js process can't write to the database or its directory.

**Check permissions:**

```bash
ls -la /opt/paste-md/data/
```

**Fix:**

```bash
sudo chown -R paste-md:paste-md /opt/paste-md/data
sudo chmod 755 /opt/paste-md/data
sudo chmod 644 /opt/paste-md/data/paste.db 2>/dev/null || true
sudo systemctl restart paste-md
```

If using `ProtectSystem=strict` in the systemd unit (the default), ensure `ReadWritePaths=/opt/paste-md/data` is present in the service file.

## Admin login and internal dashboard

The admin account is configured in a JSON file next to the application root
(`<project>/admin.json`, e.g. `/opt/paste-md/admin.json`):

```bash
cp admin.example.json admin.json
# edit username, password, and sessionSecret
```

| Field | Description |
|-------|-------------|
| `username` | Admin username |
| `password` | Admin password |
| `sessionSecret` | Secret used to sign the session cookie (generate one, e.g. `python3 -c "import secrets; print(secrets.token_urlsafe(32))"`) |

`admin.json` is git-ignored. The path can be overridden with the
`ADMIN_CONFIG_PATH` environment variable.

Once configured, a **Login** link appears in the header next to the theme
toggle. Logging in (custom `/login` page — no browser popup) sets a signed,
httpOnly session cookie (7 days) and unlocks:

- **Pastes / Logout** links in the header
- **`/internal/pastes`** — the internal dashboard listing every paste with
  editable expiration, rename (`Rename...` field per row), and delete. Any
  unauthenticated access to `/internal/pastes` (or the admin server actions,
  or `DELETE /api/cleanup`) redirects to `/login`.

## Custom paste names (API)

Pastes can be created under a custom name with the JSON API:

```bash
curl -X POST https://paste.example.com/api/paste \
  -H "Content-Type: application/json" \
  -d '{"content": "# Hello", "expiration": "1w", "name": "hello-world"}'
# => {"id":"hello-world","url":"/hello-world"}
```

The `curl`-friendly upload endpoint accepts the same fields as JSON, a
multipart `name` field, or a `?name=` query parameter:

```bash
curl -X POST https://paste.example.com/api/paste/upload \
  -H "Content-Type: application/json" \
  -d '{"content": "# Hello", "expiration": "never", "name": "hello-world"}'
```

Rules: names may contain letters, numbers, dots, underscores and dashes
(max 64 characters), must not collide with an existing paste (409), and
reserved names (`login`, `logout`, `internal`, `api`, `_next`,
`favicon.ico`, `robots.txt`) are rejected. The web editor also exposes a
"Custom paste name (optional)" field next to the expiration selector.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Port the server listens on |
| `NODE_ENV` | `development` | Set to `production` for deployments |
| `ADMIN_CONFIG_PATH` | `./admin.json` | Path to the admin account configuration file |
| `SESSION_COOKIE_SECURE` | unset | Set to `true` to mark the session cookie `Secure` (HTTPS deployments) |
| `CLEANUP_SECRET` | unset | Bearer token for `DELETE /api/cleanup` (expired-paste purge) when called without an admin session |

## License

MIT
