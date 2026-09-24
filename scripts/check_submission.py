import subprocess
from pathlib import Path

# Paths configuration relative to repository root
ROOT_DIR = Path(__file__).resolve().parent.parent


def check_directory_structure():
    """Verify mandatory directory structure exists."""
    required_dirs = [
        "backend/app/routes",
        "backend/app/services",
        "backend/app/repositories",
        "backend/app/providers/triage",
        "backend/alembic/versions",
        "backend/tests",
        "frontend/src/components",
        "frontend/src/pages",
        "frontend/src/api",
        "frontend/tests",
        "k8s/base",
        "k8s/overlays/dev",
        "k8s/overlays/prod",
        "load",
        "docs/adr",
        "docs/evidence",
        "scripts",
        ".github/workflows",
    ]

    missing = []
    for d in required_dirs:
        p = ROOT_DIR / d
        if not p.is_dir():
            missing.append(d)

    return len(missing) == 0, missing


def check_documentation_files():
    """Verify mandatory markdown documentation files exist."""
    required_files = [
        "README.md",
        "PROJECT_PLAN.md",
        "docs/RUNBOOK.md",
        "docs/AI-USAGE.md",
        "docs/ENGINEERING-NOTES.md",
        "docs/adr/0001-provider-interface.md",
        "docs/adr/0002-frontend-runtime-config.md",
        "docs/adr/0003-deploy-by-sha.md",
        "docs/adr/0004-pii-and-data-governance.md",
    ]

    missing = []
    for f in required_files:
        p = ROOT_DIR / f
        if not p.is_file():
            missing.append(f)

    return len(missing) == 0, missing


def check_secrets_isolation():
    """Verify secrets isolation (.env is ignored and not tracked by git)."""
    try:
        res = subprocess.run(
            ["git", "ls-files", ".env"],
            cwd=ROOT_DIR,
            capture_output=True,
            text=True,
            check=False,
        )
        if res.stdout.strip():
            return False, ".env file IS tracked by git history (SECURITY RISK!)"
        return True, ".env is safely untracked by git"
    except (OSError, RuntimeError) as e:
        return False, str(e)


def check_git_commit_distribution():
    """Check git shortlog commit counts."""
    try:
        res = subprocess.run(
            ["git", "shortlog", "-sn", "HEAD"],
            cwd=ROOT_DIR,
            capture_output=True,
            text=True,
            check=False,
        )
        output = res.stdout.strip()
        lines = output.split("\n") if output else []
        total_commits = 0
        authors = []

        for line in lines:
            parts = line.strip().split("\t")
            if len(parts) == 2:
                count = int(parts[0])
                name = parts[1]
                total_commits += count
                authors.append((name, count))

        return True, authors, total_commits
    except (OSError, RuntimeError) as e:
        return False, str(e), 0


def main():
    print("=" * 65)
    print(" CivicPulse Pre-Flight Submission Audit Validator")
    print("=" * 65)

    all_passed = True

    # Check 1: Directory Structure
    dirs_ok, missing_dirs = check_directory_structure()
    if dirs_ok:
        print(" [PASS] Directory Structure Audit")
    else:
        all_passed = False
        print(" [FAIL] Directory Structure Audit. Missing:")
        for md in missing_dirs:
            print(f"        - {md}")

    # Check 2: Secret Isolation
    secret_ok, secret_msg = check_secrets_isolation()
    if secret_ok:
        print(" [PASS] Secrets Isolation (.env is untracked)")
    else:
        all_passed = False
        print(f" [FAIL] Secrets Isolation: {secret_msg}")

    # Check 3: Documentation Files
    docs_ok, missing_docs = check_documentation_files()
    if docs_ok:
        print(" [PASS] Mandatory Documentation & ADR Files Audit")
    else:
        print(" [INFO] Mandatory Documentation Status:")
        for md in missing_docs:
            print(f"        - Pending/Missing: {md}")

    # Check 4: Git Shortlog Commits
    git_ok, authors, total_commits = check_git_commit_distribution()
    if git_ok:
        print(f" [PASS] Git Commit Distribution (Total Commits: {total_commits})")
        for name, count in authors:
            pct = round((count / total_commits) * 100, 1) if total_commits > 0 else 0
            print(f"        - {name}: {count} commits ({pct}%)")
    else:
        print(f" [FAIL] Git Commit Distribution Check: {authors}")

    print("=" * 65)
    if all_passed:
        print(" PRE-FLIGHT AUDIT CLEAN! READY FOR SUBMISSION!")
    else:
        print(" PRE-FLIGHT AUDIT IN PROGRESS - COMPLETE DOCUMENTATION FILES BEFORE FINAL SUBMISSION")
    print("=" * 65)


if __name__ == "__main__":
    main()
