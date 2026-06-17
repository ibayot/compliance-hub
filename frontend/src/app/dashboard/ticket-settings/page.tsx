'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAutoRefresh } from '@/lib/utils/useAutoRefresh';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  CircularProgress,
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
  Tooltip,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useAuth } from '@/contexts/AuthContext';
import {
  ticketSettingsApi,
  TicketCategory,
  TicketKeywordRule,
  EscalationFocalConfig,
} from '@/app/api/references';
import { feedbackApi, Feedback } from '@/lib/api/feedback';

const TYPE_LABELS: Record<string, string> = {
  it_support: 'IT Support',
  desktop_support: 'Desktop Support',
  pantawid_ict_support: 'Pantawid ICT Support',
};

export default function TicketSettingsPage() {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const [tab, setTab] = useState(0);

  // — Categories —
  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [catLoading, setCatLoading] = useState(true);
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [editCat, setEditCat] = useState<TicketCategory | null>(null);
  const [catForm, setCatForm] = useState<{
    name: string;
    ticketType: string;
    slaHours: string;
    isActive: boolean;
  }>({ name: '', ticketType: 'it_support', slaHours: '', isActive: true });
  const [catSubmitting, setCatSubmitting] = useState(false);

  // — Keyword Rules —
  const [rules, setRules] = useState<TicketKeywordRule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [editRule, setEditRule] = useState<TicketKeywordRule | null>(null);
  const [ruleForm, setRuleForm] = useState<{
    keywords: string[];
    targetTicketType: string;
    targetCategoryId: string;
    isActive: boolean;
  }>({ keywords: [], targetTicketType: 'it_support', targetCategoryId: '', isActive: true });
  const [keywordInput, setKeywordInput] = useState('');
  const [ruleSubmitting, setRuleSubmitting] = useState(false);

  // — Escalation Focals —
  const [focals, setFocals] = useState<EscalationFocalConfig[]>([]);
  const [focalsLoading, setFocalsLoading] = useState(true);
  const [focalDialogOpen, setFocalDialogOpen] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<{ value: string; label: string }[]>([]);
  const [focalForm, setFocalForm] = useState<{ ticketType: string; roleValue: string }>({
    ticketType: 'all',
    roleValue: '',
  });
  const [focalSubmitting, setFocalSubmitting] = useState(false);

  const fetchFocals = useCallback(async () => {
    try {
      setFocalsLoading(true);
      setFocals(await ticketSettingsApi.getEscalationFocals());
    } catch {
      enqueueSnackbar('Failed to load escalation focals', { variant: 'error' });
    } finally {
      setFocalsLoading(false);
    }
  }, []);

  // — Feedback —
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(true);
  const [feedbackFilter, setFeedbackFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected'>(
    'all',
  );

  const fetchFeedbacks = useCallback(async () => {
    try {
      setFeedbackLoading(true);
      const res = await feedbackApi.list(feedbackFilter);
      setFeedbacks(res.data);
    } catch {
      enqueueSnackbar('Failed to load feedback', { variant: 'error' });
    } finally {
      setFeedbackLoading(false);
    }
  }, [feedbackFilter, enqueueSnackbar]);

  // — Global Settings & SLA Insights —
  const [globalConfig, setGlobalConfig] = useState<{
    assignmentStrategy: string;
    roundRobinCapHours: number;
  }>({ assignmentStrategy: 'CURRENT_AUTO', roundRobinCapHours: 80 });
  const [slaInsights, setSlaInsights] = useState<any[]>([]);
  const [globalLoading, setGlobalLoading] = useState(true);

  const fetchGlobalData = useCallback(async () => {
    try {
      setGlobalLoading(true);
      const [config, insights] = await Promise.all([
        ticketSettingsApi.getGlobalConfig(),
        ticketSettingsApi.getSlaInsights(),
      ]);
      setGlobalConfig(config);
      setSlaInsights(insights);
    } catch {
      enqueueSnackbar('Failed to load global config and insights', { variant: 'error' });
    } finally {
      setGlobalLoading(false);
    }
  }, [enqueueSnackbar]);

  const handleUpdateGlobalConfig = async () => {
    try {
      await ticketSettingsApi.updateGlobalConfig(globalConfig);
      enqueueSnackbar('Global settings updated', { variant: 'success' });
      fetchGlobalData();
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'Failed to update global settings', {
        variant: 'error',
      });
    }
  };

  const handleUpdateFeedbackStatus = async (id: number, status: 'accepted' | 'rejected') => {
    try {
      await feedbackApi.updateStatus(id, status);
      enqueueSnackbar(`Feedback ${status}`, { variant: 'success' });
      fetchFeedbacks();
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'Failed', { variant: 'error' });
    }
  };

  const openFocalDialog = async () => {
    try {
      const roles = await ticketSettingsApi.getAvailableEscalationRoles();
      setAvailableRoles(roles);
    } catch {
      setAvailableRoles([]);
    }
    setFocalForm({ ticketType: 'all', roleValue: '' });
    setFocalDialogOpen(true);
  };

  const handleSaveFocal = async () => {
    if (!focalForm.roleValue) {
      enqueueSnackbar('Select a role', { variant: 'warning' });
      return;
    }
    try {
      setFocalSubmitting(true);
      const roleLabel =
        availableRoles.find((r) => r.value === focalForm.roleValue)?.label ?? focalForm.roleValue;
      await ticketSettingsApi.addEscalationFocal({
        ticketType: focalForm.ticketType,
        roleValue: focalForm.roleValue,
        label: roleLabel,
      });
      enqueueSnackbar('Escalation focal added', { variant: 'success' });
      setFocalDialogOpen(false);
      fetchFocals();
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'Failed to save', { variant: 'error' });
    } finally {
      setFocalSubmitting(false);
    }
  };

  const handleDeleteFocal = async (id: number) => {
    if (!confirm('Remove this escalation focal configuration?')) return;
    try {
      await ticketSettingsApi.removeEscalationFocal(id);
      enqueueSnackbar('Escalation focal removed', { variant: 'success' });
      fetchFocals();
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'Failed', { variant: 'error' });
    }
  };

  const fetchCategories = useCallback(async () => {
    // Pass activeOnly=false so admin sees ALL categories (including inactive) for management
    try {
      setCatLoading(true);
      setCategories(await ticketSettingsApi.getCategories(undefined, false));
    } catch {
      enqueueSnackbar('Failed to load categories', { variant: 'error' });
    } finally {
      setCatLoading(false);
    }
  }, []);

  const fetchRules = useCallback(async () => {
    try {
      setRulesLoading(true);
      setRules(await ticketSettingsApi.getKeywordRules());
    } catch {
      enqueueSnackbar('Failed to load keyword rules', { variant: 'error' });
    } finally {
      setRulesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
    fetchRules();
    fetchFocals();
    fetchFeedbacks();
    fetchGlobalData();
  }, [fetchCategories, fetchRules, fetchFocals, fetchFeedbacks, fetchGlobalData]);
  useAutoRefresh(fetchFeedbacks);

  // Category CRUD
  const openCatDialog = (cat?: TicketCategory) => {
    if (cat) {
      setEditCat(cat);
      setCatForm({
        name: cat.name,
        ticketType: cat.ticketType,
        slaHours: cat.slaHours != null ? String(cat.slaHours) : '',
        isActive: cat.isActive,
      });
    } else {
      setEditCat(null);
      setCatForm({ name: '', ticketType: 'it_support', slaHours: '', isActive: true });
    }
    setCatDialogOpen(true);
  };

  const handleSaveCat = async () => {
    if (!catForm.name.trim()) {
      enqueueSnackbar('Name is required', { variant: 'warning' });
      return;
    }
    try {
      setCatSubmitting(true);
      const parsedSla = catForm.slaHours ? Number(catForm.slaHours) : null;
      if (parsedSla !== null && (parsedSla < 0 || parsedSla > 168)) {
        enqueueSnackbar('SLA must be between 0 and 168 hours', { variant: 'warning' });
        setCatSubmitting(false);
        return;
      }

      let finalIsActive = catForm.isActive;
      if (parsedSla === null) {
        finalIsActive = false;
      }
      const catPayload = {
        name: catForm.name,
        ticketType: catForm.ticketType,
        slaHours: parsedSla,
        isActive: finalIsActive,
      };

      if (editCat) {
        await ticketSettingsApi.updateCategory(editCat.id, catPayload);
        enqueueSnackbar('Category updated', { variant: 'success' });
      } else {
        await ticketSettingsApi.createCategory(catPayload);
        enqueueSnackbar('Category created', { variant: 'success' });
      }
      setCatDialogOpen(false);
      fetchCategories();
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'Failed to save category', {
        variant: 'error',
      });
    } finally {
      setCatSubmitting(false);
    }
  };

  const handleDeleteCat = async (id: string) => {
    if (!confirm('Soft-delete this category?')) return;
    try {
      await ticketSettingsApi.deleteCategory(id);
      enqueueSnackbar('Category deleted', { variant: 'success' });
      fetchCategories();
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'Failed', { variant: 'error' });
    }
  };

  // Keyword Rule CRUD
  const openRuleDialog = (rule?: TicketKeywordRule) => {
    if (rule) {
      setEditRule(rule);
      const kws =
        rule.keywords && rule.keywords.length > 0 ? rule.keywords : [rule.keyword].filter(Boolean);
      setRuleForm({
        keywords: kws,
        targetTicketType: rule.targetTicketType,
        targetCategoryId: rule.targetCategoryId ?? '',
        isActive: rule.isActive,
      });
    } else {
      setEditRule(null);
      setRuleForm({
        keywords: [],
        targetTicketType: 'it_support',
        targetCategoryId: '',
        isActive: true,
      });
    }
    setKeywordInput('');
    setRuleDialogOpen(true);
  };

  const handleSaveRule = async () => {
    if (ruleForm.keywords.length === 0) {
      enqueueSnackbar('At least one keyword is required', { variant: 'warning' });
      return;
    }
    try {
      setRuleSubmitting(true);
      const payload = {
        keywords: ruleForm.keywords,
        targetTicketType: ruleForm.targetTicketType,
        targetCategoryId: ruleForm.targetCategoryId || undefined,
        isActive: ruleForm.isActive,
      };
      if (editRule) {
        await ticketSettingsApi.updateKeywordRule(editRule.id, payload);
        enqueueSnackbar('Rule updated', { variant: 'success' });
      } else {
        await ticketSettingsApi.createKeywordRule(payload);
        enqueueSnackbar('Rule created', { variant: 'success' });
      }
      setRuleDialogOpen(false);
      fetchRules();
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'Failed to save rule', { variant: 'error' });
    } finally {
      setRuleSubmitting(false);
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!confirm('Delete this keyword rule?')) return;
    try {
      await ticketSettingsApi.deleteKeywordRule(id);
      enqueueSnackbar('Rule deleted', { variant: 'success' });
      fetchRules();
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'Failed', { variant: 'error' });
    }
  };

  const filteredCategoriesForRule = categories.filter(
    (c) => c.ticketType === ruleForm.targetTicketType && !c.isDeleted,
  );

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} mb={0.5}>
        Ticket Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Manage support categories and keyword-based auto-shift rules
      </Typography>

      <Card>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label={`Categories (${categories.filter((c) => !c.isDeleted).length})`} />
          <Tab label={`Keyword Rules (${rules.length})`} />
          <Tab label={`Escalation Focals (${focals.length})`} />
          <Tab label={`Global Settings & SLA Insights`} />
          <Tab label={`User Feedback (${feedbacks.length})`} />
        </Tabs>

        {/* ── Categories Tab ── */}
        {tab === 0 && (
          <CardContent>
            <Box display="flex" justifyContent="flex-end" mb={2}>
              <Button
                startIcon={<AddIcon />}
                variant="contained"
                size="small"
                onClick={() => openCatDialog()}
              >
                Add Category
              </Button>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Support Type</TableCell>
                    <TableCell>
                      <Tooltip title="Set per category via the Edit button">
                        <span>SLA Time Limit</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {catLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <CircularProgress size={24} />
                      </TableCell>
                    </TableRow>
                  ) : categories.filter((c) => !c.isDeleted).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography color="text.secondary" py={2}>
                          No categories configured.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    categories
                      .filter((c) => !c.isDeleted)
                      .map((cat) => (
                        <TableRow key={cat.id} hover>
                          <TableCell>
                            <Typography fontWeight={600}>{cat.name}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={TYPE_LABELS[cat.ticketType] ?? cat.ticketType}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>{cat.slaHours != null ? `${cat.slaHours}h` : '—'}</TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={cat.isActive ? 'Active' : 'Inactive'}
                              color={cat.isActive ? 'success' : 'default'}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Tooltip title="Edit">
                              <IconButton size="small" onClick={() => openCatDialog(cat)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeleteCat(cat.id)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        )}

        {/* ── Keyword Rules Tab ── */}
        {tab === 1 && (
          <CardContent>
            <Box display="flex" justifyContent="flex-end" mb={2}>
              <Button
                startIcon={<AddIcon />}
                variant="contained"
                size="small"
                onClick={() => openRuleDialog()}
              >
                Add Rule
              </Button>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Keyword</TableCell>
                    <TableCell>Target Type</TableCell>
                    <TableCell>Target Category</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rulesLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <CircularProgress size={24} />
                      </TableCell>
                    </TableRow>
                  ) : rules.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <Typography color="text.secondary" py={2}>
                          No keyword rules configured yet.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    rules.map((rule) => (
                      <TableRow key={rule.id} hover>
                        <TableCell>
                          <Box display="flex" gap={0.5} flexWrap="wrap">
                            {(rule.keywords && rule.keywords.length > 0
                              ? rule.keywords
                              : [rule.keyword]
                            ).map((kw, i) => (
                              <Chip key={i} size="small" label={kw} variant="outlined" />
                            ))}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={TYPE_LABELS[rule.targetTicketType] ?? rule.targetTicketType}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>{(rule.targetCategory ?? rule.category)?.name ?? '—'}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={rule.isActive ? 'Active' : 'Inactive'}
                            color={rule.isActive ? 'success' : 'default'}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => openRuleDialog(rule)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteRule(rule.id)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        )}
        {/* ── Escalation Focals Tab ── */}
        {tab === 2 && (
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="body2" color="text.secondary">
                Configure which roles act as escalation focal points per ticket type.
              </Typography>
              <Button
                startIcon={<AddIcon />}
                variant="contained"
                size="small"
                onClick={openFocalDialog}
              >
                Add Focal
              </Button>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Ticket Type</TableCell>
                    {/*<TableCell>Focal User</TableCell>*/}
                    <TableCell>User - Role</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {focalsLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        <CircularProgress size={24} />
                      </TableCell>
                    </TableRow>
                  ) : focals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        <Typography color="text.secondary" py={2}>
                          No escalation focals configured.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    focals.map((f) => (
                      <TableRow key={f.id} hover>
                        <TableCell>
                          <Chip
                            size="small"
                            label={TYPE_LABELS[f.ticketType] ?? f.ticketType}
                            variant="outlined"
                          />
                        </TableCell>
                        {/*<TableCell><Typography variant="body2" fontFamily="monospace">{f.roleValue}</Typography></TableCell>*/}
                        <TableCell>{f.label}</TableCell>
                        <TableCell align="right">
                          <Tooltip title="Remove">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteFocal(f.id)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        )}

        {/* ── Global Settings & SLA Insights Tab ── */}
        {tab === 3 && (
          <CardContent>
            <Typography variant="h6" fontWeight={600} mb={2}>
              Routing Configuration
            </Typography>
            {globalLoading ? (
              <Box textAlign="center" py={4}>
                <CircularProgress size={30} />
              </Box>
            ) : (
              <Stack spacing={3} maxWidth={500} mb={4}>
                <TextField
                  select
                  label="Assignment Strategy"
                  value={globalConfig.assignmentStrategy}
                  onChange={(e) =>
                    setGlobalConfig((prev) => ({ ...prev, assignmentStrategy: e.target.value }))
                  }
                  fullWidth
                  helperText={
                    globalConfig.assignmentStrategy === 'CURRENT_AUTO'
                      ? 'Assigns tickets to the first eligible technician with exactly zero active tickets.'
                      : 'Assigns tickets round-robin to the technician who has waited the longest, up to the defined SLA load capacity cap.'
                  }
                >
                  <MenuItem value="CURRENT_AUTO">Legacy Zero-Active (Current Auto)</MenuItem>
                  <MenuItem value="CAPPED_ROUND_ROBIN">Capped Round-Robin</MenuItem>
                </TextField>

                {globalConfig.assignmentStrategy === 'CAPPED_ROUND_ROBIN' && (
                  <TextField
                    label="Round-Robin SLA Cap (hours)"
                    type="number"
                    value={globalConfig.roundRobinCapHours}
                    onChange={(e) =>
                      setGlobalConfig((prev) => ({
                        ...prev,
                        roundRobinCapHours: Number(e.target.value),
                      }))
                    }
                    fullWidth
                    helperText="A technician will not receive new tickets if the sum of SLA hours of their active tickets exceeds this cap."
                  />
                )}

                <Box>
                  <Button variant="contained" onClick={handleUpdateGlobalConfig}>
                    Save Routing Settings
                  </Button>
                </Box>
              </Stack>
            )}

            <Typography variant="h6" fontWeight={600} mb={2}>
              SLA Recalibration Insights
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Compare configured SLA hours against the actual average resolution time for each
              category.
            </Typography>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Category</TableCell>
                    <TableCell align="right">Resolved Tickets</TableCell>
                    <TableCell align="right">Configured SLA</TableCell>
                    <TableCell align="right">Avg Actual Resolution</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {globalLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <CircularProgress size={24} />
                      </TableCell>
                    </TableRow>
                  ) : slaInsights.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <Typography color="text.secondary" py={2}>
                          No resolution data available.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    slaInsights.map((insight, i) => (
                      <TableRow key={i} hover>
                        <TableCell>
                          <Typography fontWeight={600}>{insight.categoryName}</Typography>
                        </TableCell>
                        <TableCell align="right">{insight.resolvedTicketsCount}</TableCell>
                        <TableCell align="right">
                          {insight.configuredSlaHours > 0
                            ? `${insight.configuredSlaHours.toFixed(1)}h`
                            : 'None'}
                        </TableCell>
                        <TableCell align="right">
                          {insight.avgResolutionHours
                            ? `${insight.avgResolutionHours.toFixed(1)}h`
                            : '—'}
                        </TableCell>
                        <TableCell>
                          {insight.configuredSlaHours > 0 ? (
                            <Chip
                              size="small"
                              label={insight.isFailingSla ? 'Failing' : 'Healthy'}
                              color={insight.isFailingSla ? 'error' : 'success'}
                            />
                          ) : (
                            <Chip size="small" label="Unmonitored" color="default" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        )}

        {/* ── User Feedback Tab ── */}
        {tab === 4 && (
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="body2" color="text.secondary">
                Review and act on user feedback/suggestions. Regular users cannot see this history.
              </Typography>
              <TextField
                select
                size="small"
                value={feedbackFilter}
                onChange={(e) => setFeedbackFilter(e.target.value as any)}
                sx={{ width: 150 }}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="accepted">Accepted</MenuItem>
                <MenuItem value="rejected">Rejected</MenuItem>
              </TextField>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Suggestion</TableCell>
                    <TableCell>Suggested By</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Acted By</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {feedbackLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <CircularProgress size={24} />
                      </TableCell>
                    </TableRow>
                  ) : feedbacks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography color="text.secondary" py={2}>
                          No feedback entries found.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    feedbacks.map((f) => (
                      <TableRow key={f.id} hover>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          {new Date(f.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell sx={{ maxWidth: 400, whiteSpace: 'pre-wrap' }}>
                          {f.suggestion}
                        </TableCell>
                        <TableCell>
                          {f.submitter
                            ? `${f.submitter.firstName || ''} ${f.submitter.lastName || ''}`.trim() ||
                              f.submitter.email
                            : 'Anonymous'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={f.status.toUpperCase()}
                            color={
                              f.status === 'accepted'
                                ? 'success'
                                : f.status === 'rejected'
                                  ? 'error'
                                  : 'default'
                            }
                          />
                        </TableCell>
                        <TableCell>
                          {f.actedBy
                            ? `${f.actedBy.firstName || ''} ${f.actedBy.lastName || ''}`.trim() ||
                              f.actedBy.email
                            : '—'}
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                            {f.status === 'pending' && (
                              <>
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="success"
                                  onClick={() => handleUpdateFeedbackStatus(f.id, 'accepted')}
                                >
                                  Accept
                                </Button>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="error"
                                  onClick={() => handleUpdateFeedbackStatus(f.id, 'rejected')}
                                >
                                  Reject
                                </Button>
                              </>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        )}
      </Card>

      {/* Escalation Focal Dialog */}
      <Dialog
        open={focalDialogOpen}
        onClose={() => setFocalDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Add Escalation Focal</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              select
              label="Ticket Type *"
              value={focalForm.ticketType}
              onChange={(e) => setFocalForm((f) => ({ ...f, ticketType: e.target.value }))}
              fullWidth
            >
              <MenuItem value="all">All Types</MenuItem>
              <MenuItem value="it_support">IT Support</MenuItem>
              <MenuItem value="desktop_support">Desktop Support</MenuItem>
              <MenuItem value="pantawid_ict_support">Pantawid ICT Support</MenuItem>
            </TextField>
            <TextField
              select
              label="Select Focal User *"
              value={focalForm.roleValue}
              onChange={(e) => setFocalForm((f) => ({ ...f, roleValue: e.target.value }))}
              fullWidth
            >
              {availableRoles.length === 0 ? (
                <MenuItem disabled value="">
                  No eligible staff available
                </MenuItem>
              ) : (
                availableRoles.map((r) => (
                  <MenuItem key={r.value} value={r.value}>
                    {r.label}
                  </MenuItem>
                ))
              )}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFocalDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSaveFocal}
            variant="contained"
            disabled={focalSubmitting || !focalForm.roleValue}
          >
            {focalSubmitting ? 'Saving…' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={catDialogOpen} onClose={() => setCatDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{editCat ? 'Edit Category' : 'Add Category'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Category Name *"
              value={catForm.name}
              onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
              fullWidth
            />
            <TextField
              select
              label="Support Type *"
              value={catForm.ticketType}
              onChange={(e) => setCatForm({ ...catForm, ticketType: e.target.value })}
              fullWidth
            >
              <MenuItem value="it_support">IT Support</MenuItem>
              <MenuItem value="desktop_support">Desktop Support</MenuItem>
            </TextField>
            <TextField
              label="SLA Time Limit (hours)"
              type="number"
              inputProps={{ min: 1, max: 168 }}
              value={catForm.slaHours}
              onChange={(e) => setCatForm({ ...catForm, slaHours: e.target.value })}
              fullWidth
              helperText="Leave blank for no SLA"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={catForm.isActive}
                  onChange={(e) => setCatForm({ ...catForm, isActive: e.target.checked })}
                />
              }
              label="Active"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCatDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveCat} variant="contained" disabled={catSubmitting}>
            {catSubmitting ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Keyword Rule Dialog */}
      <Dialog
        open={ruleDialogOpen}
        onClose={() => setRuleDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{editRule ? 'Edit Keyword Rule' : 'Add Keyword Rule'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Box>
              <TextField
                label="Keywords *"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ',') && keywordInput.trim()) {
                    e.preventDefault();
                    const kw = keywordInput.trim().replace(/,+$/, '');
                    if (kw && !ruleForm.keywords.includes(kw)) {
                      setRuleForm((f) => ({ ...f, keywords: [...f.keywords, kw] }));
                    }
                    setKeywordInput('');
                  }
                }}
                fullWidth
                helperText="Type a keyword and press Enter or comma to add. Multiple keywords can map to the same category."
                placeholder="e.g. Internet"
              />
              {ruleForm.keywords.length > 0 && (
                <Box display="flex" gap={0.5} flexWrap="wrap" mt={1}>
                  {ruleForm.keywords.map((kw, i) => (
                    <Chip
                      key={i}
                      label={kw}
                      size="small"
                      onDelete={() =>
                        setRuleForm((f) => ({
                          ...f,
                          keywords: f.keywords.filter((_, j) => j !== i),
                        }))
                      }
                    />
                  ))}
                </Box>
              )}
            </Box>
            <TextField
              select
              label="Target Support Type *"
              value={ruleForm.targetTicketType}
              onChange={(e) =>
                setRuleForm({ ...ruleForm, targetTicketType: e.target.value, targetCategoryId: '' })
              }
              fullWidth
            >
              <MenuItem value="it_support">IT Support</MenuItem>
              <MenuItem value="desktop_support">Desktop Support</MenuItem>
              <MenuItem value="pantawid_ict_support">Pantawid ICT Support</MenuItem>
            </TextField>
            <TextField
              select
              label="Target Category (optional)"
              value={ruleForm.targetCategoryId}
              onChange={(e) => setRuleForm({ ...ruleForm, targetCategoryId: e.target.value })}
              fullWidth
            >
              <MenuItem value="">— None —</MenuItem>
              {filteredCategoriesForRule.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
            <FormControlLabel
              control={
                <Switch
                  checked={ruleForm.isActive}
                  onChange={(e) => setRuleForm({ ...ruleForm, isActive: e.target.checked })}
                />
              }
              label="Active"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRuleDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveRule} variant="contained" disabled={ruleSubmitting}>
            {ruleSubmitting ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
