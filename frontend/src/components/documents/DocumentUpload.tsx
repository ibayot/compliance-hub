'use client';

import React, { useState } from 'react';
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
import { documentsApi, UploadDocumentRequest } from '@/lib/api/documents';
import { unitsApi } from '@/lib/api/units';

interface DocumentUploadProps {
  onSuccess?: () => void;
}

const documentTypes = [
  'Policy',
  'Procedure',
  'Guidelines',
  'Manual',
  'Report',
  'Other',
];

export default function DocumentUpload({ onSuccess }: DocumentUploadProps) {
  const [formData, setFormData] = useState({
    title: '',
    document_type: '',
    period: '',
    year: new Date().getFullYear().toString(),
    unit_id: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch units for dropdown
  const { data: unitsResponse } = useQuery({
    queryKey: ['units'],
    queryFn: () => unitsApi.listUnits({ page: 1, limit: 100 }),
  });

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
      if (
        !selectedFile.name.toLowerCase().endsWith('.docx') &&
        selectedFile.type !==
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ) {
        setError('Only DOCX files are allowed');
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
          .replace(/\.docx$/i, '')
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
  };

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
              {file ? file.name : 'Choose DOCX File'}
              <input
                type="file"
                hidden
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
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
              {documentTypes.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

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
