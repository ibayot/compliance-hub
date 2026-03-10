'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { CloudUpload as UploadIcon } from '@mui/icons-material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { documentsApi, UploadDocumentRequest } from '@/lib/api/documents';
import { unitsApi } from '@/lib/api/units';
import {
  docTypesApi,
  computeExpectedFilenameExplicit,
  ReportorialDocType,
} from '@/lib/api/document-types';
import { useAuth } from '@/contexts/AuthContext';

interface DocumentUploadProps {
  onSuccess?: () => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function DocumentUpload({ onSuccess }: DocumentUploadProps) {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const isFocal = user?.role === 'focal';

  const now = new Date();

  const [title, setTitle] = useState('');
  const [unitId, setUnitId] = useState('');
  const [reportorialDocTypeId, setReportorialDocTypeId] = useState('');
  const [file, setFile] = useState<File | null>(null);

  // Period picker state
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedQuarter, setSelectedQuarter] = useState(Math.ceil((now.getMonth() + 1) / 3));

  // Load units (admin can pick any)
  const { data: unitsResponse } = useQuery({
    queryKey: ['units'],
    queryFn: () => unitsApi.listUnits({ page: 1, limit: 100 }),
    enabled: !isFocal,
  });

  // Auto-populate unit for focal users from their primary unit
  useEffect(() => {
    if (isFocal && user?.units?.length) {
      setUnitId(String((user.units as any[])[0].id));
    }
  }, [isFocal, user?.units]);

  // Load reportorial doc types for selected unit
  const { data: docTypes = [] } = useQuery<ReportorialDocType[]>({
    queryKey: ['doc-types', unitId],
    queryFn: () => docTypesApi.byUnit(Number(unitId)),
    enabled: !!unitId,
  });

  // Reset doc type when unit changes
  useEffect(() => {
    setReportorialDocTypeId('');
  }, [unitId]);

  // Selected doc type object
  const selectedDocType = useMemo(
    () => docTypes.find((dt) => String(dt.id) === reportorialDocTypeId),
    [docTypes, reportorialDocTypeId],
  );

  // Compute expected filename from explicit period picker values
  const expectedFilename = useMemo(() => {
    if (!selectedDocType) return null;
    return computeExpectedFilenameExplicit(selectedDocType, {
      year: selectedYear,
      month: selectedMonth,
      quarter: selectedQuarter,
    });
  }, [selectedDocType, selectedYear, selectedMonth, selectedQuarter]);

