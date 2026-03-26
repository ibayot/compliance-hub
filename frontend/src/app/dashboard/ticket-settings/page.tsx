'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, Card, CardContent, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Chip, TextField, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions, Stack, CircularProgress,
  Tabs, Tab, Switch, FormControlLabel, Tooltip,
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useAuth } from '@/contexts/AuthContext';
import {
  ticketSettingsApi, TicketCategory, TicketKeywordRule,
} from '@/app/api/references';

const TYPE_LABELS: Record<string, string> = {
  it_support: 'IT Support',
  desktop_support: 'Desktop Support',
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
  const [catForm, setCatForm] = useState({ name: '', ticketType: 'it_support', isActive: true });
  const [catSubmitting, setCatSubmitting] = useState(false);

  // — Keyword Rules —
  const [rules, setRules] = useState<TicketKeywordRule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [editRule, setEditRule] = useState<TicketKeywordRule | null>(null);
  const [ruleForm, setRuleForm] = useState({ keyword: '', targetTicketType: 'it_support', targetCategoryId: '', isActive: true });
  const [ruleSubmitting, setRuleSubmitting] = useState(false);

  const fetchCategories = useCallback(async () => {
    try { setCatLoading(true); setCategories(await ticketSettingsApi.getCategories()); }
    catch { enqueueSnackbar('Failed to load categories', { variant: 'error' }); }
    finally { setCatLoading(false); }
  }, []);

  const fetchRules = useCallback(async () => {
    try { setRulesLoading(true); setRules(await ticketSettingsApi.getKeywordRules()); }
    catch { enqueueSnackbar('Failed to load keyword rules', { variant: 'error' }); }
    finally { setRulesLoading(false); }
  }, []);

  useEffect(() => { fetchCategories(); fetchRules(); }, [fetchCategories, fetchRules]);

  // Category CRUD
  const openCatDialog = (cat?: TicketCategory) => {
    if (cat) {
      setEditCat(cat);
      setCatForm({ name: cat.name, ticketType: cat.ticketType, isActive: cat.isActive });
    } else {
      setEditCat(null);
      setCatForm({ name: '', ticketType: 'it_support', isActive: true });
    }
    setCatDialogOpen(true);
  };

  const handleSaveCat = async () => {
    if (!catForm.name.trim()) { enqueueSnackbar('Name is required', { variant: 'warning' }); return; }
    try {
      setCatSubmitting(true);
      if (editCat) {
        await ticketSettingsApi.updateCategory(editCat.id, catForm);
        enqueueSnackbar('Category updated', { variant: 'success' });
      } else {
        await ticketSettingsApi.createCategory(catForm);
        enqueueSnackbar('Category created', { variant: 'success' });
      }
      setCatDialogOpen(false);
      fetchCategories();
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'Failed to save category', { variant: 'error' });
    } finally { setCatSubmitting(false); }
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
      setRuleForm({ keyword: rule.keyword, targetTicketType: rule.targetTicketType, targetCategoryId: rule.targetCategoryId ?? '', isActive: rule.isActive });
    } else {
      setEditRule(null);
      setRuleForm({ keyword: '', targetTicketType: 'it_support', targetCategoryId: '', isActive: true });
    }
    setRuleDialogOpen(true);
  };

  const handleSaveRule = async () => {
    if (!ruleForm.keyword.trim()) { enqueueSnackbar('Keyword is required', { variant: 'warning' }); return; }
    try {
      setRuleSubmitting(true);
      const payload = { ...ruleForm, targetCategoryId: ruleForm.targetCategoryId || undefined };
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
    } finally { setRuleSubmitting(false); }
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

  const filteredCategoriesForRule = categories.filter(c => c.ticketType === ruleForm.targetTicketType && !c.isDeleted);

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} mb={0.5}>Ticket Settings</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Manage support categories and keyword-based auto-shift rules
      </Typography>

      <Card>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Tab label={`Categories (${categories.filter(c => !c.isDeleted).length})`} />
          <Tab label={`Keyword Rules (${rules.length})`} />
        </Tabs>

        {/* ── Categories Tab ── */}
        {tab === 0 && (
          <CardContent>
            <Box display="flex" justifyContent="flex-end" mb={2}>
              <Button startIcon={<AddIcon />} variant="contained" size="small" onClick={() => openCatDialog()}>Add Category</Button>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Key</TableCell>
                    <TableCell>Support Type</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {catLoading ? (
                    <TableRow><TableCell colSpan={5} align="center"><CircularProgress size={24} /></TableCell></TableRow>
                  ) : categories.filter(c => !c.isDeleted).length === 0 ? (
                    <TableRow><TableCell colSpan={5} align="center"><Typography color="text.secondary" py={2}>No categories configured.</Typography></TableCell></TableRow>
                  ) : categories.filter(c => !c.isDeleted).map(cat => (
                    <TableRow key={cat.id} hover>
                      <TableCell><Typography fontWeight={600}>{cat.name}</Typography></TableCell>
                      <TableCell><Typography variant="body2" color="text.secondary" fontFamily="monospace">{cat.key}</Typography></TableCell>
                      <TableCell><Chip size="small" label={TYPE_LABELS[cat.ticketType] ?? cat.ticketType} variant="outlined" /></TableCell>
                      <TableCell><Chip size="small" label={cat.isActive ? 'Active' : 'Inactive'} color={cat.isActive ? 'success' : 'default'} /></TableCell>
                      <TableCell align="right">
                        <Tooltip title="Edit"><IconButton size="small" onClick={() => openCatDialog(cat)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => handleDeleteCat(cat.id)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        )}

        {/* ── Keyword Rules Tab ── */}
        {tab === 1 && (
          <CardContent>
            <Box display="flex" justifyContent="flex-end" mb={2}>
              <Button startIcon={<AddIcon />} variant="contained" size="small" onClick={() => openRuleDialog()}>Add Rule</Button>
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
                    <TableRow><TableCell colSpan={5} align="center"><CircularProgress size={24} /></TableCell></TableRow>
                  ) : rules.length === 0 ? (
                    <TableRow><TableCell colSpan={5} align="center"><Typography color="text.secondary" py={2}>No keyword rules configured yet.</Typography></TableCell></TableRow>
                  ) : rules.map(rule => (
                    <TableRow key={rule.id} hover>
                      <TableCell><Typography fontFamily="monospace">&quot;{rule.keyword}&quot;</Typography></TableCell>
                      <TableCell><Chip size="small" label={TYPE_LABELS[rule.targetTicketType] ?? rule.targetTicketType} variant="outlined" /></TableCell>
                      <TableCell>{rule.category?.name ?? '—'}</TableCell>
                      <TableCell><Chip size="small" label={rule.isActive ? 'Active' : 'Inactive'} color={rule.isActive ? 'success' : 'default'} /></TableCell>
                      <TableCell align="right">
                        <Tooltip title="Edit"><IconButton size="small" onClick={() => openRuleDialog(rule)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => handleDeleteRule(rule.id)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        )}
      </Card>

      {/* Category Dialog */}
      <Dialog open={catDialogOpen} onClose={() => setCatDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{editCat ? 'Edit Category' : 'Add Category'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField label="Category Name *" value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} fullWidth />
            <TextField select label="Support Type *" value={catForm.ticketType} onChange={e => setCatForm({ ...catForm, ticketType: e.target.value })} fullWidth>
              <MenuItem value="it_support">IT Support</MenuItem>
              <MenuItem value="desktop_support">Desktop Support</MenuItem>
            </TextField>
            <FormControlLabel control={<Switch checked={catForm.isActive} onChange={e => setCatForm({ ...catForm, isActive: e.target.checked })} />} label="Active" />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCatDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveCat} variant="contained" disabled={catSubmitting}>{catSubmitting ? 'Saving…' : 'Save'}</Button>
        </DialogActions>
      </Dialog>

      {/* Keyword Rule Dialog */}
      <Dialog open={ruleDialogOpen} onClose={() => setRuleDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{editRule ? 'Edit Keyword Rule' : 'Add Keyword Rule'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField label="Keyword *" value={ruleForm.keyword} onChange={e => setRuleForm({ ...ruleForm, keyword: e.target.value })} fullWidth helperText="Text to match in subject/description (case-insensitive)" />
            <TextField select label="Target Support Type *" value={ruleForm.targetTicketType} onChange={e => setRuleForm({ ...ruleForm, targetTicketType: e.target.value, targetCategoryId: '' })} fullWidth>
              <MenuItem value="it_support">IT Support</MenuItem>
              <MenuItem value="desktop_support">Desktop Support</MenuItem>
            </TextField>
            <TextField select label="Target Category (optional)" value={ruleForm.targetCategoryId} onChange={e => setRuleForm({ ...ruleForm, targetCategoryId: e.target.value })} fullWidth>
              <MenuItem value="">— None —</MenuItem>
              {filteredCategoriesForRule.map(c => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))}
            </TextField>
            <FormControlLabel control={<Switch checked={ruleForm.isActive} onChange={e => setRuleForm({ ...ruleForm, isActive: e.target.checked })} />} label="Active" />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRuleDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveRule} variant="contained" disabled={ruleSubmitting}>{ruleSubmitting ? 'Saving…' : 'Save'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
