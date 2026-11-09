'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  FormControl,
  FormControlLabel,
  FormLabel,
  Grid,
  Radio,
  RadioGroup,
  Stack,
  Switch,
  Typography,
  useTheme,
} from '@mui/material';
import PaletteIcon from '@mui/icons-material/Palette';
import { useSnackbar } from 'notistack';
import { useThemeMode } from '@/contexts/ThemeModeContext';
import { usersApi } from '@/lib/api/users';
import type { AppAppearancePreferences } from '@/lib/appearance';
import {
  APP_COLOR_THEMES,
  APP_LAYOUT_PRESETS,
  normalizeAppAppearance,
} from '@/lib/appearance';

function LayoutPreview({ preset }: { preset: AppAppearancePreferences['layoutPreset'] }) {
  const theme = useTheme();
  const panelColor = theme.palette.action.hover;
  const accent = theme.palette.primary.main;

  if (preset === 'split-pane-workbench') {
    return (
      <Box aria-hidden="true" sx={{ display: 'flex', gap: 0.5, height: 42, p: 0.5, border: 1, borderColor: 'divider', borderRadius: 1.5 }}>
        <Box sx={{ width: '28%', bgcolor: panelColor, borderRadius: 0.75 }} />
        <Box sx={{ flex: 1, display: 'flex', gap: 0.5 }}>
          <Box sx={{ flex: 1, border: 1, borderColor: 'divider', borderRadius: 0.75 }} />
          <Box sx={{ width: '28%', bgcolor: panelColor, borderRadius: 0.75 }} />
        </Box>
      </Box>
    );
  }

  if (preset === 'sectioned-workspace') {
    return (
      <Box aria-hidden="true" sx={{ display: 'flex', gap: 0.5, height: 42, p: 0.5, border: 1, borderColor: 'divider', borderRadius: 1.5 }}>
        <Box sx={{ width: '34%', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Box sx={{ height: 16, bgcolor: `${accent}20`, borderRadius: 0.75 }} />
          <Box sx={{ flex: 1, bgcolor: panelColor, borderRadius: 0.75 }} />
        </Box>
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Box sx={{ height: 10, width: '56%', bgcolor: accent, opacity: 0.75, borderRadius: 1 }} />
          <Box sx={{ flex: 1, bgcolor: panelColor, borderRadius: 0.75 }} />
          <Box sx={{ flex: 1, bgcolor: panelColor, borderRadius: 0.75 }} />
        </Box>
      </Box>
    );
  }

  return (
    <Box aria-hidden="true" sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, height: 42, p: 0.5, border: 1, borderColor: 'divider', borderRadius: 1.5 }}>
      <Box sx={{ display: 'flex', gap: 0.5, height: 12 }}>
        {[0, 1, 2, 3].map((item) => <Box key={item} sx={{ flex: 1, bgcolor: item === 0 ? `${accent}20` : panelColor, borderRadius: 0.5 }} />)}
      </Box>
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.35, p: 0.35, border: 1, borderColor: 'divider', borderRadius: 0.75 }}>
        {[0, 1, 2].map((item) => <Box key={item} sx={{ height: 3, bgcolor: item === 0 ? accent : panelColor, opacity: item === 0 ? 0.8 : 1, borderRadius: 1 }} />)}
      </Box>
    </Box>
  );
}

