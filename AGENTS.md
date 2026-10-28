# AGENTS.md

This repository uses BMAD orchestration by default.

Operating rules:
- Start by classifying the task into analysis, architecture, implementation, or QA.
- Use the smallest sufficient BMAD workflow.
- Keep outputs traceable from request to implementation.
- For medium or large work, produce a mini-plan before changing files.
- Do not introduce architectural changes silently.
- Always define validation steps.
- Include the running local Docker database in implementation readiness under `APP-CH-007`; disposable test databases do not replace local application updates. Staging and production database updates remain user-managed unless explicitly authorized.
- For new applications and multi-step features, follow `context/application/workflow-completeness.md`: map required inputs to consumers/correction paths and verify the essential entry-to-outcome journey. Preserve the local evidence/Git policy in `APP-CH-008`.
- Before substantive analysis, architecture, implementation, review, or QA, read `context/MASTER.md`, classify the request with its routing table, and load only the context documents selected by that route. Do not preload the entire `context/` tree.
- In plans and completion summaries, cite the applicable context rule IDs. When no pattern covers a material decision, identify it as a candidate pattern instead of silently establishing a new convention.
- If a request conflicts with an active context rule, identify the exact rule and resolve the conflict by following the rule, recording an approved scoped exception, or explicitly revising the rule and assessing affected implementations. Never drift silently.
- Treat `context/application/PROFILE.md` as the active application profile. Do not apply inactive language, framework, platform, or infrastructure guidance to this repository.
- Context standards describe intended behavior; they are not evidence that existing code already complies. Audit implementation evidence before reporting compliance, and keep audit-only requests read-only.
- When a change establishes or alters a reusable convention, update the relevant context pattern, index, implementation map, decision, or exception within the same change when that documentation update is in scope.
- For every application release, the implementer must author the user-facing in-app changelog; do not require the user to transcribe release notes manually.
- Changelog notes must describe only visible functionality, enhancements, and bug fixes, must target role capabilities rather than role names, and must be supplied through an idempotent environment-managed SQL file under `db-init`.
- Every release must include a separately curated End User changelog when requester-visible behavior changed. Use short general wording, exclude staff-only context from both its title and notes, and limit it to the End User's visible workflows.
