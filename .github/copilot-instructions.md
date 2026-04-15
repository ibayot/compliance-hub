# Repository BMAD Rules

This repository uses BMAD as the default development method.

## Core Principles
- Always consult existing code and documentation before proposing or implementing changes
- Keep all changes **small, testable, and traceable**
- Maintain consistency with existing structure, naming conventions, and dependency patterns
- Prefer **minimal, targeted fixes** over broad refactoring unless explicitly required

## Execution Discipline (Mandatory)
For every non-trivial change:
- Follow structured thinking:
  - Analysis → Design → Implementation → Validation
- Ensure **end-to-end impact awareness across affected layers** (do not assume single-layer scope)
- Provide:
  - affected files
  - validation/test steps
  - assumptions (if any)

## QA & Traceability Enforcement
- All changes must be traceable:
  - requirement/QA → root cause → fix → test
- Do not skip or partially address requirements
- If multiple issues overlap:
  - consolidate first
  - implement a single fix that resolves all related issues

## Change Rules (Non-Negotiable)
Do NOT:
- modify unrelated logic
- introduce breaking changes unless unavoidable
- replace requirements with alternative implementations without justification

Do:
- preserve backward compatibility wherever possible
- explicitly document any deviations, risks, or unavoidable impacts
- choose the safest and most reversible approach when uncertain

## Versioning
- Use semantic format: `x.y.Z`
- Every change must increment **Z (patch version)**
- Version updates must be reflected in:
  - commits
  - relevant documentation

## Testing Expectations
- Validate changes using appropriate test levels:
  - unit
  - integration (if applicable)
  - end-to-end (if applicable)
- Include:
  - commands executed
  - expected vs actual results
- Fix failures before finalizing changes

## Documentation Updates
- Update existing documentation when behavior changes
- Include:
  - what changed
  - why (linked to requirement/QA)
  - how to validate
  - rollback steps (if applicable)

## Architecture & Design Changes
- When proposing structural changes:
  - briefly explain tradeoffs
  - justify against current implementation
  - avoid unnecessary complexity

## Module & Code Additions
- Follow existing folder structure and dependency patterns
- Avoid introducing new patterns unless justified and documented