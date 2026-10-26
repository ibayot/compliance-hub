/** OT provenance is server-owned; a calendar edit never retroactively changes a ticket. */
export function isOvertimeStaff(role?: string): boolean {
  return !!role && role !== 'user' && role !== 'super_admin';
}

export function overtimeReadScope(alias: string, viewerId: number, staff: boolean): string {
  const own = `(${alias}.requester_id = :otViewerId OR ${alias}.created_by_id = :otViewerId OR ${alias}.assigned_to_id = :otViewerId)`;
  const participants = staff ? ` OR (${alias}.status = 'open' AND ${alias}.assigned_to_id IS NULL AND EXISTS (
    SELECT 1 FROM attendance ot_attendance INNER JOIN users ot_user ON ot_user.id = ot_attendance.user_id
    WHERE ot_attendance.user_id = :otViewerId AND ot_attendance.date = ${alias}.overtime_date
    AND ot_attendance.status = 'present' AND ot_attendance.clock_in_time IS NOT NULL
    AND ot_user.active = 1 AND ot_user.role NOT IN ('user', 'super_admin')))` : '';
  const escalation = staff ? ` OR EXISTS (SELECT 1 FROM ticket_escalations ote WHERE ote.ticket_id = ${alias}.id
    AND (ote.escalated_by_id = :otViewerId OR ote.escalated_to_id = :otViewerId))` : '';
  return `(${alias}.overtime_date IS NULL OR ${own}${participants}${escalation})`;
}
