import type { TicketingConfig } from '../entities/ticketing-config.entity';

/** The configured end of this attendance shift, expressed as a Manila date and time. */
export function attendanceShiftEnd(
  date: string,
  clockIn: Date | null | undefined,
  config: TicketingConfig | null,
): Date {
  const at = (time: string) => new Date(`${date}T${time.length === 5 ? time + ':00' : time}+08:00`);
  if (config?.scheduleMode !== 'CWW') return at(config?.officeClockout || '17:00:00');
  if (!clockIn) return at(config.cwwClockoutEnd || '19:00:00');
  if (clockIn < at(config.cwwClockinStart || '07:00:00')) {
    return at(config.cwwClockoutStart || '18:00:00');
  }
  if (clockIn <= at(config.cwwClockinEnd || '08:00:00')) {
    return new Date(clockIn.getTime() + 11 * 60 * 60 * 1000);
  }
  return at(config.cwwClockoutEnd || '19:00:00');
}
