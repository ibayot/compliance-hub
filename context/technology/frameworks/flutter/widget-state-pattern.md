---
id: TECH-FLUTTER-STATE
status: baseline
scope: "Flutter; applicable only when enabled by the application profile"
triggers:
  - "Flutter widget"
  - "state management"
  - "form"
---

# Flutter Widgets and State

## Guidelines

Keep widgets focused on composition and assign each state value to its shortest appropriate lifetime.

## Why

State held in the wrong widget can be lost on navigation or remain after identity changes.

## Structure

```dart
import 'package:flutter/material.dart';

class LabelView extends StatelessWidget {
  const LabelView({super.key, required this.label});
  final String label;

  @override
  Widget build(BuildContext context) => Text(label);
}
```

## Store Implementation

The sample is presentational and owns no store. Ephemeral interaction may stay local; application/domain state uses the selected solution. Dispose controllers, listeners, and subscriptions in their owning lifecycle. Preserve theming, semantic labels, and text scaling.

## Rules

- `TECH-FLUTTER-STATE-001` MUST follow the application's declared state-management ownership model.
- `TECH-FLUTTER-STATE-002` MUST dispose owned resources when their lifecycle ends.
- `TECH-FLUTTER-STATE-003` SHOULD use shared theme/component contracts rather than repeated hardcoded visual values.

## Validation

Run flutter analyze and focused widget tests. Exercise rebuilds, disposal, large text, dark/light themes where supported, and state reset.

## Exceptions

Apply this baseline only to the enabled pack and affected behavior. A different implementation needs a recorded rationale and relevant validation; introducing this pattern does not authorize replacing the application's architecture.

## Related

- [Pack overview](INDEX.md)
- [Application profile](../../../application/PROFILE.md)
- [Security routing](../../../security/INDEX.md)
- [Official reference](https://docs.flutter.dev/data-and-backend/state-mgmt/intro)
