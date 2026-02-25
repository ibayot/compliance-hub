'use client';

import React from 'react';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
} from '@mui/lab';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Chip,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { DocumentVersion } from '@/lib/api/documents';

interface VersionTimelineProps {
  versions: DocumentVersion[];
  currentVersionId?: string;
  onViewVersion: (versionId: string) => void;
  onDownloadVersion: (versionId: string) => void;
}

export default function VersionTimeline({
  versions,
  currentVersionId,
  onViewVersion,
  onDownloadVersion,
}: VersionTimelineProps) {
  if (versions.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No versions available
      </Typography>
    );
  }

  return (
    <Timeline position="right">
      {versions.map((version, index) => (
        <TimelineItem key={version.id}>
          <TimelineOppositeContent
            sx={{
              flex: '0 0 90px',
              maxWidth: 90,
              minWidth: 70,
              py: 1.5,
            }}
          >
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
              {format(new Date(version.created_at), 'MMM dd, yyyy')}
            </Typography>
            <Typography variant="caption" sx={{ fontSize: '0.68rem' }}>
              {format(new Date(version.created_at), 'hh:mm a')}
            </Typography>
          </TimelineOppositeContent>
          <TimelineSeparator>
            <TimelineDot color={version.id === currentVersionId ? 'primary' : 'grey'} />
            {index < versions.length - 1 && <TimelineConnector />}
          </TimelineSeparator>
          <TimelineContent>
            <Card
              variant="outlined"
              sx={{
                bgcolor: version.id === currentVersionId ? 'action.hover' : 'background.paper',
              }}
            >
              <CardContent sx={{ pb: '12px !important' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                  <Typography variant="subtitle2">Version {version.version_number}</Typography>
                  {version.id === currentVersionId && (
                    <Chip label="Current" color="primary" size="small" />
                  )}
                </Box>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  gutterBottom
                  sx={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                >
                  {version.file_name}
                </Typography>

                <Typography variant="caption" color="text.secondary" display="block">
                  Size: {(version.file_size / 1024 / 1024).toFixed(2)} MB
                </Typography>

                <Typography variant="caption" color="text.secondary" display="block">
                  Uploaded by: {version.uploader?.username || 'Unknown'}
                </Typography>

                {version.change_notes && (
                  <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                    &quot;{version.change_notes}&quot;
                  </Typography>
                )}

                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                  {version.preview_path && (
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<ViewIcon />}
                      onClick={() => onViewVersion(version.id)}
                    >
                      View
                    </Button>
                  )}
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={() => onDownloadVersion(version.id)}
                  >
                    Download
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </TimelineContent>
        </TimelineItem>
      ))}
    </Timeline>
  );
}
