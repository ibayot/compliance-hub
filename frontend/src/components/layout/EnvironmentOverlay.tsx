import { Box, useTheme } from '@mui/material';

type VisibleEnvironment = 'LOCAL' | 'STAGING';

function getVisibleEnvironment(): VisibleEnvironment | null {
  const configuredEnvironment = String(import.meta.env.VITE_APP_ENV || '').trim().toLowerCase();
  const environment = configuredEnvironment || (import.meta.env.DEV ? 'local' : 'production');

  if (environment === 'local' || environment === 'development') return 'LOCAL';
  if (environment === 'staging' || environment === 'stage') return 'STAGING';
  return null;
}

export default function EnvironmentOverlay() {
  const environment = getVisibleEnvironment();
  const theme = useTheme();
  if (!environment) return null;

  const isLocal = environment === 'LOCAL';
  const isDarkMode = theme.palette.mode === 'dark';
  const foregroundColor = isLocal
    ? isDarkMode ? '#90caf9' : '#0d47a1'
    : isDarkMode ? '#ffcc80' : '#8a3f00';
  const backgroundColor = isLocal
    ? isDarkMode ? 'rgba(13, 71, 161, 0.42)' : 'rgba(227, 242, 253, 0.96)'
    : isDarkMode ? 'rgba(230, 81, 0, 0.42)' : 'rgba(255, 243, 224, 0.96)';

  return (
    <Box
      aria-label={`${environment} environment`}
      sx={{
        position: 'fixed',
        left: '50%',
        bottom: 10,
        zIndex: 1400,
        px: 2,
        py: 0.6,
        border: '2px solid',
        borderColor: foregroundColor,
        borderRadius: 1,
        color: foregroundColor,
        bgcolor: backgroundColor,
        fontSize: '0.82rem',
        fontWeight: 800,
        letterSpacing: '0.18em',
        lineHeight: 1.5,
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        transform: 'translateX(-50%) rotate(-3deg)',
        userSelect: 'none',
      }}
    >
      {environment}
    </Box>
  );
}
