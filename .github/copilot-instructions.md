# BMAD Copilot Instructions (Secure Development)

This repository follows **BMAD (Build → Measure → Analyze → Decide)** with secure development practices aligned to:
- **OWASP Top 10**
- **OWASP API Security Top 10**

Copilot MUST follow these rules on every code generation, modification, and implementation task.

These are enforcement rules.

---

## Scope

These instructions apply to ALL directories:
- `scanner/` — SAST engine
- `src/` — frontend modules
- `tests/` — test suite
- `vscode-extension/` — VS Code extension
- `cli.js`, `server.js` — entry points
- `references/` — supporting documentation

---

## Change Classification (MANDATORY)

Before making any change, classify it:

1. **Trivial**
   - typos, comments, formatting, minor null checks

2. **Minor**
   - localized logic change
   - small bug fix

3. **Structural**
   - multi-file impact
   - shared modules affected

4. **Architectural**
   - system design, API contract, or major flow changes

Rules:
- Trivial → minimal process, skip full BMAD and documentation updates
- Minor → partial BMAD, version bump required
- Structural / Architectural → full compliance required

---

## Pre-Implementation Gate (CONDITIONAL)

Required for Minor, Structural, and Architectural changes.

Copilot MUST:

1. Review relevant existing file(s) (full file, not partial)
2. Identify impacted modules and documentation (`README.md`, `DOCUMENTATION.md`)
3. Determine which `package.json` file(s) require patch version increment
4. Confirm no OWASP Top 10 risks are introduced

Do NOT begin implementation until these are addressed.

---

## Core Behavior

- Review existing code and patterns before suggesting changes
- Keep changes minimal and consistent
- Avoid unnecessary refactoring
- Prefer modifying existing logic over rewriting
- Do not modify unrelated code
- Maintain backward compatibility unless explicitly required

---

## Execution Flow (MANDATORY for non-trivial changes)

Analysis → Design → Implementation → Validation

Ensure:
- Proper scope
- Cross-layer awareness (frontend, backend, API, DB, extension)

---

## Database & Schema Safety (MANDATORY)

- Do NOT modify database schema without explicit instruction
- Do NOT:
  - rename tables
  - rename columns
  - change data types
  - drop constraints or fields

If schema changes are explicitly required:
- Provide migration strategy (forward + rollback)
- Maintain backward compatibility
- Update `DOCUMENTATION.md`
- Validate all existing queries remain functional

---

## Secure Coding Rules (MANDATORY)

### Input Validation & Output Encoding (Injection)

- Treat ALL input as untrusted
- Validate and sanitize:
  - user input
  - query parameters
  - headers
  - file uploads
- Encode outputs where applicable

Prevent:
- SQL Injection
- XSS
- Command Injection
- Template Injection

---

### Authentication & Session Management

- Enforce authentication on protected resources
- Validate tokens (expiry, signature, issuer)
- Use secure cookies:
  - HTTPOnly
  - Secure flag
- Never expose session identifiers

---

### Authorization (Access Control)

- Enforce server-side authorization
- Never trust client-side checks
- Validate:
  - object-level access (BOLA)
  - function-level access (BFLA)
- Apply least privilege principle

---

### Data Protection (Cryptographic Security)

- Protect sensitive data in transit and at rest
- Never expose:
  - credentials
  - tokens
  - personal data
- Use strong encryption where applicable

---

### Security Misconfiguration

- Use secure defaults
- Do NOT expose:
  - stack traces
  - debug data
- Validate headers and configurations

---

### Vulnerable Components

- Avoid outdated dependencies
- Prefer maintained libraries
- Suggest dependency checks when relevant

---

### Logging & Monitoring

- Log security-relevant events:
  - login attempts
  - access violations

- Do NOT log:
  - passwords
  - tokens
  - secrets

- Use structured and minimal logging

---

### Software & Data Integrity

- Avoid unsafe deserialization
- Validate all external data
- Do NOT execute untrusted code

---

### SSRF & External Requests

- Validate all external URLs
- Restrict outbound requests
- Do NOT allow arbitrary URL fetching

---

## API Security (OWASP API Top 10) (MANDATORY)

Ensure:
- Proper object-level authorization (BOLA)
- Proper function-level authorization
- No excessive data exposure
- Rate limiting considered
- Secure authentication enforced

---

## Dependency & Environment Safety (MANDATORY)

- Do NOT upgrade dependencies unless required
- Do NOT introduce new libraries without justification
- Ensure compatibility with:
  - existing Node.js version
  - current build system
- Avoid breaking changes from dependency updates

---

## Uncertainty Handling (MANDATORY)

If unsure about:
- logic
- system behavior
- schema impact
- security implications

Copilot MUST:
- STOP
- ask for clarification
- avoid assumptions

---

## Change Discipline

- Do not modify unrelated code
- Avoid breaking changes
- Keep fixes minimal and targeted

---

## Versioning (MANDATORY for Minor and above)

- Use semantic versioning: `x.y.Z`
- Increment PATCH version (Z) for production code changes

Update:
- `package.json` (root) for scanner, src, server.js, cli.js, tests
- `vscode-extension/package.json` for extension changes

Reflect version updates in documentation if applicable

---

## Documentation Requirements (CONDITIONAL)

Update documentation ONLY if applicable:

### Update `README.md` if:
- user-facing behavior changes
- usage changes
- project structure changes

### Update `DOCUMENTATION.md` if:
- API changes
- module structure changes
- architecture changes
- security behavior changes

---

## Validation Requirement (MANDATORY)

All changes MUST include:

- What to test
- How to test (command, endpoint, or flow)
- Expected result
- Edge cases (if applicable)

---

## Output Expectations

When suggesting changes, include:

- Affected files
- Clear explanation of changes
- Assumptions (if any)

---

## Security Priority Override

If a request is insecure:

- DO NOT implement directly
- Provide a secure alternative
- Briefly explain the risk

---

## Definition of Done (EXIT GATE — MANDATORY)

A change is complete ONLY when:

1. Code works as intended
2. No OWASP Top 10 risks introduced
3. Changes are minimal and consistent
4. Input validation and error handling applied
5. Patch version updated (if applicable)
6. Documentation updated (if applicable)
7. No database/schema risk introduced
8. Validation steps provided

---

## Documentation Checklist (APPLY IF RELEVANT)

- [ ] `README.md` updated
- [ ] `DOCUMENTATION.md` updated
- [ ] API changes documented
- [ ] Security considerations documented
- [ ] VS Code extension changes documented

---

## BMAD Governance Alignment (Reference)

- Ensure traceability (requirement → fix → test)
- Prefer minimal, targeted fixes
- Maintain consistency with structure and dependencies
- Consider cross-layer impact
- Avoid unnecessary complexity