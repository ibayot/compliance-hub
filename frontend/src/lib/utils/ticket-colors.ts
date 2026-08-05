import { TicketType } from '@/app/api/references';

export const PRIORITY_COLOR: Record<string, 'default' | 'info' | 'warning' | 'error' | 'success'> =
  {
    low: 'info',
    medium: 'warning',
    high: 'error',
    urgent: 'error',
    critical: 'default',
  };

export const STATUS_COLOR: Record<
  string,
  'default' | 'info' | 'warning' | 'success' | 'error' | 'secondary'
> = {
  open: 'info',
  assigned: 'warning',
  in_progress: 'warning',
  resolved: 'success',
  closed: 'default',
  freeze: 'secondary',
  duplicate: 'default',
};

export const TICKET_TYPE_LABELS: Record<TicketType, string> = {
  desktop_support: 'Desktop Support',
  it_support: 'IT Support',
  pantawid_ict_support: 'Pantawid ICT Support',
};

export function formatTicketStatus(status: string): string {
  if (!status) return '';
  if (status.toLowerCase() === 'freeze') return 'ON HOLD';
  return status.replace(/_/g, ' ').toUpperCase();
}
