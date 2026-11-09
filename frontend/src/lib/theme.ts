'use client';

import { createTheme } from '@mui/material/styles';
import type { AppColorTheme, AppLayoutPreset } from '@/lib/appearance';

export type AppLayoutMode = 'web' | 'mobile';

const layoutBreakpoints = (layoutMode: AppLayoutMode) =>
  layoutMode === 'mobile'
    ? {
        // Preserve the tablet layout on desktop-class browsers: sm remains active,
        // while md-and-larger layouts are intentionally kept out of reach.
        xs: 0,
        sm: 600,
        md: 100000,
        lg: 100001,
        xl: 100002,
      }
    : undefined;

const colorTokens: Record<
  AppColorTheme,
  { primary: string; primaryLight: string; primaryDark: string; secondary: string; page: string; darkPage: string; darkPaper: string }
> = {
  'clean-blue': {
    primary: '#2563eb',
    primaryLight: '#60a5fa',
    primaryDark: '#1d4ed8',
    secondary: '#5b6fbe',
    page: '#f4f7fb',
    darkPage: '#101722',
    darkPaper: '#1a2432',
  },
  'slate-teal': {
    primary: '#167a78',
    primaryLight: '#42a6a0',
    primaryDark: '#105f60',
    secondary: '#536b79',
    page: '#f1f6f5',
    darkPage: '#101b1c',
    darkPaper: '#1a292a',
  },
  'warm-neutral': {
    primary: '#8a6238',
    primaryLight: '#b88a55',
    primaryDark: '#694825',
    secondary: '#6f6877',
    page: '#f8f6f1',
    darkPage: '#1c1915',
    darkPaper: '#29241e',
  },
};

const layoutTokens: Record<
  AppLayoutPreset,
  { spacing: number; radius: number; tableCellPadding: string; cardShadow: string; cardHeaderPadding: string; cardContentPadding: string; buttonHeight: number }
> = {
  'operations-grid': {
    spacing: 7,
    radius: 6,
    tableCellPadding: '7px 10px',
    cardShadow: 'none',
    cardHeaderPadding: '14px 16px 0',
    cardContentPadding: '12px 16px 14px',
    buttonHeight: 34,
  },
  'split-pane-workbench': {
    spacing: 8,
    radius: 12,
    tableCellPadding: '9px 14px',
    cardShadow: '0 3px 14px rgba(15, 23, 42, 0.07)',
    cardHeaderPadding: '18px 20px 0',
    cardContentPadding: '16px 20px 20px',
    buttonHeight: 38,
  },
  'sectioned-workspace': {
    spacing: 9.5,
    radius: 16,
    tableCellPadding: '11px 16px',
    cardShadow: '0 5px 18px rgba(15, 23, 42, 0.075)',
    cardHeaderPadding: '22px 24px 0',
    cardContentPadding: '20px 24px 24px',
    buttonHeight: 40,
  },
};

