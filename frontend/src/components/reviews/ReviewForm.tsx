'use client';

import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
  IconButton,
  Chip,
  Select,
  MenuItem,
  InputLabel,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { ReviewDecision, SubmitReviewDto, Finding } from '@/app/api/reviews';

interface ReviewFormProps {
  documentId: string;
  onSubmit: (data: SubmitReviewDto) => Promise<void>;
  onCancel?: () => void;
}

export default function ReviewForm({
  documentId,
  onSubmit,
  onCancel,
}: ReviewFormProps) {
  const [decision, setDecision] = useState<ReviewDecision>(
    ReviewDecision.COMPLIANT,
  );
  const [remarks, setRemarks] = useState('');
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  const handleAddFinding = () => {
    setFindings([
      ...findings,
      { category: '', description: '', severity: 'low' },
    ]);
  };

  const handleRemoveFinding = (index: number) => {
    setFindings(findings.filter((_, i) => i !== index));
  };

  const handleFindingChange = (
    index: number,
    field: keyof Finding,
    value: string,
  ) => {
    const newFindings = [...findings];
    newFindings[index] = { ...newFindings[index], [field]: value };
    setFindings(newFindings);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const reviewData: SubmitReviewDto = {
        decision,
        remarks: remarks || undefined,
        findings: findings.length > 0 ? findings : undefined,
      };

      await onSubmit(reviewData);
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to submit review', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Submit Manual Review
        </Typography>

        <Box component="form" onSubmit={handleSubmit}>
          <FormControl fullWidth margin="normal">
            <Typography variant="subtitle2" gutterBottom>
              Decision
            </Typography>
            <RadioGroup
              value={decision}
              onChange={(e) => setDecision(e.target.value as ReviewDecision)}
            >
              <FormControlLabel
                value={ReviewDecision.COMPLIANT}
                control={<Radio />}
                label="Compliant"
              />
              <FormControlLabel
                value={ReviewDecision.NON_COMPLIANT}
                control={<Radio />}
                label="Non-Compliant"
              />
              <FormControlLabel
                value={ReviewDecision.NEEDS_REVISION}
                control={<Radio />}
                label="Needs Revision"
              />
            </RadioGroup>
          </FormControl>

          <TextField
            fullWidth
            multiline
            rows={4}
            label="Remarks"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            margin="normal"
          />

          <Box sx={{ mt: 3, mb: 2 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Typography variant="subtitle2">Findings</Typography>
              <Button
                startIcon={<AddIcon />}
                onClick={handleAddFinding}
                size="small"
              >
                Add Finding
              </Button>
            </Box>

            {findings.map((finding, index) => (
              <Card key={index} variant="outlined" sx={{ mt: 2, p: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="start">
                  <Box flex={1}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Category"
                      value={finding.category}
                      onChange={(e) =>
                        handleFindingChange(index, 'category', e.target.value)
                      }
                      margin="dense"
                    />
                    <TextField
                      fullWidth
                      size="small"
                      multiline
                      rows={2}
                      label="Description"
                      value={finding.description}
                      onChange={(e) =>
                        handleFindingChange(index, 'description', e.target.value)
                      }
                      margin="dense"
                    />
                    <FormControl fullWidth size="small" margin="dense">
                      <InputLabel>Severity</InputLabel>
                      <Select
                        value={finding.severity || 'low'}
                        onChange={(e) =>
                          handleFindingChange(index, 'severity', e.target.value)
                        }
                        label="Severity"
                      >
                        <MenuItem value="low">Low</MenuItem>
                        <MenuItem value="medium">Medium</MenuItem>
                        <MenuItem value="high">High</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                  <IconButton
                    onClick={() => handleRemoveFinding(index)}
                    size="small"
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </Card>
            ))}
          </Box>

          <Box display="flex" gap={2} mt={3}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={loading}
              fullWidth
            >
              {loading ? 'Submitting...' : 'Submit Review'}
            </Button>
            {onCancel && (
              <Button variant="outlined" onClick={onCancel} fullWidth>
                Cancel
              </Button>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
