'use client';

import { useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';

type ManualRole = 'super_admin' | 'reviewer' | 'focal' | 'technician' | 'auditor';

type ManualItem = {
  title: string;
  description: string;
  roles: ManualRole[];
  path: string;
  details: {
    purpose: string;
    inputs: Array<{ field: string; explanation: string }>;
    outputs: Array<{ field: string; explanation: string }>;
  };
};

const manualItems: ManualItem[] = [
  {
    title: 'Documents Upload and Tracking',
    description: 'Upload DOCX, monitor processing, review versions, and map references for ready/compliant documents.',
    roles: ['super_admin', 'reviewer', 'focal', 'technician', 'auditor'],
    path: '/dashboard/documents',
    details: {
      purpose: 'Store compliance documents, generate text/preview data, and manage version history for review workflows.',
      inputs: [
        { field: 'Title', explanation: 'Main document name shown in document lists and review queues.' },
        { field: 'Document Type', explanation: 'Classifies the document (Policy, Procedure, Guideline, Manual, etc.).' },
        { field: 'Unit', explanation: 'Owning organizational unit used for assignment and filtering.' },
        { field: 'File Upload (DOCX/PDF)', explanation: 'The source file that is processed for extraction and preview.' },
      ],
      outputs: [
        { field: 'Processing Status', explanation: 'Shows queued/processing/completed/error state of extraction jobs.' },
        { field: 'Version List', explanation: 'History of uploaded revisions with metadata and created dates.' },
        { field: 'Preview Viewer', explanation: 'Rendered document preview used by both document view and review screens.' },
        { field: 'Extracted Metrics', explanation: 'Auto-derived section/keyword/number/deadline values for compliance tracking.' },
      ],
    },
  },
  {
    title: 'Metrics Template Builder',
    description: 'Create and maintain section, keyword, number extraction, and deadline templates.',
    roles: ['super_admin', 'reviewer'],
    path: '/dashboard/metrics',
    details: {
      purpose: 'Define reusable extraction rules so uploaded documents produce consistent measurable compliance data.',
      inputs: [
        { field: 'Template Name / Description', explanation: 'Create: enter a unique template name and optional description. Update: edit text to reflect policy changes. Delete: remove unused templates from the table actions.' },
        { field: 'Metric Type = Section Check', explanation: 'Create/Update fields: Required Sections list (one per line). System validates section presence during extraction and records pass/fail for all required sections.' },
        { field: 'Metric Type = Keyword Check', explanation: 'Create/Update fields: Keywords list, Minimum Matches, Case Sensitive flag, Word Boundary flag. Use this for obligation phrases that must appear in the document text.' },
        { field: 'Metric Type = Property Check (Number Extraction)', explanation: 'Create/Update fields: Extraction Keywords, Comparison operator (>=, <=, =, >, <), Expected Numbers list. Use for counts and quantitative compliance thresholds.' },
        { field: 'Metric Type = Date Check', explanation: 'Create/Update fields: Submission Frequency, Deadline Day, Month Offset, Max Days Late, and Custom Regex groups when using custom period codes.' },
        { field: 'Applicability (Document Type / Unit)', explanation: 'Set where the template applies. Create with target document type/unit, update as ownership changes, and delete stale applicability by deleting or replacing template rows.' },
      ],
      outputs: [
        { field: 'Saved Template', explanation: 'Versioned template available to document processing services.' },
        { field: 'Rule Validation Feedback', explanation: 'Immediate validation errors for malformed or conflicting rules.' },
        { field: 'Extraction Consistency', explanation: 'Standardized metric outputs across documents using same template.' },
        { field: 'CRUD Audit Trail', explanation: 'Every create/update/delete operation reflects in the metrics list immediately and affects subsequent document processing runs.' },
      ],
    },
  },
  {
    title: 'Manual Compliance Reviews',
    description: 'Review pending documents with inline viewer and tag as compliant, non-compliant, or needs revision.',
    roles: ['super_admin', 'reviewer', 'auditor'],
    path: '/dashboard/reviews',
    details: {
      purpose: 'Perform final human compliance decisions using document preview, remarks, and explicit review outcomes.',
      inputs: [
        { field: 'Selected Document', explanation: 'Pending or returned document chosen for manual review.' },
        { field: 'Review Decision', explanation: 'Compliant, Non-Compliant, or Needs Revision classification.' },
        { field: 'Reviewer Remarks', explanation: 'Required contextual notes supporting the compliance decision.' },
      ],
      outputs: [
        { field: 'Review Record', explanation: 'Stored review entry with reviewer identity and timestamp.' },
        { field: 'Updated Document State', explanation: 'Document progresses to approved, rejected, or returned status.' },
        { field: 'Review History', explanation: 'Traceable list of all review decisions and remarks per document.' },
      ],
    },
  },
  {
    title: 'Issuance and Mapping Management',
    description: 'Manage issuances and map compliant documents to issuances through link/unlink actions.',
    roles: ['super_admin', 'reviewer'],
    path: '/dashboard/issuances',
    details: {
      purpose: 'Track official issuances and connect each one to supporting compliant documents.',
      inputs: [
        { field: 'Issuance Code/Title', explanation: 'Primary identifier and human-readable title of an issuance.' },
        { field: 'Issuance Metadata', explanation: 'Category, effective dates, and descriptive attributes.' },
        { field: 'Document Mapping Selection', explanation: 'Choose compliant documents to link or unlink from issuance.' },
      ],
      outputs: [
        { field: 'Issuance Registry', explanation: 'Central list of active and historical issuances.' },
        { field: 'Mapped Document Set', explanation: 'Current compliance evidence linked to each issuance.' },
        { field: 'Mapping Auditability', explanation: 'Consistent relationship tracking for reporting and inspection.' },
      ],
    },
  },
  {
    title: 'Issue Documentation Workflow',
    description: 'Create and track issues, update resolution steps/date, and monitor closure workflow.',
    roles: ['super_admin', 'reviewer', 'focal', 'technician', 'auditor'],
    path: '/dashboard/tickets',
    details: {
      purpose: 'Capture non-compliance or operational issues and drive them through assignment, progress, and closure.',
      inputs: [
        { field: 'Issue Type / Category', explanation: 'Structured classification used for reporting and triage.' },
        { field: 'Issue Description', explanation: 'Detailed narrative of the observed problem.' },
        { field: 'Assigned Unit / Personnel', explanation: 'Team or person accountable for corrective actions.' },
        { field: 'Resolution Remarks and Date', explanation: 'Documented fix details and completion timestamp.' },
      ],
      outputs: [
        { field: 'Ticket Status', explanation: 'Pending, in-progress, returned, resolved, or closed lifecycle state.' },
        { field: 'Action Trail', explanation: 'Chronological updates of assignments, returns, and resolution notes.' },
        { field: 'Closure Record', explanation: 'Final trace when issue is accepted as resolved/closed.' },
      ],
    },
  },
  {
    title: 'Unit Administration',
    description: 'Manage organizational units and structural metadata used in assignment and reporting workflows.',
    roles: ['super_admin'],
    path: '/dashboard/units',
    details: {
      purpose: 'Maintain unit master data that powers ownership, assignment, and reporting dimensions.',
      inputs: [
        { field: 'Unit Name', explanation: 'Official name of the organizational unit.' },
        { field: 'Unit Code', explanation: 'Short unique identifier referenced by workflows and reports.' },
        { field: 'Parent/Hierarchy Info', explanation: 'Optional structure for grouping and roll-up reporting.' },
      ],
      outputs: [
        { field: 'Active Unit Directory', explanation: 'Authoritative list used across documents, tickets, and assignments.' },
        { field: 'Validation Results', explanation: 'Conflict checks for duplicate codes or invalid hierarchy links.' },
        { field: 'Reporting Dimensions', explanation: 'Unit attributes available for filtering dashboards and exports.' },
      ],
    },
  },
];

export default function UserManualPage() {
  const { user } = useAuth();
  const [selectedManual, setSelectedManual] = useState<ManualItem | null>(null);

  const role = user?.role;
  const visibleItems = useMemo(
    () => manualItems.filter((item) => (role ? item.roles.includes(role as ManualRole) : false)),
    [role],
  );

  return (
    <Box>
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          User Manual
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Feature guide with field-level inputs and outputs. Only modules available to your account are shown.
        </Typography>
      </Box>

      <Grid container spacing={2}>
        {visibleItems.map((item) => (
          <Grid item xs={12} md={6} key={item.title}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardActionArea sx={{ height: '100%' }} onClick={() => setSelectedManual(item)}>
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
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      {visibleItems.length === 0 && (
        <Typography color="text.secondary">No manual sections available for your role.</Typography>
      )}

      <Dialog open={Boolean(selectedManual)} onClose={() => setSelectedManual(null)} fullWidth maxWidth="md">
        <DialogTitle>{selectedManual?.title}</DialogTitle>
        <DialogContent>
          {selectedManual && (
            <Box>
              <Typography variant="body2" color="text.secondary" mb={2}>
                {selectedManual.description}
              </Typography>
              <Typography variant="body2" mb={2}>
                <strong>Purpose:</strong> {selectedManual.details.purpose}
              </Typography>

              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" gutterBottom>
                Field Inputs
              </Typography>
              <List dense>
                {selectedManual.details.inputs.map((input) => (
                  <ListItem key={input.field} disableGutters>
                    <ListItemText primary={input.field} secondary={input.explanation} />
                  </ListItem>
                ))}
              </List>

              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" gutterBottom>
                System Outputs
              </Typography>
              <List dense>
                {selectedManual.details.outputs.map((output) => (
                  <ListItem key={output.field} disableGutters>
                    <ListItemText primary={output.field} secondary={output.explanation} />
                  </ListItem>
                ))}
              </List>

              <Typography variant="caption" color="primary.main">
                Module Path: {selectedManual.path}
              </Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
