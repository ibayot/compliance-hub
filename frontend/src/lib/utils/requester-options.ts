import type { UserRecord } from '@/lib/api/users';
import { formatPersonName } from './person-name';

const unitNames = (user: UserRecord): string => (user.units || [])
  .map(unit => typeof unit?.name === 'string' ? unit.name.trim() : '').filter(Boolean).join(' · ');

export function requesterOptionLabel(user: UserRecord): string {
  return [formatPersonName(user, user.email), unitNames(user), user.needsEmail ? 'email required' : '']
    .filter(Boolean).join(' — ');
}

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** Only filters already-authorized options; never fetches or broadens the eligible requester list. */
export function filterRequesterOptions(options: UserRecord[], state: { inputValue: string }): UserRecord[] {
  const input = normalize(state.inputValue.trim()).replace(/\s+/g, ' ');
  const words = input.split(/[,\s]+/).filter(Boolean);
  if (!words.length) return options;
  // An exact unit name means that unit, not unrelated names that happen to contain its words.
  const unitMatches = options.filter(user => (user.units || []).some(unit =>
    typeof unit?.name === 'string' && normalize(unit.name.trim()).replace(/\s+/g, ' ') === input));
  if (unitMatches.length) return unitMatches;
  return options.filter(user => {
    const searchable = normalize([formatPersonName(user, user.email), user.email, unitNames(user)].join(' '));
    return words.every(word => searchable.includes(word));
  });
}
