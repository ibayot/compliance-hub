'use client';

import { ReactNode, useState } from 'react';
import { Divider, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Tooltip } from '@mui/material';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { Ticket } from '@/app/api/references';
import { useTicketCancellation } from '@/components/TicketCancelButton';

export interface TicketMenuAction {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}

export default function TicketActionsMenu({ ticket, actions, onCancelled, orientation = 'horizontal' }: {
  ticket: Ticket; actions: TicketMenuAction[]; onCancelled: () => void; orientation?: 'horizontal' | 'vertical';
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const cancellation = useTicketCancellation({ ticket, onCancelled });
  const menuId = `ticket-actions-${ticket.id}`;
  if (!actions.length && !cancellation.allowed && !cancellation.isDialogOpen) return null;
  return <span style={{ display: 'inline-flex' }} onClick={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}>
    <Tooltip title="Ticket actions">
      <IconButton size="small" aria-label={`Actions for ticket ${ticket.ticketNumber}`} aria-haspopup="menu"
        aria-controls={anchor ? menuId : undefined} aria-expanded={anchor ? true : undefined}
        onClick={event => setAnchor(event.currentTarget)}>
        {orientation === 'vertical' ? <MoreVertIcon fontSize="small" /> : <MoreHorizIcon fontSize="small" />}
      </IconButton>
    </Tooltip>
    <Menu id={menuId} anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)} disableRestoreFocus={cancellation.isDialogOpen}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      MenuListProps={{ 'aria-label': `Actions for ticket ${ticket.ticketNumber}` }}>
      {actions.map(action => <MenuItem key={action.label} disabled={action.disabled} onClick={() => { setAnchor(null); action.onClick(); }}>
        <ListItemIcon>{action.icon}</ListItemIcon><ListItemText>{action.label}</ListItemText>
      </MenuItem>)}
      {cancellation.allowed && <Divider />}
      {cancellation.allowed && <MenuItem sx={{ color: 'error.main' }} onClick={() => { setAnchor(null); cancellation.openDialog(); }}>
        <ListItemIcon sx={{ color: 'inherit' }}><DeleteOutlineIcon fontSize="small" /></ListItemIcon>
        <ListItemText>Cancel Ticket</ListItemText>
      </MenuItem>}
    </Menu>
    {cancellation.dialog}
  </span>;
}
