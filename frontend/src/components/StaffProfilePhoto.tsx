import { useId, useState } from 'react';
import { Avatar, Box, ButtonBase, Dialog, IconButton, Typography } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';

type StaffProfilePhotoProps = {
  staffId?: string | null;
  name: string;
  size?: number;
};

function initialsFor(name: string) {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'U';
}

export default function StaffProfilePhoto({ staffId, name, size = 40 }: StaffProfilePhotoProps) {
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const titleId = useId();
  const imageRoot = String(import.meta.env.VITE_PROFILE_IMAGE_URL || '').trim().replace(/\/+$/, '');
  const normalizedStaffId = String(staffId || '').trim();
  const imageUrl = imageRoot && normalizedStaffId
    ? `${imageRoot}/${encodeURIComponent(normalizedStaffId)}.jpg`
    : '';
  const available = !!imageUrl && !failed;

  const handleImageError = () => {
    setFailed(true);
    setOpen(false);
  };

  return (
    <>
      <ButtonBase
        type="button"
        disabled={!available}
        onClick={() => setOpen(true)}
        aria-label={available ? `View ${name} profile photo` : `${name} profile photo unavailable`}
        sx={{
          flexShrink: 0,
          borderRadius: '50%',
          '&:focus-visible': { outline: '3px solid', outlineColor: 'primary.main', outlineOffset: 2 },
        }}
      >
        <Avatar
          src={available ? imageUrl : undefined}
          alt={`${name} profile photo`}
          imgProps={{
            onError: handleImageError,
            style: { objectPosition: 'center 20%' },
          }}
          sx={{
            width: size,
            height: size,
            bgcolor: 'action.selected',
            color: 'text.primary',
            cursor: available ? 'zoom-in' : 'default',
          }}
        >
          {initialsFor(name)}
        </Avatar>
      </ButtonBase>

      <Dialog
        open={open && available}
        onClose={() => setOpen(false)}
        maxWidth={false}
        aria-labelledby={titleId}
        PaperProps={{
          sx: {
            width: 'min(440px, calc(100vw - 24px))',
            height: 'min(560px, calc(100vh - 32px))',
            maxWidth: 'none',
            m: 1,
            overflow: 'visible',
            backgroundColor: 'transparent',
            boxShadow: 'none',
          },
        }}
      >
        <Box
          sx={{
            width: '100%',
            height: '100%',
            minHeight: 0,
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1.5,
          }}
        >
          <IconButton
            aria-label="Close profile photo"
            onClick={() => setOpen(false)}
            sx={{
              position: 'absolute',
              top: 4,
              right: 4,
              zIndex: 1,
              color: 'common.white',
              bgcolor: 'rgba(0, 0, 0, 0.62)',
              '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.82)' },
            }}
          >
            <CloseRoundedIcon />
          </IconButton>
          <Box
            sx={{
              width: '100%',
              flex: 1,
              minHeight: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'visible',
            }}
          >
            <Box
              component="img"
              src={imageUrl}
              alt={`${name} profile photo`}
              onError={handleImageError}
              sx={{
                display: 'block',
                width: '100%',
                height: '100%',
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'cover',
                objectPosition: 'center 20%',
                filter: 'contrast(1.04) saturate(1.04)',
                borderRadius: '18px',
                boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.28), 0 14px 30px rgba(0, 0, 0, 0.32), 0 32px 64px rgba(0, 0, 0, 0.52)',
              }}
            />
          </Box>
          <Typography
            id={titleId}
            component="h2"
            variant="subtitle1"
            fontWeight={700}
            textAlign="center"
            sx={{
              width: 'fit-content',
              maxWidth: '100%',
              px: 2,
              py: 0.75,
              borderRadius: 2.5,
              border: '1px solid rgba(255, 255, 255, 0.16)',
              bgcolor: 'rgba(12, 16, 24, 0.68)',
              color: 'common.white',
              overflowWrap: 'anywhere',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.42)',
              textShadow: '0 2px 8px rgba(0, 0, 0, 0.9)',
            }}
          >
            {name}
          </Typography>
        </Box>
      </Dialog>
    </>
  );
}
