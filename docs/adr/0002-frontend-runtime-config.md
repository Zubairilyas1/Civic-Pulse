# ADR 0002: Frontend Runtime Configuration Through `config.js` and Nginx

- **Status:** Accepted
- **Date:** 2026-09-26
- **Authors:** Sami & Zubair

## Context

Vite replaces `VITE_*` variables while creating the static bundle. That approach would bake an API host into every frontend image, forcing a rebuild for each environment. CivicPulse must instead use one frontend image in local Compose, Kubernetes development, and production deployments.

The browser also needs a same-origin API path: locally, Nginx must proxy `/api/*` to the backend service; in Kubernetes, the Ingress routes `/api` directly to the backend service. Neither design exposes database or Redis addresses to the browser.

## Decision

The frontend loads `/config.js` before its application module. The typed client reads `window.__CIVICPULSE_CONFIG__.API_BASE_URL` and defaults to `/api` when the runtime file is unavailable or incomplete.

The production image contains a `config.template.js`. At container start, the Nginx entrypoint script substitutes `API_BASE_URL` into the delivered `config.js`. The file is served with `Cache-Control: no-store`, preventing a browser from using a stale environment setting after a redeploy.

```
Browser
  │ loads /config.js
  ▼
React typed API client ── /api ──► Nginx proxy (Compose) ──► backend:8000
                                              │
                                              └── Kubernetes Ingress routes /api to backend
```

## Consequences

### Positive

- The same immutable frontend image can run in every environment.
- API addresses are operational configuration, not compiled frontend source.
- The browser uses a relative API path, avoiding CORS configuration in normal deployment.
- Nginx keeps internal service names such as `backend` out of browser code.

### Trade-offs

- `config.js` must be loaded before the Vite entry module.
- The container entrypoint must fail visibly if runtime generation is misconfigured.
- Values in `config.js` are public by design; secrets must remain in backend-only Secrets and `.env` files.

## Implementation References

- Runtime-config contract: `frontend/src/api/config.ts`
- Default configuration for Vite development: `frontend/public/config.js`
- Production template and container-start generation: `frontend/public/config.template.js`, `frontend/docker-entrypoint.d/40-generate-runtime-config.sh`
- Cache policy and same-origin proxy: `frontend/nginx.conf`
