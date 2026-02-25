'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Typography,
  Alert,
  CircularProgress,
  Paper,
} from '@mui/material';
import { CloudUpload as UploadIcon } from '@mui/icons-material';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  documentsApi,
  UploadDocumentRequest,
  UploadOption,
} from '@/lib/api/documents';
import { unitsApi } from '@/lib/api/units';
import { useAuth } from '@/contexts/AuthContext';

interface DocumentUploadProps {
  onSuccess?: () => void;
}

export default function DocumentUpload({ onSuccess }: DocumentUploadProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    document_type: '',
    period: '',
    year: new Date().getFullYear().toString(),
    unit_id: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadOptions, setUploadOptions] = useState<UploadOption[]>([]);
  const [expectedFileName, setExpectedFileName] = useState<string | undefined>();

  const isFocal = user?.role === 'focal';

  // Fetch units for dropdown
  const { data: unitsResponse } = useQuery({
    queryKey: ['units'],
    queryFn: () => unitsApi.listUnits({ page: 1, limit: 100 }),
  });

  const { data: documentTypes } = useQuery({
    queryKey: ['document-types'],
    queryFn: () => documentsApi.listDocumentTypes(),
  });

  const { data: focalUploadOptions = [] } = useQuery({
    queryKey: ['upload-options', formData.period, formData.year, isFocal],
    queryFn: async () => {
      if (!isFocal || !formData.period || !formData.year) {
        return [] as UploadOption[];
      }
      return documentsApi.getUploadOptions(formData.period, formData.year);
    },
    enabled: isFocal,
  });

  useEffect(() => {
    if (!isFocal) {
      return;
    }

    setUploadOptions(focalUploadOptions);

    if (focalUploadOptions.length === 0) {
      setFormData((prev) => ({
        ...prev,
        document_type: '',
        unit_id: '',
      }));
      setExpectedFileName(undefined);
      return;
    }

    const current = focalUploadOptions.find(
      (option) =>
        option.document_type === formData.document_type &&
        String(option.unit_id) === formData.unit_id,
    );

    const selected = current || focalUploadOptions[0];
    const nextUnitId = String(selected.unit_id);
    if (
      formData.document_type !== selected.document_type ||
      formData.unit_id !== nextUnitId
    ) {
      setFormData((prev) => ({
        ...prev,
        document_type: selected.document_type,
        unit_id: nextUnitId,
      }));
    }
    setExpectedFileName(selected.expected_file_name);
  }, [focalUploadOptions, formData.document_type, formData.unit_id, isFocal]);

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: (data: UploadDocumentRequest) =>
      documentsApi.uploadDocument(data),
    onSuccess: () => {
      // Reset form
      setFormData({
        title: '',
        document_type: '',
        period: '',
        year: new Date().getFullYear().toString(),
        unit_id: '',
      });
      setExpectedFileName(undefined);
      setFile(null);
      setError(null);
      onSuccess?.();
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to upload document');
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const isDocx =
        selectedFile.name.toLowerCase().endsWith('.docx') ||
        selectedFile.type ===
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      const isPdf =
        selectedFile.name.toLowerCase().endsWith('.pdf') ||
        selectedFile.type === 'application/pdf';

      if (
        !isDocx && !isPdf
      ) {
        setError('Only DOCX and PDF files are allowed');
        return;
      }

      // Validate file size (50MB)
      if (selectedFile.size > 50 * 1024 * 1024) {
        setError('File size must be less than 50MB');
        return;
      }

      setFile(selectedFile);
      setError(null);

      // Auto-fill title from filename if empty
      if (!formData.title) {
        const titleFromFile = selectedFile.name
          .replace(/\.(docx|pdf)$/i, '')
          .replace(/[-_]/g, ' ');
        setFormData((prev) => ({ ...prev, title: titleFromFile }));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      setError('Please select a file');
      return;
    }

    uploadMutation.mutate({
      ...formData,
      file,
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (isFocal && field === 'period') {
      setExpectedFileName(undefined);
    }

    if (isFocal && field === 'document_type') {
      const selected = uploadOptions.find(
        (option) => option.document_type === value,
      );
      if (selected) {
        setFormData((prev) => ({ ...prev, unit_id: String(selected.unit_id), document_type: selected.document_type }));
        setExpectedFileName(selected.expected_file_name);
      }
    }
  };

  const focalTypeOptions = uploadOptions.map((option) => option.document_type);
  const typeOptions = isFocal
    ? Array.from(new Set(focalTypeOptions))
    : documentTypes || [];

  return (
    <Paper elevation={3} sx={{ p: 4, maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h5" gutterBottom>
        Upload Document
      </Typography>

      <form onSubmit={handleSubmit}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 3 }}>
          {/* File Upload */}
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
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                Size: {(file.size / 1024 / 1024).toFixed(2)} MB
              </Typography>
            )}
          </Box>

          {/* Title */}
          <TextField
            label="Document Title"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            required
            fullWidth
          />

          {/* Unit */}
          <FormControl fullWidth required>
            <InputLabel>Unit</InputLabel>
            <Select
              value={formData.unit_id}
              onChange={(e) => handleInputChange('unit_id', e.target.value)}
              label="Unit"
              disabled={isFocal}
            >
              {unitsResponse?.data?.map((unit) => (
                <MenuItem key={unit.id} value={unit.id}>
                  {unit.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Document Type */}
          <FormControl fullWidth required>
            <InputLabel>Document Type</InputLabel>
            <Select
              value={formData.document_type}
              onChange={(e) => handleInputChange('document_type', e.target.value)}
              label="Document Type"
            >
              {typeOptions.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {isFocal && expectedFileName && (
            <Alert severity="info">
              Expected filename for this cycle: <strong>{expectedFileName}</strong>
            </Alert>
          )}

          {isFocal && formData.period && formData.year && uploadOptions.length === 0 && (
            <Alert severity="warning">
              No available report assignments for the selected cycle. Existing assigned report types may already be submitted.
            </Alert>
          )}

          {/* Year */}
          <TextField
            label="Year"
            value={formData.year}
            onChange={(e) => handleInputChange('year', e.target.value)}
            required
            fullWidth
            type="number"
            inputProps={{ min: 2000, max: 2100 }}
          />

          {/* Period */}
          <TextField
            label="Period (e.g., Q1, 2024-01)"
            value={formData.period}
            onChange={(e) => handleInputChange('period', e.target.value)}
            required
            fullWidth
            placeholder="Q1"
            helperText="Format: Q1, Q2, Q3, Q4, or YYYY-MM"
          />

          {/* Error Message */}
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={uploadMutation.isPending}
            startIcon={
              uploadMutation.isPending ? <CircularProgress size={20} /> : <UploadIcon />
            }
          >
            {uploadMutation.isPending ? 'Uploading...' : 'Upload Document'}
          </Button>

          {/* Success Message */}
          {uploadMutation.isSuccess && (
            <Alert severity="success">
              Document uploaded successfully! Processing will begin shortly.
            </Alert>
          )}
        </Box>
      </form>
    </Paper>
  );
}
