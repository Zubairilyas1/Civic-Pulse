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
2. Check backend logs for timeout, rate-limit, or validation errors.
3. Do not retry a cloud provider with PII copied into a terminal or ticket.
4. Set `TRIAGE_PROVIDER=rules` or `TRIAGE_PROVIDER=simulated` for a controlled fallback, then restart the backend deployment.
5. Verify a new complaint is accepted and records a fallback `triaged_by` value.

The Groq and Ollama providers already fall back to rule-based triage when their primary request fails. Complaint creation should remain available.

## 5. Rate Limits and Cached Statistics

- A `429 Too Many Requests` response includes `Retry-After`. The frontend should wait for that period rather than repeatedly retrying.
- `/api/stats` is cached for 30 seconds. A complaint create or status update invalidates the stats cache, so the next request should be a cache miss.
- If statistics are unexpectedly stale, verify the backend write succeeded before clearing Redis. Cache clearing is an operational exception, not the first response.

## 6. Kubernetes Deployment and Rollback

Build the desired overlay before applying it:

```bash
kustomize build k8s/overlays/dev
kubectl apply -k k8s/overlays/dev
kubectl rollout status deployment/backend -n civicpulse
kubectl rollout status deployment/frontend -n civicpulse
```

Production deployments must use an immutable image SHA. After a failed rollout:

```bash
kubectl rollout undo deployment/backend -n civicpulse
kubectl rollout undo deployment/frontend -n civicpulse
kubectl rollout status deployment/backend -n civicpulse
kubectl rollout status deployment/frontend -n civicpulse
```

Confirm health endpoints and a browser smoke test after rollback. Do not automatically downgrade database schema for an application-only rollback; forward-compatible migrations are required.

## 7. Escalation Checklist

Escalate to both project members when any of the following occurs:

- `/api/ready` fails after a rollout.
- A frontend build cannot load `/config.js` or reach `/api`.
- Complaint creation consistently returns 5xx errors.
- A production image is not identifiable by its Git SHA.
- A secret or citizen PII is suspected to have been exposed.
