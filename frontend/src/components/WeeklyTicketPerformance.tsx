import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, CircularProgress, Stack, Typography } from '@mui/material';
import { ticketsApi, WeeklyPerformanceSummary } from '@/app/api/references';
import { useAuth } from '@/contexts/AuthContext';
import { useSse } from '@/lib/utils/useSse';
import ResolutionTimingSummary from './ResolutionTimingSummary';

export function formatActiveTime(hours: number): string {
  const minutes = Math.round(hours * 60);
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

const dateLabel = (value: string) => new Date(value).toLocaleDateString('en-PH', {
  timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric',
});

/** Summary-only endpoint: no report-management access or ticket content is needed. */
export default function WeeklyTicketPerformance() {
  const { user, myCap, isSessionLocked } = useAuth();
  const [summary, setSummary] = useState<WeeklyPerformanceSummary | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [breakdown, setBreakdown] = useState(false);
  const generation = useRef(0);
  const debounce = useRef<ReturnType<typeof setTimeout>>();
  const allowed = !!user && !!myCap?.isTicketPerformanceAccess && !isSessionLocked;

  const load = useCallback(async () => {
    if (!allowed) return;
    const request = ++generation.current;
    try {
      const result = await ticketsApi.getWeeklyPerformance();
      if (request !== generation.current) return;
      setSummary(result);
      setError(false);
    } catch {
      if (request === generation.current) setError(true);
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }, [allowed, user?.id]);

  useEffect(() => {
    setSummary(null);
    setError(false);
    setLoading(true);
    setShowAll(false);
    setBreakdown(false);
    void load();
    return () => { generation.current++; clearTimeout(debounce.current); };
  }, [load]);

  useSse(['TICKET_UPDATED', 'GLOBAL_SETTINGS_UPDATED', 'SYSTEM_STATUS_CHANGED', 'USER_DIRECTORY_UPDATED'], () => {
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => void load(), 750);
  });

  useEffect(() => {
    if (!allowed) return;
    // One boundary timer, not an API polling loop; handles an open dashboard at midnight.
    let boundary: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const offset = 8 * 60 * 60 * 1000;
      const now = Date.now();
      const nextMidnight = (Math.floor((now + offset) / 86400000) + 1) * 86400000 - offset;
      boundary = setTimeout(() => { void load(); schedule(); }, nextMidnight - now + 1000);
    };
    schedule();
    const visible = () => { if (document.visibilityState === 'visible') void load(); };
    document.addEventListener('visibilitychange', visible);
    return () => { clearTimeout(boundary); document.removeEventListener('visibilitychange', visible); };
  }, [allowed, load]);

  if (!allowed) return null;
  const rows = showAll ? summary?.rows : summary?.rows.slice(0, 5);
  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" component="h2">Weekly Ticket Performance</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 1 }}>
          {summary ? `${dateLabel(summary.startAt)} – ${dateLabel(summary.endAt)} · Philippine time` : 'Monday through today · Philippine time'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Score: 50% SLA compliance, 30% completed-ticket volume relative to the busiest assignee,
          and 20% active resolution efficiency (SLA allowance ÷ active time, capped at 100%).
          Active time follows the ticket SLA clock, excluding its credited pauses and off-clock time.
          Compare ticket counts too: a small sample may not represent overall performance.
        </Typography>
        {loading && <Box role="status" aria-label="Loading weekly performance"><CircularProgress size={24} /></Box>}
        {error && <Alert severity="warning" action={<Button color="inherit" onClick={() => void load()}>Retry</Button>}>
          Weekly performance could not be refreshed.{summary ? ' The last loaded results are shown.' : ' Please try again.'}
        </Alert>}
        {!loading && !error && !rows?.length && <Typography color="text.secondary">
          No completed tickets with usable SLA timing this week.
        </Typography>}
        {!!rows?.length && <Stack spacing={1} sx={{ mt: 1 }}>
          {rows.map((row, index) => <Box key={row.techId} sx={{ p: 1.5, borderRadius: 1, bgcolor: index % 2 ? 'action.hover' : 'background.default' }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr auto', md: 'minmax(180px, 2fr) repeat(4, minmax(90px, 1fr))' }, gap: 1 }}>
              <Typography fontWeight={600}>{index + 1}. {row.techName}</Typography>
              <Typography sx={{ gridColumn: { xs: 2, md: 5 }, gridRow: 1 }} fontWeight={700} color="primary.main">{row.weightedScore.toFixed(1)} / 100</Typography>
              <Typography variant="body2">Completed: {row.resolvedTickets}</Typography>
              <Typography variant="body2">SLA met: {row.slaRate.toFixed(1)}%</Typography>
              <Typography variant="body2">Avg active: {formatActiveTime(row.avgActiveResolutionHours)}</Typography>
            </Box>
            {breakdown && <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              SLA: {row.met} met / {row.missed} missed · Volume: {row.volumeScore.toFixed(1)} / 100 · Efficiency: {row.efficiencyScore.toFixed(1)} / 100.
              {' '}Each component is weighted at 50%, 30%, and 20% respectively; totals use unrounded values.
            </Typography>}
            {breakdown && <ResolutionTimingSummary average estimatedTickets={row.estimatedTickets} timing={{
              elapsedCalendarHours: row.avgCalendarResolutionHours,
              elapsedBusinessHours: row.avgBusinessResolutionHours ?? row.avgActiveResolutionHours,
              creditedPauseHours: row.avgCreditedPauseHours ?? 0, activeHours: row.avgActiveResolutionHours,
              pauseCount: row.pauseCount ?? null, estimated: !!row.estimatedTickets,
            }} />}
          </Box>)}
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {(summary?.rows.length ?? 0) > 5 && <Button onClick={() => setShowAll(v => !v)} aria-expanded={showAll}>
              {showAll ? 'Show top five' : `View all ${summary?.rows.length} assignees`}
            </Button>}
            <Button onClick={() => setBreakdown(v => !v)} aria-expanded={breakdown}>{breakdown ? 'Hide' : 'Show'} score breakdown</Button>
          </Stack>
        </Stack>}
        {!!summary?.excludedTickets && <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
          {summary.excludedTickets} completed ticket(s) excluded because assignee, SLA allowance, or reliable SLA timing is unavailable.
        </Typography>}
      </CardContent>
    </Card>
  );
}
