# ADR 0003: Deploy Container Images by Immutable Git SHA

- **Status:** Accepted
- **Date:** 2026-09-26
- **Authors:** Sami & Zubair

## Context

The `latest` image tag changes over time. A deployment using only that tag cannot prove which source revision is running, and a rollback may pull a different image than the one originally tested. CivicPulse has a backend API and a static frontend; both must be traceable to the same reviewed source revision.

## Decision

Continuous delivery will publish each container image with an immutable Git-SHA tag, for example:

```text
ghcr.io/zubairilyas1/civicpulse-backend:sha-a1b2c3d
ghcr.io/zubairilyas1/civicpulse-frontend:sha-a1b2c3d
```

Kubernetes production manifests and production Compose deployments must receive those SHA tags as deploy-time values. `latest` may remain as a developer convenience, but it is never the value used for an approved production rollout or rollback.

## Rationale

1. **Traceability:** An incident report can map a running image directly to a commit and PR.
2. **Repeatability:** Reapplying the same manifest produces the same application version.
3. **Safe rollback:** Operators can select the prior known-good SHA rather than guessing what `latest` contained.
4. **Frontend/backend compatibility:** Releasing both images with the same source SHA makes the deployed pair explicit.

## Rollout Procedure

1. CI tests and builds the revision without pushing on pull requests.
2. CD builds both images on a protected `main` revision and publishes SHA tags to GHCR.
3. The deploy job injects the SHA tags into the production Kustomize overlay or Compose variables.
4. The deploy job waits for rollout completion, executes a smoke test, and records the run link.
5. To roll back, set the previous SHA and use `kubectl rollout undo` or reapply the previous overlay revision.

## Consequences

- Deployment metadata contains a reproducible artifact identifier.
- Image retention must keep a practical rollback window of SHA tags.
- CD must build and publish the frontend image as well as the backend image; this is a shared CI/CD follow-up.
- Existing base manifests that use `latest` are development defaults and must be overridden by a production SHA-tag patch before release.

## Implementation References

- Backend SHA metadata currently emitted by CD: `.github/workflows/cd.yml`
- Production image variables: `compose.prod.yaml`
- Frontend image build definition: `frontend/Dockerfile`
- Production overlay location for SHA image patches: `k8s/overlays/prod/kustomization.yaml`
