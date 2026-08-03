'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  HelpOutline as HelpIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useAuth } from '@/contexts/AuthContext';
import { knowledgeBaseApi } from '@/app/api/references';
import ReactMarkdown from 'react-markdown';
import { useAutoRefresh } from '@/lib/utils/useAutoRefresh';

interface KBArticle {
  id: number;
  title: string;
  content: string;
  tags: string;
  helpfulCount: number;
  unhelpfulCount: number;
}

export default function KnowledgeBasePage() {
  const { myCap } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const [articles, setArticles] = useState<KBArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Edit Dialog State
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<KBArticle | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    content: '',
    tags: '',
  });
  const [saving, setSaving] = useState(false);

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
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedArticle) return;
    if (!editForm.title.trim() || !editForm.content.trim()) {
      enqueueSnackbar('Title and content are required.', { variant: 'warning' });
      return;
    }
    try {
      setSaving(true);
      await knowledgeBaseApi.update(selectedArticle.id, {
        title: editForm.title.trim(),
        content: editForm.content.trim(),
        tags: editForm.tags.trim(),
      });
      enqueueSnackbar('Article updated successfully', { variant: 'success' });
      setEditDialogOpen(false);
      fetchArticles(searchQuery);
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'Failed to update article', {
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const isEditable = !!myCap?.isTicketSettingsFocal;

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
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', mr: 2 }}>
                      <Typography fontWeight={600} sx={{ flexGrow: 1 }}>
                        {art.title}
                      </Typography>
                      <Box mr={2} sx={{ display: 'flex', gap: 1 }}>
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
                      </Box>
                      {isEditable && (
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
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box sx={{ mb: 2, typography: 'body2', color: 'text.primary', '& p': { m: 0, mb: 1 }, '& ul, & ol': { m: 0, pl: 2 } }}>
                      <ReactMarkdown>{art.content}</ReactMarkdown>
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

      {/* Edit Article Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Knowledge Base Article</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Title *"
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              fullWidth
            />
            <TextField
              label="Content *"
              value={editForm.content}
              onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
              multiline
              rows={8}
              fullWidth
              inputProps={{ maxLength: 1000 }}
            />
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
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
