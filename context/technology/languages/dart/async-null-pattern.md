---
id: TECH-DART-ASYNC
status: baseline
scope: "Dart; applicable only when enabled by the application profile"
triggers:
  - "Dart future"
  - "Dart null"
  - "Dart error"
---

# Dart Null Safety and Async Ownership

## Guidelines

Model optional data explicitly and give every Future a completion or supervision path.

## Why

Forced null assertions and abandoned asynchronous work hide invalid state.

## Structure

```dart
Future<String> normalizeLabel(Future<String?> input) async {
  final value = (await input)?.trim();
  if (value == null || value.isEmpty) {
    throw ArgumentError('Label is required');
  }
  return value;
}
```

## Implementation

Use nullable values only when absence has a defined meaning. Preserve stack information on rethrow. Cancellation and widget disposal are responsibilities of the owning lifecycle; a Future alone does not establish cancellation.

## Rules

- `TECH-DART-ASYNC-001` MUST handle nullable values before dereferencing them.
- `TECH-DART-ASYNC-002` MUST observe or explicitly supervise asynchronous failures.
- `TECH-DART-ASYNC-003` SHOULD keep infrastructure failures distinguishable from validation failures.

## Validation

Run dart analyze and targeted tests. Exercise null, empty, failure after disposal, and overlapping requests.

## Exceptions

Apply only to the enabled pack and changed behavior. Record a scoped exception with rationale and validation when a baseline cannot be followed; this document does not authorize an application architecture migration.

## Related

- [Pack overview](INDEX.md)
- [Application profile](../../../application/PROFILE.md)
- [Security routing](../../../security/INDEX.md)
- [Official reference](https://dart.dev/libraries/async/async-await)
