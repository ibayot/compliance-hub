import React from 'react';
import { Card, CardContent, Typography, Grid, Box, Stack } from '@mui/material';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import AcUnitIcon from '@mui/icons-material/AcUnit';
import FileCopyIcon from '@mui/icons-material/FileCopy';

interface GeneralStats {
  total: number;
  open: number;
  assigned: number;
  inProgress: number;
  resolved: number;
  closed: number;
  frozen?: number;
  duplicate?: number;
}

export default function GeneralOverview({ stats }: { stats: GeneralStats | null }) {
  if (!stats) return null;

  return (
    <Card sx={{ mb: 4, borderRadius: 2, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
      <CardContent>
        <Typography variant="h6" fontWeight={600} mb={3}>
          General Overview
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3} lg={3}>
            <Box textAlign="center" p={2} bgcolor="#f8f9fa" borderRadius={2}>
              <ConfirmationNumberIcon sx={{ color: 'text.secondary', mb: 1 }} />
              <Typography variant="h4" fontWeight={700}>{stats.total}</Typography>
              <Typography variant="body2" color="text.secondary">Total</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3} lg={3}>
            <Box textAlign="center" p={2} bgcolor="#e3f2fd" borderRadius={2}>
              <CheckCircleIcon sx={{ color: 'info.main', mb: 1 }} />
              <Typography variant="h4" fontWeight={700}>{stats.open}</Typography>
              <Typography variant="body2" color="text.secondary">Open</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3} lg={3}>
            <Box textAlign="center" p={2} bgcolor="#fff3e0" borderRadius={2}>
              <AssignmentIcon sx={{ color: 'warning.main', mb: 1 }} />
              <Typography variant="h4" fontWeight={700}>{stats.assigned}</Typography>
              <Typography variant="body2" color="text.secondary">Assigned</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3} lg={3}>
            <Box textAlign="center" p={2} bgcolor="#f3e5f5" borderRadius={2}>
              <AutorenewIcon sx={{ color: 'secondary.main', mb: 1 }} />
              <Typography variant="h4" fontWeight={700}>{stats.inProgress}</Typography>
              <Typography variant="body2" color="text.secondary">In Progress</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3} lg={3}>
            <Box textAlign="center" p={2} bgcolor="#e8f5e9" borderRadius={2}>
              <DoneAllIcon sx={{ color: 'success.main', mb: 1 }} />
              <Typography variant="h4" fontWeight={700}>{stats.resolved}</Typography>
              <Typography variant="body2" color="text.secondary">Resolved</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3} lg={3}>
            <Box textAlign="center" p={2} bgcolor="#eceff1" borderRadius={2}>
              <CheckCircleIcon sx={{ color: 'text.disabled', mb: 1 }} />
              <Typography variant="h4" fontWeight={700}>{stats.closed}</Typography>
              <Typography variant="body2" color="text.secondary">Closed</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3} lg={3}>
            <Box textAlign="center" p={2} bgcolor="#e0f7fa" borderRadius={2}>
              <AcUnitIcon sx={{ color: 'cyan.main', mb: 1 }} />
              <Typography variant="h4" fontWeight={700}>{stats.frozen ?? 0}</Typography>
              <Typography variant="body2" color="text.secondary">Frozen</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3} lg={3}>
            <Box textAlign="center" p={2} bgcolor="#ffebee" borderRadius={2}>
              <FileCopyIcon sx={{ color: 'error.main', mb: 1 }} />
              <Typography variant="h4" fontWeight={700}>{stats.duplicate ?? 0}</Typography>
              <Typography variant="body2" color="text.secondary">Duplicate</Typography>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
