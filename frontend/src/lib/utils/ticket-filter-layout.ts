// Container queries respond to the usable panel width, including an open sidebar.
export const ticketFilterPanelSx = {
  containerType: 'inline-size',
  p: { xs: 1.5, sm: 2 },
  '&:last-child': { pb: { xs: 1.5, sm: 2 } },
  '& .MuiInputBase-root': { minHeight: 44, fontSize: '0.875rem' },
  '& .MuiButton-root': { minHeight: 44 },
} as const;

export const ticketFilterGridSx = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 170px), 1fr))',
  gap: 1.5,
  alignItems: 'stretch',
  '& > *': { minWidth: 0, width: '100%' },
  '@container (max-width: 359px)': {
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    '& > .ticket-filter-date, & > .ticket-filter-period, & > .ticket-filter-reset': { gridColumn: '1 / -1' },
  },
  '@container (max-width: 279px)': { gridTemplateColumns: 'minmax(0, 1fr)' },
} as const;

export const ticketSearchSx = {
  gridColumn: '1 / -1',
  '@container (min-width: 360px)': { gridColumn: 'span 2' },
} as const;

export const ticketFilterShortcutsSx = {
  gridColumn: '1 / -1',
  '@container (min-width: 360px)': { gridColumn: 'span 2' },
  display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.5, minWidth: 0,
} as const;
