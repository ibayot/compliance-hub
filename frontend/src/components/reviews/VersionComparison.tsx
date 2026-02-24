'use client';

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Divider,
  Grid,
} from '@mui/material';
import { VersionComparison as VersionComparisonType } from '@/app/api/reviews';

interface VersionComparisonProps {
  comparison: VersionComparisonType;
}

export default function VersionComparison({
  comparison,
}: VersionComparisonProps) {
  const { diff_output, version_a, version_b } = comparison;
  const { stats, htmlDiff } = diff_output;

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Version Comparison
        </Typography>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Version A
            </Typography>
            <Typography variant="body1">
              {version_a?.file_name || `Version ${version_a?.version_number}`}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {new Date(version_a?.created_at).toLocaleString()}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Version B
            </Typography>
            <Typography variant="body1">
              {version_b?.file_name || `Version ${version_b?.version_number}`}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {new Date(version_b?.created_at).toLocaleString()}
            </Typography>
          </Grid>
        </Grid>

        <Divider sx={{ mb: 2 }} />

        <Box display="flex" gap={2} mb={3}>
          <Chip
            label={`${stats.additions} additions`}
            color="success"
            size="small"
          />
          <Chip
            label={`${stats.deletions} deletions`}
            color="error"
            size="small"
          />
          <Chip
            label={`${stats.unchanged} unchanged`}
            color="default"
            size="small"
          />
          <Chip
            label={`${stats.changePercentage.toFixed(1)}% changed`}
            color="info"
            size="small"
          />
        </Box>

        <Box
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            p: 2,
            maxHeight: '600px',
            overflow: 'auto',
            backgroundColor: '#f5f5f5',
            fontFamily: 'monospace',
            fontSize: '0.875rem',
            '& ins': {
              backgroundColor: '#d4edda',
              textDecoration: 'none',
              color: '#155724',
            },
            '& del': {
              backgroundColor: '#f8d7da',
              textDecoration: 'line-through',
              color: '#721c24',
            },
          }}
          dangerouslySetInnerHTML={{ __html: htmlDiff }}
        />
      </CardContent>
    </Card>
  );
}
