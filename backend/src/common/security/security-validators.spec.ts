import * as path from 'path';
import {
  parseStringArrayJson,
  resolvePathWithinRoot,
  sanitizeObjectByAllowlist,
} from './security-validators';

describe('security-validators', () => {
  describe('resolvePathWithinRoot', () => {
    it('resolves a safe path under root', () => {
      const result = resolvePathWithinRoot('/tmp/storage', 'documents/file.txt');
      const expectedRoot = path.resolve('/tmp/storage');
      expect(result.startsWith(expectedRoot)).toBe(true);
      expect(result.endsWith(`${path.sep}documents${path.sep}file.txt`)).toBe(true);
    });

    it('throws for traversal outside root', () => {
      expect(() => resolvePathWithinRoot('/tmp/storage', '../../etc/passwd')).toThrow(
        'Path escapes storage root',
      );
    });
  });

  describe('parseStringArrayJson', () => {
    it('parses JSON string arrays safely', () => {
      expect(parseStringArrayJson('["a","b"," c "]')).toEqual(['a', 'b', 'c']);
    });

    it('returns fallback single item for non-json strings', () => {
      expect(parseStringArrayJson('single')).toEqual(['single']);
    });

    it('returns empty array for invalid non-string input', () => {
      expect(parseStringArrayJson({ key: 'value' })).toEqual([]);
    });
  });

  describe('sanitizeObjectByAllowlist', () => {
    it('keeps only allowlisted keys', () => {
      const payload = {
        safeA: 'x',
        safeB: 123,
        unsafe: 'drop',
      };

      const result = sanitizeObjectByAllowlist<{ safeA: string; safeB: number }>(payload, [
        'safeA',
        'safeB',
      ]);
      expect(result).toEqual({ safeA: 'x', safeB: 123 });
    });
  });
});
