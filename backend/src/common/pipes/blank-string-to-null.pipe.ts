import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';

/** Convert blank request-body strings to null before DTO validation. */
@Injectable()
export class BlankStringToNullPipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    if (metadata.type !== 'body') return value;
    return normalizeBlankStrings(value);
  }
}

export function normalizeBlankStrings(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.trim() === '' ? null : value;
  }

  if (Array.isArray(value)) {
    return value.map(normalizeBlankStrings);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, normalizeBlankStrings(child)]),
    );
  }

  return value;
}
