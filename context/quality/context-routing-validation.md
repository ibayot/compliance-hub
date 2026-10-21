# Context Routing Validation

The read-only validator checks local links, required documents, duplicate normative rule IDs, metadata IDs, and catalog reachability. These scenarios exercise semantic selection:

| Scenario | Expected context | Excluded unless triggered |
| --- | --- | --- |
| Change a button's weight | UI hierarchy, button/action scope, MUI if active, accessibility | Laravel, Flutter, database |
| Repair requester search | Selector, async/list state, API, authorization, current domain overlay | Container build |
| Replace ticket image | File picker, upload/replacement, file security/storage, ticket ownership | Unrelated reporting |
| Edit Compose healthcheck | Container health/readiness, active environment, secrets-safe validation | All UI components |
| Add Laravel request validation in a Laravel project | Its profile, PHP/Laravel validation/security packs | NestJS-specific code |
| Add Flutter offline form in a Flutter project | Its profile, Dart/Flutter state, mobile lifecycle/offline/security | React-only assumptions |
| Audit all dropdowns | Selector variants, implementation map, read-only consumer searches, explicit coverage | Automatic refactor |
| Context-only maintenance | Governance, templates, validator | Application release/version bump |

## Rules

QA-ROUTE-001 MUST use the current application's profile for an actual task. Hypothetical future-project scenarios test the library's routing design; they do not activate those packs here.

QA-ROUTE-002 MUST verify that a route finds related security/accessibility context without loading unrelated technologies.

## Command

~~~text
node context/tools/validate-context.mjs
~~~

External links are references and are not network-checked by this validator. Code examples are not automatically compiled.
