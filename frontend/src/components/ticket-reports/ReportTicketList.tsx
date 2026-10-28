import { Box, Chip, Stack, Table, TableBody, TableCell, TableHead, TableRow, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { useState } from 'react';
import ResponsiveTable from '@/components/layout/ResponsiveTable';
import { ReportBlock, reportSupportLegend, reportSupportStyle, REPORT_HISTORY_HELP } from '@/lib/utils/ticket-report-presentation';

export default function ReportTicketList({ block, start, pageSize, basis }: { block: ReportBlock; start: number; pageSize: number; basis: string }) {
  const [layout, setLayout] = useState<'details' | 'table'>('details');
  const rows = block.rows.slice(start, start + pageSize);
  return <Stack spacing={2}>
    <Typography variant="body2" color="text.secondary">List basis: {basis}. {REPORT_HISTORY_HELP}</Typography>
    <Stack direction="row" useFlexGap flexWrap="wrap" spacing={1} role="group" aria-label="Support type legend">
      {reportSupportLegend(block).map(support => <Chip key={support.label} size="small" variant="outlined" label={support.label} sx={{ borderColor: support.color, borderWidth: 2 }} />)}
    </Stack>
    <ToggleButtonGroup exclusive size="small" value={layout} onChange={(_, value) => { if (value) setLayout(value); }} aria-label="Ticket list layout">
      <ToggleButton value="details">Details</ToggleButton><ToggleButton value="table">Table</ToggleButton>
    </ToggleButtonGroup>
    {!rows.length && <Typography color="text.secondary">No matching records.</Typography>}
    {layout === 'details' ? rows.map((values, index) => <Box component="article" aria-label={values[0]} key={block.rowKeys?.[start + index] ?? values[0]} sx={{ border: 2, borderColor: reportSupportStyle(block.supportTypes?.[start + index]).color, borderRadius: 1, overflow: 'hidden' }}>
      <Box sx={{ px: 2, py: 1.25, bgcolor: 'action.selected', borderBottom: 1, borderColor: 'divider', display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="subtitle1" component="h4" color="primary" fontWeight={700}>{values[0]}</Typography>
        <Typography variant="caption" fontWeight={700}>{reportSupportStyle(block.supportTypes?.[start + index]).label}</Typography>
      </Box>
      <Box component="dl" sx={{ m: 0, p: 2, display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2,minmax(0,1fr))', lg: 'repeat(3,minmax(0,1fr))' }, gap: 2 }}>
        {values.slice(1).map((value, index) => <Box key={block.headers[index + 1]} sx={{ minWidth: 0, ...(block.headers[index + 1] === 'Description' ? { gridColumn: '1 / -1' } : {}) }}>
          <Typography component="dt" variant="caption" color="text.secondary" fontWeight={700}>{block.headers[index + 1]}</Typography>
          <Box component="dd" sx={{ typography: 'body2', m: 0, mt: 0.5, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
            {block.headers[index + 1] === 'SLA' || block.headers[index + 1] === 'History' ? <Chip size="small" label={value} color={value === 'Met' || value === 'Recorded' ? 'success' : value === 'Missed' ? 'error' : 'default'} variant="outlined" /> : value}
          </Box>
        </Box>)}
      </Box>
    </Box>) : <ResponsiveTable minWidth={Math.max(1000, block.headers.length * 170)} maxHeight="65vh">
      <Table size="small" stickyHeader aria-label="Ticket list">
        <TableHead><TableRow>{block.headers.map((header, index) => <TableCell key={header} component="th" scope="col" sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', fontWeight: 700, minWidth: index === 0 ? 170 : 150, ...(index === 0 ? { position: 'sticky', left: 0, zIndex: 4 } : {}) }}>{header}</TableCell>)}</TableRow></TableHead>
        <TableBody>{rows.map((values, rowIndex) => <TableRow key={block.rowKeys?.[start + rowIndex] ?? values[0]} sx={{ '&:nth-of-type(even)': { bgcolor: 'action.hover' } }}>{values.map((value, index) => <TableCell key={index} sx={{ verticalAlign: 'top', maxWidth: 300, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', ...(index === 0 ? { position: 'sticky', left: 0, bgcolor: 'background.paper', color: 'primary.main', fontWeight: 700, zIndex: 1, whiteSpace: 'nowrap', borderLeft: '3px solid', borderLeftColor: reportSupportStyle(block.supportTypes?.[start + rowIndex]).color } : {}) }}>{value}</TableCell>)}</TableRow>)}</TableBody>
      </Table>
    </ResponsiveTable>}
  </Stack>;
}
