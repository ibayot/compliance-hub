export const APP_LAYOUT_PRESETS = [
  {
    value: 'operations-grid',
    label: 'Operations Grid',
    description: 'Full-width tables and work areas, with compact controls and summaries across the top.',
  },
  {
    value: 'split-pane-workbench',
    label: 'Split-Pane Workbench',
    description: 'A context rail beside your work: filters, report options, profile information, or document details.',
  },
  {
    value: 'sectioned-workspace',
    label: 'Sectioned Workspace',
    description: 'Broad section bands, grouped reading areas, and columns of dashboard and settings cards.',
  },
] as const;

export const APP_COLOR_THEMES = [
  {
    value: 'clean-blue',
    label: 'Clean Blue',
    description: 'Crisp blue accents with cool neutral surfaces.',
    swatches: ['#2563eb', '#eaf1ff', '#f5f8fc'],
  },
  {
    value: 'slate-teal',
    label: 'Slate & Teal',
    description: 'Calm teal accents with balanced slate neutrals.',
    swatches: ['#177a78', '#e6f3f1', '#f3f7f6'],
  },
  {
    value: 'warm-neutral',
    label: 'Warm Neutral',
    description: 'Soft warm surfaces with restrained bronze accents.',
    swatches: ['#8a6238', '#f3ede3', '#faf7f1'],
  },
] as const;

export const APP_LAYOUT_MAX_WIDTH: Record<AppLayoutPreset, number> = {
  'operations-grid': 1840,
  'split-pane-workbench': 1680,
  'sectioned-workspace': 1540,
};

export type AppLayoutPreset = (typeof APP_LAYOUT_PRESETS)[number]['value'];
export type AppColorTheme = (typeof APP_COLOR_THEMES)[number]['value'];
export type AppColorMode = 'light' | 'dark';

export interface AppAppearancePreferences {
  layoutPreset: AppLayoutPreset;
  colorTheme: AppColorTheme;
  mode: AppColorMode;
}

export const DEFAULT_APP_APPEARANCE: AppAppearancePreferences = {
  layoutPreset: 'operations-grid',
  colorTheme: 'clean-blue',
  mode: 'light',
};

export function normalizeAppAppearance(value: unknown): AppAppearancePreferences {
  if (!value || typeof value !== 'object') return DEFAULT_APP_APPEARANCE;

  const source = value as Record<string, unknown>;
  const layoutPreset = APP_LAYOUT_PRESETS.some((option) => option.value === source.layoutPreset)
    ? (source.layoutPreset as AppLayoutPreset)
    : DEFAULT_APP_APPEARANCE.layoutPreset;
  const colorTheme = APP_COLOR_THEMES.some((option) => option.value === source.colorTheme)
    ? (source.colorTheme as AppColorTheme)
    : DEFAULT_APP_APPEARANCE.colorTheme;
  const mode = source.mode === 'dark' ? 'dark' : 'light';

  return { layoutPreset, colorTheme, mode };
}
