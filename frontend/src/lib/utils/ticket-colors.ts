import { TicketType } from '@/app/api/references';

type TicketChipStyle = {
  bgcolor: string;
  color: string;
  borderColor?: string;
  borderStyle?: 'solid';
  borderWidth?: number;
  borderRadius: number;
  fontWeight: number;
  letterSpacing?: string;
  '& .MuiChip-label': { color: string };
};

const filledChip = (bgcolor: string, color = '#fff', borderRadius = 999): TicketChipStyle => ({
  bgcolor,
  color,
  borderRadius,
  fontWeight: 700,
  letterSpacing: '0.02em',
  '& .MuiChip-label': { color },
});

const outlinedChip = (
  bgcolor: string,
  color: string,
  borderColor: string,
): TicketChipStyle => ({
  bgcolor,
  color,
  borderColor,
  borderStyle: 'solid',
  borderWidth: 1.5,
  borderRadius: 1,
  fontWeight: 700,
  letterSpacing: '0.02em',
  '& .MuiChip-label': { color },
});

// Priority uses one purple family and a pill shape, status uses solid semantic
// colors with squarer corners, and SLA uses a light outlined treatment. The
// three badge classes therefore remain distinguishable even when labels are
// viewed quickly or beside one another.
export const PRIORITY_CHIP_SX: Record<string, TicketChipStyle> = {
  low: filledChip('#5E35B1'),
  medium: filledChip('#7B1FA2'),
  high: filledChip('#9C1A68'),
  urgent: filledChip('#B71C5C'),
  critical: filledChip('#3D174D'),
  unset: filledChip('#6A5D70'),
};

export const STATUS_CHIP_SX: Record<string, TicketChipStyle> = {
  open: filledChip('#1565C0', '#fff', 1.5),
  assigned: filledChip('#F9A825', '#1B1B1B', 1.5),
  in_progress: filledChip('#00796B', '#fff', 1.5),
  pause: filledChip('#6D4C41', '#fff', 1.5),
  resolved: filledChip('#2E7D32', '#fff', 1.5),
  closed: filledChip('#455A64', '#fff', 1.5),
  freeze: filledChip('#3949AB', '#fff', 1.5),
  duplicate: filledChip('#616161', '#fff', 1.5),
};

export const SLA_CHIP: Record<string, { label: string; sx: TicketChipStyle }> = {
  met: { label: 'Met', sx: outlinedChip('#E8F5E9', '#1B5E20', '#43A047') },
  on_track: { label: 'On Track', sx: outlinedChip('#E0F2F1', '#004D40', '#00897B') },
  nearing_sla: { label: 'Nearing', sx: outlinedChip('#FFF3E0', '#E65100', '#FB8C00') },
  overdue: { label: 'Overdue', sx: outlinedChip('#FFEBEE', '#B71C1C', '#E53935') },
  paused: { label: 'Paused', sx: outlinedChip('#ECEFF1', '#263238', '#607D8B') },
};

export const TICKET_TYPE_LABELS: Record<TicketType, string> = {
  desktop_support: 'Desktop Support',
  it_support: 'IT Support',
  pantawid_ict_support: 'Pantawid ICT Support',
  specialized_concerns: 'Specialized Concerns',
};

export function formatTicketStatus(status: string): string {
  if (!status) return '';
  return status.replace(/_/g, ' ').toUpperCase();
}
