/** API projection shared by ticket detail and management performance views. */
export type ResolutionTimingView = {
  elapsedCalendarHours?: number;
  elapsedBusinessHours: number;
  creditedPauseHours: number;
  activeHours: number;
  pauseCount: number | null;
  estimated: boolean;
};
