---
id: TECH-PS-SAFE
status: baseline
scope: "PowerShell; applicable only when enabled by the application profile"
triggers:
  - "PowerShell utility"
  - "Windows path"
  - "native command"
---

# Safe PowerShell Utilities

## Guidelines

Use structured parameters and literal paths, and keep all path validation and mutation in the same shell.

## Why

Wildcard expansion, shell hopping, and native exit-code differences can target the wrong location or hide failure.

## Structure

```powershell
param([Parameter(Mandatory)][string]$TargetFile)
$ErrorActionPreference = 'Stop'
$ResolvedFile = (Resolve-Path -LiteralPath $TargetFile).Path
Get-Item -LiteralPath $ResolvedFile
```

## Implementation

For native programs, pass an argument array and check $LASTEXITCODE. Before recursive deletion or movement, resolve the full target and verify it remains beneath the explicitly allowed directory. This read-only example does not authorize deletion.

## Rules

- `TECH-PS-SAFE-001` MUST use -LiteralPath for user-controlled filesystem paths where supported.
- `TECH-PS-SAFE-002` MUST check native executable exit status when success determines subsequent work.
- `TECH-PS-SAFE-003` MUST NOT cross into cmd or another shell to perform destructive operations on enumerated PowerShell paths.

## Validation

Exercise spaces, brackets, Unicode, missing files, and a failing native command. Verify output does not disclose secret parameters.

## Exceptions

Apply only to the enabled pack and changed behavior. Record a scoped exception with rationale and validation when a baseline cannot be followed; this document does not authorize an application architecture migration.

## Related

- [Pack overview](INDEX.md)
- [Application profile](../../../application/PROFILE.md)
- [Security routing](../../../security/INDEX.md)
- [Official reference](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_quoting_rules)
