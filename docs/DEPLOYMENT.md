# Deployment Guide

This guide covers the automated deployment process for the Amazon Scraper API using GitHub Actions and Render.com.

## Overview

The project uses a fully automated CI/CD pipeline that:
- ✅ Runs tests on every PR and push
- ✅ Enforces 70% minimum code coverage
- ✅ Automatically versions releases using semantic versioning
- ✅ Deploys to Render.com on successful merge to main

## Prerequisites

Before setting up automated deployment, ensure you have:

1. **GitHub Repository**: Code hosted on GitHub
2. **Render.com Account**: Free account with a Web Service configured
3. **Codecov Account**: Free account for coverage reporting

## Required GitHub Secrets

Configure these secrets in your GitHub repository settings:

### 1. CODECOV_TOKEN

**Purpose**: Upload test coverage reports to Codecov.io

**How to obtain**:
1. Go to [Codecov.io](https://codecov.io)
2. Sign in with your GitHub account
3. Select your repository
4. Copy the upload token from Settings → General

**How to configure**:
1. Go to your GitHub repository
2. Navigate to: `Settings` → `Secrets and variables` → `Actions`
3. Click `New repository secret`
4. Name: `CODECOV_TOKEN`
5. Value: Paste your Codecov token
6. Click `Add secret`

### 2. DEPLOY_HOOK

**Purpose**: Trigger automatic deployment to Render.com

**How to obtain**:
1. Log in to [Render.com](https://render.com)
2. Go to your Web Service dashboard
3. Navigate to: `Settings` → `Deploy Hook`
4. Click `Create Deploy Hook`
5. Copy the URL (format: `https://api.render.com/deploy/srv-xxxxx?key=yyyyy`)

**How to configure**:
1. Go to your GitHub repository
2. Navigate to: `Settings` → `Secrets and variables` → `Actions`
3. Click `New repository secret`
4. Name: `DEPLOY_HOOK`
5. Value: Paste your Render deploy hook URL
6. Click `Add secret`

### 3. GITHUB_TOKEN (Automatic)

**Purpose**: Create releases and push tags

**Configuration**: ✅ No action required - automatically provided by GitHub Actions

## Workflow Explanation

### Trigger Events

The CI/CD workflow runs on:
- **Pull Requests** to `main` branch (tests only, no deployment)
- **Push** to `main` branch (full pipeline: test → release → deploy)

### Job 1: Test & Coverage

**Runs on**: Every PR and push

**Steps**:
1. Checkout code
2. Install Node.js 18.x
3. Install dependencies (with npm cache)
4. Run ESLint (`npm run lint`)
5. Run tests with coverage (`npm run test:coverage`)
6. Upload coverage to Codecov

**Failure conditions**:
- Linting errors
- Any test failure
- Coverage below 70% threshold

### Job 2: Release (main branch only)

**Runs on**: Push to `main` after successful tests

**Steps**:
1. Checkout code with full git history
2. Install dependencies
3. Build project (`npm run build`)
4. Run semantic-release:
   - Analyzes commits since last release
   - Determines version bump (major/minor/patch)
   - Updates `package.json` and `CHANGELOG.md`
   - Creates git tag
   - Creates GitHub release with notes

**Output**:
- `new_release_published`: `true` if new release was created
- `new_release_version`: Version number (e.g., `1.2.0`)

### Job 3: Deploy (main branch only, after new release)

**Runs on**: Push to `main` after new release

**Steps**:
1. Triggers Render deployment via webhook (POST request)
2. Waits 30 seconds for deployment to start

**Note**: Render automatically rebuilds and redeploys the service when triggered.

## Semantic Versioning

Version numbers follow [Semantic Versioning](https://semver.org/): `MAJOR.MINOR.PATCH`

### Version Bump Rules

| Commit Type | Version Bump | Example |
|-------------|--------------|---------|
| `feat:` | **MINOR** | `1.0.0` → `1.1.0` |
| `fix:` | **PATCH** | `1.1.0` → `1.1.1` |
| `perf:` | **PATCH** | `1.1.1` → `1.1.2` |
| `BREAKING CHANGE:` | **MAJOR** | `1.1.2` → `2.0.0` |
| `feat!:` | **MAJOR** | `1.1.2` → `2.0.0` |
| `chore:` | **No release** | - |

### Commit Message Format

Use [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

**Examples**:

```bash
# Minor release (new feature)
feat(api): add webhook notifications for job completion

# Patch release (bug fix)
fix(scraper): prevent timeout on slow pages

# Major release (breaking change)
feat!: redesign promotion API endpoints

BREAKING CHANGE: promotionId is now required parameter
```

## Monitoring Deployments

### GitHub Actions

Monitor workflow runs:
1. Go to: https://github.com/itsmaneka/amz-scraper-api/actions
2. View logs for each job
3. Check test results and coverage reports

### Codecov

View coverage reports:
1. Go to: https://codecov.io/gh/itsManeka/amz-scraper-api
2. See coverage trends over time
3. Identify uncovered code

### Render.com

Monitor deployments:
1. Log in to [Render.com](https://render.com)
2. Go to your Web Service dashboard
3. Check `Events` tab for deployment history
4. View logs in `Logs` tab

## Troubleshooting

### ❌ Tests Failing

**Symptom**: Build fails with test errors

**Solution**:
1. Run tests locally: `npm test`
2. Fix failing tests
3. Ensure coverage is >= 70%: `npm run test:coverage`
4. Push fixes

### ❌ Coverage Below 70%

**Symptom**: Build fails with "Coverage threshold not met"

**Solution**:
1. Check coverage report: `npm run test:coverage`
2. Identify uncovered code in `coverage/lcov-report/index.html`
3. Add tests for uncovered code
4. Re-run coverage check

### ❌ Semantic Release Failed

**Symptom**: Release job fails with "No release published"

**Possible causes**:
1. No releasable commits (only `chore:` commits)
2. Commits don't follow Conventional Commits format
3. Already released for current commits

**Solution**:
1. Check commit messages follow format
2. Use `git rebase -i` to fix commit messages if needed
3. Ensure at least one `feat:`, `fix:`, or breaking change commit

### ❌ Deploy Hook Failed

**Symptom**: Deploy job fails with HTTP error

**Solution**:
1. Verify `DEPLOY_HOOK` secret is correct
2. Generate new deploy hook in Render.com
3. Update GitHub secret with new URL
4. Re-run workflow

### ⚠️ Render Build Failed

**Symptom**: GitHub deployment succeeds but Render build fails

**Solution**:
1. Check Render logs for errors
2. Common issues:
   - Missing environment variables in Render
   - Node.js version mismatch
   - Build command errors
3. Fix issues in Render dashboard
4. Manually trigger rebuild or push new commit

## Manual Deployment (Emergency)

If automated deployment fails, deploy manually:

### Option 1: Manual Deploy Hook

```bash
curl -X POST "YOUR_DEPLOY_HOOK_URL"
```

### Option 2: Render Dashboard

1. Log in to Render.com
2. Go to your Web Service
3. Click `Manual Deploy` → `Deploy latest commit`

### Option 3: Manual Version Bump

```bash
# Update version
npm version patch  # or minor, or major

# Push with tags
git push --follow-tags

# Then manually trigger Render deploy
```

## Best Practices

1. ✅ **Always** test locally before pushing
2. ✅ **Always** use Conventional Commits
3. ✅ **Always** maintain >= 70% coverage
4. ✅ **Review** CHANGELOG.md after releases
5. ✅ **Monitor** Render logs after deployments
6. ❌ **Never** force push to main
7. ❌ **Never** skip tests with `[skip ci]` (except automated release commits)
8. ❌ **Never** commit directly to main (use PRs)

## Environment Variables on Render

Ensure these are configured in Render.com dashboard:

```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:password@host.neon.tech/dbname?sslmode=require
CACHE_TTL_MINUTES=30
JOB_TIMEOUT_MINUTES=10
MAX_CONCURRENT_JOBS=2
API_KEYS=your-secure-api-key
```

### Database Setup with Neon

The application uses PostgreSQL for persistent storage. To set up:

1. **Create Neon Account**:
   - Go to [Neon](https://neon.tech/)
   - Sign up for free account

2. **Create Database**:
   - Create a new project
   - Select a region close to your Render deployment
   - Copy the connection string

3. **Configure Render**:
   - In Render dashboard, add `DATABASE_URL` environment variable
   - Paste your Neon connection string
   - Format: `postgresql://user:password@host.neon.tech/dbname?sslmode=require`

4. **Deploy**:
   - The application automatically creates required tables on first run
   - Check logs to verify database initialization: `[PostgresStorage] Database schema initialized successfully`

**Note**: Neon free tier includes:
- 512 MB storage
- 100 hours/month compute time
- Perfect for development and small production workloads

## Rollback Procedure

If a deployment breaks production:

### 1. Quick Rollback (Recommended)

1. Go to Render.com dashboard
2. Navigate to: `Web Service` → `Events`
3. Find previous successful deployment
4. Click `Rollback to this version`

### 2. Git Revert

```bash
# Revert the problematic commit
git revert <commit-hash>

# Push to trigger new deployment
git push origin main
```

### 3. Manual Fix

```bash
# Create hotfix
git checkout -b hotfix/critical-bug
# Fix the issue
git commit -m "fix: resolve critical production bug"
git push origin hotfix/critical-bug

# Create PR and merge to main
# Automated deployment will trigger
```

## Support

For issues with:
- **GitHub Actions**: Check [GitHub Actions documentation](https://docs.github.com/en/actions)
- **Semantic Release**: Check [Semantic Release docs](https://semantic-release.gitbook.io/)
- **Codecov**: Check [Codecov docs](https://docs.codecov.com/)
- **Render**: Check [Render docs](https://render.com/docs) or contact support

## Additional Resources

- [Conventional Commits Specification](https://www.conventionalcommits.org/)
- [Semantic Versioning Specification](https://semver.org/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Render Deploy Hooks](https://render.com/docs/deploy-hooks)
- [Codecov Documentation](https://docs.codecov.com/)