export const getAppTheme = (
  mode: 'light' | 'dark' = 'light',
  layoutMode: AppLayoutMode = 'web',
  colorTheme: AppColorTheme = 'clean-blue',
  layoutPreset: AppLayoutPreset = 'operations-grid',
) => {
  const colors = colorTokens[colorTheme];
  const layout = layoutTokens[layoutPreset];
  const breakpoints = layoutBreakpoints(layoutMode);
  const dark = mode === 'dark';

  return createTheme({
    ...(breakpoints ? { breakpoints: { values: breakpoints } } : {}),
    spacing: layout.spacing,
    shape: { borderRadius: layout.radius },
    palette: {
      mode,
      primary: {
        main: colors.primary,
        light: colors.primaryLight,
        dark: colors.primaryDark,
        contrastText: '#ffffff',
      },
      secondary: {
        main: colors.secondary,
        contrastText: '#ffffff',
      },
      success: { main: dark ? '#4dbb8b' : '#198754' },
      error: { main: dark ? '#f07178' : '#c53d4d' },
      warning: { main: dark ? '#e6a23c' : '#a86716' },
      info: { main: dark ? '#65a9df' : '#2472b8' },
      background: dark
        ? { default: colors.darkPage, paper: colors.darkPaper }
        : { default: colors.page, paper: colorTheme === 'warm-neutral' ? '#fffefa' : '#ffffff' },
      divider: dark ? 'rgba(219, 231, 243, 0.14)' : 'rgba(30, 50, 77, 0.12)',
      text: dark
        ? { primary: '#eef3f8', secondary: '#b1becc' }
        : { primary: '#17263b', secondary: '#596a7e' },
      action: dark
        ? { hover: 'rgba(226, 237, 248, 0.07)', selected: 'rgba(226, 237, 248, 0.12)' }
        : { hover: 'rgba(31, 59, 92, 0.045)', selected: 'rgba(31, 59, 92, 0.08)' },
    },
    typography: {
      fontFamily: 'Inter, "Segoe UI", Roboto, sans-serif',
      h1: { fontSize: '2.5rem', fontWeight: 650, letterSpacing: '-0.035em' },
      h2: { fontSize: '2rem', fontWeight: 650, letterSpacing: '-0.03em' },
      h3: { fontSize: '1.75rem', fontWeight: 650, letterSpacing: '-0.025em' },
      h4: { fontSize: '1.5rem', fontWeight: 650, letterSpacing: '-0.02em' },
      h5: { fontSize: '1.25rem', fontWeight: 650, letterSpacing: '-0.01em' },
      h6: { fontSize: '1rem', fontWeight: 650 },
      button: { fontWeight: 600 },
      body2: { lineHeight: 1.5 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: dark ? colors.darkPage : colors.page,
          },
          '::selection': {
            backgroundColor: `${colors.primary}33`,
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            color: dark ? '#eef3f8' : '#17263b',
            backgroundColor: dark ? colors.darkPaper : colorTheme === 'warm-neutral' ? '#fffefa' : '#ffffff',
            backgroundImage: 'none',
            borderBottom: dark ? '1px solid rgba(219, 231, 243, 0.14)' : '1px solid rgba(30, 50, 77, 0.12)',
            boxShadow: dark ? '0 1px 3px rgba(0, 0, 0, 0.28)' : '0 1px 3px rgba(15, 23, 42, 0.035)',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: layout.radius,
            minHeight: layout.buttonHeight,
            fontWeight: 600,
            boxShadow: 'none',
            '&:focus-visible': {
              outline: `3px solid ${colors.primary}66`,
              outlineOffset: 2,
            },
          },
          contained: {
            '&:hover': { boxShadow: 'none' },
          },
          sizeSmall: { minHeight: 30 },
          sizeLarge: { minHeight: 44 },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            '&:focus-visible': {
              outline: `3px solid ${colors.primary}66`,
              outlineOffset: 1,
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: layout.radius,
            border: `1px solid ${dark ? 'rgba(219, 231, 243, 0.11)' : 'rgba(30, 50, 77, 0.10)'}`,
            boxShadow: layout.cardShadow,
            backgroundImage: 'none',
            transition: 'none',
          },
        },
      },
      MuiCardHeader: {
        styleOverrides: {
          root: {
            padding: layout.cardHeaderPadding,
            ...(layoutPreset === 'sectioned-workspace'
              ? {
                  paddingBottom: '12px',
                  borderBottom: `1px solid ${dark ? 'rgba(219, 231, 243, 0.10)' : 'rgba(30, 50, 77, 0.08)'}`,
                }
              : {}),
          },
          title: { fontWeight: 650 },
        },
      },
      MuiCardContent: {
        styleOverrides: {
          root: { padding: layout.cardContentPadding },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { borderColor: dark ? 'rgba(219, 231, 243, 0.12)' : 'rgba(30, 50, 77, 0.09)' },
          head: {
            padding: layout.tableCellPadding,
            color: dark ? '#e4edf6' : '#34465d',
            backgroundColor: dark ? 'rgba(255,255,255,0.055)' : `${colors.primary}12`,
            fontWeight: 700,
            letterSpacing: '0.025em',
            whiteSpace: 'nowrap',
          },
          body: { padding: layout.tableCellPadding },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            '&.MuiTableRow-hover:hover': {
              backgroundColor: dark ? 'rgba(255,255,255,0.045)' : `${colors.primary}08`,
            },
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: Math.max(layout.radius - 2, 6),
            '&:focus-visible': {
              outline: `3px solid ${colors.primary}66`,
              outlineOffset: -2,
            },
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            minHeight: 48,
            textTransform: 'none',
            fontWeight: 600,
            paddingInline: 16,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none' },
        },
      },
      MuiFormLabel: {
        styleOverrides: {
          root: { fontWeight: 600 },
        },
      },
      MuiTableContainer: {
        styleOverrides: {
          root: {
            borderRadius: layoutPreset === 'operations-grid' ? layout.radius : layout.radius + 2,
            border: `1px solid ${dark ? 'rgba(219, 231, 243, 0.10)' : 'rgba(30, 50, 77, 0.09)'}`,
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: Math.max(layout.radius - 2, 6),
            backgroundColor: dark ? colors.darkPaper : '#ffffff',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: Math.max(layout.radius - 3, 5), fontWeight: 600 },
        },
      },
      MuiAccordion: {
        styleOverrides: {
          root: {
            borderRadius: `${layout.radius}px !important`,
            border: `1px solid ${dark ? 'rgba(219, 231, 243, 0.11)' : 'rgba(30, 50, 77, 0.10)'}`,
            boxShadow: 'none',
            '&::before': { display: 'none' },
          },
        },
      },
      MuiTextField: {
        defaultProps: {
          autoComplete: 'off',
        },
      },
      MuiDialog: {
        defaultProps: {
          disableScrollLock: true,
        },
        styleOverrides: {
          paper: { borderRadius: layout.radius + 2, backgroundImage: 'none' },
        },
      },
      MuiMenu: {
        defaultProps: {
          disableScrollLock: true,
        },
      },
      MuiPopover: {
        defaultProps: {
          disableScrollLock: true,
        },
      },
    },
  });
};

const theme = getAppTheme('light');

export default theme;
