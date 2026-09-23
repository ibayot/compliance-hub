'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Add as AddIcon, DeleteOutline as DeleteIcon } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import {
  AppRelease,
  ChangelogCategory,
  ReleaseDraftInput,
  changelogApi,
} from '@/lib/api/changelog';
import { usersApi } from '@/lib/api/users';
import { SearchableMultiSelect } from '@/components/SearchableSelect';

type DraftNote = ReleaseDraftInput['notes'][number];

const newNote = (): DraftNote => ({
  category: 'enhancement',
  title: '',
  description: '',
  capabilityKeys: [],
});

const newDraft = (): ReleaseDraftInput => ({
  version: '',
  title: '',
  displayDays: 14,
  notes: [newNote()],
});

const capabilityLabel = (key: string) =>
  key
    .replace(/^is/, '')
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const categoryLabel: Record<ChangelogCategory, string> = {
  functional: 'Functional',
  enhancement: 'Enhancement',
  bug_fix: 'Bug Fix',
};

const apiErrorMessage = (error: unknown, fallback: string) => {
  const responseMessage = (error as { response?: { data?: { message?: string | string[] } } })
    ?.response?.data?.message;
  return Array.isArray(responseMessage) ? responseMessage.join(' ') : responseMessage || fallback;
};

export default function ChangelogManagementPage() {
  const { enqueueSnackbar } = useSnackbar();
  const [releases, setReleases] = useState<AppRelease[]>([]);
  const [form, setForm] = useState<ReleaseDraftInput>(newDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [capabilityKeys, setCapabilityKeys] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const loadReleases = useCallback(async () => {
    try {
      setReleases(await changelogApi.adminList());
    } catch {
      enqueueSnackbar('Unable to load changelog releases.', { variant: 'error' });
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    void loadReleases();
    usersApi
      .getMyCapabilities()
      .then((capabilities) =>
        setCapabilityKeys(
          Object.keys(capabilities || {})
            .filter(
              (key) =>
                key.startsWith('is') &&
                typeof (capabilities as unknown as Record<string, unknown>)[key] === 'boolean',
            )
            .sort((a, b) => capabilityLabel(a).localeCompare(capabilityLabel(b))),
        ),
      )
      .catch(() => setCapabilityKeys([]));
  }, [loadReleases]);

  const resetForm = () => {
    setForm(newDraft());
    setEditingId(null);
  };

  const updateNote = (index: number, changes: Partial<DraftNote>) => {
    setForm((current) => ({
      ...current,
      notes: current.notes.map((note, noteIndex) =>
        noteIndex === index ? { ...note, ...changes } : note,
      ),
    }));
  };

  const removeNote = (index: number) => {
    setForm((current) => ({
      ...current,
      notes: current.notes.filter((_, noteIndex) => noteIndex !== index),
    }));
  };

  const editDraft = (release: AppRelease) => {
    setEditingId(release.id);
    setForm({
      version: release.version,
      title: release.title,
      displayDays: release.displayDays,
      notes: release.notes.map(({ category, title, description, capabilityKeys: targets }) => ({
        category,
        title,
        description,
        capabilityKeys: [...targets],
      })),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveDraft = async () => {
    try {
      setSaving(true);
      if (editingId) {
        await changelogApi.update(editingId, form);
        enqueueSnackbar('Changelog draft updated.', { variant: 'success' });
      } else {
        await changelogApi.create(form);
        enqueueSnackbar('Changelog draft created.', { variant: 'success' });
      }
      resetForm();
      await loadReleases();
    } catch (error: unknown) {
      enqueueSnackbar(apiErrorMessage(error, 'Unable to save the changelog draft.'), {
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const publishRelease = async (release: AppRelease) => {
    try {
      await changelogApi.publish(release.id);
      enqueueSnackbar(`Version ${release.version} was published. Its display period starts now.`, {
        variant: 'success',
      });
      if (editingId === release.id) resetForm();
      await loadReleases();
    } catch (error: unknown) {
      enqueueSnackbar(apiErrorMessage(error, 'Unable to publish the release.'), {
        variant: 'error',
      });
    }
  };

  const deleteRelease = async (release: AppRelease) => {
    try {
      await changelogApi.remove(release.id);
      enqueueSnackbar(`Draft ${release.version} was deleted.`, { variant: 'success' });
      if (editingId === release.id) resetForm();
      await loadReleases();
    } catch (error: unknown) {
      enqueueSnackbar(apiErrorMessage(error, 'Unable to delete the draft.'), {
        variant: 'error',
      });
    }
  };

  return (
    <Box>
      <Typography variant="h4" mb={2}>
        Changelog Management
      </Typography>
      <Alert severity="info" sx={{ mb: 2 }}>
        Publish only user-visible Functional, Enhancement, or Bug Fix information. Do not include
        database, test, Docker, or internal deployment details. Each note can target a different set
        of capabilities.
      </Alert>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6">
              {editingId ? 'Edit Changelog Draft' : 'New Changelog Draft'}
            </Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                required
                fullWidth
                label="Version"
                value={form.version}
                onChange={(event) => setForm({ ...form, version: event.target.value })}
              />
              <TextField
                required
                fullWidth
                label="Release title"
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
              />
              <TextField
                required
                type="number"
                label="Display for days"
                value={form.displayDays}
                onChange={(event) => setForm({ ...form, displayDays: Number(event.target.value) })}
                inputProps={{ min: 1, max: 365 }}
                helperText="Starts when published"
                sx={{ minWidth: { md: 190 } }}
              />
            </Stack>

            {form.notes.map((note, index) => (
              <Card key={index} variant="outlined">
                <CardContent>
                  <Stack spacing={2}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography fontWeight={700}>Release note {index + 1}</Typography>
                      <Button
                        color="error"
                        size="small"
                        startIcon={<DeleteIcon />}
                        disabled={form.notes.length === 1}
                        onClick={() => removeNote(index)}
                      >
                        Remove
                      </Button>
                    </Stack>
                    <FormControl required fullWidth>
                      <InputLabel>Category</InputLabel>
                      <Select
                        label="Category"
                        value={note.category}
                        onChange={(event) =>
                          updateNote(index, {
                            category: event.target.value as ChangelogCategory,
                          })
                        }
                      >
                        {Object.entries(categoryLabel).map(([value, label]) => (
                          <MenuItem key={value} value={value}>
                            {label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <TextField
                      required
                      fullWidth
                      label="Note title"
                      value={note.title}
                      onChange={(event) => updateNote(index, { title: event.target.value })}
                    />
                    <TextField
                      required
                      fullWidth
                      multiline
                      minRows={4}
                      label="User-facing explanation"
                      value={note.description}
                      onChange={(event) => updateNote(index, { description: event.target.value })}
                      helperText="Explain what changed, who benefits, and how the visible workflow behaves."
                    />
                    <SearchableMultiSelect
                      required
                      label="Target capabilities"
                      value={note.capabilityKeys}
                      options={capabilityKeys.map((key) => ({
                        value: key,
                        label: capabilityLabel(key),
                      }))}
                      onChange={(capabilityKeys) => updateNote(index, { capabilityKeys })}
                      helperText="Search and select every capability that should receive this note."
                    />
                  </Stack>
                </CardContent>
              </Card>
            ))}

            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() =>
                setForm((current) => ({
                  ...current,
                  notes: [...current.notes, newNote()],
                }))
              }
              sx={{ alignSelf: 'flex-start' }}
            >
              Add another targeted note
            </Button>
          </Stack>
        </CardContent>
        <CardActions sx={{ px: 2, pb: 2 }}>
          <Button variant="contained" disabled={saving} onClick={() => void saveDraft()}>
            {saving ? 'Saving…' : editingId ? 'Update Draft' : 'Create Draft'}
          </Button>
          {editingId && <Button onClick={resetForm}>Cancel Edit</Button>}
        </CardActions>
      </Card>

      <Stack spacing={2}>
        {releases.map((release) => (
          <Card key={release.id}>
            <CardContent>
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                justifyContent="space-between"
                spacing={2}
              >
                <Box sx={{ flex: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    <Typography variant="h6">
                      v{release.version} — {release.title}
                    </Typography>
                    <Chip
                      size="small"
                      color={release.status === 'published' ? 'success' : 'default'}
                      label={release.status.toUpperCase()}
                    />
                  </Stack>
                  <Typography variant="body2" color="text.secondary" mb={1}>
                    {release.displayDays} day display period · {release.notes.length} targeted
                    note(s)
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Stack spacing={1.5}>
                    {release.notes.map((note) => (
                      <Box key={note.id}>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                          <Chip size="small" label={categoryLabel[note.category]} />
                          <Typography fontWeight={700}>{note.title}</Typography>
                        </Stack>
                        <Typography variant="body2" whiteSpace="pre-wrap">
                          {note.description}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Visible to: {note.capabilityKeys.map(capabilityLabel).join(', ')}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Box>
                {release.status === 'draft' && (
                  <Stack direction={{ xs: 'row', md: 'column' }} alignItems="stretch">
                    <Button onClick={() => editDraft(release)}>Edit</Button>
                    <Button onClick={() => void publishRelease(release)}>Publish</Button>
                    <Button color="error" onClick={() => void deleteRelease(release)}>
                      Delete
                    </Button>
                  </Stack>
                )}
              </Stack>
            </CardContent>
          </Card>
        ))}
        {releases.length === 0 && (
          <Typography color="text.secondary">No changelog releases have been created.</Typography>
        )}
      </Stack>
    </Box>
  );
}
