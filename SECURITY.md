# Security Policy
> **Updated for `v0.0.83` (2026-06-09)**

## Supported Versions

This is an internal enterprise application. Security fixes are applied to the current production-deployed version only. Older versions are not actively patched.

---

## Reporting a Security Vulnerability

**Do not open a public GitHub Issue or commit for security vulnerabilities.**

If you discover a security vulnerability in this application, report it privately to the system administrator or the development team lead via your organization's internal communication channel (e.g., email or internal ticketing system).

Include the following in your report:

1. **Description** — What the vulnerability is and which component it affects.
2. **Reproduction steps** — Exact steps to reproduce the issue.
3. **Impact assessment** — What data or function could be compromised.
4. **Suggested remediation** (optional) — If you have a proposed fix.

You will receive an acknowledgement within two business days. We treat all valid security reports as high priority and will work to address them in the next patch release.

---

## Security Architecture Summary

The following controls are in place in this application:

### Authentication and Session
- JWT-based access tokens (short-lived) and refresh tokens (long-lived) with issuer and audience claims.
- Tampered or expired tokens are rejected by the JWT strategy on all protected endpoints.
- Passwords are hashed using BCrypt before storage. Raw passwords are never stored.
- `passwordHash` is excluded from all API responses globally via `ClassSerializerInterceptor`.
- 15-minute inactivity lock on the frontend requires re-authentication before resuming.
- Google OAuth tokens are validated for `email_verified` claim. Unverified Google accounts are rejected.

### Authorization
- All API endpoints are protected by NestJS guards enforcing role-based access control.
- Unit-scoped operations (documents, KPI, attendance) check the authenticated user's assigned unit.
- Write operations for privileged modules (user management, metric templates, KPI master) are restricted to `super_admin` and `reviewer` roles.
- Focal users can only upload documents within their assigned unit.

### Input Validation and Injection Prevention
- All incoming request bodies are validated using NestJS `ValidationPipe` with `whitelist: true`.
- TypeORM parameterized queries are used for all database interactions to prevent SQL injection.
- File uploads are validated for type and size before processing.

### API Rate Limiting
- API rate limiting is applied at the gateway level to mitigate brute-force and denial-of-service attempts.

### CORS
- CORS is restricted to the configured `CORS_ORIGIN` environment variable. Requests from other origins are rejected.

### Secrets Management
- JWT secrets (`JWT_SECRET`, `JWT_REFRESH_SECRET`) and database passwords must be changed from development defaults before any production or staging deployment.
- Secrets are provided via environment variables and must never be committed to the repository.
- The `.env` file is excluded from version control.

### Data Storage
- Document files are stored server-side in the backend `storage/` directory (or as database blobs for issuance attachments).
- No sensitive document data is stored client-side.

### Dependencies
- Backend and frontend dependencies are managed via npm. Run `npm audit` in `backend/` and `frontend/` regularly to check for known vulnerabilities.
- A CI dependency vulnerability check is part of the build pipeline.

---

## Known Limitations

- This application is intended for deployment on a trusted intranet. It is not designed for exposure to the public internet without an additional reverse proxy, WAF, and security hardening review.
- Google OAuth client ID and secret must be configured correctly in the environment. The login flow accepts any verified Google account by default; restrict to organization-domain accounts if required by configuring domain restrictions at the Google Cloud project level.
- File preview features (PDF inline viewer, DOCX-to-HTML via mammoth) process user-uploaded content. Uploaded documents should come from trusted organizational sources only.

---

## Patch and Disclosure Policy

- Security patches follow the standard semantic versioning patch increment (`z` in `x.y.z`).
- Security-relevant changes are noted in `CHANGELOG.md` under the corresponding release entry.
- This project does not publish public CVE disclosures given its internal-only deployment scope.
