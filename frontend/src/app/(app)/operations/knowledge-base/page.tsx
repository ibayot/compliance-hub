'use client';
import StickyTabs from '@/components/layout/StickyTabs';
import WorkspaceLayout from '@/components/layout/WorkspaceLayout';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  MenuItem,
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
import { useMobilePageAction } from '@/contexts/MobileNavigationContext';

interface KBArticle {
  id: number;
  title: string;
  content: string;
  tags: string | null;
  isEnabled: boolean;
  helpfulCount: number;
  unhelpfulCount: number;
  sourceTicketId?: string | null;
  reviewWarnings?: string[];
  draftVersion?: string;
}

export default function KnowledgeBasePage() {
  const { myCap } = useAuth();
  const canManage = !!myCap?.isKnowledgeBaseManage;
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isNarrowEditor = useMediaQuery(theme.breakpoints.down('sm'));

  const [articles, setArticles] = useState<KBArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const requestGeneration = useRef(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [articleStatus, setArticleStatus] = useState<'active' | 'drafts' | 'disabled'>('active');
  const showDisabled = canManage && articleStatus === 'disabled';
  const showDrafts = canManage && articleStatus === 'drafts';
  const visibleArticles = articles.filter((article) =>
    showDrafts ? !!article.draftVersion : !article.draftVersion && article.isEnabled !== showDisabled,
  );
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [changingStatusId, setChangingStatusId] = useState<number | null>(null);
  const [publishCandidate, setPublishCandidate] = useState<KBArticle | null>(null);
  const [ratingArticleId, setRatingArticleId] = useState<number | null>(null);
  const [ratedArticleIds, setRatedArticleIds] = useState<ReadonlySet<number>>(() => new Set());
  
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
    const generation = ++requestGeneration.current;
    try {
      setLoading(true);
      setLoadError('');
      const search = showDrafts ? knowledgeBaseApi.searchDrafts
        : showDisabled ? knowledgeBaseApi.searchDisabled : knowledgeBaseApi.search;
      const data = await search(query);
      if (generation !== requestGeneration.current) return;
      setArticles(data);
    } catch {
      if (generation === requestGeneration.current) setLoadError('Failed to load knowledge base articles. Please retry.');
    } finally {
      if (generation === requestGeneration.current) setLoading(false);
    }
  }, [showDisabled, showDrafts]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
  };

  // Debounced search trigger
  useEffect(() => {
    // Invalidate a pending response immediately, not only after the debounce.
    ++requestGeneration.current;
    const delayDebounceFn = setTimeout(() => {
      fetchArticles(searchQuery);
    }, 400);
    return () => { clearTimeout(delayDebounceFn); ++requestGeneration.current; };
  }, [searchQuery, fetchArticles, refreshVersion]);

  const handleArticleStatusChange = async (article: KBArticle) => {
    const enable = !article.isEnabled;
    setChangingStatusId(article.id);
    try {
      await knowledgeBaseApi.setStatus(article.id, enable);
      ++requestGeneration.current;
      setArticles((current) => current.filter(({ id }) => id !== article.id));
      setRefreshVersion((current) => current + 1);
      enqueueSnackbar(enable ? 'Article enabled.' : 'Article disabled.', { variant: 'success' });
    } catch {
      enqueueSnackbar(enable ? 'Could not enable the article. Try again.' : 'Could not disable the article. Try again.', { variant: 'error' });
    } finally {
      setChangingStatusId(null);
    }
  };

  const handlePublishDraft = async () => {
    if (!publishCandidate?.draftVersion) return;
    const { id, draftVersion } = publishCandidate;
    setChangingStatusId(id);
    try {
      await knowledgeBaseApi.publishDraft(id, draftVersion);
      ++requestGeneration.current;
      setArticles((current) => current.filter((article) => article.id !== id));
      setPublishCandidate(null);
      setRefreshVersion((current) => current + 1);
      enqueueSnackbar('Article published.', { variant: 'success' });
    } catch (err: any) {
      if (err?.response?.status === 409) {
        setPublishCandidate(null);
        setRefreshVersion((current) => current + 1);
      }
      enqueueSnackbar(err?.response?.data?.message || 'Could not publish the article. Try again.', { variant: 'error' });
    } finally {
      setChangingStatusId(null);
    }
  };

  const handleRating = async (id: number, isHelpful: boolean) => {
    setRatingArticleId(id);
    try {
      const rating = await knowledgeBaseApi.rateArticle(id, isHelpful);
      setArticles((current) => current.map((article) => article.id === id ? {
        ...article, helpfulCount: rating.helpfulCount, unhelpfulCount: rating.unhelpfulCount,
      } : article));
      setRatedArticleIds((current) => new Set([...current, id]));
      enqueueSnackbar('Thanks for your feedback.', { variant: 'success' });
    } catch {
      enqueueSnackbar('Could not save your feedback. Try again.', { variant: 'error' });
    } finally {
      setRatingArticleId(null);
    }
  };

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
      if (selectedArticle) {
        const updated = await knowledgeBaseApi.update(selectedArticle.id, { ...payload, draftVersion: selectedArticle.draftVersion });
        ++requestGeneration.current;
        setArticles((current) => current.map((article) => article.id === updated.id ? updated : article));
      } else {
        await knowledgeBaseApi.create(payload);
      }
      enqueueSnackbar(selectedArticle?.draftVersion ? 'Draft saved.' : selectedArticle ? 'Article updated.' : 'Article added.', {
        variant: 'success',
      });
      setEditDialogOpen(false);
      if (!selectedArticle) setArticleStatus('active');
      if (!selectedArticle?.draftVersion) setRefreshVersion((current) => current + 1);
    } catch (err: any) {
      if (err?.response?.status === 409) setRefreshVersion((current) => current + 1);
      enqueueSnackbar(err?.response?.data?.message || 'Failed to update article', {
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const addArticleButtonRef = useMobilePageAction('Add Article');

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
<Stack direction={{ xs: 'column', sm: 'row' }} flexWrap="wrap" alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between" gap={2} mb={3}>
  <Box sx={{ flex: { xs: '0 0 auto', sm: '1 1 260px' }, minWidth: 0 }}>
        <Typography variant="h4" fontWeight={700}>
          Knowledge Base
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Find self-service articles, helpful guides, and technical insights.
        </Typography>
  </Box>
  {canManage && <Button ref={addArticleButtonRef} variant="contained" startIcon={<AddIcon />} onClick={openAddDialog} sx={{ alignSelf: { xs: 'stretch', sm: 'center' }, whiteSpace: 'nowrap' }}>
    Add Article
  </Button>}
</Stack>
<WorkspaceLayout kind="standard" context={<><Card sx={{ mb: 3 }}>
        <CardContent sx={{ '&:last-child': { pb: 2 } }}>
          <Stack spacing={1.5} alignItems="stretch">
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
              <TextField
                select
                fullWidth
                label="Article status"
                value={articleStatus}
                onChange={(event) => {
                  setLoading(true);
                  setArticleStatus(event.target.value as typeof articleStatus);
                }}
              >
                <MenuItem value="active">Published</MenuItem>
                <MenuItem value="drafts">Drafts</MenuItem>
                <MenuItem value="disabled">Disabled</MenuItem>
              </TextField>
            )}
          </Stack>
        </CardContent>
      </Card></>}>
{/* Search & Actions */}
{/* Articles List */}
<Card>
        <CardContent>
          {loading ? (
            <Box textAlign="center" py={4}>
              <CircularProgress size={30} />
            </Box>
          ) : loadError ? (
            <Box role="alert"><Typography color="error">{loadError}</Typography><Button onClick={() => void fetchArticles(searchQuery)}>Retry</Button></Box>
          ) : visibleArticles.length === 0 ? (
            <Box textAlign="center" py={4}>
              <HelpIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
              <Typography color="text.secondary">
                {searchQuery.trim() ? 'No matching articles found. Try searching for different keywords.'
                  : showDrafts ? 'There are no drafts awaiting review.'
                  : showDisabled ? 'There are no disabled articles.' : 'There are no published articles.'}
              </Typography>
            </Box>
          ) : (
            <Box>
              {visibleArticles.map((art) => (
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
                        {showDisabled && <Chip size="small" label="Disabled" variant="outlined" />}
                        {showDrafts ? (
                          <Chip size="small" label="Needs review" color="warning" variant="outlined" />
                        ) : (
                          <>
                            <Chip size="small" label={`${art.helpfulCount || 0} Helpful`} color="success" variant="outlined" />
                            <Chip size="small" label={`${art.unhelpfulCount || 0} Unhelpful`}
                              color={(art.unhelpfulCount || 0) > 5 ? 'error' : 'default'} variant="outlined" />
                          </>
                        )}
                      </Box>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    {showDrafts && !!art.reviewWarnings?.length && (
                      <Alert severity="warning" sx={{ mb: 2 }}>
                        Compare these commands or menu paths with the source ticket before publishing.
                        <Box component="ul" sx={{ my: 0.5, pl: 2.5, overflowWrap: 'anywhere' }}>
                          {art.reviewWarnings.map((literal) => <li key={literal}><code>{literal}</code></li>)}
                        </Box>
                      </Alert>
                    )}
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
                    {canManage && (
                      <Stack direction="row" gap={1} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
                        {showDrafts && art.sourceTicketId && (
                          <Button size="small" component={RouterLink} to={`/operations/tickets/${art.sourceTicketId}`}>Source ticket</Button>
                        )}
                        <Button size="small" startIcon={<EditIcon />} onClick={() => openEditDialog(art)}>
                          {showDrafts ? 'Edit draft' : 'Edit article'}
                        </Button>
                        <Button
                          size="small"
                          variant={showDrafts ? 'contained' : 'outlined'}
                          disabled={changingStatusId !== null}
                          onClick={() => showDrafts ? setPublishCandidate(art) : void handleArticleStatusChange(art)}
                        >
                          {showDrafts ? 'Publish article' : showDisabled ? 'Enable article' : 'Disable article'}
                        </Button>
                      </Stack>
                    )}
                    {!showDrafts && !showDisabled && (
                      <Stack direction="row" gap={1} useFlexGap flexWrap="wrap" alignItems="center" sx={{ mt: 1 }}>
                        <Typography variant="body2">Was this helpful?</Typography>
                        <Button size="small" disabled={ratingArticleId !== null || ratedArticleIds.has(art.id)}
                          onClick={() => void handleRating(art.id, true)}>Helpful</Button>
                        <Button size="small" disabled={ratingArticleId !== null || ratedArticleIds.has(art.id)}
                          onClick={() => void handleRating(art.id, false)}>Not helpful</Button>
                      </Stack>
                    )}
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>
{/* Shared Add/Edit Article Dialog */}
</WorkspaceLayout>
<Dialog open={!!publishCandidate} onClose={() => changingStatusId === null && setPublishCandidate(null)} fullWidth maxWidth="xs">
  <DialogTitle>Publish this article?</DialogTitle>
  <DialogContent>
    <Typography variant="body2">
      Published articles appear in the Knowledge Base and in ticket suggestions.
    </Typography>
    {!!publishCandidate?.reviewWarnings?.length && (
      <Alert severity="warning" sx={{ mt: 2 }}>This draft still has commands or menu paths to check.</Alert>
    )}
  </DialogContent>
  <DialogActions>
    <Button disabled={changingStatusId !== null} onClick={() => setPublishCandidate(null)}>Cancel</Button>
    <Button variant="contained" disabled={changingStatusId !== null} onClick={() => void handlePublishDraft()}>Publish</Button>
  </DialogActions>
</Dialog>
<Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{selectedArticle?.draftVersion ? 'Edit Knowledge Base Draft' : selectedArticle ? 'Edit Knowledge Base Article' : 'Add Knowledge Base Article'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            {isNarrowEditor ? (
              <>
                <StickyTabs
                  value={editorTab}
                  onChange={(_, value: 'write' | 'preview') => setEditorTab(value)}
                  variant="fullWidth"
                  sx={{ mb: 2 }}
                >
                  <Tab value="write" label="Write" />
                  <Tab value="preview" label="Preview" />
                </StickyTabs>
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
