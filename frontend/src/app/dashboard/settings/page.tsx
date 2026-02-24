'use client';

import { Box, Typography, Paper } from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <Box>
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Settings
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your account settings and preferences
        </Typography>
      </Box>

      <Paper sx={{ p: 4 }}>
        <Typography variant="h6" gutterBottom>
          User Information
        </Typography>
        <Box mt={2}>
          <Typography variant="body2">
            <strong>Name:</strong> {user?.firstName} {user?.lastName}
          </Typography>
          <Typography variant="body2">
            <strong>Email:</strong> {user?.email}
          </Typography>
          <Typography variant="body2">
            <strong>Role:</strong> {user?.role?.replace('_', ' ').toUpperCase()}
          </Typography>
        </Box>

        <Box mt={4}>
          <Typography variant="body2" color="text.secondary">
            Additional settings and preferences will be available here in future updates.
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
