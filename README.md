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

### Option A: Standalone Node.js (recommended for single-server setups)

#### 1. Prepare the server

```bash
# Install Node.js 22 (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install build tools for better-sqlite3 native compilation
sudo apt-get install -y build-essential python3
```

#### 2. Clone and build

```bash
git clone https://github.com/your-user/paste.md.git /opt/paste-md
cd /opt/paste-md
npm ci --include=dev
npm run build
```

#### 3. Create a data directory

The SQLite database lives at `data/paste.db` relative to the working directory. Ensure the directory exists and is writable:

```bash
mkdir -p /opt/paste-md/data
```

#### 4. Create a system user

```bash
sudo useradd --system --no-create-home --shell /usr/sbin/nologin paste-md
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
sudo apt-get install -y nginx
```

Create `/etc/nginx/sites-available/paste-md`:

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
sudo ln -s /etc/nginx/sites-available/paste-md /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 7. Enable HTTPS with Let's Encrypt

```bash
sudo apt-get install -y certbot python3-certbot-nginx
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

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Port the server listens on |
| `NODE_ENV` | `development` | Set to `production` for deployments |

## License

MIT
