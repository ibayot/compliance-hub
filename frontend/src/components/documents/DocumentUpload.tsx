'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
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
import { useMutation, useQuery } from '@tanstack/react-query';
import { documentsApi, UploadDocumentRequest } from '@/lib/api/documents';
import { unitsApi } from '@/lib/api/units';
import { docTypesApi, computeExpectedFilename, ReportorialDocType } from '@/lib/api/document-types';
import { useAuth } from '@/contexts/AuthContext';

interface DocumentUploadProps {
  onSuccess?: () => void;
}

export default function DocumentUpload({ onSuccess }: DocumentUploadProps) {
  const { user } = useAuth();
  const isFocal = user?.role === 'focal';

  const [title, setTitle] = useState('');
  const [unitId, setUnitId] = useState('');
  const [reportorialDocTypeId, setReportorialDocTypeId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  // Compute expected filename dynamically
  const selectedDocType = useMemo(
    () => docTypes.find((dt) => String(dt.id) === reportorialDocTypeId),
    [docTypes, reportorialDocTypeId],
  );
  const expectedFilename = useMemo(
    () => (selectedDocType ? computeExpectedFilename(selectedDocType) : null),
    [selectedDocType],
  );

  const uploadMutation = useMutation({
    mutationFn: (data: UploadDocumentRequest) => documentsApi.uploadDocument(data),
    onSuccess: () => {
      setTitle('');
      setReportorialDocTypeId('');
      setFile(null);
      setError(null);
      if (!isFocal) setUnitId('');
      onSuccess?.();
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to upload document');
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
      setError('Only DOCX and PDF files are allowed');
      return;
    }

    if (selectedFile.size > 50 * 1024 * 1024) {
      setError('File size must be less than 50 MB');
      return;
    }

    // Client-side filename validation
    if (expectedFilename) {
      const fileBaseName = selectedFile.name.replace(/\.(docx|pdf)$/i, '');
      if (fileBaseName !== expectedFilename) {
        setError(
          `Filename does not match expected pattern.\nExpected: "${expectedFilename}.docx" (or .pdf)\nGot: "${selectedFile.name}"`,
        );
        return;
      }
    }

    setFile(selectedFile);
    setError(null);

    if (!title) {
      const titleFromFile = selectedFile.name
        .replace(/\.(docx|pdf)$/i, '')
        .replace(/[_-]/g, ' ');
      setTitle(titleFromFile);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { setError('Please select a file'); return; }
    if (!unitId) { setError('Please select a unit'); return; }
    if (!reportorialDocTypeId) { setError('Please select a document type'); return; }

    uploadMutation.mutate({
      title,
      file,
      unit_id: unitId,
      document_type: selectedDocType?.display_name || '',
      reportorial_doc_type_id: Number(reportorialDocTypeId),
      period: '',
      year: String(new Date().getFullYear()),
    });
  };

  const unitOptions: { id: number; name: string }[] = isFocal
    ? ((user?.units ?? []) as any[])
    : (unitsResponse?.data ?? []);

  const selectedUnitName = unitOptions.find((u) => String(u.id) === unitId)?.name;

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

          {expectedFilename && (
            <Alert severity="info">
              Expected filename: <strong>{expectedFilename}.docx</strong> (or .pdf)
            </Alert>
          )}

          {error && (
            <Alert severity="error" onClose={() => setError(null)} sx={{ whiteSpace: 'pre-line' }}>
              {error}
            </Alert>
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

          {uploadMutation.isSuccess && (
            <Alert severity="success">Document uploaded successfully!</Alert>
          )}
        </Box>
      </form>
    </Paper>
  );
}
