---
id: TECH-FORM
status: baseline
scope: "Profile-enabled React Hook Form 7, Zod 3, and compatible resolvers"
triggers:
  - "form schema or validation"
  - "default values or reset"
  - "controlled input integration"
---

# React Hook Form and Zod Pattern

## Guidelines

Use the selected form owner and schema to keep editable values, validation, and submission behavior aligned. Integrate canonical UI fields with the form library's supported registration/controller mechanism.

## Why

Independent field state and schema types can diverge; repeated automatic resets can erase a user's draft.

## Structure

```typescript
import { z } from 'zod';

export const labelSchema = z.object({
  label: z.string().trim().min(1, 'Enter a label'),
});
export type LabelValues = z.infer<typeof labelSchema>;
```

The schema uses Zod 3-compatible APIs. In a form, connect it through the installed compatible zodResolver and useForm implementation; use the application's approved field and error components.

## Store Implementation

React Hook Form owns editable values, touched/dirty state, and submission status. Zod defines validation/transformation, and the server owns authorization and authoritative business validation. Initialize defaults for the intended record and reset deliberately after a record change or confirmed save. Do not copy every field into parallel React state. Input/output types may differ when schema coercion/defaults/transforms are used; verify resolver typing for the installed versions.

## Rules

- `TECH-FORM-001` MUST define default values and intentional draft-reset behavior for editable workflows.
- `TECH-FORM-002` MUST map client and server validation failures into the approved field/form feedback contract.
- `TECH-FORM-003` MUST prevent duplicate non-idempotent submission while preserving failure recovery.
- `TECH-FORM-004` MUST NOT treat browser/schema validation as a substitute for backend validation or authorization.

## Validation

Test missing/whitespace values, cross-field constraints, rejected server validation, failed submission/retry, record changes, dirty drafts during refetch, and keyboard submission. Run the existing type check with the installed form/resolver/schema versions.

## Exceptions

Existing forms using another approved owner require a scoped migration decision; this pattern does not authorize rewriting every form.

## Related

[Library router](INDEX.md), [React server/form state](../frameworks/react/server-form-state-pattern.md), [official resolver integration](https://github.com/react-hook-form/resolvers), [Zod 3 documentation source](https://github.com/colinhacks/zod/blob/main/packages/docs-v3/home.md).
