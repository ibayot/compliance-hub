import { Box } from '@mui/material';

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
  if (!environment) return null;

  const isLocal = environment === 'LOCAL';

  return (
    <Box
      aria-label={`${environment} environment`}
      sx={{
        position: 'fixed',
        left: '50%',
        bottom: 10,
        zIndex: 1400,
        px: 1.25,
        py: 0.25,
        border: '1px solid',
        borderColor: isLocal ? 'rgba(25, 118, 210, 0.65)' : 'rgba(237, 108, 2, 0.7)',
        borderRadius: 1,
        color: isLocal ? 'rgba(25, 118, 210, 0.78)' : 'rgba(180, 83, 9, 0.82)',
        bgcolor: isLocal ? 'rgba(227, 242, 253, 0.72)' : 'rgba(255, 243, 224, 0.78)',
        fontSize: '0.64rem',
        fontWeight: 700,
        letterSpacing: '0.14em',
        lineHeight: 1.4,
        pointerEvents: 'none',
        transform: 'translateX(-50%) rotate(-3deg)',
        userSelect: 'none',
      }}
    >
      {environment}
    </Box>
  );
}
