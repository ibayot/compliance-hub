'use client';

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { ManualReview, ReviewDecision } from '@/app/api/reviews';

interface ReviewDisplayProps {
  review: ManualReview;
}

const decisionConfig = {
  [ReviewDecision.COMPLIANT]: {
    label: 'Compliant',
    color: 'success' as const,
    icon: <CheckCircleIcon />,
  },
  [ReviewDecision.NON_COMPLIANT]: {
    label: 'Non-Compliant',
    color: 'error' as const,
    icon: <CancelIcon />,
  },
  [ReviewDecision.NEEDS_REVISION]: {
    label: 'Needs Revision',
    color: 'warning' as const,
    icon: <WarningIcon />,
  },
};

const severityColors = {
  low: 'info' as const,
  medium: 'warning' as const,
  high: 'error' as const,
};

export default function ReviewDisplay({ review }: ReviewDisplayProps) {
  const config = decisionConfig[review.decision];

  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          {config.icon}
          <Typography variant="h6">Manual Review</Typography>
          <Chip label={config.label} color={config.color} size="small" />
        </Box>

        <Box mb={2}>
          <Typography variant="caption" color="text.secondary">
            Reviewed by:{' '}
            {review.reviewer
              ? `${review.reviewer.firstName} ${review.reviewer.lastName}`
              : 'Unknown'}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            Date: {new Date(review.reviewed_at).toLocaleString()}
          </Typography>
        </Box>

        {review.remarks && (
          <>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="subtitle2" gutterBottom>
              Remarks
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              {review.remarks}
            </Typography>
          </>
        )}

        {review.findings && review.findings.length > 0 && (
          <>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="subtitle2" gutterBottom>
              Findings ({review.findings.length})
            </Typography>
            <List dense>
              {review.findings.map((finding, index) => (
                <ListItem key={index}>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body2">{finding.category}</Typography>
                        {finding.severity && (
                          <Chip
                            label={finding.severity}
                            color={severityColors[finding.severity]}
                            size="small"
                          />
                        )}
                      </Box>
                    }
                    secondary={finding.description}
                  />
                </ListItem>
              ))}
            </List>
          </>
        )}
      </CardContent>
    </Card>
  );
}
