'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  TextField,
  MenuItem,
  Stack,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  IconButton,
} from '@mui/material';
import { Visibility as ViewIcon } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { auditLogsApi } from '@/app/api/references';

function formatKey(key: string): string {
  // Convert snake_case or camelCase to Title Case
  return key
    .replace(/([A-Z])/g, ' $1') // insert a space before all caps
    .replace(/_/g, ' ') // replace underscores with spaces
    .replace(/^./, function (str) {
      return str.toUpperCase(); // uppercase the first character
    })
    .trim();
}

function formatJsonValue(val: any): React.ReactNode {
  if (val === null || val === undefined) return <em style={{ color: '#888' }}>none</em>;
  
  if (typeof val === 'boolean') {
    return <Chip size="small" label={val ? 'Yes' : 'No'} color={val ? 'success' : 'default'} />;
  }
  
  if (typeof val === 'string') {
    // Attempt to parse stringified JSON objects (e.g. meta)
    if ((val.startsWith('{') && val.endsWith('}')) || (val.startsWith('[') && val.endsWith(']'))) {
      try {
        const parsed = JSON.parse(val);
        return formatJsonValue(parsed);
      } catch (e) {
        // Ignore and treat as normal string
      }
    }

    // Check if it's an ISO date string
    const isIsoDate = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(val);
    if (isIsoDate) {
      return new Date(val).toLocaleString(undefined, { 
        year: 'numeric', month: 'short', day: 'numeric', 
        hour: '2-digit', minute: '2-digit' 
      });
    }
    return val;
  }
  
  if (Array.isArray(val)) {
    if (val.length === 0) return <em style={{ color: '#888' }}>empty array</em>;
    return (
      <Stack spacing={0.5}>
        {val.map((item, index) => (
          <Box key={index} sx={{ p: 0.5, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid #eee' }}>
            {formatJsonValue(item)}
          </Box>
        ))}
      </Stack>
    );
  }
  
  if (typeof val === 'object') {
    return (
      <Box sx={{ p: 1, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid #eee' }}>
        {Object.entries(val).map(([k, v]) => (
          <Box key={k} sx={{ display: 'flex', mb: 0.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 600, width: 100, flexShrink: 0, color: 'text.secondary' }}>
              {formatKey(k)}:
            </Typography>
            <Box sx={{ flex: 1 }}>{formatJsonValue(v)}</Box>
          </Box>
        ))}
      </Box>
    );
  }
  
  return String(val);
}


function humanizeTableName(table: string): string {
  if (!table) return 'System';
  return table.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function humanizeDatabaseName(database: string): string {
  if (database?.endsWith('_users')) return 'Users Service';
  if (database?.endsWith('_ticketing')) return 'Ticketing Service';
  return database || 'Unknown Service';
}

function humanizeKey(key: string): string {
  if (key === 'id') return 'ID';
  if (key.endsWith('Id')) key = key.slice(0, -2);
  if (key.endsWith('_id')) key = key.slice(0, -3);
  return key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
}

function JsonDiffViewer({ oldValues, newValues }: { oldValues: any; newValues: any }) {
  let parsedOld = oldValues;
  let parsedNew = newValues;

  // Sometimes values are passed as stringified JSON from the database
  if (typeof oldValues === 'string') {
    try { parsedOld = JSON.parse(oldValues); } catch (e) { parsedOld = oldValues; }
  }
  if (typeof newValues === 'string') {
    try { parsedNew = JSON.parse(newValues); } catch (e) { parsedNew = newValues; }
  }

  const allKeys = new Set([...Object.keys(parsedOld || {}), ...Object.keys(parsedNew || {})]);
  const rows: React.ReactNode[] = [];
  const hiddenKeys = ['id', 'password', 'token', 'refreshToken', 'createdAt', 'updatedAt', 'deletedAt'];

  allKeys.forEach((key) => {
    if (hiddenKeys.includes(key)) return;
    const oldVal = parsedOld?.[key];
    const newVal = parsedNew?.[key];
    
    // Convert complex structures to string for easy comparison to check if changed
    const oldStr = typeof oldVal === 'object' && oldVal !== null ? JSON.stringify(oldVal) : String(oldVal);
    const newStr = typeof newVal === 'object' && newVal !== null ? JSON.stringify(newVal) : String(newVal);

    if (oldStr !== newStr) {
      rows.push(
        <Box key={key} sx={{ mb: 2, p: 1.5, bgcolor: '#f8f9fa', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <Typography variant="subtitle2" color="primary" sx={{ mb: 1, fontWeight: 700 }}>
            {formatKey(key)}
          </Typography>
          <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ wordBreak: 'break-all', overflowWrap: 'break-word' }}>
            <Box sx={{ flex: 1, p: 1, bgcolor: '#ffebee', borderRadius: 1, border: '1px dashed #ef9a9a', minWidth: 0 }}>
              <Typography variant="caption" color="error" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>PREVIOUS</Typography>
              {formatJsonValue(oldVal)}
            </Box>
            <Box sx={{ pt: 2, flexShrink: 0 }}>
              <Typography color="text.secondary">→</Typography>
            </Box>
            <Box sx={{ flex: 1, p: 1, bgcolor: '#e8f5e9', borderRadius: 1, border: '1px dashed #a5d6a7', minWidth: 0 }}>
              <Typography variant="caption" color="success.main" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>NEW</Typography>
              {formatJsonValue(newVal)}
            </Box>
          </Stack>
        </Box>
      );
    }
  });

  if (rows.length === 0) {
    return <Typography variant="body2" color="text.secondary">No changes detected in JSON payloads.</Typography>;
  }

  return <Box>{rows}</Box>;
}

export default function AuditLogsPage() {
  const { enqueueSnackbar } = useSnackbar();
  
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  
  const [tables, setTables] = useState<string[]>([]);
  const [filterAction, setFilterAction] = useState('');
  const [filterTable, setFilterTable] = useState('');
  
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const fetchLogs = async () => {
    try {
      const data = await auditLogsApi.getLogs({
        page: page + 1,
        limit: rowsPerPage,
        action: filterAction || undefined,
        tableName: filterTable || undefined,
      });
      setLogs(data.data);
      setTotal(data.total);
    } catch (err) {
      enqueueSnackbar('Failed to load audit logs', { variant: 'error' });
    }
  };

  const fetchTables = async () => {
    try {
      const data = await auditLogsApi.getTables();
      setTables(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage, filterAction, filterTable]);

  const handleOpenView = (log: any) => {
    setSelectedLog(log);
    setViewDialogOpen(true);
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} mb={3}>
        Audit Logs
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" spacing={2} flexWrap="wrap">
            <TextField
              select
              label="Action"
              value={filterAction}
              onChange={(e) => { setFilterAction(e.target.value); setPage(0); }}
              size="small"
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="">All Actions</MenuItem>
              <MenuItem value="INSERT">INSERT</MenuItem>
              <MenuItem value="UPDATE">UPDATE</MenuItem>
              <MenuItem value="DELETE">DELETE</MenuItem>
            </TextField>

            <TextField
              select
              label="Table Name"
              value={filterTable}
              onChange={(e) => { setFilterTable(e.target.value); setPage(0); }}
              size="small"
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="">All Tables</MenuItem>
              {tables.map(t => (
                <MenuItem key={t} value={t}>{t}</MenuItem>
              ))}
            </TextField>

            <Button variant="outlined" onClick={() => { setFilterAction(''); setFilterTable(''); setPage(0); }}>
              Reset Filters
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead sx={{ bgcolor: 'background.default' }}>
            <TableRow>
              <TableCell>Timestamp</TableCell>
              <TableCell>Action</TableCell>
              <TableCell>Service</TableCell>
              <TableCell>Table</TableCell>
              <TableCell>User</TableCell>
              <TableCell>IP Address</TableCell>
              <TableCell align="center">Details</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id} hover>
                <TableCell>{new Date(log.createdAt).toLocaleString()}</TableCell>
                <TableCell>
                  <Chip 
                    label={log.action} 
                    size="small" 
                    color={
                      log.action === 'INSERT' ? 'success' : 
                      log.action === 'UPDATE' ? 'warning' : 'error'
                    } 
                  />
                </TableCell>
                <TableCell>{humanizeDatabaseName(log.databaseName)}</TableCell>
                <TableCell>{humanizeTableName(log.tableName)}</TableCell>
                <TableCell>{log.userEmail || 'System'}</TableCell>
                <TableCell>{log.ipAddress}</TableCell>
                <TableCell align="center">
                  <IconButton size="small" onClick={() => handleOpenView(log)}>
                    <ViewIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {logs.length === 0 && (
              <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                  No audit logs found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </TableContainer>

      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Audit Log Details</DialogTitle>
        <DialogContent dividers>
          {selectedLog && (
            <Stack spacing={2}>
              <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
                
                <Typography variant="body2"><strong>Timestamp:</strong> {new Date(selectedLog.createdAt).toLocaleString()}</Typography>
                <Typography variant="body2"><strong>Action:</strong> {selectedLog.action}</Typography>
                <Typography variant="body2"><strong>Service:</strong> {humanizeDatabaseName(selectedLog.databaseName)}</Typography>
                <Typography variant="body2"><strong>Table:</strong> {humanizeTableName(selectedLog.tableName)}</Typography>
                
                <Typography variant="body2"><strong>User:</strong> {selectedLog.userEmail || 'System'}</Typography>
                <Typography variant="body2"><strong>IP Address:</strong> {selectedLog.ipAddress}</Typography>
                <Typography variant="body2"><strong>Session ID:</strong> {selectedLog.sessionId}</Typography>
              </Box>

              <Box>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>Description</Typography>
                <Typography variant="body2" color="text.secondary">{selectedLog.description}</Typography>
              </Box>

              <Box>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>Data Changes</Typography>
                <JsonDiffViewer 
                  oldValues={selectedLog.oldValues ? JSON.parse(selectedLog.oldValues) : null} 
                  newValues={selectedLog.newValues ? JSON.parse(selectedLog.newValues) : null} 
                />
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
