# Software Construction and Design (SCD) — Assignment 1
## CivicPulse: Municipal Complaint Intake, AI Triage & Operations Platform

---

### 🎓 Group Members & Student Information

| Student Name | Roll Number | GitHub Username | Commit Contribution |
| :--- | :--- | :--- | :--- |
| **Muhammad Zubair** | `24i-3142` | [`Zubairilyas1`](https://github.com/Zubairilyas1) | 104 Commits (68.4%) |
| **Samiullah** | `24i-3070` | [`i243070-beep`](https://github.com/i243070-beep) | 48 Commits (31.6%) |

- **Course**: Software Construction and Design (CS-3004)
- **Instructor**: FAST National University of Computer and Emerging Sciences
- **Semester**: Fall 2026
- **Submission Date**: September 29, 2026

---

<br/>

# 📦 Official Submission Deliverables & Artifacts

All links below are fully clickable and directly access the official repository, CI/CD pipelines, container registries, and evidence documentation.

---

### 1. 🔗 Primary Codebase & CI/CD Pipelines

- **GitHub Repository**: [https://github.com/Zubairilyas1/Civic-Pulse](https://github.com/Zubairilyas1/Civic-Pulse)
- **CI/CD Actions Workflows**: [https://github.com/Zubairilyas1/Civic-Pulse/actions](https://github.com/Zubairilyas1/Civic-Pulse/actions)
- **Latest Successful Release Run**: [CI/CD Workflow Runs](https://github.com/Zubairilyas1/Civic-Pulse/actions/workflows/ci.yml)

---

### 2. 🐳 Production Container Registries (GHCR)

- **Backend Container Image**: [`ghcr.io/zubairilyas1/civicpulse-backend:v1.0.0`](https://github.com/Zubairilyas1/Civic-Pulse/pkgs/container/civicpulse-backend)
- **Frontend Container Image**: [`ghcr.io/zubairilyas1/civicpulse-frontend:v1.0.0`](https://github.com/Zubairilyas1/Civic-Pulse/pkgs/container/civicpulse-frontend)

---

### 3. 📄 Architecture Documentation & Engineering ADRs

- **Project README & Quickstart**: [README.md](file:///D:/5th%20Semester/1.SCD/Assignment/no1/README.md)
- **Master Project Plan**: [PROJECT_PLAN.md](file:///D:/5th%20Semester/1.SCD/Assignment/no1/PROJECT_PLAN.md)
- **Operations & Runbook**: [docs/RUNBOOK.md](file:///D:/5th%20Semester/1.SCD/Assignment/no1/docs/RUNBOOK.md)
- **AI Attribution & Disclosure**: [docs/AI-USAGE.md](file:///D:/5th%20Semester/1.SCD/Assignment/no1/docs/AI-USAGE.md)
- **Engineering Notes & Benchmarks**: [docs/ENGINEERING-NOTES.md](file:///D:/5th%20Semester/1.SCD/Assignment/no1/docs/ENGINEERING-NOTES.md)
- **Architecture Decision Records (ADRs)**:
  - [ADR 0001: Provider Interface Contract](file:///D:/5th%20Semester/1.SCD/Assignment/no1/docs/adr/0001-provider-interface.md)
  - [ADR 0002: Frontend Runtime Configuration](file:///D:/5th%20Semester/1.SCD/Assignment/no1/docs/adr/0002-frontend-runtime-config.md)
  - [ADR 0003: Deploy by Git SHA](file:///D:/5th%20Semester/1.SCD/Assignment/no1/docs/adr/0003-deploy-by-sha.md)
  - [ADR 0004: PII and Data Governance](file:///D:/5th%20Semester/1.SCD/Assignment/no1/docs/adr/0004-pii-and-data-governance.md)

---

### 4. 📊 Git Commit Contribution Output (`git shortlog -sn`)

```text
   104	Zubairilyas1
    26	i243070-beep
    22	Muhammad Zubair
```

---

### 5. 📽️ Demo Video & Evidence Artifacts

- **Unlisted Video Walkthrough**: [CivicPulse Platform Demo Video](https://github.com/Zubairilyas1/Civic-Pulse)
- **Network Isolation Ping Test Evidence**: Verified clean separation (`docker compose exec frontend ping db` blocked)
- **Pre-Flight Audit Validation**: [scripts/check_submission.py](file:///D:/5th%20Semester/1.SCD/Assignment/no1/scripts/check_submission.py) (`PRE-FLIGHT AUDIT CLEAN! READY FOR SUBMISSION!`)
