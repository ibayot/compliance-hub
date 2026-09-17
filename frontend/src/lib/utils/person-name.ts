export type PersonNameLike = {
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  suffix?: string | null;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  email?: string | null;
} | null | undefined;

export function formatPersonName(person: PersonNameLike, fallback = ''): string {
  if (!person) return fallback;
  const name = [
    person.firstName ?? person.first_name,
    person.middleName ?? person.middle_name,
    person.lastName ?? person.last_name,
    person.suffix,
  ]
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)
    .join(' ');
  return name || String(person.email ?? '').trim() || fallback;
}
