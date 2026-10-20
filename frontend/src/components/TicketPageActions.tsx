import { useState } from 'react';
import { Box, Button, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Tooltip } from '@mui/material';
import { Add, ArrowBack, History, MailOutline, MoreVert } from '@mui/icons-material';

export interface TicketPageActionsProps {
  canCreate: boolean;
  canInvite: boolean;
  canViewEscalations: boolean;
  showingEscalations: boolean;
  escalationCount: number;
  onCreate: () => void;
  onInvite: () => void;
  onToggleEscalations: () => void;
}

export default function TicketPageActions(props: TicketPageActionsProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const secondary = [
    ...(props.canViewEscalations ? [{ label: props.showingEscalations ? 'Back to Tickets' : `Escalation History (${props.escalationCount})`, icon: props.showingEscalations ? <ArrowBack /> : <History />, action: props.onToggleEscalations, color: 'warning' as const }] : []),
    ...(props.canInvite ? [{ label: 'Send Rating Invitation', icon: <MailOutline />, action: props.onInvite, color: 'info' as const }] : []),
  ];
  if (!props.canCreate && !secondary.length) return null;
  return <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: { xs: '100%', sm: 'auto' }, minWidth: 0 }}>
    {props.canCreate && <Button variant="contained" startIcon={<Add />} onClick={props.onCreate}
      sx={{ minHeight: 44, whiteSpace: 'nowrap', flex: { xs: 1, sm: 'none' } }}>New Ticket</Button>}
    {secondary.length > 0 && <>
      <Tooltip title="More ticket actions"><IconButton aria-label="More ticket actions" aria-haspopup="menu"
        aria-controls={anchor ? 'ticket-page-actions' : undefined} aria-expanded={anchor ? true : undefined}
        onClick={event => setAnchor(event.currentTarget)} sx={{ width: 44, height: 44, border: 1, borderColor: 'divider', borderRadius: 1 }}>
        <MoreVert />
      </IconButton></Tooltip>
      <Menu id="ticket-page-actions" anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        MenuListProps={{ 'aria-label': 'More ticket actions' }}>
        {secondary.map(item => <MenuItem key={item.label} onClick={() => { setAnchor(null); item.action(); }}>
          <ListItemIcon sx={{ color: `${item.color}.main` }}>{item.icon}</ListItemIcon><ListItemText>{item.label}</ListItemText>
        </MenuItem>)}
      </Menu>
    </>}
  </Box>;
}
