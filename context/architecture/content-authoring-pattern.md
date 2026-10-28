---
id: ARCH-CONTENT
status: baseline
scope: maintained editorial or informational content and repository-backed collections
owner: application-maintainers
triggers: [blog, newsletter archive, about content, CMS, admin editor, Markdown content, seeded content]
---

# Content Authoring and Delivery

## Guidelines and rationale

Design reader access together with the owner's accepted maintenance workflow. A list and detail page alone do not establish how content will be changed, and an editor UI does not establish durable publication. [Intake](../application/intake.md) owns the decision about an admin interface versus an accepted repository/editor workflow; this pattern owns implementing and checking that decision.

## Structure

~~~text
authorized author -> editor/repository -> validated draft -> preview/publish
  -> durable source and publication mechanism -> reader list/detail routes
fresh checkout -> committed seed or explicit empty collection -> usable routes
~~~

## Implementation

### Authoring and deployment

Record the editable collections/pages, authorized actors, draft/published states, canonical storage, validation, and how changes reach readers. Match the persistence choice to the actual host. Repository Markdown can support local or Git-backed editing with a build/redeploy step. A browser admin editor needs an authorized durable write path; a login screen alone is insufficient. On read-only or ephemeral deployments, writing into the deployed source directory or a function's temporary filesystem cannot be the persistence design. Do not promise online edits survive reload/restart or appear in production without verifying the entire publication path. No database, CMS, Git provider, or authentication service is selected by this reusable pattern.

When administration is selected, apply the active authentication, session, authorization, input/output, and secret rules at the trusted boundary. Do not use a hidden route, browser-only check, hardcoded shared password, or client-exposed provider token as protection. Missing owner credentials are configuration gaps, not permission to invent accounts.

### Files, initial data, and absence

Resolve content paths from an explicit application/package root or framework-supported source convention, not an assumed shell working directory. Check development, build, production start, and deployment packaging where relevant, including client/server module boundaries. Commit non-sensitive seed content when a populated initial experience is required, or provide a deterministic, idempotent initialization command that is exercised as part of setup. Clearly distinguish illustrative examples from a real historical archive.

Define separate behavior for a genuinely empty collection, an unknown slug, an intentionally optional absent directory, missing required packaged content, and invalid front matter. Empty states and not-found pages should be usable. Expected absence must not escape as an unhandled filesystem error. Required configuration or corrupted content must fail through a controlled diagnostic/error boundary; do not catch every error and silently return an empty list. Tests should deliberately vary the working directory and remove an optional collection to expose path and initialization assumptions.

## Rules

- ARCH-CONTENT-001 MUST implement the accepted authoring/publication workflow with explicit canonical storage, actor permissions, editable resources, and visibility of saved versus published content.
- ARCH-CONTENT-002 MUST verify repository content paths, initialization, and packaging from the documented application root and supported run modes; required seed content must be committed or reproducibly created without personal data.
- ARCH-CONTENT-003 MUST handle empty collections, unknown items, and expected missing files deliberately, while surfacing missing required content or invalid data through safe controlled failures rather than unhandled filesystem errors or silent data loss.
- ARCH-CONTENT-004 MUST use durable authorized persistence compatible with the target host for online edits; temporary or read-only deployed filesystems must not be presented as a persistent CMS.
- ARCH-CONTENT-005 MUST verify the selected maintenance path end to end: edit, save, preview/publish, reload/restart, and reader visibility; authenticated administration also requires direct unauthorized read/write checks.

## Validation and enforcement

Use synthetic seed files and controlled missing/invalid cases. Exercise list and item routes, empty collections, alternate working directory, clean checkout, and the actual publication path. For a Git workflow, verify a source edit appears in preview/build output; for an admin workflow, verify protected editing and persistence. Automated route/fixture checks and manual owner workflows are complementary. Documented guidance alone is not enforcement or evidence that an application's admin or content routes work.

## Related

- [System boundaries](system-overview.md)
- [File storage](../infrastructure/file-storage-pattern.md)
- [Authentication](../security/identity/authentication-pattern.md)
- [Backend authorization](../security/authorization/backend-enforcement-pattern.md)
- [Input validation](../security/input-output/input-validation-pattern.md)
- [Rich text output](../security/input-output/encoding-richtext-pattern.md)
- [Application build workflow](../workflows/application-build-workflow.md)
