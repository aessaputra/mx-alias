# MX Alias

Self-hosted email alias manager for [MXroute](https://mxroute.com/). Create and delete forwarding aliases from a password-protected web UI.

![Node.js](https://img.shields.io/badge/Node.js-24-3c873a?style=flat-square&logo=node.js&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react&logoColor=black)

No database — all aliases live on MXroute's side. The app is a thin, stateless UI over the MXroute API.

## Prerequisites

- **Node.js 24** (`>=24 <25`, enforced in `package.json` engines)
- **MXroute account** with API access (server, username, API key)
- A reverse proxy (Caddy, Nginx, etc.) for HTTPS — the session cookie requires `Secure`

## Getting Started

Generate a session secret and create `.env`:

```bash
openssl rand -hex 32
cp .env.example .env   # fill in your values
```

| Variable | Description |
|---|---|
| `MXROUTE_SERVER` | MXroute API host (e.g. `https://api.mxroute.com`) |
| `MXROUTE_USERNAME` | MXroute account username |
| `MXROUTE_API_KEY` | MXroute API key |
| `ADMIN_PASSWORD` | Password for the web UI login |
| `SESSION_SECRET` | Random string ≥ 32 chars |

All five are required. The app refuses to start if any are missing.

## Local Development

```bash
npm ci
npm run dev
```

Open <http://localhost:3000>.

## Docker

Build and run with Compose:

```bash
cp .env.example .env   # fill in your values
docker compose up -d
```

Or build and run manually:

```bash
docker build -t mx-alias .

docker run -d \
  -p 3000:3000 \
  -e MXROUTE_SERVER=https://api.mxroute.com \
  -e MXROUTE_USERNAME=your-username \
  -e MXROUTE_API_KEY=your-api-key \
  -e ADMIN_PASSWORD=your-password \
  -e SESSION_SECRET=$(openssl rand -hex 32) \
  --name mx-alias \
  mx-alias
```

The image is multi-stage, runs as non-root (`nextjs:1001`), and includes a `/health` endpoint checked every 30s.

## Testing

```bash
npm run lint          # ESLint
npm run typecheck     # TypeScript strict check
npm test              # Unit tests (vitest)
npm run test:e2e      # E2E tests (Playwright)
```

Full local gate in one shot:

```bash
npm run lint && npm run typecheck && npm test && npm run build
```

> [!CAUTION]
> The Playwright e2e suite uses a mock API. Running it against a real MXroute account will create and delete forwarding aliases. Only test with a disposable domain.

## Architecture

- `app/` — Next.js App Router: pages, server actions, health endpoint
- `components/` — Client components (alias form, forwarder list)
- `lib/` — Business logic: MXroute API client, validation, session handling, security
- `tests/` — Unit and E2E tests

Authentication is password-based with HMAC-signed tokens stored in `httpOnly` cookies. Origin validation protects against CSRF. Input is validated server-side before any MXroute API call.

A reverse proxy is required in production — the session cookie uses `Secure` and browsers will not send it over plain HTTP.
