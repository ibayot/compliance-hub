'use client';

import { Box, Card, CardContent, Chip, Grid, Typography } from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';

type ManualItem = {
  title: string;
  description: string;
  roles: Array<'super_admin' | 'reviewer' | 'focal' | 'technician' | 'auditor'>;
  path: string;
};

const manualItems: ManualItem[] = [
  {
    title: 'Documents Upload and Tracking',
    description: 'Upload DOCX, monitor processing, review versions, and map references for ready/compliant documents.',
    roles: ['super_admin', 'reviewer', 'focal', 'technician', 'auditor'],
    path: '/dashboard/documents',
  },
  {
    title: 'Metrics Template Builder',
    description: 'Create and maintain section, keyword, number extraction, and deadline templates.',
    roles: ['super_admin', 'reviewer'],
    path: '/dashboard/metrics',
  },
  {
    title: 'Manual Compliance Reviews',
    description: 'Review pending documents with inline viewer and tag as compliant, non-compliant, or needs revision.',
    roles: ['super_admin', 'reviewer', 'auditor'],
    path: '/dashboard/reviews',
  },
  {
    title: 'Issuance and Mapping Management',
    description: 'Manage issuances and map compliant documents to issuances through link/unlink actions.',
    roles: ['super_admin', 'reviewer'],
    path: '/dashboard/issuances',
  },
  {
    title: 'Issue Documentation Workflow',
    description: 'Create and track issues, update resolution steps/date, and monitor closure workflow.',
    roles: ['super_admin', 'reviewer', 'focal', 'technician', 'auditor'],
    path: '/dashboard/tickets',
  },
  {
    title: 'Unit Administration',
    description: 'Manage organizational units and structural metadata used in assignment and reporting workflows.',
    roles: ['super_admin'],
    path: '/dashboard/units',
  },
];

export default function UserManualPage() {
  const { user } = useAuth();

  const role = user?.role;
  const visibleItems = manualItems.filter((item) => (role ? item.roles.includes(role as any) : false));

  return (
    <Box>
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          User Manual
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Role-based feature guide. Only modules available to your role are shown.
        </Typography>
        {role && (
          <Chip sx={{ mt: 2 }} color="primary" label={`Your role: ${role.replace('_', ' ').toUpperCase()}`} />
        )}
      </Box>

      <Grid container spacing={2}>
        {visibleItems.map((item) => (
          <Grid item xs={12} md={6} key={item.title}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {item.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  {item.description}
                </Typography>
                <Typography variant="caption" color="primary.main">
                  Module: {item.path}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {visibleItems.length === 0 && (
        <Typography color="text.secondary">No manual sections available for your role.</Typography>
      )}
    </Box>
  );
}
