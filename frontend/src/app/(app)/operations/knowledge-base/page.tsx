'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  CircularProgress,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  Paper,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  HelpOutline as HelpIcon,
  Add as AddIcon,
  FormatBold as BoldIcon,
  FormatItalic as ItalicIcon,
  Title as HeadingIcon,
  FormatListBulleted as BulletListIcon,
  FormatListNumbered as NumberedListIcon,
  Link as LinkIcon,
  Code as CodeIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useAuth } from '@/contexts/AuthContext';
import { knowledgeBaseApi } from '@/app/api/references';
import { SafeMarkdown } from '@/components/SafeRichText';

interface KBArticle {
  id: number;
  title: string;
  content: string;
  tags: string | null;
  helpfulCount: number;
  unhelpfulCount: number;
}

export default function KnowledgeBasePage() {
  const { myCap } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isNarrowEditor = useMediaQuery(theme.breakpoints.down('sm'));

  const [articles, setArticles] = useState<KBArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Shared Add/Edit Dialog State
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<KBArticle | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    content: '',
    tags: '',
  });
  const [saving, setSaving] = useState(false);
  const [editorTab, setEditorTab] = useState<'write' | 'preview'>('write');
  const contentInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  const fetchArticles = useCallback(async (query = '') => {
    try {
      setLoading(true);
      const data = await knowledgeBaseApi.search(query);
      setArticles(data);
    } catch {
      enqueueSnackbar('Failed to load knowledge base articles', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
  };

  // Debounced search trigger
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchArticles(searchQuery);
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, fetchArticles]);

  const openEditDialog = (article: KBArticle) => {
    setSelectedArticle(article);
    setEditForm({
      title: article.title,
      content: article.content,
      tags: article.tags || '',
    });
    setEditorTab('write');
    setEditDialogOpen(true);
  };

  const openAddDialog = () => {
    setSelectedArticle(null);
    setEditForm({ title: '', content: '', tags: '' });
    setEditorTab('write');
    setEditDialogOpen(true);
  };

  const handleSaveArticle = async () => {
    if (!editForm.title.trim() || !editForm.content.trim()) {
      enqueueSnackbar('Title and content are required.', { variant: 'warning' });
      return;
    }
    try {
      setSaving(true);
      const payload = {
        title: editForm.title.trim(),
        content: editForm.content.trim(),
        tags: editForm.tags.trim(),
      };
      if (selectedArticle) await knowledgeBaseApi.update(selectedArticle.id, payload);
      else await knowledgeBaseApi.create(payload);
      enqueueSnackbar(selectedArticle ? 'Article updated successfully' : 'Article added successfully', {
        variant: 'success',
      });
      setEditDialogOpen(false);
      await fetchArticles(searchQuery);
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'Failed to update article', {
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const canManage = !!myCap?.isKnowledgeBaseManage;

  const applyMarkdown = (before: string, after = '', placeholder = 'text') => {
    const input = contentInputRef.current;
    const start = input?.selectionStart ?? editForm.content.length;
    const end = input?.selectionEnd ?? editForm.content.length;
    const selected = editForm.content.slice(start, end) || placeholder;
    const content = `${editForm.content.slice(0, start)}${before}${selected}${after}${editForm.content.slice(end)}`;
    setEditForm((current) => ({ ...current, content }));
    requestAnimationFrame(() => {
      input?.focus();
      input?.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  };

  const prefixMarkdownLines = (prefix: string) => {
    const input = contentInputRef.current;
    const start = input?.selectionStart ?? editForm.content.length;
    const end = input?.selectionEnd ?? editForm.content.length;
    const lineStart = editForm.content.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
    const nextLineBreak = editForm.content.indexOf('\n', end);
    const lineEnd = nextLineBreak === -1 ? editForm.content.length : nextLineBreak;
    const selected = editForm.content.slice(lineStart, lineEnd) || 'List item';
    const replaced = selected
      .split('\n')
      .map((line, index) => `${prefix === '1. ' ? `${index + 1}. ` : prefix}${line}`)
      .join('\n');
    const content = `${editForm.content.slice(0, lineStart)}${replaced}${editForm.content.slice(lineEnd)}`;
    setEditForm((current) => ({ ...current, content }));
    requestAnimationFrame(() => {
      input?.focus();
      input?.setSelectionRange(lineStart, lineStart + replaced.length);
    });
  };

  const editorFields = (
    <Stack spacing={2}>
      <TextField
        label="Title *"
        value={editForm.title}
        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
        fullWidth
        inputProps={{ maxLength: 255 }}
      />
      <Box>
        <Paper variant="outlined" sx={{ p: 0.5, mb: 1 }}>
          <Stack direction="row" spacing={0.25} flexWrap="wrap" useFlexGap>
            <Tooltip title="Bold">
              <IconButton size="small" aria-label="Bold" onClick={() => applyMarkdown('**', '**')}>
                <BoldIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Italic">
              <IconButton size="small" aria-label="Italic" onClick={() => applyMarkdown('*', '*')}>
                <ItalicIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Heading">
              <IconButton size="small" aria-label="Heading" onClick={() => prefixMarkdownLines('## ')}>
                <HeadingIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Bulleted list">
              <IconButton size="small" aria-label="Bulleted list" onClick={() => prefixMarkdownLines('- ')}>
                <BulletListIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Numbered list">
              <IconButton size="small" aria-label="Numbered list" onClick={() => prefixMarkdownLines('1. ')}>
                <NumberedListIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Link">
              <IconButton
                size="small"
                aria-label="Link"
                onClick={() => applyMarkdown('[', '](https://)', 'link text')}
              >
                <LinkIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Inline code">
              <IconButton size="small" aria-label="Inline code" onClick={() => applyMarkdown('`', '`', 'code')}>
                <CodeIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Paper>
        <TextField
          inputRef={contentInputRef}
          label="Content *"
          value={editForm.content}
          onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
          multiline
          minRows={14}
          maxRows={22}
          fullWidth
          inputProps={{ maxLength: 20000 }}
          helperText={`${editForm.content.length.toLocaleString()} / 20,000 characters — Markdown formatting is supported.`}
        />
      </Box>
      <TextField
        label="Tags (comma separated)"
        value={editForm.tags}
        onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
        placeholder="e.g. internet, connectivity, proxy"
        fullWidth
        inputProps={{ maxLength: 255 }}
        helperText="Separate tags with commas."
      />
    </Stack>
  );

  const articlePreview = (
    <Paper variant="outlined" sx={{ p: 2, minHeight: 360, height: '100%', overflow: 'auto' }}>
      <Typography variant="overline" color="text.secondary">
        Formatted preview
      </Typography>
      <Typography variant="h6" sx={{ mt: 0.5, mb: 2, overflowWrap: 'anywhere' }}>
        {editForm.title.trim() || 'Article title'}
      </Typography>
      <Box
        sx={{
          typography: 'body2',
          '& p': { mt: 0, mb: 1.5 },
          '& pre': { overflowX: 'auto', p: 1.5, bgcolor: 'action.hover', borderRadius: 1 },
          '& code': { overflowWrap: 'anywhere' },
          '& img': { maxWidth: '100%' },
        }}
      >
        {editForm.content.trim() ? (
          <SafeMarkdown>{editForm.content}</SafeMarkdown>
        ) : (
          <Typography color="text.secondary">Your formatted article will appear here.</Typography>
        )}
      </Box>
    </Paper>
  );

  return (
    <Box>
      <Box mb={3}>
        <Typography variant="h4" fontWeight={700}>
          Knowledge Base
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Find self-service articles, helpful guides, and technical insights.
        </Typography>
      </Box>

      {/* Search & Actions */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="stretch">
            <TextField
              fullWidth
              label="Search Knowledge Base Articles"
              placeholder="Type keywords, tags, or topics (e.g. Internet, Printer, Email...)"
              value={searchQuery}
              onChange={handleSearchChange}
              inputProps={{ maxLength: 1000 }}
              InputProps={{
                startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
              }}
            />
            {canManage && (
              <Button variant="contained" startIcon={<AddIcon />} onClick={openAddDialog} sx={{ minWidth: 140 }}>
                Add Article
              </Button>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Articles List */}
      <Card>
        <CardContent>
          {loading ? (
            <Box textAlign="center" py={4}>
              <CircularProgress size={30} />
            </Box>
          ) : articles.length === 0 ? (
            <Box textAlign="center" py={4}>
              <HelpIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
              <Typography color="text.secondary">
                No matching articles found. Try searching for different keywords.
              </Typography>
            </Box>
          ) : (
            <Box>
              {articles.map((art) => (
                <Accordion key={art.id} sx={{ mb: 1 }}>
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    sx={{
                      position: 'relative',
                      flexDirection: { xs: 'column', sm: 'row' },
                      alignItems: { xs: 'stretch', sm: 'center' },
                      '& .MuiAccordionSummary-expandIconWrapper': {
                        alignSelf: { xs: 'flex-end', sm: 'auto' },
                        position: { xs: 'absolute', sm: 'static' },
                        right: { xs: 8, sm: 'auto' },
                        bottom: { xs: 8, sm: 'auto' },
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'stretch', sm: 'center' }, width: '100%', mr: 2, gap: { xs: 1, sm: 0 }, minWidth: 0 }}>
                      <Typography
                        fontWeight={600}
                        sx={{ flexGrow: 1, minWidth: 0, whiteSpace: 'normal', overflowWrap: 'anywhere', wordBreak: 'break-word' }}
                      >
                        {art.title}
                      </Typography>
                      <Box mr={{ xs: 0, sm: 2 }} sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', pr: { xs: 4, sm: 0 } }}>
                        <Chip
                          size="small"
                          label={`${art.helpfulCount || 0} Helpful`}
                          color="success"
                          variant="outlined"
                        />
                        <Chip
                          size="small"
                          label={`${art.unhelpfulCount || 0} Unhelpful`}
                          color={(art.unhelpfulCount || 0) > 5 ? 'error' : 'default'}
                          variant="outlined"
                        />
                        {canManage && (
                          <Tooltip title="Edit Article">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditDialog(art);
                              }}
                              sx={{ color: 'primary.main' }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box sx={{ mb: 2, typography: 'body2', color: 'text.primary', '& p': { m: 0, mb: 1 }, '& ul, & ol': { m: 0, pl: 2 } }}>
                      <SafeMarkdown>{art.content}</SafeMarkdown>
                    </Box>
                    {art.tags &&
                      art.tags.split(',').map((tag) => (
                        <Chip
                          key={tag}
                          label={tag.trim()}
                          size="small"
                          sx={{ mr: 0.5, mb: 0.5 }}
                        />
                      ))}
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Shared Add/Edit Article Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{selectedArticle ? 'Edit Knowledge Base Article' : 'Add Knowledge Base Article'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            {isNarrowEditor ? (
              <>
                <Tabs
                  value={editorTab}
                  onChange={(_, value: 'write' | 'preview') => setEditorTab(value)}
                  variant="fullWidth"
                  sx={{ mb: 2 }}
                >
                  <Tab value="write" label="Write" />
                  <Tab value="preview" label="Preview" />
                </Tabs>
                {editorTab === 'write' ? editorFields : articlePreview}
              </>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
                  gap: 2,
                  alignItems: 'stretch',
                }}
              >
                {editorFields}
                {articlePreview}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveArticle} variant="contained" disabled={saving}>
            {saving ? 'Saving…' : selectedArticle ? 'Save Changes' : 'Add Article'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
