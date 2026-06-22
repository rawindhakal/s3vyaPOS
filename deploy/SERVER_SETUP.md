# Server setup (one-time) — Ubuntu 24.04, native pm2 + nginx

These steps add s3vyaPOS alongside the existing sites. They use a **new** Postgres
DB, **new** ports (api 5300, web 3300) and a **new** nginx vhost, so the live apps
(cakezake, empress-dreams, mik33, tinytaps) and MongoDB are untouched.

> ⚠️ Rotate the root password / switch to SSH keys before doing this.

## 1. Install PostgreSQL
```bash
apt update && apt install -y postgresql
sudo -u postgres psql -c "CREATE USER s3vyapos WITH PASSWORD 'STRONG_PASSWORD';"
sudo -u postgres psql -c "CREATE DATABASE s3vyapos OWNER s3vyapos;"
```

## 2. Clone & configure
```bash
cd /var/www
git clone https://github.com/rawindhakal/s3vyaPOS.git
cd s3vyaPOS
cp .env.example .env
# edit .env: DATABASE_URL, JWT secrets, NEXT_PUBLIC_API_URL=https://pos.YOURDOMAIN.com/api,
#            CORS_ORIGIN=https://pos.YOURDOMAIN.com
corepack enable pnpm
pnpm install
pnpm --filter @s3vya/api db:deploy
pnpm --filter @s3vya/api db:seed   # optional demo data
pnpm build
```

## 3. Start with pm2
```bash
pm2 start deploy/ecosystem.config.js
pm2 save
```

## 4. nginx + TLS
```bash
cp deploy/nginx.conf /etc/nginx/sites-available/s3vyapos
# edit server_name to pos.YOURDOMAIN.com
ln -s /etc/nginx/sites-available/s3vyapos /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d pos.YOURDOMAIN.com
```

## 5. Firewall (already has 80/443/22 open)
```bash
ufw status   # ensure 'Nginx Full' allowed
```

## Updating later
```bash
cd /var/www/s3vyaPOS && ./deploy/deploy.sh
```