export default function AppearanceSettingsCard() {
  const { mode, colorTheme, layoutPreset, setAppearance, appearanceReady } = useThemeMode();
  const { enqueueSnackbar } = useSnackbar();
  const [saving, setSaving] = useState(false);
  const saved = useMemo(() => ({ mode, colorTheme, layoutPreset }), [mode, colorTheme, layoutPreset]);
  const [draft, setDraft] = useState<AppAppearancePreferences>(saved);

  useEffect(() => {
    setDraft(saved);
  }, [saved]);

  const isDirty = draft.mode !== saved.mode || draft.colorTheme !== saved.colorTheme || draft.layoutPreset !== saved.layoutPreset;

  const handleSave = async () => {
    if (saving || !appearanceReady || !isDirty) return;
    setSaving(true);
    try {
      const preferences = await usersApi.updateUiPreferences(draft);
      setAppearance(normalizeAppAppearance(preferences));
      enqueueSnackbar('Appearance preferences saved.', { variant: 'success' });
    } catch (error: any) {
      enqueueSnackbar(
        error?.response?.data?.message || 'Unable to save appearance preferences. Please try again.',
        { variant: 'error' },
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card elevation={2}>
      <CardHeader
        avatar={<PaletteIcon color="primary" />}
        title="Appearance & Workspace"
        subheader="Choose a layout and color theme for the whole application. Your choices are saved to your account."
      />
      <CardContent sx={{ pt: 2 }}>
        {!appearanceReady ? (
          <Alert severity="info" sx={{ mb: 2 }} icon={<CircularProgress size={18} />}>
            Loading your saved appearance preferences…
          </Alert>
        ) : null}

        <FormControl component="fieldset" fullWidth disabled={!appearanceReady || saving}>
          <FormLabel component="legend" sx={{ color: 'text.primary', fontWeight: 700, mb: 1 }}>
            Workspace layout
          </FormLabel>
          <RadioGroup
            row
            name="workspace-layout-preset"
            value={draft.layoutPreset}
            onChange={(event) => setDraft((current) => ({ ...current, layoutPreset: event.target.value as AppAppearancePreferences['layoutPreset'] }))}
            aria-label="Workspace layout"
            sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: 1.25 }}
          >
            {APP_LAYOUT_PRESETS.map((option) => (
              <FormControlLabel
                key={option.value}
                value={option.value}
                control={<Radio size="small" inputProps={{ 'aria-label': option.label }} />}
                label={
                  <Box sx={{ width: '100%', pt: 0.5, pb: 1 }}>
                    <LayoutPreview preset={option.value} />
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 1 }}>{option.label}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.45, mt: 0.25 }}>
                      {option.description}
                    </Typography>
                  </Box>
                }
                sx={{
                  m: 0,
                  px: 1,
                  border: 1,
                  borderColor: draft.layoutPreset === option.value ? 'primary.main' : 'divider',
                  borderRadius: 2,
                  alignItems: 'flex-start',
                  bgcolor: draft.layoutPreset === option.value ? 'action.selected' : 'background.paper',
                  '& .MuiFormControlLabel-label': { flex: 1, minWidth: 0 },
                  '&:hover': { borderColor: 'primary.main' },
                }}
              />
            ))}
          </RadioGroup>
        </FormControl>

        <FormControl component="fieldset" fullWidth disabled={!appearanceReady || saving} sx={{ mt: 2.5 }}>
          <FormLabel component="legend" sx={{ color: 'text.primary', fontWeight: 700, mb: 1 }}>
            Color theme
          </FormLabel>
          <RadioGroup
            row
            name="workspace-color-theme"
            value={draft.colorTheme}
            onChange={(event) => setDraft((current) => ({ ...current, colorTheme: event.target.value as AppAppearancePreferences['colorTheme'] }))}
            aria-label="Color theme"
            sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 1.25 }}
          >
            {APP_COLOR_THEMES.map((option) => (
              <FormControlLabel
                key={option.value}
                value={option.value}
                control={<Radio size="small" inputProps={{ 'aria-label': option.label }} />}
                label={
                  <Box sx={{ display: 'grid', gap: 1, py: 1.25, minWidth: 0 }}>
                    <Stack direction="row" spacing={0.5} aria-hidden="true" sx={{ flexShrink: 0 }}>
                      {option.swatches.map((swatch) => (
                        <Box key={swatch} sx={{ width: 17, height: 17, bgcolor: swatch, borderRadius: '50%', border: 1, borderColor: 'divider' }} />
                      ))}
                    </Stack>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="subtitle2" fontWeight={700}>{option.label}</Typography>
                      <Typography variant="caption" color="text.secondary">{option.description}</Typography>
                    </Box>
                  </Box>
                }
                sx={{
                  m: 0,
                  px: 1,
                  border: 1,
                  borderColor: draft.colorTheme === option.value ? 'primary.main' : 'divider',
                  borderRadius: 2,
                  bgcolor: draft.colorTheme === option.value ? 'action.selected' : 'background.paper',
                  alignItems: 'flex-start',
                  '& .MuiRadio-root': { mt: 0.5 },
                  '& .MuiFormControlLabel-label': { flex: 1, minWidth: 0 },
                  '&:hover': { borderColor: 'primary.main' },
                }}
              />
            ))}
          </RadioGroup>
        </FormControl>

        <Grid container spacing={1} alignItems="center" sx={{ mt: 1.5 }}>
          <Grid item xs={12} sm>
            <FormControlLabel
              disabled={!appearanceReady || saving}
              control={
                <Switch
                  checked={draft.mode === 'dark'}
                  onChange={(event) => setDraft((current) => ({ ...current, mode: event.target.checked ? 'dark' : 'light' }))}
                  inputProps={{ 'aria-label': 'Use dark appearance' }}
                />
              }
              label={
                <Box>
                  <Typography variant="body2" fontWeight={600}>Dark appearance</Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Color theme and layout remain selected independently.
                  </Typography>
                </Box>
              }
            />
          </Grid>
          <Grid item xs={12} sm="auto">
            <Button variant="contained" onClick={() => void handleSave()} disabled={!appearanceReady || saving || !isDirty}>
              {saving ? 'Saving…' : 'Save Appearance'}
            </Button>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
