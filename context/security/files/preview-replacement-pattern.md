---
id: SEC-PREVIEW
status: baseline
scope: security
owner: application-maintainer
triggers: ["preview", "thumbnail", "replace file", "conversion worker"]
---

# Preview generation and file replacement pattern

## Guidelines

Treat converters as consumers of hostile content. Preserve the relationship between artifact, source version, permissions, and retention.

## Why

A stale preview can disclose replaced content, while a converter can consume excessive resources or reach unrelated files.

## Structure

Illustrative contract; adapt identifiers to the active application.

```text
approved source/version → bounded isolated converter → derived artifact(version, policy) → authorized delivery
replacement → create new version → atomic metadata switch → retire old artifacts
```

## Implementation

Bound CPU, memory, time, output size, filesystem, and network access. Invoke converters with argument arrays rather than shell interpolation. Define retry, cleanup, audit history, and permissions across replacement.

Review, approval, extraction, thumbnails, metrics, and comparisons must carry the source version through reads, writes, and retries. When the action applies to the current version, compare the version the user opened with the current version inside the same concurrency boundary as the decision write. A mismatch needs a recoverable conflict. Preserve historical decisions, but determine current status and queue eligibility from the applicable version.

A background job can finish after a replacement. Check the parent and version on lookup. Publish derived results to that version and condition any parent-level status, content, or error update on it still being current. Keep extraction, preview, and downstream processing outcomes distinguishable so one late or failed step cannot overwrite another step's authoritative state.

## Rules

- **SEC-PREVIEW-001** — MUST bind derived artifacts to the exact source version and its effective access policy.
- **SEC-PREVIEW-002** — MUST bound converter resources and restrict its available filesystem/network authority.
- **SEC-PREVIEW-003** — MUST handle replacement failures without exposing an unapproved artifact or losing the prior valid version unintentionally.

- **SEC-PREVIEW-004** — MUST preserve version identity through review and processing. Reject stale current-version mutations and keep superseded job outcomes from changing the current record.

## Validation

Test harmless corrupt files, timeout, worker crash, concurrent replacement, stale preview retrieval, and cleanup retry. Verify that a previously approved revision does not satisfy a new revision's review, that a stale submission changes no state, and that a delayed success or failure leaves the new revision intact. Probe direct preview, download, comparison, evidence and history routes with mismatched or inaccessible parent/version IDs.

## Exceptions

Record the affected rule, scope, compensating control, owner, and review condition before deviating. A baseline does not assert that existing code is compliant.

## Related Patterns

- [upload-security-pattern](upload-security-pattern.md)
- [download-access-pattern](download-access-pattern.md)
- [retention-deletion-pattern](../data-protection/retention-deletion-pattern.md)
