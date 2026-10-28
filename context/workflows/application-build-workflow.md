---
id: WF-APPLICATION-BUILD
status: baseline
scope: new applications and substantial runnable application slices
owner: application-maintainers
triggers: [new application, initial build, first run, runnable handoff]
---

# Application Build and Runnable Handoff

## Purpose and preconditions

Turn an authorized build request into a usable local application with observable evidence. Read [intake](../application/intake.md), select the actual technology guidance, and record acceptance criteria in the local [execution map](../templates/execution-map-template.md). Existing instructions and explicit user limits govern installation, execution, network use, and credentials. This workflow grants no deployment, account-creation, spending, or publication authority.

## Structure

~~~text
intake and operating workflow -> selected architecture and dependencies
  -> safe local setup -> seeded/empty data states -> application start
  -> essential user tasks and failure/recovery checks -> build/type checks
  -> completion gate and runnable handoff
~~~

## Implementation and evidence

### First run

Read package scripts before executing them. Use the selected runtime and package manager in the application root, install dependencies, and synchronize the supported lockfile. Apply [dependency security and installed-API compatibility](../security/infrastructure/dependency-security-pattern.md) for new packages. Do not confuse a repository's context-tool package with its application package. Preserve the user's environment files and running processes. Create an ignored framework-appropriate local environment file only from safe development defaults when needed and authorized; keep the example file documented. Never invent a credential, overwrite an existing secret, print resolved sensitive configuration, or treat an empty placeholder as a working required integration. [Configuration](../infrastructure/configuration-pattern.md) owns configuration validation and exposure.

Start the application on an available port and confirm its URL responds. A running process or an HTTP 200 does not prove the page renders or its controls work. Exercise initial routes and the primary user tasks in the actual UI, using synthetic inputs. For client-only tools, check the browser-executed code, dynamic module imports, meaningful results, and privacy boundary. For provider features, follow the [external integration](../api-and-integrations/external-integration-pattern.md) checks. Repository content follows [content authoring and delivery](../architecture/content-authoring-pattern.md).

For database-backed delivery, apply [schema readiness](../data/schema-bootstrap-pattern.md): identify who prepares/applies/verifies updates, the verified runtime connection and artifact, and whether local work is delegated. Exercise the affected running application with its actual schema, not only a disposable test database. Within existing authority, complete required local increments before a ready claim; otherwise name the exact pending operator step. Keep staging/production authority separate and deliver ignored artifacts through the accepted channel.

### Functional acceptance

Before implementation, map applicable inputs and decisions through the [workflow completeness contract](../application/workflow-completeness.md). Separate configuration activation from per-request readiness. Verify the creation journey with changed inputs and missing-to-corrected states; a directly opened complete fixture or a collection of unrelated state screenshots does not prove that journey. Split preview/engineering tracks use the same acceptance rows (APP-COMPLETE-003..007).

Build a small flow matrix before claiming success: starting state, action, expected observable result, error/recovery state, and evidence. Cover each essential feature rather than only the landing page. Include changes after an initial result: adjust parameters, enter another value, reset, retry, navigate away/back, and directly load an item route where relevant. Use [frontend refresh semantics](../architecture/frontend-pattern.md) and [UI quality](../quality/ui-quality-pattern.md). Run the relevant build/type checks as a separate layer; they cannot replace UI or integration behavior checks. Use focused automation or a recorded manual walkthrough proportionate to the risk, without mandating a new test framework for every application.

### Blocked execution and handoff

When installation, credentials, a browser, or a provider is unavailable, resolve authorized local causes and continue independent work. Record the exact failed command or unavailable capability, affected acceptance criteria, and next action. A code review or mock can provide bounded evidence, but cannot establish live compatibility. [Definition of done](../quality/definition-of-done.md) owns the completion claim. A blocker permits an honest incomplete handoff; it does not turn unexecuted required checks into success.

Provide the working directory, exact install/start commands, environment variable names, required owner actions, and the preview URL when available. When a preview is part of the task, leave it reachable if the environment supports that; otherwise state whether the process was stopped and how to restart it. Installing dependencies and starting the app again on another machine or after a stopped session is normal setup. The defect is an unexercised or misleading handoff, not the existence of setup commands.

## Rules

- WF-APP-001 MUST perform the authorized local dependency, safe configuration, and start steps for a runnable application request, or record the exact blocker and resulting incomplete acceptance criteria.
- WF-APP-002 MUST exercise every essential delivered user flow in its intended runtime, including changed inputs and relevant negative/recovery states, before reporting that flow working. A build, screenshot, server start, or documentation review alone is insufficient.
- WF-APP-003 MUST run the selected build/type checks separately from behavioral checks and preserve the actual environment, commands, outcomes, and limitations in the local execution map.
- WF-APP-004 MUST hand off an accurate launch recipe and preview status, clearly identifying missing owner-supplied secrets, configuration, content, or unverified integrations.

## Validation and limits

Review a fresh-install/start result, representative route and task outcomes, content initialization, dependency/runtime compatibility, and failure recovery. An environment-blocked application remains implemented/unverified or incomplete as appropriate. Context-tool tests verify this guidance's routing/export integrity; they do not execute an adopting application or guarantee defect prevention.

## Related

- [Feature workflow](feature-change-workflow.md)
- [Testing](../quality/testing-pattern.md)
- [Validation matrix](../quality/validation-matrix.md)
- [Definition of done](../quality/definition-of-done.md)
