# Email Alias Manager

Self-hosted MXroute email alias manager. Create and delete forwarding aliases from a password-protected web UI. Next.js 16 + React 19, no database — all state lives on MXroute.

## Prerequisites

- **Node.js 24** (`>=24 <25` — enforced in `package.json` engines)
- **MXroute account** with API access (server, username, API key)
- A reverse proxy (Caddy, Nginx, etc.) for HTTPS — the session cookie requires `Secure`.

## Environment Variables

Generate a session secret:

```bash
openssl rand -hex 32
```

Create `.env` from the example and fill in your values:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `MXROUTE_SERVER` | MXroute API host (e.g. `https://api.mxroute.com`) |
| `MXROUTE_USERNAME` | MXroute account username |
| `MXROUTE_API_KEY` | MXroute API key |
| `ADMIN_PASSWORD` | Password for the web UI login |
| `SESSION_SECRET` | Random string ≥ 32 chars (use `openssl rand -hex 32`) |

All five are required. The app refuses to start if any are missing.

## Local Development

```bash
npm ci
cp .env.example .env   # fill in your values
npm run dev
```

Open http://localhost:3000.

## Testing

```bash
npm run lint          # ESLint
npm run typecheck     # TypeScript strict check
npm test              # 70 unit tests (vitest)
npm run test:e2e      # 11 e2e tests (Playwright)
```

Run the full local gate in one shot:

```bash
npm ci && npm run lint && npm run typecheck && npm test && npm run build && npx playwright test
```

## Docker

Build:

```bash
docker build -t email-alias .
```

Run:

```bash
docker run -d \
  -p 3000:3000 \
  -e MXROUTE_SERVER=https://api.mxroute.com \
  -e MXROUTE_USERNAME=your-username \
  -e MXROUTE_API_KEY=your-api-key \
  -e ADMIN_PASSWORD=your-password \
  -e SESSION_SECRET=$(openssl rand -hex 32) \
  --name email-alias \
  email-alias
```

The image exposes port 3000 and runs as a non-root user (`nextjs:1001`). A health check hits `/health` every 30s.

## Reverse Proxy / HTTPS

**HTTPS is required.** The session cookie uses `Secure` — the browser will not send it over plain HTTP. Put a reverse proxy (Caddy, Nginx, Traefik) in front that terminates TLS.

## No Database

All aliases are managed through MXroute's API. There is no local database. This means:

- No data to back up locally.
- Aliases are the source of truth on MXroute's side.
- Losing the `.env` file means you recreate it and point at the same MXroute account.

## Live Smoke Tests — Warning

The Playwright e2e suite uses a mock API. **Real MXroute API calls mutate your account** (create and delete forwarding aliases). Only run against a real account if you understand the consequences and have a disposable domain/alias to test with.

## Future: Vercel

The app uses `next start` standalone output and is compatible with Vercel deployment via the same environment variables. Vercel hosting has not been verified as part of this release.

## License

Private.
