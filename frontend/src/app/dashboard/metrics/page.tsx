'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
  CircularProgress,
  Chip,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { metricsApi, MetricTemplate } from '@/lib/api/metrics';
import { unitsApi, Unit } from '@/lib/api/units';
import { docTypesApi, ReportorialDocType } from '@/lib/api/document-types';

type MetricType = 'section_check' | 'keyword_check' | 'property_check' | 'date_check';

const metricTypeLabels: Record<MetricType, string> = {
  section_check: 'Section Rules',
  keyword_check: 'Keyword Rules',
  property_check: 'Number Extraction',
  date_check: 'Date / Deadline Check',
};

export default function MetricsPage() {
  const { enqueueSnackbar } = useSnackbar();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<MetricTemplate[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [docTypes, setDocTypes] = useState<ReportorialDocType[]>([]);
  const [editing, setEditing] = useState<MetricTemplate | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [metricType, setMetricType] = useState<MetricType>('keyword_check');
  const [weight, setWeight] = useState(1);
  const [reportorialDocTypeId, setReportorialDocTypeId] = useState('');

  const [requiredSectionsText, setRequiredSectionsText] = useState('Introduction\nMethodology\nFindings\nRecommendations');
  const [keywordText, setKeywordText] = useState('compliance, report, memorandum, issuance');
  const [keywordMinMatches, setKeywordMinMatches] = useState(1);
  const [keywordCaseSensitive, setKeywordCaseSensitive] = useState(false);
  const [keywordWordBoundary, setKeywordWordBoundary] = useState(false);

  const [extractKeywordsText, setExtractKeywordsText] = useState('total incidents\nresolved incidents\nopen incidents\nusers trained');
  const [extractComparison, setExtractComparison] = useState<'gte' | 'lte' | 'eq' | 'gt' | 'lt'>('gte');
  const [extractComparisonsText, setExtractComparisonsText] = useState('>=\n>=\n<=\n>=');
  const [extractExpectedNumbersText, setExtractExpectedNumbersText] = useState('1\n1\n0\n10');

  const [deadlineDay, setDeadlineDay] = useState(5);
  const [deadlineMonthOffset, setDeadlineMonthOffset] = useState(1);
  const [maxDaysLate, setMaxDaysLate] = useState(0);
  const [submissionFrequency, setSubmissionFrequency] = useState<'monthly' | 'quarterly' | 'annual' | 'custom'>('monthly');
  const [submissionMonth, setSubmissionMonth] = useState(12);
  const [customPeriodRegex, setCustomPeriodRegex] = useState('^(\\d{4})(\\d{2})$');
  const [customPeriodYearGroup, setCustomPeriodYearGroup] = useState(1);
  const [customPeriodMonthGroup, setCustomPeriodMonthGroup] = useState(2);
  const [customFallbackMonth, setCustomFallbackMonth] = useState(12);

  const loadData = async () => {
    try {
      setLoading(true);
      const [metrics, unitList, doctypeList] = await Promise.all([
        metricsApi.listTemplates(),
        unitsApi.listAll(),
        docTypesApi.fetchAll(),
      ]);
      setTemplates(metrics);
      setUnits(unitList);
      setDocTypes(doctypeList);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetForm = () => {
    setEditing(null);
    setName('');
    setDescription('');
    setMetricType('keyword_check');
    setWeight(1);
    setReportorialDocTypeId('');

    setRequiredSectionsText('Introduction\nMethodology\nFindings\nRecommendations');
    setKeywordText('compliance, report, memorandum, issuance');
    setKeywordMinMatches(1);
    setKeywordCaseSensitive(false);
    setKeywordWordBoundary(false);

    setExtractKeywordsText('total incidents\nresolved incidents\nopen incidents\nusers trained');
    setExtractComparison('gte');
    setExtractComparisonsText('>=\n>=\n<=\n>=');
    setExtractExpectedNumbersText('1\n1\n0\n10');

    setDeadlineDay(5);
    setDeadlineMonthOffset(1);
    setMaxDaysLate(0);
    setSubmissionFrequency('monthly');
    setSubmissionMonth(12);
    setCustomPeriodRegex('^(\\d{4})(\\d{2})$');
    setCustomPeriodYearGroup(1);
    setCustomPeriodMonthGroup(2);
    setCustomFallbackMonth(12);
  };

  const parseListText = (value: string): string[] => {
    return value
      .split(/[,\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (template: MetricTemplate) => {
    resetForm();
    setEditing(template);
    setName(template.name);
    setDescription(template.description || '');
    setMetricType(template.metric_type);
    setWeight(template.weight || 1);
    setReportorialDocTypeId(
      template.applicability?.[0]?.reportorial_doc_type_id
        ? String(template.applicability[0].reportorial_doc_type_id)
        : ''
    );

    const ruleConfig = template.rule_config || {};
    const passCriteria = template.pass_criteria || {};

    if (template.metric_type === 'section_check') {
      setRequiredSectionsText((ruleConfig.required_sections || []).join('\n'));
    }

    if (template.metric_type === 'keyword_check') {
      setKeywordText((ruleConfig.keywords || []).join(', '));
      setKeywordMinMatches(Number(passCriteria.min_matches ?? ruleConfig.min_count ?? 1));
      setKeywordCaseSensitive(Boolean(ruleConfig.case_sensitive));
      setKeywordWordBoundary(Boolean(ruleConfig.use_word_boundary));
    }

    if (template.metric_type === 'property_check') {
      const existingKeywords = Array.isArray(ruleConfig.keywords)
        ? ruleConfig.keywords
        : ruleConfig.keyword
          ? [ruleConfig.keyword]
          : [];
      const existingExpectedNumbers = Array.isArray(ruleConfig.expected_numbers)
        ? ruleConfig.expected_numbers
        : Number.isFinite(Number(ruleConfig.expected_number))
          ? [ruleConfig.expected_number]
          : [];
      const existingComparisons = Array.isArray(ruleConfig.comparisons)
        ? ruleConfig.comparisons
        : [];
      setExtractKeywordsText(existingKeywords.join('\n'));
      setExtractComparison((ruleConfig.comparison as any) || 'gte');
      setExtractComparisonsText(
        (existingComparisons.length > 0
          ? existingComparisons
          : existingKeywords.map(() => (ruleConfig.comparison as any) || 'gte'))
          .map((item: string) => {
            switch (String(item || '').trim()) {
              case 'gte': return '>=';
              case 'lte': return '<=';
              case 'gt': return '>';
              case 'lt': return '<';
              case 'eq': return '=';
              default: return '>=';
            }
          })
          .join('\n'),
      );
      setExtractExpectedNumbersText(existingExpectedNumbers.join('\n') || '1');
    }

    if (template.metric_type === 'date_check') {
      setDeadlineDay(Number(ruleConfig.deadline_day ?? 5));
      setDeadlineMonthOffset(Number(ruleConfig.deadline_month_offset ?? 1));
      setMaxDaysLate(Number(ruleConfig.max_days_late ?? 0));
      setSubmissionFrequency((ruleConfig.submission_frequency as any) || 'monthly');
      setSubmissionMonth(Number(ruleConfig.submission_month ?? 12));
      setCustomPeriodRegex(String(ruleConfig.custom_period_regex ?? '^(\\d{4})(\\d{2})$'));
      setCustomPeriodYearGroup(Number(ruleConfig.custom_period_year_group ?? 1));
      setCustomPeriodMonthGroup(Number(ruleConfig.custom_period_month_group ?? 2));
      setCustomFallbackMonth(Number(ruleConfig.custom_period_fallback_month ?? 12));
    }

    setOpen(true);
  };

  const buildMetricConfig = () => {
    if (metricType === 'section_check') {
      const sections = parseListText(requiredSectionsText);
      return {
        rule_config: {
          required_sections: sections,
        },
        pass_criteria: {
          all_present: true,
        },
      };
    }

    if (metricType === 'keyword_check') {
      return {
        rule_config: {
          keywords: parseListText(keywordText),
          min_count: keywordMinMatches,
          case_sensitive: keywordCaseSensitive,
          use_word_boundary: keywordWordBoundary,
        },
        pass_criteria: {
          min_matches: keywordMinMatches,
        },
      };
    }

    if (metricType === 'property_check') {
      const keywords = parseListText(extractKeywordsText);
      const expectedNumbers = parseListText(extractExpectedNumbersText)
        .map((item) => Number(item))
        .filter((item) => Number.isFinite(item));
      const perKeywordComparisons = parseListText(extractComparisonsText)
        .map((item) => {
          const value = String(item).trim();
          if (value === '>=') return 'gte';
          if (value === '<=') return 'lte';
          if (value === '>') return 'gt';
          if (value === '<') return 'lt';
          if (value === '=') return 'eq';
          if (['gte', 'lte', 'gt', 'lt', 'eq'].includes(value)) return value as 'gte' | 'lte' | 'gt' | 'lt' | 'eq';
          return null;
        })
        .filter((item): item is 'gte' | 'lte' | 'gt' | 'lt' | 'eq' => item !== null);

      return {
        rule_config: {
          mode: 'number_extraction',
          field: 'extracted_text',
          keywords,
          keyword: keywords[0],
          comparison: extractComparison,
          comparisons: perKeywordComparisons,
          expected_number: expectedNumbers[0],
          expected_numbers: expectedNumbers,
          window_chars: 120,
        },
        pass_criteria: {
          matches_pattern: true,
        },
      };
    }

    return {
      rule_config: {
        submission_frequency: submissionFrequency,
        submission_month: submissionMonth,
        deadline_day: deadlineDay,
        deadline_month_offset: deadlineMonthOffset,
        max_days_late: maxDaysLate,
        custom_period_regex: customPeriodRegex,
        custom_period_year_group: customPeriodYearGroup,
        custom_period_month_group: customPeriodMonthGroup,
        custom_period_fallback_month: customFallbackMonth,
      },
      pass_criteria: {
        within_deadline: true,
      },
    };
  };

  const validateForm = (): string | null => {
    if (!name.trim()) {
      return 'Template name is required.';
    }

    if (metricType === 'section_check' && parseListText(requiredSectionsText).length === 0) {
      return 'At least one required section is needed.';
    }

    if (metricType === 'keyword_check' && parseListText(keywordText).length === 0) {
      return 'At least one keyword is needed.';
    }

    if (metricType === 'property_check') {
      const keywords = parseListText(extractKeywordsText);
      if (keywords.length === 0) {
        return 'At least one keyword is required for number extraction.';
      }
      const expectedNumbers = parseListText(extractExpectedNumbersText)
        .map((item) => Number(item))
        .filter((item) => Number.isFinite(item));
      if (expectedNumbers.length === 0) {
        return 'At least one expected number must be provided.';
      }
      if (expectedNumbers.length < keywords.length) {
        return 'Expected numbers must match the number of keywords.';
      }

      const comparisons = parseListText(extractComparisonsText);
      if (comparisons.length < keywords.length) {
        return 'Comparisons must match the number of keywords.';
      }

      const invalidComparison = comparisons.find((item) => !['>=', '<=', '>', '<', '=', 'gte', 'lte', 'gt', 'lt', 'eq'].includes(item));
      if (invalidComparison) {
        return `Invalid comparison operator: ${invalidComparison}. Use >=, <=, >, <, or =.`;
      }
    }

    if (metricType === 'date_check') {
      if (deadlineDay < 1 || deadlineDay > 28) {
        return 'Deadline day must be between 1 and 28.';
      }
      if (maxDaysLate < 0) {
        return 'Max days late cannot be negative.';
      }
      if (submissionFrequency === 'annual' && (submissionMonth < 1 || submissionMonth > 12)) {
        return 'Submission month for annual frequency must be between 1 and 12.';
      }
      if (submissionFrequency === 'custom' && !customPeriodRegex.trim()) {
        return 'Custom period regex is required for custom frequency.';
      }
    }

    return null;
  };

  const handleSave = async () => {
    const validationError = validateForm();
    if (validationError) {
      enqueueSnackbar(validationError, { variant: 'error' });
      return;
    }

    const { rule_config, pass_criteria } = buildMetricConfig();

    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      metric_type: metricType,
      weight,
      rule_config,
      pass_criteria,
      applicability: reportorialDocTypeId
        ? [{ reportorial_doc_type_id: Number(reportorialDocTypeId) }]
        : [],
    };

    try {
      setSaving(true);
      if (editing) {
        await metricsApi.updateTemplate(editing.id, payload);
      } else {
        await metricsApi.createTemplate(payload);
      }
      setOpen(false);
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await metricsApi.deleteTemplate(id);
    await loadData();
  };

  const filteredTemplates = useMemo(() => {
    if (tab === 0) {
      return templates;
    }

    const typeByTab: Record<number, MetricType> = {
      1: 'section_check',
      2: 'keyword_check',
      3: 'property_check',
      4: 'date_check',
    };

    const selectedType = typeByTab[tab];
    return templates.filter((template) => template.metric_type === selectedType);
  }, [tab, templates]);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Metrics Template Builder
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Configure section checks, keyword checks, number extraction, and deadlines per unit/report type
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          Create Template
        </Button>
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={tab} onChange={(_, value) => setTab(value)}>
          <Tab label="All Templates" />
          <Tab label="Section Rules" />
          <Tab label="Keyword Rules" />
          <Tab label="Number Extraction" />
          <Tab label="Date Check" />
        </Tabs>
      </Paper>

      <Paper sx={{ p: 2 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" py={6}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Weight</TableCell>
                  <TableCell>Applicability</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredTemplates.map((template) => (
                  <TableRow key={template.id} hover>
                    <TableCell>
                      <Typography fontWeight={600}>{template.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {template.description || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>{metricTypeLabels[template.metric_type]}</TableCell>
                    <TableCell>{template.weight}</TableCell>
                    <TableCell>
                      {template.applicability?.length && template.applicability[0].reportorial_doc_type_id ? (
                        <Chip
                          size="small"
                          label={(() => {
                            const dt = docTypes.find((d) => d.id === template.applicability![0].reportorial_doc_type_id);
                            return dt ? `${dt.unit?.name ?? ''} • ${dt.display_name}` : `Doc Type #${template.applicability![0].reportorial_doc_type_id}`;
                          })()}
                        />
                      ) : (
                        'Global'
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton onClick={() => openEdit(template)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton color="error" onClick={() => handleDelete(template.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredTemplates.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      No metric templates found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editing ? 'Edit Metric Template' : 'Create Metric Template'}</DialogTitle>
        <DialogContent>
          <TextField margin="dense" label="Template Name" fullWidth value={name} onChange={(event) => setName(event.target.value)} />
          <TextField margin="dense" label="Description" fullWidth value={description} onChange={(event) => setDescription(event.target.value)} />

            <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={2} mt={1}>
              <TextField select label="Metric Type" value={metricType} onChange={(event) => setMetricType(event.target.value as MetricType)}>
                <MenuItem value="section_check">Section Rules</MenuItem>
                <MenuItem value="keyword_check">Keyword Rules</MenuItem>
                <MenuItem value="property_check">Number Extraction</MenuItem>
                <MenuItem value="date_check">Date / Deadline Check</MenuItem>
              </TextField>
              <TextField type="number" label="Weight" value={weight} onChange={(event) => setWeight(Math.max(Number(event.target.value) || 1, 1))} />
            </Box>

          <TextField
            margin="dense"
            select
            label="Reportorial Document Type (optional)"
            fullWidth
            value={reportorialDocTypeId}
            onChange={(event) => setReportorialDocTypeId(event.target.value)}
          >
            <MenuItem value="">All Document Types (Global)</MenuItem>
            {docTypes.map((dt) => (
              <MenuItem key={dt.id} value={String(dt.id)}>
                {dt.unit?.name ? `${dt.unit.name} — ` : ''}{dt.display_name}
              </MenuItem>
            ))}
          </TextField>

          {metricType === 'section_check' && (
            <>
              <TextField
                margin="dense"
                label="Required Sections (comma or newline separated)"
                fullWidth
                multiline
                minRows={4}
                value={requiredSectionsText}
                onChange={(event) => setRequiredSectionsText(event.target.value)}
              />
              <Typography variant="caption" color="text.secondary">
                Sample set (5): Introduction, Methodology, Findings, Recommendations, Action Plan
              </Typography>
            </>
          )}

          {metricType === 'keyword_check' && (
            <>
              <TextField
                margin="dense"
                label="Keywords (comma or newline separated)"
                fullWidth
                multiline
                minRows={3}
                value={keywordText}
                onChange={(event) => setKeywordText(event.target.value)}
              />
              <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={2} mt={1}>
                <TextField
                  type="number"
                  label="Minimum Matches"
                  value={keywordMinMatches}
                  onChange={(event) => setKeywordMinMatches(Math.max(Number(event.target.value) || 1, 1))}
                />
                <Box>
                  <FormControlLabel
                    control={<Checkbox checked={keywordCaseSensitive} onChange={(event) => setKeywordCaseSensitive(event.target.checked)} />}
                    label="Case sensitive"
                  />
                  <FormControlLabel
                    control={<Checkbox checked={keywordWordBoundary} onChange={(event) => setKeywordWordBoundary(event.target.checked)} />}
                    label="Match whole words only"
                  />
                </Box>
              </Box>
              <Typography variant="caption" color="text.secondary">
                Sample set (5): compliance, report, memorandum, issuance, implementation
              </Typography>
            </>
          )}

          {metricType === 'property_check' && (
            <>
              <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr 1fr 1fr' }} gap={2} mt={1}>
                <TextField
                  label="Keywords (comma or newline separated)"
                  value={extractKeywordsText}
                  multiline
                  minRows={3}
                  onChange={(event) => setExtractKeywordsText(event.target.value)}
                />
                <TextField
                  select
                  label="Default Comparison"
                  value={extractComparison}
                  onChange={(event) => setExtractComparison(event.target.value as any)}
                >
                  <MenuItem value="gte">&gt;=</MenuItem>
                  <MenuItem value="lte">&lt;=</MenuItem>
                  <MenuItem value="gt">&gt;</MenuItem>
                  <MenuItem value="lt">&lt;</MenuItem>
                  <MenuItem value="eq">=</MenuItem>
                </TextField>
                <TextField
                  label="Comparisons (one per keyword)"
                  value={extractComparisonsText}
                  multiline
                  minRows={3}
                  onChange={(event) => setExtractComparisonsText(event.target.value)}
                  helperText="Use >=, <=, >, <, or =; one per line to match each keyword."
                />
                <TextField
                  label="Expected Numbers (comma or newline separated)"
                  value={extractExpectedNumbersText}
                  multiline
                  minRows={3}
                  onChange={(event) => setExtractExpectedNumbersText(event.target.value)}
                />
              </Box>
              <Typography variant="caption" color="text.secondary">
                Sample mapping: total incidents &gt;= 1, resolved incidents &gt;= 1, open incidents &lt;= 0, users trained &gt;= 10
              </Typography>
            </>
          )}

          {metricType === 'date_check' && (
            <>
            <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr 1fr' }} gap={2} mt={1}>
              <TextField
                select
                label="Submission Frequency"
                value={submissionFrequency}
                onChange={(event) => setSubmissionFrequency(event.target.value as any)}
              >
                <MenuItem value="monthly">Monthly</MenuItem>
                <MenuItem value="quarterly">Quarterly</MenuItem>
                <MenuItem value="annual">Annual</MenuItem>
                <MenuItem value="custom">Custom Period</MenuItem>
              </TextField>
              {submissionFrequency === 'annual' ? (
                <TextField
                  type="number"
                  label="Submission Month (1-12)"
                  value={submissionMonth}
                  onChange={(event) => setSubmissionMonth(Number(event.target.value) || 12)}
                />
              ) : (
                <Box />
              )}
              <Box />
              <TextField
                type="number"
                label="Deadline Day (1-28)"
                value={deadlineDay}
                onChange={(event) => setDeadlineDay(Number(event.target.value) || 5)}
              />
              <TextField
                type="number"
                label="Deadline Month Offset"
                value={deadlineMonthOffset}
                onChange={(event) => setDeadlineMonthOffset(Number(event.target.value) || 1)}
              />
              <TextField
                type="number"
                label="Max Allowed Days Late"
                value={maxDaysLate}
                onChange={(event) => setMaxDaysLate(Math.max(Number(event.target.value) || 0, 0))}
              />
              {submissionFrequency === 'custom' && (
                <>
                  <TextField
                    label="Custom Period Regex"
                    value={customPeriodRegex}
                    onChange={(event) => setCustomPeriodRegex(event.target.value)}
                  />
                  <TextField
                    type="number"
                    label="Year Group Index"
                    value={customPeriodYearGroup}
                    onChange={(event) => setCustomPeriodYearGroup(Number(event.target.value) || 1)}
                  />
                  <TextField
                    type="number"
                    label="Month Group Index"
                    value={customPeriodMonthGroup}
                    onChange={(event) => setCustomPeriodMonthGroup(Number(event.target.value) || 2)}
                  />
                  <TextField
                    type="number"
                    label="Fallback Month (1-12)"
                    value={customFallbackMonth}
                    onChange={(event) => setCustomFallbackMonth(Number(event.target.value) || 12)}
                  />
                </>
              )}
            </Box>
            <Typography variant="caption" color="text.secondary">
              Sample scenarios (5): Monthly-5th+1 month, Quarterly-10th+1 month, Annual-month12 day15, Custom YYYYMM regex, Custom fallback month 12
            </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
