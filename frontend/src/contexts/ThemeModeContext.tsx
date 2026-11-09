'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ThemeProvider, styled } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { SnackbarProvider, MaterialDesignContent, closeSnackbar, useSnackbar } from 'notistack';
import CloseIcon from '@mui/icons-material/Close';
import IconButton from '@mui/material/IconButton';
import { getAppTheme } from '@/lib/theme';
import type { AppLayoutMode } from '@/lib/theme';
import type {
  AppAppearancePreferences,
  AppColorTheme,
  AppLayoutPreset,
} from '@/lib/appearance';

const StyledMaterialDesignContent = styled(MaterialDesignContent)(({ theme }) => ({
  '&.notistack-MuiContent-success': {
    backgroundColor: theme.palette.success.main,
  },
  '&.notistack-MuiContent-error': {
    backgroundColor: theme.palette.error.main,
  },
  '&.notistack-MuiContent-warning': {
    backgroundColor: theme.palette.warning.main,
  },
  '&.notistack-MuiContent-info': {
    backgroundColor: theme.palette.info.main,
  },
}));

type ThemeMode = 'light' | 'dark';

type ThemeModeContextValue = {
  mode: ThemeMode;
  colorTheme: AppColorTheme;
  layoutPreset: AppLayoutPreset;
  setAppearance: (preferences: AppAppearancePreferences) => void;
  appearanceReady: boolean;
  setAppearanceReady: (ready: boolean) => void;
  layoutMode: AppLayoutMode;
  setLayoutMode: (mode: AppLayoutMode) => void;
  toggleLayoutMode: () => void;
};

const ThemeModeContext = createContext<ThemeModeContextValue | undefined>(undefined);

const NETWORK_STATUS_SNACKBAR_KEY = 'network-status';

function NetworkStatusNotifier() {
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    let wasOffline = !navigator.onLine;

    const showOffline = () => {
      wasOffline = true;
      enqueueSnackbar(
        'You are offline. Live updates are paused and changes cannot be saved until your connection returns.',
        {
          key: NETWORK_STATUS_SNACKBAR_KEY,
          variant: 'warning',
          persist: true,
        },
      );
    };

    const showRestored = () => {
      closeSnackbar(NETWORK_STATUS_SNACKBAR_KEY);
      if (wasOffline) {
        enqueueSnackbar('Internet connection restored. Notifications are being refreshed.', {
          variant: 'success',
        });
      }
      wasOffline = false;
    };

    if (wasOffline) showOffline();
    window.addEventListener('offline', showOffline);
    window.addEventListener('online', showRestored);
    return () => {
      window.removeEventListener('offline', showOffline);
      window.removeEventListener('online', showRestored);
      closeSnackbar(NETWORK_STATUS_SNACKBAR_KEY);
    };
  }, [enqueueSnackbar]);

  return null;
}

export function ThemeModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('app-theme-mode') : null;
    return stored === 'dark' ? 'dark' : 'light';
  });

  const [layoutMode, setLayoutModeState] = useState<AppLayoutMode>(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('app-layout-mode') : null;
    return stored === 'mobile' ? 'mobile' : 'web';
  });

  const setLayoutMode = React.useCallback((nextMode: AppLayoutMode) => {
    setLayoutModeState(nextMode);
    localStorage.setItem('app-layout-mode', nextMode);
  }, []);

  const toggleLayoutMode = React.useCallback(() => {
    setLayoutMode(layoutMode === 'web' ? 'mobile' : 'web');
  }, [layoutMode, setLayoutMode]);

  const [colorTheme, setColorThemeState] = useState<AppColorTheme>(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('app-color-theme') : null;
    return stored === 'slate-teal' || stored === 'warm-neutral' ? stored : 'clean-blue';
  });

  const [layoutPreset, setLayoutPresetState] = useState<AppLayoutPreset>(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('app-layout-preset') : null;
    return stored === 'split-pane-workbench' || stored === 'sectioned-workspace'
      ? stored
      : 'operations-grid';
  });

  const [appearanceReady, setAppearanceReady] = useState(false);

  const setAppearance = React.useCallback((preferences: AppAppearancePreferences) => {
    setModeState(preferences.mode);
    setColorThemeState(preferences.colorTheme);
    setLayoutPresetState(preferences.layoutPreset);
    localStorage.setItem('app-theme-mode', preferences.mode);
    localStorage.setItem('app-color-theme', preferences.colorTheme);
    localStorage.setItem('app-layout-preset', preferences.layoutPreset);
  }, []);

  const value = useMemo(
    () => ({
      mode,
      colorTheme,
      layoutPreset,
      setAppearance,
      appearanceReady,
      setAppearanceReady,
      layoutMode,
      setLayoutMode,
      toggleLayoutMode,
    }),
    [
      mode,
      colorTheme,
      layoutPreset,
      setAppearance,
      appearanceReady,
      setAppearanceReady,
      layoutMode,
      setLayoutMode,
      toggleLayoutMode,
    ],
  );

  const theme = useMemo(
    () => getAppTheme(mode, layoutMode, colorTheme, layoutPreset),
    [mode, layoutMode, colorTheme, layoutPreset],
  );

  return (
    <ThemeModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <SnackbarProvider
          maxSnack={3}
          preventDuplicate
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          autoHideDuration={4000}
          disableWindowBlurListener
          action={(key) => (
            <IconButton
              size="small"
              color="inherit"
              aria-label="Close message"
              onClick={() => closeSnackbar(key)}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          )}
          style={{ marginTop: 8 }}
          Components={{
            success: StyledMaterialDesignContent,
            error: StyledMaterialDesignContent,
            warning: StyledMaterialDesignContent,
            info: StyledMaterialDesignContent,
          }}
        >
          <NetworkStatusNotifier />
          {children}
        </SnackbarProvider>
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}

export function useThemeMode() {
  const context = useContext(ThemeModeContext);
  if (!context) {
    throw new Error('useThemeMode must be used within ThemeModeProvider');
  }
  return context;
}
