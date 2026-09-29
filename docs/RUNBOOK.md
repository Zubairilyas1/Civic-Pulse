# CivicPulse Runbook

This guide is for operating CivicPulse in local Compose and Kubernetes environments. Do not place production API keys, database passwords, or citizen PII in commands, screenshots, issues, or Git history.

## 1. Local Deployment

1. Copy the example environment file and set only the values required for your local provider.

   ```powershell
   Copy-Item .env.example .env
   ```

2. Start the development stack.

   ```bash
   docker compose up --build
   ```

3. Apply the database migration after PostgreSQL is healthy.

   ```bash
   docker compose exec backend alembic upgrade head
   ```

4. Open the frontend at `http://localhost:3000` and FastAPI documentation at `http://localhost:8000/docs`.

The frontend uses `/api`, which Nginx proxies to `backend:8000`. PostgreSQL, Redis, and Ollama stay on the internal Compose network and are not host-published.

## 2. Verify a Deployment

```bash
curl http://localhost:8000/api/health
curl http://localhost:8000/api/ready
curl -i http://localhost:8000/api/stats
```

Expected results:

- `/api/health` returns `status: ok`.
- `/api/ready` returns `status: ready`.
- `/api/stats` returns `200` and an `X-Cache: MISS` header on a first request; a follow-up request can return `X-Cache: HIT`.

Submit a complaint through the frontend or `POST /api/complaints`, then check that it is triaged and visible in `GET /api/complaints`.

## 3. Logs and First Response

```bash
docker compose logs --tail=100 frontend
docker compose logs --tail=100 backend
docker compose logs --tail=100 db redis
```

In Kubernetes:

```bash
kubectl get pods -n civicpulse
kubectl logs deployment/backend -n civicpulse --tail=100
kubectl logs deployment/frontend -n civicpulse --tail=100
kubectl describe pod <pod-name> -n civicpulse
```

The backend emits an `X-Request-ID` response header and structured access logs. Record that ID when investigating a failed request.

## 4. Triage Provider Failure

1. Confirm the active provider with `GET /api/meta/providers`.
2. Check `recent_outcomes` on the same endpoint: each entry records `provider`, `latency_ms` and whether triage fell back, for the last 20 attempts.
3. Check backend logs for one WARNING per fallback (`Triage fallback complaint_id=... provider=... error_class=...`); there should be exactly one per complaint, emitted after persist.
4. Check backend logs for timeout, rate-limit, or validation errors. Groq calls carry a 10-second wall-clock budget, retry once only on `429`/`5xx`, and never retry `4xx`.
5. Do not retry a cloud provider with PII copied into a terminal or ticket.
6. Set `TRIAGE_PROVIDER=rules` or `TRIAGE_PROVIDER=simulated` for a controlled fallback, then restart the backend deployment.
7. Verify a new complaint is accepted and records a fallback `triaged_by` value.

The Groq and Ollama providers already fall back to rule-based triage when their primary request fails, and `/metrics` increments `triage_fallbacks_total` in the same case. Complaint creation should remain available.

## 5. Rate Limits, Cached Statistics and Metrics

- A `429 Too Many Requests` response includes `Retry-After`. The frontend should wait for that period rather than repeatedly retrying. The counter lives in Redis (`ratelimit:<ip>:<window>`), so all backend replicas share one budget; `/health` and `/ready` (and their `/api` copies) are exempt so probes never consume budget. If Redis is down the limiter fails open with a WARNING instead of blocking traffic.
- `/api/stats` is cached for 30 seconds. A complaint create or status update invalidates the stats cache, so the next request should be a cache miss.
- If statistics are unexpectedly stale, verify the backend write succeeded before clearing Redis. Cache clearing is an operational exception, not the first response.
- `GET /metrics` (also under `/api`) exposes `http_requests_total`, `http_request_duration_seconds`, `triage_duration_seconds`, `triage_fallbacks_total` and `triage_cache_lookups_total{result="hit"|"miss"}` (the triage cache hit rate). Route labels use path templates (`/complaints/{complaint_id}`), so cardinality stays bounded. Scrape it from Prometheus on the backend Service port `8000`.

## 6. Kubernetes Deployment and Rollback

Build the desired overlay before applying it (the dev overlay deploys into the `civicpulse-dev` namespace, prod into `civicpulse-prod`):

```bash
kubectl kustomize k8s/overlays/dev
kubectl apply -k k8s/overlays/dev
kubectl rollout status deployment/backend -n civicpulse-dev
kubectl rollout status deployment/frontend -n civicpulse-dev
```

Production deployments must use an immutable image SHA (the `deploy-k8s` CD job rewrites the prod overlay's `newTag` to `$GITHUB_SHA` before applying). After a failed rollout:

```bash
kubectl rollout undo deployment/backend -n civicpulse-prod
kubectl rollout undo deployment/frontend -n civicpulse-prod
kubectl rollout status deployment/backend -n civicpulse-prod
kubectl rollout status deployment/frontend -n civicpulse-prod
```

Confirm health endpoints and a browser smoke test after rollback. Do not automatically downgrade database schema for an application-only rollback; forward-compatible migrations are required.

The frontend deployment has a readiness probe on `/` and uses a rolling-update policy of `maxUnavailable: 0` and `maxSurge: 1`. During a frontend update, confirm it keeps serving capacity:

```bash
kubectl rollout status deployment/frontend -n civicpulse-prod
kubectl get pods -n civicpulse-prod -l app=frontend
```

## 7. Creating a Release

Only tag a revision that has been merged to `main` and has a green CI run:

```bash
git checkout main
git pull origin main
git tag v1.0.0
git push origin v1.0.0
```

`release.yml` accepts semantic version tags such as `v1.0.0` or `v1.0.0-rc.1`. It reruns the frontend and backend checks, then creates a GitHub draft release with generated notes. Review the CD/deployment result before publishing that draft; do not publish a release for an unverified image.

## 8. Escalation Checklist

Escalate to both project members when any of the following occurs:

- `/api/ready` fails after a rollout.
- A frontend build cannot load `/config.js` or reach `/api`.
- Complaint creation consistently returns 5xx errors.
- A production image is not identifiable by its Git SHA.
- A secret or citizen PII is suspected to have been exposed.
