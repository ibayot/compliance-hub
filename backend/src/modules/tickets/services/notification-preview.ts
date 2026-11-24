/** Lock-screen-safe summaries selected only from the persisted notification event type. */
const SAFE_NOTIFICATION_PREVIEWS: Readonly<Record<string, string>> = {
  assigned: 'A ticket assignment was updated.',
  auto_assigned: 'A ticket assignment was updated.',
  ticket_assigned: 'A ticket assignment was updated.',
  manually_reassigned: 'A ticket assignment was updated.',
  unassigned: 'A ticket assignment was updated.',
  assignee_corrected: 'A ticket assignment was updated.',
  queue_promoted: 'A ticket is ready for you to work on.',
  status_changed: 'A ticket status was updated.',
  ticket_cancelled: 'A ticket was cancelled.',
  ticket_closed: 'A ticket was closed.',
  requester_corrected: 'The requester details on a ticket were updated.',
  resolution_time_overridden: 'A ticket response-time record was corrected.',
  comment_added: 'A new comment was added to a ticket.',
  internal_note_added: 'A ticket note was added.',
  internal_note_mentioned: 'You were mentioned in a ticket note.',
  attachment_replaced: 'A ticket attachment was updated.',
  escalation_received: 'A ticket escalation needs your attention.',
  ticket_escalated: 'A ticket was escalated.',
  escalation_requested: 'A ticket escalation needs your attention.',
  escalation_accepted: 'A ticket escalation was accepted.',
  escalation_declined: 'A ticket escalation was declined.',
  escalation_returned: 'An escalated ticket was returned.',
  escalation_focal_selected: 'Your escalation assignment was updated.',
  escalation_focal_removed: 'Your escalation assignment was updated.',
  ticket_rated: 'Feedback was submitted for a ticket.',
  sla_alert_75: 'A ticket is nearing its service target.',
  sla_alert_100: 'A ticket is overdue.',
  sla_alert_150: 'A ticket has exceeded its service target by 50%.',
  nearing_sla: 'A ticket is nearing its service target.',
  overdue_sla: 'A ticket is overdue.',
  frozen_ticket_reminder: 'A ticket needs follow-up.',
  attendance_updated: 'An attendance record was updated.',
  attendance_absence_report: 'An attendance update is available.',
  duty_updated: 'A duty schedule was updated.',
  unit_synchronized: 'A unit record was synchronized.',
  role_capabilities_updated: 'Account access settings were updated.',
  user_role_updated: 'Account access settings were updated.',
};

export function safeNotificationPreview(eventType: string): string {
  return Object.prototype.hasOwnProperty.call(SAFE_NOTIFICATION_PREVIEWS, eventType)
    ? SAFE_NOTIFICATION_PREVIEWS[eventType]
    : 'A new update is available in FO2 iCare.';
}
