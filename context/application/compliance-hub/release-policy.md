# Compliance Hub Release Policy

These rules come from repository AGENTS.md and apply to application releases.

- CH-RELEASE-001 MUST have the implementer author user-facing in-app changelog notes.
- CH-RELEASE-002 MUST describe only visible functionality, enhancements, and bug fixes, targeted to capabilities rather than role names.
- CH-RELEASE-003 MUST supply the notes through an idempotent environment-managed SQL file under db-init.
- CH-RELEASE-004 MUST curate a separate End User changelog whenever requester-visible behavior changes; use short general wording and exclude staff-only context from both titles and notes.
- CH-RELEASE-005 MUST preserve existing display/acknowledgment records when reapplying a release-note update.
- CH-RELEASE-006 MUST verify affected version sources and deployment artifacts as part of a release; a documentation-only context update is not an application release.

## Evidence

Inspect [changelog service](../../../backend/src/modules/changelog/changelog.service.ts), [dialog](../../../frontend/src/components/ChangelogDialog.tsx), [API](../../../frontend/src/lib/api/changelog.ts), and [db-init guidance](../../../db-init/README.md). Incremental SQL may be environment-managed and ignored by Git; deliver the required artifact without changing that repository policy silently.

## Validation

Verify capability-specific visibility, a separate End User view, note categories, repeat application, and preservation of acknowledgment. Keep implementation-only changes out of user-facing notes.
