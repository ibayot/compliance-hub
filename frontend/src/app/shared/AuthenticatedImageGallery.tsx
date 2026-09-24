import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { apiClient } from '@/lib/api/client';

export interface AuthenticatedImageItem {
  url: string;
  alt?: string;
}

interface AuthenticatedImageGalleryProps {
  images: AuthenticatedImageItem[];
  thumbnailStyle?: React.CSSProperties;
  emptyText?: string;
}

type LoadedImage = { objectUrl?: string; error?: boolean };

export default function AuthenticatedImageGallery({
  images,
  thumbnailStyle,
  emptyText,
}: AuthenticatedImageGalleryProps) {
  const [loaded, setLoaded] = useState<Record<string, LoadedImage>>({});
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const imageUrlKey = images.map((image) => image.url).join('\u0000');
  const uniqueUrls = useMemo(
    () => [...new Set(imageUrlKey ? imageUrlKey.split('\u0000') : [])],
    [imageUrlKey],
  );

  useEffect(() => {
    let active = true;
    const createdUrls: string[] = [];

    Promise.all(
      uniqueUrls.map(async (url) => {
        try {
          const response = await apiClient.get(url, { responseType: 'blob' });
          const objectUrl = URL.createObjectURL(response.data);
          if (!active) {
            URL.revokeObjectURL(objectUrl);
            return [url, { error: true }] as const;
          }
          createdUrls.push(objectUrl);
          return [url, { objectUrl }] as const;
        } catch {
          return [url, { error: true }] as const;
        }
      }),
    ).then((entries) => {
      if (active) setLoaded(Object.fromEntries(entries));
    });

    return () => {
      active = false;
      createdUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [uniqueUrls]);

  useEffect(() => {
    if (openIndex != null && openIndex >= images.length) setOpenIndex(null);
  }, [images.length, openIndex]);

  if (images.length === 0) {
    return emptyText ? (
      <Typography variant="caption" color="text.secondary">
        {emptyText}
      </Typography>
    ) : null;
  }

  const move = (offset: number) => {
    setOpenIndex((current) => {
      if (current == null || images.length === 0) return current;
      return (current + offset + images.length) % images.length;
    });
  };
  const currentImage = openIndex == null ? null : images[openIndex];
  const currentLoaded = currentImage ? loaded[currentImage.url] : null;

  return (
    <>
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
        {images.map((image, index) => {
          const state = loaded[image.url];
          return (
            <Box
              key={`${image.url}-${index}`}
              component="button"
              type="button"
              aria-label={`Open ${image.alt || `image ${index + 1}`}`}
              onClick={() => state?.objectUrl && setOpenIndex(index)}
              sx={{
                p: 0,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                bgcolor: 'transparent',
                overflow: 'hidden',
                cursor: state?.objectUrl ? 'pointer' : 'default',
                minWidth: 80,
                minHeight: 80,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {state?.objectUrl ? (
                <Box
                  component="img"
                  src={state.objectUrl}
                  alt={image.alt || `Image ${index + 1}`}
                  sx={{
                    width: 120,
                    height: 120,
                    objectFit: 'cover',
                    display: 'block',
                    ...thumbnailStyle,
                  }}
                />
              ) : state?.error ? (
                <Typography color="error" variant="caption" px={1}>
                  Failed to load
                </Typography>
              ) : (
                <CircularProgress size={22} />
              )}
            </Box>
          );
        })}
      </Stack>

      <Dialog
        open={openIndex != null}
        onClose={() => setOpenIndex(null)}
        maxWidth="lg"
        fullWidth
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') move(-1);
          if (event.key === 'ArrowRight') move(1);
        }}
        PaperProps={{ sx: { bgcolor: 'black', borderRadius: 2, position: 'relative' } }}
      >
        <DialogContent
          sx={{
            p: 0,
            minHeight: { xs: 320, sm: 480 },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <IconButton
            aria-label="Close image viewer"
            onClick={() => setOpenIndex(null)}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              zIndex: 2,
              color: 'white',
              bgcolor: 'rgba(0,0,0,0.45)',
            }}
          >
            <CloseIcon />
          </IconButton>
          {currentLoaded?.objectUrl && currentImage && (
            <Box
              component="img"
              src={currentLoaded.objectUrl}
              alt={currentImage.alt || `Image ${(openIndex ?? 0) + 1}`}
              sx={{ maxWidth: '100%', maxHeight: '82vh', objectFit: 'contain', display: 'block' }}
            />
          )}
          {images.length > 1 && (
            <>
              <IconButton
                aria-label="Previous image"
                onClick={() => move(-1)}
                sx={{
                  position: 'absolute',
                  left: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'white',
                  bgcolor: 'rgba(0,0,0,0.45)',
                }}
              >
                <NavigateBeforeIcon />
              </IconButton>
              <IconButton
                aria-label="Next image"
                onClick={() => move(1)}
                sx={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'white',
                  bgcolor: 'rgba(0,0,0,0.45)',
                }}
              >
                <NavigateNextIcon />
              </IconButton>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ bgcolor: 'black', justifyContent: 'space-between', px: 2 }}>
          <Typography variant="caption" color="grey.400">
            {openIndex == null ? '' : `${openIndex + 1} / ${images.length}`}
          </Typography>
          <Button onClick={() => setOpenIndex(null)} sx={{ color: 'grey.300' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
