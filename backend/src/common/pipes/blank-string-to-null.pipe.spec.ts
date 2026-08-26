import { BlankStringToNullPipe, normalizeBlankStrings } from './blank-string-to-null.pipe';

describe('BlankStringToNullPipe', () => {
  it('converts blank body values recursively but preserves non-body values', () => {
    const pipe = new BlankStringToNullPipe();
    const body = { optional: '   ', nested: { note: '', value: 'kept' }, items: [' ', 'x'] };

    expect(pipe.transform(body, { type: 'body' } as any)).toEqual({
      optional: null,
      nested: { note: null, value: 'kept' },
      items: [null, 'x'],
    });
    expect(pipe.transform(' ', { type: 'query' } as any)).toBe(' ');
  });

  it('does not alter null, booleans, or numbers', () => {
    expect(normalizeBlankStrings(null)).toBeNull();
    expect(normalizeBlankStrings(false)).toBe(false);
    expect(normalizeBlankStrings(0)).toBe(0);
  });
});
