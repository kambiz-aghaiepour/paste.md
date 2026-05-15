#!/usr/bin/env bash
set -euo pipefail

# paste.md — Rocky Linux deployment script
# Run as root or with sudo on a fresh Rocky Linux server.
# Usage: sudo bash setup.sh [--domain paste.example.com] [--repo https://github.com/user/paste.md.git]

INSTALL_DIR="/opt/paste-md"
SERVICE_USER="paste-md"
SERVICE_NAME="paste-md"
NODE_PORT=3000
DOMAIN=""
REPO_URL=""
SSL_DIR="/etc/nginx/ssl/paste-md"

usage() {
    echo "Usage: sudo bash setup.sh [--domain DOMAIN] [--repo REPO_URL]"
    echo ""
    echo "Options:"
    echo "  --domain   Server domain name for nginx and Let's Encrypt (e.g. paste.example.com)"
    echo "  --repo     Git repository URL to clone (default: current directory copy)"
    echo ""
    echo "If --domain is omitted, nginx is configured with the server's IP address."
    echo "If --repo is omitted, the script copies the current directory to ${INSTALL_DIR}."
    exit 1
}

while [[ $# -gt 0 ]]; do
    case $1 in
        --domain) DOMAIN="$2"; shift 2 ;;
        --repo)   REPO_URL="$2"; shift 2 ;;
        --help|-h) usage ;;
        *) echo "Unknown option: $1"; usage ;;
    esac
done

if [[ $EUID -ne 0 ]]; then
    echo "This script must be run as root (or with sudo)."
    exit 1
fi

echo "==> Installing Node.js 22"
curl -fsSL https://rpm.nodesource.com/setup_22.x | bash -
dnf install -y nodejs

echo "==> Installing build tools for native modules"
dnf groupinstall -y "Development Tools"
dnf install -y python3

echo "==> Setting up application directory"
if [[ -n "$REPO_URL" ]]; then
    git clone "$REPO_URL" "$INSTALL_DIR"
else
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    if [[ "$SCRIPT_DIR" != "$INSTALL_DIR" ]]; then
        mkdir -p "$INSTALL_DIR"
        rsync -a --exclude node_modules --exclude .next --exclude data --exclude .git "$SCRIPT_DIR/" "$INSTALL_DIR/"
    fi
fi

cd "$INSTALL_DIR"

echo "==> Installing dependencies and building"
npm ci --include=dev
npm run build

echo "==> Creating system user: ${SERVICE_USER}"
if ! id "$SERVICE_USER" &>/dev/null; then
    useradd --system --no-create-home --shell /sbin/nologin "$SERVICE_USER"
fi

echo "==> Creating data directory with correct permissions"
mkdir -p "$INSTALL_DIR/data"
chown -R "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR"
chmod 755 "$INSTALL_DIR/data"
# SQLite WAL mode creates -wal and -shm sidecar files in the data directory,
# so the service user needs write access to both the directory and the db file.
if [[ -f "$INSTALL_DIR/data/paste.db" ]]; then
    chmod 644 "$INSTALL_DIR/data/paste.db"
fi

echo "==> Creating systemd service"
cat > "/etc/systemd/system/${SERVICE_NAME}.service" <<EOF
[Unit]
Description=paste.md
After=network.target

[Service]
Type=simple
User=${SERVICE_USER}
Group=${SERVICE_USER}
WorkingDirectory=${INSTALL_DIR}
ExecStart=/usr/bin/node node_modules/.bin/next start --port ${NODE_PORT}
Restart=on-failure
RestartSec=5

Environment=NODE_ENV=production
Environment=PORT=${NODE_PORT}

NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=${INSTALL_DIR}/data
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now "$SERVICE_NAME"

echo "==> Configuring firewalld"
systemctl unmask firewalld
systemctl start firewalld
systemctl enable firewalld
firewall-cmd --permanent --add-service=http --add-service=https
firewall-cmd --reload

echo "==> Installing and configuring nginx"
dnf install -y nginx
systemctl enable --now nginx

setsebool -P httpd_can_network_connect 1

SERVER_NAME="${DOMAIN:-_}"

echo "==> Generating self-signed SSL certificate"
mkdir -p "$SSL_DIR"
openssl req -x509 -nodes -days 365 \
    -newkey rsa:2048 \
    -keyout "$SSL_DIR/selfsigned.key" \
    -out "$SSL_DIR/selfsigned.crt" \
    -subj "/CN=${DOMAIN:-paste-md}"
openssl dhparam -out "$SSL_DIR/dhparam.pem" 2048

chmod 600 "$SSL_DIR/selfsigned.key"
chmod 644 "$SSL_DIR/selfsigned.crt" "$SSL_DIR/dhparam.pem"

SSL_CERT="$SSL_DIR/selfsigned.crt"
SSL_KEY="$SSL_DIR/selfsigned.key"

cat > /etc/nginx/conf.d/paste-md.conf <<EOF
server {
    listen 80;
    server_name ${SERVER_NAME};
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    server_name ${SERVER_NAME};

    ssl_certificate ${SSL_CERT};
    ssl_certificate_key ${SSL_KEY};
    ssl_dhparam ${SSL_DIR}/dhparam.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;

    client_max_body_size 2M;

    location / {
        proxy_pass http://127.0.0.1:${NODE_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

nginx -t
systemctl reload nginx

if [[ -n "$DOMAIN" ]]; then
    echo "==> Replacing self-signed cert with Let's Encrypt"
    dnf install -y certbot python3-certbot-nginx
    certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email
    echo "    HTTPS configured with Let's Encrypt for ${DOMAIN}"
else
    echo "==> Using self-signed SSL certificate"
    echo "    Cert: ${SSL_CERT}"
    echo "    Key:  ${SSL_KEY}"
    echo "    To switch to Let's Encrypt later: sudo certbot --nginx -d your-domain.com"
fi

echo ""
echo "==> Deployment complete!"
echo "    Service: systemctl status ${SERVICE_NAME}"
if [[ -n "$DOMAIN" ]]; then
    echo "    URL:     https://${DOMAIN}"
else
    echo "    URL:     https://$(hostname -I | awk '{print $1}') (self-signed)"
fi
echo "    Data:    ${INSTALL_DIR}/data/paste.db"
