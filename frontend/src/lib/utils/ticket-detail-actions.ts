export type TicketDetailActionKey = 'updateStatus' | 'duplicate' | 'printDisposal' | 'printInspection' |
  'assign' | 'escalate' | 'close' | 'rate' | 'resolutionTime' | 'requester' | 'assignee';

export interface TicketDetailActionContext {
  status: string;
  canShowStatusAction: boolean;
  isTicketAdmin: boolean;
  isDisposal: boolean;
  isTechnician: boolean;
  hideTopActionButtons: boolean;
  hasAcceptedEscalation: boolean;
  isAcceptedEscalationFocal: boolean;
  canReassign: boolean;
  canEscalateNow: boolean;
  isRegularUser: boolean;
  isRequester: boolean;
  canSatisfaction: boolean;
  canOverrideResolutionTime: boolean;
  canCorrectTicketRecord: boolean;
  canCorrectAssignee: boolean;
}

/** Presentation-only: mirrors the original action guards, without granting permissions. */
export function getTicketDetailActionKeys(context: TicketDetailActionContext): TicketDetailActionKey[] {
  const c = context;
  const active = ['open', 'assigned', 'in_progress'].includes(c.status);
  const resolved = ['resolved', 'closed'].includes(c.status);
  const terminal = resolved || ['duplicate', 'cancelled'].includes(c.status);
  const actions: TicketDetailActionKey[] = [];
  if (c.canShowStatusAction) actions.push('updateStatus');
  if (c.isTicketAdmin && c.canShowStatusAction && active) actions.push('duplicate');
  if (c.isDisposal) {
    actions.push('printDisposal');
    if (c.isTechnician || c.isTicketAdmin) actions.push('printInspection');
  }
  if (!c.hideTopActionButtons && (!c.hasAcceptedEscalation || c.isAcceptedEscalationFocal) && c.canReassign && !terminal)
    actions.push('assign');
  if (!c.hideTopActionButtons && !terminal && ((!c.hasAcceptedEscalation && c.canEscalateNow) ||
    (c.hasAcceptedEscalation && c.isAcceptedEscalationFocal))) actions.push('escalate');
  if (!c.hideTopActionButtons && c.isRegularUser && c.isRequester && c.status === 'resolved') actions.push('close');
  if (!c.hideTopActionButtons && c.canSatisfaction) actions.push('rate');
  if (c.canOverrideResolutionTime && resolved) actions.push('resolutionTime');
  if (c.canCorrectTicketRecord) actions.push('requester');
  if (c.canCorrectAssignee) actions.push('assignee');
  return actions;
}
