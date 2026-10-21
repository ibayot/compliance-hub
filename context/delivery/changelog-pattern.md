---
id: CORE-DELIVERY-CHANGELOG
status: baseline
scope: delivery
owner: application-maintainers
---

# User-Facing Changelog

## Guidelines
DELIVERY-NOTES-001 MUST curate notes by visible user workflow and intended audience.

## Why
Release notes help people understand what changed; implementation jargon and unrelated staff details obscure that purpose.

## Structure
~~~text
audience/capability -> feature/enhancement/fix
                   -> short title -> visible outcome
~~~

## Implementation
The implementer writes the notes from delivered behavior and acceptance evidence. Apply the profile's storage, idempotence, visibility, and acknowledgment requirements.

## Rules
DELIVERY-NOTES-002 MUST exclude unshipped features and internal-only maintenance from user-facing notes.
DELIVERY-NOTES-003 MUST preserve audience separation when a release contains different workflows.
DELIVERY-NOTES-004 MUST not ask the user to transcribe notes the implementer can author.

## Validation
Compare each note with shipped behavior, title/content scope, audience filtering, and repeat application if data-managed.