  const uploadMutation = useMutation({
    mutationFn: (data: UploadDocumentRequest) => documentsApi.uploadDocument(data),
    onSuccess: () => {
      setTitle('');
      setReportorialDocTypeId('');
      setFile(null);
      if (!isFocal) setUnitId('');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      enqueueSnackbar('Document uploaded successfully!', { variant: 'success' });
      onSuccess?.();
    },
    onError: (err: any) => {
      enqueueSnackbar(err.response?.data?.message || 'Failed to upload document', { variant: 'error' });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const isDocx =
      selectedFile.name.toLowerCase().endsWith('.docx') ||
      selectedFile.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const isPdf =
      selectedFile.name.toLowerCase().endsWith('.pdf') ||
      selectedFile.type === 'application/pdf';

    if (!isDocx && !isPdf) {
      enqueueSnackbar('Only DOCX and PDF files are allowed', { variant: 'error' });
      return;
    }

    if (selectedFile.size > 50 * 1024 * 1024) {
      enqueueSnackbar('File size must be less than 50 MB', { variant: 'error' });
      return;
    }

    // Client-side filename validation
    if (expectedFilename) {
      const fileBaseName = selectedFile.name.replace(/\.(docx|pdf)$/i, '');
      if (fileBaseName !== expectedFilename) {
        enqueueSnackbar(
          `Filename does not match expected pattern.\nExpected: "${expectedFilename}.docx" (or .pdf)\nGot: "${selectedFile.name}"`,
          { variant: 'error' },
        );
        return;
      }
    }

    setFile(selectedFile);

    if (!title) {
      const titleFromFile = selectedFile.name
        .replace(/\.(docx|pdf)$/i, '')
        .replace(/[_-]/g, ' ');
      setTitle(titleFromFile);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { enqueueSnackbar('Please select a file', { variant: 'error' }); return; }
    if (!unitId) { enqueueSnackbar('Please select a unit', { variant: 'error' }); return; }
    if (!reportorialDocTypeId) { enqueueSnackbar('Please select a document type', { variant: 'error' }); return; }

    // Compute period token for the backend
    let periodToken = '';
    if (selectedDocType) {
      if (selectedDocType.submission_frequency === 'monthly') {
        periodToken = String(selectedMonth).padStart(2, '0');
      } else if (selectedDocType.submission_frequency === 'quarterly') {
        periodToken = `Q${selectedQuarter}`;
      }
      // annual: periodToken stays ''
    }

    uploadMutation.mutate({
      title,
      file,
      unit_id: unitId,
      document_type: selectedDocType?.display_name || '',
      reportorial_doc_type_id: Number(reportorialDocTypeId),
      period: periodToken,
      year: String(selectedYear),
    });
  };

  const unitOptions: { id: number; name: string }[] = isFocal
    ? ((user?.units ?? []) as any[])
    : (unitsResponse?.data ?? []);

  const selectedUnitName = unitOptions.find((u) => String(u.id) === unitId)?.name;

  // Year range: current year ± 3
  const yearOptions = Array.from({ length: 7 }, (_, i) => now.getFullYear() - 3 + i);

  return (
    <Paper elevation={3} sx={{ p: 4, maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h5" gutterBottom>
        Upload Document
      </Typography>

      <form onSubmit={handleSubmit}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 3 }}>
          {/* File Picker */}
          <Box>
            <Button
              variant="outlined"
              component="label"
              fullWidth
              startIcon={<UploadIcon />}
              sx={{ height: 56 }}
            >
              {file ? file.name : 'Choose DOCX or PDF File'}
              <input
                type="file"
                hidden
                accept=".docx,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf"
                onChange={handleFileChange}
              />
            </Button>
            {file && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Size: {(file.size / 1024 / 1024).toFixed(2)} MB
              </Typography>
            )}
          </Box>

          {/* Title */}
          <TextField
            label="Document Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            fullWidth
          />

          {/* Unit */}
          {isFocal ? (
            <TextField
              label="Unit"
              value={selectedUnitName ?? ''}
              InputProps={{ readOnly: true }}
              fullWidth
              helperText="Auto-populated from your assigned unit"
            />
          ) : (
            <FormControl fullWidth required>
              <InputLabel>Unit</InputLabel>
              <Select
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                label="Unit"
              >
                {unitOptions.map((unit) => (
                  <MenuItem key={unit.id} value={String(unit.id)}>
                    {unit.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {/* Reportorial Document Type */}
          <FormControl fullWidth required disabled={!unitId}>
            <InputLabel>Document Type</InputLabel>
            <Select
              value={reportorialDocTypeId}
              onChange={(e) => setReportorialDocTypeId(e.target.value)}
              label="Document Type"
            >
              {docTypes.filter((dt) => dt.active).map((dt) => (
                <MenuItem key={dt.id} value={String(dt.id)}>
                  {dt.display_name}
                </MenuItem>
              ))}
              {docTypes.length === 0 && (
                <MenuItem disabled value="">
                  {unitId ? 'No document types for this unit' : 'Select a unit first'}
                </MenuItem>
              )}
            </Select>
          </FormControl>

          {/* ── Period Picker (shown once a doc type is selected) ── */}
          {selectedDocType && (
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {/* Year */}
              <FormControl sx={{ minWidth: 110 }} required>
                <InputLabel>Year</InputLabel>
                <Select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  label="Year"
                >
                  {yearOptions.map((y) => (
                    <MenuItem key={y} value={y}>{y}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Month (monthly only) */}
              {selectedDocType.submission_frequency === 'monthly' && (
                <FormControl sx={{ minWidth: 160 }} required>
                  <InputLabel>Month</InputLabel>
                  <Select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    label="Month"
                  >
                    {MONTH_NAMES.map((name, idx) => (
                      <MenuItem key={idx + 1} value={idx + 1}>{name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              {/* Quarter (quarterly only) */}
              {selectedDocType.submission_frequency === 'quarterly' && (
                <FormControl sx={{ minWidth: 130 }} required>
                  <InputLabel>Quarter</InputLabel>
                  <Select
                    value={selectedQuarter}
                    onChange={(e) => setSelectedQuarter(Number(e.target.value))}
                    label="Quarter"
                  >
                    {[1, 2, 3, 4].map((q) => (
                      <MenuItem key={q} value={q}>Q{q}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Box>
          )}

          {expectedFilename && (
            <Typography variant="body2" color="text.secondary">
              Expected filename: <strong>{expectedFilename}.docx</strong> (or .pdf)
            </Typography>
          )}

          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={uploadMutation.isPending}
            startIcon={uploadMutation.isPending ? <CircularProgress size={20} /> : <UploadIcon />}
          >
            {uploadMutation.isPending ? 'Uploading...' : 'Upload Document'}
          </Button>
        </Box>
      </form>
    </Paper>
  );
}
