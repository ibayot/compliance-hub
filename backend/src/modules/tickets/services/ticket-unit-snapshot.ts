export interface TicketUnitSnapshot {
  unitId: number | null;
  unitName: string | null;
  source: 'filing' | 'requester_correction' | 'baseline';
  capturedAt: string;
}

/** Ticket history owns this value; later personnel transfers must not rewrite it. */
export function captureTicketUnit(requester: { units?: Array<{ id?: number; name?: string }> }, source: 'filing' | 'requester_correction' = 'filing'): TicketUnitSnapshot {
  const unit = requester.units?.[0];
  const unitId = Number(unit?.id);
  return {
    unitId: Number.isSafeInteger(unitId) && unitId > 0 ? unitId : null,
    unitName: unit?.name?.trim() || null,
    source,
    capturedAt: new Date().toISOString(),
  };
}
