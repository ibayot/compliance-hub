# Application Definition Intake

Use this interview when initializing an application or materially changing its profile. Inspect what the repository already answers, then ask only about unresolved choices that affect design.

Use [workflow completeness and discovery](workflow-completeness.md) to expand the owner's main points into applicable domain decisions and an entry-to-outcome contract. The list below is a starting taxonomy, not proof that all necessary questions were answered. Record material areas as confirmed, evidenced, delegated, assumed, unresolved or excluded; ask focused follow-ups until essential consumers have a reachable, sufficiently specified path. Do not turn irrelevant possibilities into mandatory features or repeat resolved questions (APP-COMPLETE-001..003).

1. Purpose, intended outcomes, users, capabilities, and non-goals.
2. Critical workflows, alternate paths, destructive actions, state transitions, and recovery.
3. Data sensitivity, privacy, retention, audit, external legal/compliance requirements, and accountable owners.
4. Languages/framework versions, platforms, architecture constraints, integrations, and data ownership.
5. Visual language, action hierarchy, density, terminology, accessibility, devices, and localization.
6. State persistence, offline behavior, notifications, background work, and concurrent edits.
7. Environment topology, container use, hosting, secrets, backups, restore targets, and release process.
8. Acceptance criteria, testing commands, performance/reliability expectations, and evidence required.
9. AI tasks, approved providers/models, allowed prompt data, output authority, human review, evaluation criteria, retention/logging, per-user/system quotas, spend boundary, provider failure, and fallback behavior.

## Decisions before implementation

### Visual direction

Inspect existing approved designs and the user's brief first. When no direction is established, ask one concise question inviting a preferred theme, color palette, image reference, or reference URL. An answer such as "you decide" delegates the choice; record the chosen direction and its rationale. Follow an explicit instruction to choose or continue with assumptions without repeatedly asking. Record a reference as inspiration, not permission to copy its assets or claim it was inspected when it was not accessible. The [measured UI quality pattern](../quality/ui-quality-pattern.md) owns subsequent visual and interaction review.

### Content ownership and administration

For a blog, newsletter archive, about page, catalog, or other maintained content, identify who will create, edit, publish, and remove it after delivery. Ask whether the owner needs an authenticated admin interface or will use an explicitly accepted repository/editor workflow. Include editable informational pages, drafts, preview, publication, and durable storage in the decision. Public reader pages do not resolve the owner's maintenance needs. An admin interface is a capability to discuss; a login page alone does not provide content management. Do not introduce authentication, credentials, databases, or external accounts silently. An explicit public-only or repository-editing instruction can resolve the question. Use [content authoring](../architecture/content-authoring-pattern.md) for the selected workflow.

### Interaction and first run

For tools/configurators, identify whether changes update results live or require a deliberate submit/apply action. Identify the initial data and configuration required for a fresh checkout, the application working directory, install/start commands, and how the owner will open a preview. Use the [application build workflow](../workflows/application-build-workflow.md) for execution and evidence.

- APP-INTAKE-003 MUST resolve an unspecified visual direction through a concise preference/reference question before visual implementation, unless existing approved guidance or an explicit user delegation/assumption instruction resolves it. Record the answer, delegation, or stated assumption.
- APP-INTAKE-004 MUST explicitly resolve the post-delivery authoring and administration workflow for maintained content before treating its scope as complete, including actors, editable content, publishing, access, and persistence. Ask when the brief leaves a material capability or architecture choice unresolved.
- APP-INTAKE-005 MUST record tool refresh behavior and first-run prerequisites as acceptance criteria, rather than leaving these behaviors implicit in implementation choices.

### Runtime and database responsibility

Record a small environment matrix: actual connection/context, who prepares/applies/verifies migrations/configuration, what local changes are already delegated, prerequisites, artifact-delivery channel and what remains owner-managed. A database name does not establish whether the server is local or remote. Clarify material unknowns before execution; do not repeat an already approved local-update responsibility or assume it also grants production authority. Disposable checks supplement the selected application-runtime acceptance.

## Capturing later requests

APP-INTAKE-001 MUST classify a new request as a one-off behavior, reusable candidate, approved variant, exception, or deliberate rule change. APP-INTAKE-002 MUST surface a concrete conflict with the original workflow by rule ID. Do not freeze the original design when an authorized requirement legitimately changes it.

Record answers in PROFILE.md and local domain documents. Unknown values stay explicitly unresolved; do not invent organizational policy.
