---
id: TECH-MUI
status: baseline
scope: "Profile-enabled MUI 5 with the application's shared theme"
triggers:
  - "MUI component"
  - "theme token or visual variant"
  - "style consistency"
---

# MUI Theme and Component Pattern

## Guidelines

Use shared theme tokens and canonical UI components. Express visual hierarchy through approved variants; one-off styling should have a local purpose rather than redefine a repeated control.

## Why

Central token/variant ownership makes consistency edits traceable and reduces page-specific colors, dimensions, and interaction differences.

## Structure

```tsx
import Button from '@mui/material/Button';

export function ConfirmAction({ onConfirm }: { onConfirm: () => void }) {
  return (
    <Button variant="contained" color="primary" onClick={onConfirm}>
      Confirm
    </Button>
  );
}
```

This minimal MUI 5 example assumes the existing ThemeProvider and approved action hierarchy. A real application uses its canonical button wrapper when one exists.

## Store Implementation

The theme provider owns theme selection/tokens. The action's owner supplies loading, disabled, and permission state; styling does not maintain a separate permission or submission store. Use the installed MUI 5 APIs and inspect component imports because lab and core components may differ.

## Rules

- `TECH-MUI-001` MUST use established palette, spacing, typography, breakpoint, and focus tokens for repeated UI treatment.
- `TECH-MUI-002` MUST preserve semantic behavior, accessible naming, focus visibility, and approved action hierarchy when customizing components.
- `TECH-MUI-003` MUST assess affected consumers before changing global component defaults, style overrides, or theme tokens.
- `TECH-MUI-004` SHOULD promote a repeated local customization into an approved shared variant/component with documented states.

## Validation

Check supported themes, keyboard focus, loading/disabled/error states, narrow viewports, and long text. For global token/default changes, inspect representative consumers rather than validating one page only. Verify the installed MUI major before copying current documentation examples.

## Exceptions

A workflow-specific visual treatment needs a documented purpose and scope. It does not silently redefine the general component variant.

## Related

[Library router](INDEX.md), [React state ownership](../frameworks/react/component-state-pattern.md), [MUI 5 theming](https://v5.mui.com/material-ui/customization/theming/).
