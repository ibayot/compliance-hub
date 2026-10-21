import { Typography } from '@mui/material';
import type { ResolutionTimingView } from '@/lib/types/ticket-timing';
const hours = (value: number) => `${value.toFixed(2)}h`;

/** Same explanation in ticket details, weekly performance, and selected-period reports. */
export default function ResolutionTimingSummary({ timing, average = false, estimatedTickets }: {
  timing: ResolutionTimingView; average?: boolean; estimatedTickets?: number;
}) {
  return <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'left' }}>
    {timing.elapsedCalendarHours != null && <>{average ? 'Average elapsed calendar time' : 'Elapsed calendar time'}: {hours(timing.elapsedCalendarHours)}. </>}
    {average ? 'Average business time before pauses' : 'Business time before pauses'}: {hours(timing.elapsedBusinessHours)}
    {' − '}{average ? 'average credited pauses' : 'credited pauses'}: {hours(timing.creditedPauseHours)}
    {' = '}{average ? 'average active time' : 'active time'}: {hours(timing.activeHours)}.
    {' '}Recorded pause count{average ? ' across these tickets' : ''}: {timing.pauseCount ?? 'unavailable for older records'}.
    {' '}Off-clock hours are excluded before this calculation.
    {timing.estimated && <> Estimate: {estimatedTickets ? `${estimatedTickets} corrected ticket(s) have` : 'this corrected ticket has'} older pause totals without exact interval history.</>}
  </Typography>;
}
