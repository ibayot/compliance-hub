import { ValueTransformer } from 'typeorm';

export const dateTransformer: ValueTransformer = {
  to: (value: string | null) => value,
  from: (value: string | Date | null) => {
    if (!value) return value;
    // If the database driver returns a Date object instead of a string (which happens for 'date' type),
    // extract the YYYY-MM-DD in the local timezone of the Node process to avoid UTC shifting bugs.
    if (value instanceof Date) {
      const y = value.getFullYear();
      const m = String(value.getMonth() + 1).padStart(2, '0');
      const d = String(value.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return value;
  },
};
