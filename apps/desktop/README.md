# s3vyaPOS Desktop (cashier billing terminal)

A thin **Electron** shell that runs the s3vyaPOS web app as a native desktop
application for cashiers. It opens directly on the **POS** screen and behaves like
a kiosk (fullscreen with F11, external links open in the browser).

## Configure the target
By default it loads `http://localhost:3300/pos`. Point it at your deployed app with
env vars:

```bash
S3VYA_APP_URL="https://pos.YOURDOMAIN.com"   # no trailing slash
S3VYA_START_PATH="/pos"                        # landing screen
```

## Run in development
```bash
pnpm install                       # installs Electron (first run downloads the binary)
# make sure the web app is running (pnpm dev at the repo root)
pnpm --filter @s3vya/desktop dev
```

## Build installers
Produces a native installer for the current OS (dmg / nsis / AppImage):
```bash
S3VYA_APP_URL="https://pos.YOURDOMAIN.com" pnpm --filter @s3vya/desktop package
# output in apps/desktop/release/
```

## Notes
- Auth, billing, payments, printing — everything from the web POS works unchanged.
- The shell exposes `window.s3vyaDesktop` so the web app can detect it (e.g. to
  enable native receipt printing later).
- Receipt printing currently uses the browser print dialog; a future version can
  wire `webContents.print()` to a fixed thermal printer.
