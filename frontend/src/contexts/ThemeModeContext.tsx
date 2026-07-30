'use client';

import React, { createContext, useContext, useMemo, useState } from 'react';
import { ThemeProvider, styled } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { SnackbarProvider, MaterialDesignContent } from 'notistack';
import { getAppTheme } from '@/lib/theme';

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
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
};

const ThemeModeContext = createContext<ThemeModeContextValue | undefined>(undefined);

export function ThemeModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('app-theme-mode') : null;
    return stored === 'dark' ? 'dark' : 'light';
  });

  const setMode = React.useCallback((nextMode: ThemeMode) => {
    setModeState(nextMode);
    localStorage.setItem('app-theme-mode', nextMode);
  }, []);

  const toggleMode = React.useCallback(() => {
    setMode(mode === 'light' ? 'dark' : 'light');
  }, [mode, setMode]);

  const value = useMemo(() => ({ mode, setMode, toggleMode }), [mode, setMode, toggleMode]);

  const theme = useMemo(() => getAppTheme(mode), [mode]);

  return (
    <ThemeModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <SnackbarProvider
          maxSnack={4}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          autoHideDuration={4000}
          style={{ marginTop: 8 }}
          Components={{
            success: StyledMaterialDesignContent,
            error: StyledMaterialDesignContent,
            warning: StyledMaterialDesignContent,
            info: StyledMaterialDesignContent,
          }}
        >
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
