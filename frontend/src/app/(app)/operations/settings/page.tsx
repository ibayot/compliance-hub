'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSse } from '@/lib/utils/useSse';
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
  Divider,
  CircularProgress,
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Checkbox,
  FormGroup,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, ExpandMore as ExpandMoreIcon, WarningAmber as WarningIcon, ErrorOutline as ErrorIcon, CheckCircleOutline as CheckIcon } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useAuth } from '@/contexts/AuthContext';
import {
  ticketSettingsApi,
  knowledgeBaseApi,
  TicketCategory,
  TicketKeywordRule,
  TicketIssueType,
  EscalationFocalConfig,
  ticketsApi,
} from '@/app/api/references';
import { feedbackApi, Feedback } from '@/lib/api/feedback';
import { UserRole } from '@/lib/types/auth';

const TYPE_LABELS: Record<string, string> = {
  it_support: 'IT Support',
  desktop_support: 'Desktop Support',
  pantawid_ict_support: 'Pantawid ICT Support',
};

export default function TicketSettingsPage() {
  const { user, myCap } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const canManageGlobalSettings = false;
  const globalSettingsTabIndex = canManageGlobalSettings ? 4 : -1;
  const userFeedbackTabIndex = canManageGlobalSettings ? 5 : 4;

  const [tab, setTab] = useState(0);

  // — Categories —
  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [catLoading, setCatLoading] = useState(true);
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [editCat, setEditCat] = useState<TicketCategory | null>(null);
  const [catForm, setCatForm] = useState<{
    name: string;
    isIt: boolean;
    isDesktop: boolean;
    isPantawid: boolean;
    isActive: boolean;
  }>({ name: '', isIt: false, isDesktop: false, isPantawid: false, isActive: true });
  const [categorySearch, setCategorySearch] = useState('');
  const [catSubmitting, setCatSubmitting] = useState(false);
  const [deleteCatId, setDeleteCatId] = useState<string | null>(null);

  // — Keyword Rules —
  const [rules, setRules] = useState<TicketKeywordRule[]>([]);
  const [deleteRuleId, setDeleteRuleId] = useState<string | null>(null);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [editRule, setEditRule] = useState<TicketKeywordRule | null>(null);
  const [ruleForm, setRuleForm] = useState<{
    keywords: string[];
    targetTicketType: string;
    targetCategoryId: string;
    targetIssueTypeId: string;
    isActive: boolean;
  }>({ keywords: [], targetTicketType: 'it_support', targetCategoryId: '', targetIssueTypeId: '', isActive: true });
  const [keywordInput, setKeywordInput] = useState('');
  const [ruleSubmitting, setRuleSubmitting] = useState(false);
  const [ruleSearch, setRuleSearch] = useState("");

  // — Specific Issues —
  const [issues, setIssues] = useState<TicketIssueType[]>([]);
  const [issuesLoading, setIssuesLoading] = useState(true);
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [deleteIssueId, setDeleteIssueId] = useState<string | null>(null);
  const [editIssue, setEditIssue] = useState<TicketIssueType | null>(null);
  const [issueForm, setIssueForm] = useState<{
    name: string;
    description: string;
    categoryId: string;
    slaHours: string;
    allowablePauseHours: string;
    isActive: boolean;
    maxFreezeHours: string;
  }>({
    name: '',
    description: '',
    categoryId: '',
    slaHours: '24',
    allowablePauseHours: '48',
    isActive: true,
    maxFreezeHours: '',
  });
  const [issueSearch, setIssueSearch] = useState('');
  const [issueSubmitting, setIssueSubmitting] = useState(false);

  // — Escalation Focals —
  const [focals, setFocals] = useState<EscalationFocalConfig[]>([]);
  const [focalsLoading, setFocalsLoading] = useState(true);
  const [focalDialogOpen, setFocalDialogOpen] = useState(false);
  const [deleteFocalId, setDeleteFocalId] = useState<number | null>(null);
  const [availableUsers, setAvailableUsers] = useState<{ value: string; label: string }[]>([]);
  const [focalForm, setFocalForm] = useState<{ ticketType: string; userId: string }>({
    ticketType: 'all',
    userId: '',
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

  const silentFetchFeedbacks = useCallback(async () => {
    try {
      const res = await feedbackApi.list(feedbackFilter);
      setFeedbacks(res.data);
    } catch {
      //
    }
  }, [feedbackFilter]);

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
    autoCloseDays: number;
    smtpHost?: string | null;
    smtpPort?: number | null;
    smtpUser?: string | null;
    smtpPass?: string | null;
    smtpFrom?: string | null;
    smtpFromName?: string | null;
    primarySmtpDailyLimit?: number;
    scheduleMode?: string;
    officeClockin?: string;
    officeClockout?: string;
    cwwClockinStart?: string;
    cwwClockinEnd?: string;
    cwwClockoutStart?: string;
    cwwClockoutEnd?: string;
    isFlagCeremonyPaused?: boolean;
    isEmailNotificationsEnabled?: boolean;
    emailTestOverride?: string | null;
  }>({
    assignmentStrategy: 'CURRENT_AUTO', roundRobinCapHours: 80, autoCloseDays: 3, smtpHost: '', smtpPort: 587, smtpUser: '', smtpPass: '', smtpFrom: '', smtpFromName: '', primarySmtpDailyLimit: 2000,
    scheduleMode: 'OFFICE_HOURS',
    officeClockin: '08:00:00',
    officeClockout: '17:00:00',
    cwwClockinStart: '07:00:00',
    cwwClockinEnd: '08:00:00',
    cwwClockoutStart: '18:00:00',
    cwwClockoutEnd: '19:00:00',
    isFlagCeremonyPaused: false,
    isEmailNotificationsEnabled: true,
    emailTestOverride: '',
  });

  const [globalLoading, setGlobalLoading] = useState(true);
  const [smtpTestLoading, setSmtpTestLoading] = useState(false);
  const [smtpTestEmail, setSmtpTestEmail] = useState('');

  const fetchGlobalData = useCallback(async () => {
    if (!canManageGlobalSettings) return;
    try {
      setGlobalLoading(true);
      const [config] = await Promise.all([
        ticketSettingsApi.getGlobalConfig(),
      ]);
      setGlobalConfig(config);
    } catch {
      enqueueSnackbar('Failed to load global config', { variant: 'error' });
    } finally {
      setGlobalLoading(false);
    }
  }, [enqueueSnackbar, canManageGlobalSettings]);

  useEffect(() => {
    if (canManageGlobalSettings) {
      fetchGlobalData();
    }
  }, [canManageGlobalSettings, fetchGlobalData]);



  const handleUpdateGlobalConfig = async () => {
    try {
      const { id, createdAt, updatedAt, primarySmtpSentToday, primarySmtpLastSentDate, ...payload } = globalConfig as any;
      await ticketSettingsApi.updateGlobalConfig(payload);
      enqueueSnackbar('Global settings updated', { variant: 'success' });
      fetchGlobalData();
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'Failed to update global settings', {
        variant: 'error',
      });
    }
  };

  const handleTestSmtp = async () => {
    if (!smtpTestEmail) {
      enqueueSnackbar('Please enter an email address to test', { variant: 'warning' });
      return;
    }
    setSmtpTestLoading(true);
    try {
      const res = await ticketSettingsApi.testEmail(smtpTestEmail);
      enqueueSnackbar(res.message, { variant: res.sent ? 'success' : 'error' });
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'Test email failed', { variant: 'error' });
    } finally {
      setSmtpTestLoading(false);
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
      const users = await ticketSettingsApi.getAvailableEscalationUsers();
      setAvailableUsers(users);
    } catch {
      setAvailableUsers([]);
    }
    setFocalForm({ ticketType: 'all', userId: '' });
    setFocalDialogOpen(true);
  };

  const handleSaveFocal = async () => {
    if (!focalForm.userId) {
      enqueueSnackbar('Select a user', { variant: 'warning' });
      return;
    }
    try {
      setFocalSubmitting(true);
      const userLabel =
        availableUsers.find((r) => r.value === focalForm.userId)?.label ?? focalForm.userId;
      await ticketSettingsApi.addEscalationFocal({
        ticketType: focalForm.ticketType,
        userId: Number(focalForm.userId),
        label: userLabel,
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

  const confirmDeleteFocal = async () => {
    if (!deleteFocalId) return;
    try {
      await ticketSettingsApi.removeEscalationFocal(deleteFocalId);
      enqueueSnackbar('Escalation focal removed', { variant: 'success' });
      setDeleteFocalId(null);
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
  }, [enqueueSnackbar]);

  const fetchIssues = useCallback(async () => {
    try {
      setIssuesLoading(true);
      setIssues(await ticketSettingsApi.getIssueTypes());
    } catch {
      enqueueSnackbar('Failed to load issue types', { variant: 'error' });
    } finally {
      setIssuesLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchCategories();
    fetchRules();
    fetchIssues();
    fetchFocals();
    fetchFeedbacks();
    fetchGlobalData();
  }, [fetchCategories, fetchRules, fetchFocals, fetchFeedbacks, fetchGlobalData]);
  useSse(['TICKET_UPDATED', 'GLOBAL_SETTINGS_UPDATED'], silentFetchFeedbacks);

  // Category CRUD
  const openCatDialog = (cat?: TicketCategory) => {
    if (cat) {
      setEditCat(cat);
      setCatForm({
        name: cat.name,
        isIt: cat.isIt,
        isDesktop: cat.isDesktop,
        isPantawid: cat.isPantawid,
        isActive: cat.isActive,
      });
    } else {
      setEditCat(null);
      setCatForm({ name: '', isIt: false, isDesktop: false, isPantawid: false, isActive: true });
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
      const catPayload = {
        name: catForm.name,
        isIt: catForm.isIt,
        isDesktop: catForm.isDesktop,
        isPantawid: catForm.isPantawid,
        isActive: catForm.isActive,
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

  const confirmDeleteCat = async () => {
    if (!deleteCatId) return;
    try {
      await ticketSettingsApi.deleteCategory(deleteCatId);
      enqueueSnackbar('Category removed', { variant: 'success' });
      fetchCategories();
      setDeleteCatId(null);
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
        targetIssueTypeId: rule.targetIssueTypeId ?? '',
        isActive: rule.isActive,
      });
    } else {
      setEditRule(null);
      setRuleForm({
        keywords: [],
        targetTicketType: 'it_support',
        targetCategoryId: '',
        targetIssueTypeId: '',
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
    if (!ruleForm.targetCategoryId) {
      enqueueSnackbar('Target Category is required', { variant: 'warning' });
      return;
    }
    if (!ruleForm.targetIssueTypeId) {
      enqueueSnackbar('Target Issue is required', { variant: 'warning' });
      return;
    }
    try {
      setRuleSubmitting(true);
      const payload = {
        keywords: ruleForm.keywords,
        targetTicketType: ruleForm.targetTicketType,
        targetCategoryId: ruleForm.targetCategoryId || null,
        targetIssueTypeId: ruleForm.targetIssueTypeId || null,
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

  const confirmDeleteRule = async () => {
    if (!deleteRuleId) return;
    try {
      await ticketSettingsApi.deleteKeywordRule(deleteRuleId);
      enqueueSnackbar('Rule deleted', { variant: 'success' });
      setDeleteRuleId(null);
      fetchRules();
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'Failed', { variant: 'error' });
    }
  };

  // Issue CRUD
  const openIssueDialog = (issue?: TicketIssueType) => {
    if (issue) {
      setEditIssue(issue);
      setIssueForm({
        name: issue.name,
        description: issue.description || '',
        categoryId: String(issue.categoryId || issue.category?.id || issue.category_id || ''),
        slaHours: issue.slaHours != null ? String(issue.slaHours) : '',
        allowablePauseHours: String(issue.allowablePauseHours ?? 48),
        isActive: issue.isActive,
        maxFreezeHours: issue.maxFreezeHours != null ? String(issue.maxFreezeHours) : '',
      });
    } else {
      setEditIssue(null);
      setIssueForm({
        name: '',
        description: '',
        categoryId: '',
        slaHours: '24',
        allowablePauseHours: '48',
        isActive: true,
        maxFreezeHours: '',
      });
    }
    setIssueDialogOpen(true);
  };

  const handleSaveIssue = async () => {
    if (!issueForm.name.trim()) return enqueueSnackbar('Name required', { variant: 'error' });
    if (!issueForm.categoryId) return enqueueSnackbar('Category required', { variant: 'error' });
    
    const parsedSla = issueForm.slaHours ? Number(issueForm.slaHours) : null;
    if (parsedSla === null || parsedSla <= 0 || parsedSla > 168) {
      enqueueSnackbar('SLA must be between 1 and 168 hours', { variant: 'warning' });
      return;
    }

    const parsedPause = issueForm.allowablePauseHours ? Number(issueForm.allowablePauseHours) : 48;
    const parsedFreeze = issueForm.maxFreezeHours ? Number(issueForm.maxFreezeHours) : null;
    if (parsedPause < 0 || parsedPause > 168) {
      enqueueSnackbar('Allowable Pause Hours must be between 0 and 168', { variant: 'warning' });
      return;
    }

    setIssueSubmitting(true);
    try {
      const payload = {
        ...issueForm,
        slaHours: parsedSla,
        allowablePauseHours: parsedPause,
        maxFreezeHours: parsedFreeze
      };
      if (editIssue) {
        await ticketSettingsApi.updateIssueType(editIssue.id, payload);
        enqueueSnackbar('Issue updated', { variant: 'success' });
      } else {
        await ticketSettingsApi.createIssueType(payload);
        enqueueSnackbar('Issue created', { variant: 'success' });
      }
      setIssueDialogOpen(false);
      fetchIssues();
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'Failed to save issue', { variant: 'error' });
    } finally {
      setIssueSubmitting(false);
    }
  };

  const confirmDeleteIssue = async () => {
    if (!deleteIssueId) return;
    try {
      await ticketSettingsApi.deleteIssueType(deleteIssueId);
      enqueueSnackbar('Issue deleted', { variant: 'success' });
      setDeleteIssueId(null);
      fetchIssues();
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'Failed', { variant: 'error' });
    }
  };

  const filteredCategoriesForRule = categories.filter(
    (c) => {
      if (c.isDeleted) return false;
      if (ruleForm.targetTicketType === 'it_support') return c.isIt;
      if (ruleForm.targetTicketType === 'desktop_support') return c.isDesktop;
      if (ruleForm.targetTicketType === 'pantawid_ict_support') return c.isPantawid;
      return false;
    }
  );

  const filteredIssuesForRule = issues.filter(
    (iss) => ruleForm.targetCategoryId && (iss.categoryId || iss.category_id) === ruleForm.targetCategoryId && !iss.isDeleted,
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
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label={`Categories (${categories.filter((c) => !c.isDeleted).length})`} />
          <Tab label={`Issues (${issues.length})`} />
          <Tab label={`Keyword Rules (${rules.length})`} />
          <Tab label={`Escalation Focals (${focals.length})`} />
          {canManageGlobalSettings && <Tab label={`Global Settings`} />}
          <Tab label={`User Feedback (${feedbacks.length})`} />
        </Tabs>

        {/* ── Categories Tab ── */}
        {tab === 0 && (
          <CardContent>
            <Box display="flex" justifyContent="space-between" mb={2}>
              <TextField
                placeholder="Search categories..."
                size="small"
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                  inputProps={{ maxLength: 100 }}
                sx={{ minWidth: 300 }}
              />
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
                    <TableCell>Support Types</TableCell>
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
                      .filter((c) => {
                      if (c.isDeleted) return false;
                      const s = categorySearch.trim().toLowerCase();
                      if (!s) return true;
                      if (c.name.toLowerCase().includes(s)) return true;
                      if (c.isIt && "it support".includes(s)) return true;
                      if (c.isDesktop && "desktop support".includes(s)) return true;
                      if (c.isPantawid && "pantawid".includes(s)) return true;
                      return false;
                    })
                      .map((cat) => (
                        <TableRow key={cat.id} hover>
                          <TableCell>
                            <Typography fontWeight={600}>{cat.name}</Typography>
                          </TableCell>
                          <TableCell>
                            <Box display="flex" gap={0.5} flexWrap="wrap">
                              {cat.isIt && <Chip size="small" label="IT Support" variant="outlined" />}
                              {cat.isDesktop && <Chip size="small" label="Desktop Support" variant="outlined" />}
                              {cat.isPantawid && <Chip size="small" label="Pantawid ICT Support" variant="outlined" />}
                            </Box>
                          </TableCell>
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
                                onClick={() => setDeleteCatId(cat.id)}
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

        {/* —— Issues Tab —— */}
        {tab === 1 && (
          <CardContent>
            <Box display="flex" justifyContent="space-between" mb={2}>
              <TextField
                placeholder="Search issues..."
                size="small"
                value={issueSearch}
                onChange={(e) => setIssueSearch(e.target.value)}
                  inputProps={{ maxLength: 100 }}
                sx={{ minWidth: 300 }}
              />
              <Button
                startIcon={<AddIcon />}
                variant="contained"
                size="small"
                onClick={() => openIssueDialog()}
              >
                Add Issue
              </Button>
            </Box>

            {issuesLoading ? (
              <Box display="flex" justifyContent="center" p={4}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell><strong>Category</strong></TableCell>
                      <TableCell><strong>Name</strong></TableCell>
                      <TableCell>
                        <Tooltip title="Set per issue via the Edit button">
                          <strong>SLA Time Limit</strong>
                        </Tooltip>
                      </TableCell>
                      <TableCell><strong>Allowable Pause Hours</strong></TableCell>
                      <TableCell><strong>Status</strong></TableCell>
                      <TableCell align="right"><strong>Actions</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {issues
                        .filter((iss) => (issueSearch.trim() === "" || iss.name.toLowerCase().includes(issueSearch.toLowerCase()) || (iss.category && iss.category.name && iss.category.name.toLowerCase().includes(issueSearch.toLowerCase()))))
                        .map((iss) => (
                      <TableRow key={iss.id} hover>
                        <TableCell>{iss.category?.name || <Typography variant="caption" color="error">Unlinked</Typography>}</TableCell>
                        <TableCell>
                          <Typography variant="body2">{iss.name}</Typography>
                          {iss.description && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              {iss.description}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>{iss.slaHours != null ? `${iss.slaHours}h` : '—'}</TableCell>
                        <TableCell>{iss.allowablePauseHours ?? 48}h</TableCell>
                        <TableCell>{iss.maxFreezeHours != null ? `${iss.maxFreezeHours}h` : 'Unlimited'}</TableCell>
                        <TableCell>
                          <Chip
                            label={iss.isActive ? 'Active' : 'Inactive'}
                            color={iss.isActive ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton size="small" color="primary" onClick={() => openIssueDialog(iss)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={() => setDeleteIssueId(iss.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                    {issues.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                          No issues found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        )}

        {/* ── Keyword Rules Tab ── */}
        {tab === 2 && (
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <TextField
                placeholder="Search rules..."
                size="small"
                value={ruleSearch}
                onChange={(e) => setRuleSearch(e.target.value)}
                sx={{ minWidth: 300, mr: 2 }}
                inputProps={{ maxLength: 100 }}
              />
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
                    <TableCell>Support Type</TableCell>
                    <TableCell>Target Category</TableCell>
                    <TableCell>Target Issue</TableCell>
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
                    rules.filter(rule => {
                      const s = ruleSearch.trim().toLowerCase();
                      if (!s) return true;
                      const kws = rule.keywords || [rule.keyword];
                      const kwMatch = kws.some(k => k.toLowerCase().includes(s));
                      const typeMatch = rule.targetTicketType && TYPE_LABELS[rule.targetTicketType] && TYPE_LABELS[rule.targetTicketType].toLowerCase().includes(s);
                      const catMatch = (rule.targetCategory ?? rule.category)?.name?.toLowerCase().includes(s);
                      const issueMatch = rule.targetIssueType?.name?.toLowerCase().includes(s);
                      return kwMatch || typeMatch || catMatch || issueMatch;
                    }).map((rule) => (
                      <TableRow key={rule.id} hover sx={{ '& td, & th': { height: 'auto', py: 1, verticalAlign: 'middle' } }}>
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
                        <TableCell>{rule.targetIssueType?.name ?? "—"}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={rule.isActive ? 'Active' : 'Inactive'}
                            color={rule.isActive ? 'success' : 'default'}
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                          <Box display="flex" justifyContent="flex-end" flexWrap="nowrap">
                            <Tooltip title="Edit">
                              <IconButton size="small" onClick={() => openRuleDialog(rule)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => setDeleteRuleId(rule.id)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
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
        {tab === 3 && (
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
                              onClick={() => setDeleteFocalId(f.id)}
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
        {canManageGlobalSettings && tab === globalSettingsTabIndex && (
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
                  <MenuItem value="CURRENT_AUTO">
                    Zero-Active {globalConfig.assignmentStrategy === 'CURRENT_AUTO' ? ' - Active' : ''}
                  </MenuItem>
                  <MenuItem value="CAPPED_ROUND_ROBIN">
                    Capped Round-Robin {globalConfig.assignmentStrategy === 'CAPPED_ROUND_ROBIN' ? ' - Active' : ''}
                  </MenuItem>
                </TextField>

                <TextField
                  label="Auto Close (Days)"
                  type="number"
                  value={globalConfig.autoCloseDays}
                  onChange={(e) =>
                    setGlobalConfig((prev) => ({
                      ...prev,
                      autoCloseDays: Number(e.target.value),
                    }))
                  }
                  fullWidth
                  helperText="Number of days before a resolved ticket is automatically closed."
                />

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

            <Typography variant="h6" fontWeight={600} mb={2} mt={4}>
              Work Hours & Schedule
            </Typography>
            {globalLoading ? (
              <Box textAlign="center" py={4}>
                <CircularProgress size={30} />
              </Box>
            ) : (
              <Stack spacing={3} maxWidth={500} mb={4}>
                <TextField
                  select
                  label="Schedule Mode"
                  value={globalConfig.scheduleMode || 'OFFICE_HOURS'}
                  onChange={(e) => setGlobalConfig((prev) => ({ ...prev, scheduleMode: e.target.value }))}
                  fullWidth
                >
                  <MenuItem value="OFFICE_HOURS">
                    Standard Office Hours {globalConfig.scheduleMode === 'OFFICE_HOURS' ? ' - Active' : ''}
                  </MenuItem>
                  <MenuItem value="CWW">
                    Compressed Work Week (CWW) {globalConfig.scheduleMode === 'CWW' ? ' - Active' : ''}
                  </MenuItem>
                </TextField>

                {globalConfig.scheduleMode === 'OFFICE_HOURS' && (
                  <>
                    <TextField
                      label="Office Clock-in"
                      type="time"
                      value={globalConfig.officeClockin || '08:00:00'}
                      onChange={(e) => setGlobalConfig((prev) => ({ ...prev, officeClockin: e.target.value }))}
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                      label="Office Clock-out"
                      type="time"
                      value={globalConfig.officeClockout || '17:00:00'}
                      onChange={(e) => setGlobalConfig((prev) => ({ ...prev, officeClockout: e.target.value }))}
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                    />
                  </>
                )}

                {globalConfig.scheduleMode === 'CWW' && (
                  <>
                    <TextField
                      label="CWW Clock-in Start"
                      type="time"
                      value={globalConfig.cwwClockinStart || '07:00:00'}
                      onChange={(e) => setGlobalConfig((prev) => ({ ...prev, cwwClockinStart: e.target.value }))}
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                      label="CWW Clock-in End"
                      type="time"
                      value={globalConfig.cwwClockinEnd || '08:00:00'}
                      onChange={(e) => setGlobalConfig((prev) => ({ ...prev, cwwClockinEnd: e.target.value }))}
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                      label="CWW Clock-out Start"
                      type="time"
                      value={globalConfig.cwwClockoutStart || '18:00:00'}
                      onChange={(e) => setGlobalConfig((prev) => ({ ...prev, cwwClockoutStart: e.target.value }))}
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                      label="CWW Clock-out End"
                      type="time"
                      value={globalConfig.cwwClockoutEnd || '19:00:00'}
                      onChange={(e) => setGlobalConfig((prev) => ({ ...prev, cwwClockoutEnd: e.target.value }))}
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                    />
                  </>
                )}

                <Box>
                  <Button variant="contained" onClick={handleUpdateGlobalConfig}>
                    Save Work Hours
                  </Button>
                </Box>
              </Stack>
            )}

            {false && (
              <>
                <Typography variant="h6" fontWeight={600} mb={2} mt={4}>
                  SMTP Configuration
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={3}>
                  Manage corporate email credentials for outbound ticket notifications.
                </Typography>
                {globalLoading ? (
                  <Box textAlign="center" py={4}>
                    <CircularProgress size={30} />
                  </Box>
                ) : (
                  <Stack spacing={3} maxWidth={500} mb={4}>
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                      <Typography variant="subtitle1" fontWeight={600}>Enable Outbound Emails</Typography>
                      <Switch
                        checked={globalConfig.isEmailNotificationsEnabled ?? true}
                        onChange={(e) => setGlobalConfig((prev) => ({ ...prev, isEmailNotificationsEnabled: e.target.checked }))}
                        color="primary"
                      />
                    </Box>

                    {globalConfig.isEmailNotificationsEnabled && (
                      <TextField
                        label="Test Override Email"
                        value={globalConfig.emailTestOverride || ''}
                        onChange={(e) => setGlobalConfig((prev) => ({ ...prev, emailTestOverride: e.target.value }))}
                          inputProps={{ maxLength: 100 }}
                        fullWidth
                        helperText="If set, all system emails will be rerouted to this address. Leave blank for normal behavior."
                      />
                    )}

                    <Divider sx={{ my: 2 }} />

                    <TextField
                      label="SMTP Host"
                      value={globalConfig.smtpHost || ''}
                      onChange={(e) => setGlobalConfig((prev) => ({ ...prev, smtpHost: e.target.value }))}
                        inputProps={{ maxLength: 100 }}
                      fullWidth
                    />
                    <TextField
                      label="SMTP Port"
                      type="number"
                      value={globalConfig.smtpPort || ''}
                      onChange={(e) => setGlobalConfig((prev) => ({ ...prev, smtpPort: Number(e.target.value) }))}
                      fullWidth
                    />
                    <TextField
                      label="SMTP Username"
                      value={globalConfig.smtpUser || ''}
                      onChange={(e) => setGlobalConfig((prev) => ({ ...prev, smtpUser: e.target.value }))}
                        inputProps={{ maxLength: 100 }}
                      fullWidth
                    />
                    <TextField
                      label="SMTP Password"
                      type="password"
                      value={globalConfig.smtpPass || ''}
                      onChange={(e) => setGlobalConfig((prev) => ({ ...prev, smtpPass: e.target.value }))}
                        inputProps={{ maxLength: 100 }}
                      fullWidth
                      helperText="Leave blank to keep existing password"
                    />
                    <TextField
                      label="From Email Address"
                      value={globalConfig.smtpFrom || ''}
                      onChange={(e) => setGlobalConfig((prev) => ({ ...prev, smtpFrom: e.target.value }))}
                        inputProps={{ maxLength: 100 }}
                      fullWidth
                    />
                    <TextField
                      label="From Name"
                      value={globalConfig.smtpFromName || ''}
                      onChange={(e) => setGlobalConfig((prev) => ({ ...prev, smtpFromName: e.target.value }))}
                        inputProps={{ maxLength: 100 }}
                      fullWidth
                    />
                    <Box display="flex" gap={2} alignItems="flex-start">
                      <Button variant="contained" onClick={handleUpdateGlobalConfig}>
                        Save SMTP Settings
                      </Button>
                    </Box>
                    <Box display="flex" gap={2} alignItems="center" mt={2} p={2} border={1} borderColor="divider" borderRadius={1}>
                      <TextField
                        size="small"
                        label="Test Recipient Email"
                        value={smtpTestEmail}
                        onChange={(e) => setSmtpTestEmail(e.target.value)}
                        sx={{ flexGrow: 1 }}
                      />
                      <Button
                        variant="outlined"
                        onClick={handleTestSmtp}
                        disabled={smtpTestLoading}
                      >
                        {smtpTestLoading ? 'Sending...' : 'Test Connection'}
                      </Button>
                    </Box>
                  </Stack>
                )}
              </>
            )}


          </CardContent>
        )}

        {/* ── User Feedback Tab ── */}
        {tab === userFeedbackTabIndex && (
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

      {/* Issue Dialog */}
      <Dialog
        open={issueDialogOpen}
        onClose={() => setIssueDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{editIssue ? 'Edit Issue' : 'Add Issue'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              select
              label="Category *"
              fullWidth
              size="small"
              value={issueForm.categoryId}
              onChange={(e) => setIssueForm({ ...issueForm, categoryId: e.target.value })}
            >
              {categories.filter(c => !c.isDeleted).map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Issue Name"
              fullWidth
              size="small"
              value={issueForm.name}
              onChange={(e) => setIssueForm({ ...issueForm, name: e.target.value })}
                inputProps={{ maxLength: 150 }}
            />
            <TextField
              label="Description (Optional)"
              fullWidth
              size="small"
              multiline
              rows={2}
              value={issueForm.description}
              onChange={(e) => setIssueForm({ ...issueForm, description: e.target.value })}
            />
            <TextField
              label="SLA Time Limit (hours)"
              type="text"
              inputMode="numeric"
              inputProps={{ min: 1, max: 99, maxLength: 2 }}
              fullWidth
              size="small"
              value={issueForm.slaHours}
              onChange={(e) => {
                let val = e.target.value.replace(/\D/g, '');
                if (val !== '' && Number(val) > 99) val = '99';
                setIssueForm({ ...issueForm, slaHours: val });
              }}
              helperText="Optional. Enter hours > 0."
            />
            <TextField
              label="Allowable Pause Hours *"
                type="text"
                inputMode="numeric"
                inputProps={{ min: 0, max: 120, maxLength: 3 }}
              fullWidth
              size="small"
              value={issueForm.allowablePauseHours}
              onChange={(e) => {
                let val = e.target.value.replace(/\D/g, '');
                if (val !== '' && Number(val) > 120) val = '120';
                setIssueForm({ ...issueForm, allowablePauseHours: val })
              }}
              helperText="Maximum allowed cumulative pause hours before SLA pause is rejected."
            />
            <TextField
              label="Max Freeze Hours"
              type="text"
              inputMode="numeric"
              inputProps={{ min: 1, max: 720, maxLength: 3 }}
              fullWidth
              size="small"
              value={issueForm.maxFreezeHours}
              onChange={(e) => {
                let val = e.target.value.replace(/\D/g, '');
                if (val !== '' && Number(val) > 720) val = '720';
                setIssueForm({ ...issueForm, maxFreezeHours: val });
              }}
              helperText="Optional. Max hours a ticket can stay frozen. Leave blank for unlimited."
            />
            <FormControlLabel
              control={
                <Switch
                  checked={issueForm.isActive}
                  onChange={(e) => setIssueForm({ ...issueForm, isActive: e.target.checked })}
                />
              }
              label="Active"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIssueDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveIssue} variant="contained" disabled={issueSubmitting}>
            {issueSubmitting ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

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
              value={focalForm.userId}
              onChange={(e) => setFocalForm((f) => ({ ...f, userId: e.target.value }))}
              fullWidth
            >
              {availableUsers.length === 0 ? (
                <MenuItem disabled value="">
                  No eligible staff available
                </MenuItem>
              ) : (
                availableUsers.map((r) => (
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
            disabled={focalSubmitting || !focalForm.userId}
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
                inputProps={{ maxLength: 150 }}
              fullWidth
            />
            <Typography variant="subtitle2" color="text.secondary">
              Support Types
            </Typography>
            <FormGroup>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={catForm.isIt}
                    onChange={(e) => setCatForm({ ...catForm, isIt: e.target.checked })}
                  />
                }
                label="IT Support"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={catForm.isDesktop}
                    onChange={(e) => setCatForm({ ...catForm, isDesktop: e.target.checked })}
                  />
                }
                label="Desktop Support"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={catForm.isPantawid}
                    onChange={(e) => setCatForm({ ...catForm, isPantawid: e.target.checked })}
                  />
                }
                label="Pantawid ICT Support"
              />
            </FormGroup>
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
                  inputProps={{ maxLength: 50 }}
                  error={keywordInput.length > 50}
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
              label="Support Type *"
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
              label="Target Category *"
              value={ruleForm.targetCategoryId}
              onChange={(e) => setRuleForm({ ...ruleForm, targetCategoryId: e.target.value })}
              fullWidth
            >
              {filteredCategoriesForRule.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Target Issue *"
              value={ruleForm.targetIssueTypeId}
              onChange={(e) => setRuleForm({ ...ruleForm, targetIssueTypeId: e.target.value })}
              fullWidth
              disabled={!ruleForm.targetCategoryId}
            >
              {filteredIssuesForRule.map((iss) => (
                <MenuItem key={iss.id} value={iss.id}>
                  {iss.name}
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

      {/* Remove Category Dialog */}
      <Dialog open={!!deleteCatId} onClose={() => setDeleteCatId(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Remove Category</DialogTitle>
        <DialogContent>
          Are you sure you want to remove this category?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteCatId(null)}>Cancel</Button>
          <Button onClick={confirmDeleteCat} variant="contained" color="error">
            Remove
          </Button>
        </DialogActions>
      </Dialog>

      {/* Remove Issue Dialog */}
      <Dialog open={!!deleteIssueId} onClose={() => setDeleteIssueId(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Remove Issue</DialogTitle>
        <DialogContent>
          Are you sure you want to remove this issue type?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteIssueId(null)}>Cancel</Button>
          <Button onClick={confirmDeleteIssue} variant="contained" color="error">
            Remove
          </Button>
        </DialogActions>
      </Dialog>

      {/* Remove Rule Dialog */}
      <Dialog open={!!deleteRuleId} onClose={() => setDeleteRuleId(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Remove Keyword Rule</DialogTitle>
        <DialogContent>
          Are you sure you want to delete this keyword rule?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteRuleId(null)}>Cancel</Button>
          <Button onClick={confirmDeleteRule} variant="contained" color="error">
            Remove
          </Button>
        </DialogActions>
      </Dialog>

      {/* Remove Focal Dialog */}
      <Dialog open={!!deleteFocalId} onClose={() => setDeleteFocalId(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Remove Escalation Focal</DialogTitle>
        <DialogContent>
          Are you sure you want to remove this escalation focal configuration?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteFocalId(null)}>Cancel</Button>
          <Button onClick={confirmDeleteFocal} variant="contained" color="error">
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
