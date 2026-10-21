---
id: CTR-SCAN
status: baseline
scope: "Container Security; applicable only when enabled by the application profile"
triggers:
  - "image vulnerability"
  - "SBOM"
  - "container dependency scan"
---

# Image and Dependency Findings

## Guidelines

Assess scan findings against the exact built/deployed artifact and its runtime exposure.

## Why

A manifest scan may miss OS libraries; an image scan alone may lack context for reachability or compensating controls.

## Structure

```text
artifact digest -> OS/language inventory -> supported scan tooling
finding -> affected component -> exposure/impact -> action owner
fix/rebuild -> verify new digest -> rescan -> retained evidence
```

## Implementation

Use tools already approved by the project; this pattern does not authorize installing or uploading private artifacts. Distinguish fix availability, runtime relevance, and false positives. Time-bound accepted risk and keep the original finding traceable.

## Rules

- `CTR-SCAN-001` MUST associate findings and remediation evidence with an artifact/version.
- `CTR-SCAN-002` MUST NOT declare a service secure solely because one scanner reports no findings.
- `CTR-SCAN-003` SHOULD track accepted material findings with owner, rationale, and review condition.

## Validation

Review source and OS dependency coverage, scan the actual target image when tooling is available, and verify remediation removed the intended component/finding.

## Exceptions

Existing Dockerfiles/Compose configuration are implementation evidence, not evidence that this baseline is satisfied. Record deviations and their affected environment; evaluate changes separately before altering a running deployment.

## Related

- [Pack overview](INDEX.md)
- [Application profile](../../application/PROFILE.md)
- [Security routing](../../security/INDEX.md)
- [Official reference](https://docs.docker.com/scout/)
