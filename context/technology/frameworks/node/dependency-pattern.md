---
id: TECH-NODE-DEPS
status: baseline
scope: "Node.js Runtime; applicable only when enabled by the application profile"
triggers:
  - "npm install"
  - "dependency upgrade"
  - "package script"
---

# Node Dependencies and Package Scripts

## Guidelines

Use the repository's selected package manager and lockfile as one dependency contract.

## Why

Installing from a manifest alone can resolve different transitive versions on separate builds.

## Structure

```sh
# Example only when npm and a compatible package-lock.json are established:
npm ci
npm run build
```

## Implementation

Read script bodies before running them: a command named lint or prepare may mutate files. Preserve install flags that affect lockfile compatibility until a deliberate dependency change removes them. Verify native modules on the deployed OS/libc and architecture.

## Rules

- `TECH-NODE-DEPS-001` MUST keep the chosen manifest and lockfile synchronized when dependencies change.
- `TECH-NODE-DEPS-002` MUST NOT silently switch package managers or rewrite unrelated dependency resolutions.
- `TECH-NODE-DEPS-003` MUST check package lifecycle scripts and native/runtime compatibility for newly introduced dependencies.

## Validation

Use the declared runtime and a clean dependency installation in an isolated environment when the task changes dependency resolution. Run the affected build/tests and inspect lockfile scope.

## Exceptions

Apply this baseline only to the enabled pack and affected behavior. A different implementation needs a recorded rationale and relevant validation; introducing this pattern does not authorize replacing the application's architecture.

## Related

- [Pack overview](INDEX.md)
- [Application profile](../../../application/PROFILE.md)
- [Security routing](../../../security/INDEX.md)
- [Official reference](https://docs.npmjs.com/cli/v11/commands/npm-ci/)
