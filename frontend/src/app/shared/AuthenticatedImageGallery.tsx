import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import { apiClient } from '@/lib/api/client';

export interface AuthenticatedImageItem {
  url: string;
  alt?: string;
}

interface AuthenticatedImageGalleryProps {
  images: AuthenticatedImageItem[];
  thumbnailStyle?: React.CSSProperties;
  emptyText?: string;
  onReplace?: (image: AuthenticatedImageItem, index: number) => void;
}

type LoadedImage = { objectUrl?: string; error?: boolean };
const zoomLevels = [1, 1.5, 2, 3, 4];

export default function AuthenticatedImageGallery({
  images,
  thumbnailStyle,
  emptyText,
  onReplace,
}: AuthenticatedImageGalleryProps) {
  const [imageLoad, setImageLoad] = useState<{ key: string; entries: Record<string, LoadedImage> }>();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [zoomIndex, setZoomIndex] = useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const captionId = useId();
  const imageUrlKey = images.map((image) => image.url).join('\u0000');
  const loaded = imageLoad?.key === imageUrlKey ? imageLoad.entries : undefined;
  const uniqueUrls = useMemo(
    () => [...new Set(imageUrlKey ? imageUrlKey.split('\u0000') : [])],
    [imageUrlKey],
  );

  useEffect(() => {
    const controller = new AbortController();
    const createdUrls: string[] = [];

    Promise.all(
      uniqueUrls.map(async (url) => {
        try {
          const response = await apiClient.get(url, { responseType: 'blob', signal: controller.signal });
          if (controller.signal.aborted) return [url, { error: true }] as const;
          const objectUrl = URL.createObjectURL(response.data);
          createdUrls.push(objectUrl);
          return [url, { objectUrl }] as const;
        } catch {
          return [url, { error: true }] as const;
        }
      }),
    ).then((entries) => {
      if (!controller.signal.aborted) setImageLoad({ key: imageUrlKey, entries: Object.fromEntries(entries) });
    });

    return () => {
      controller.abort();
      createdUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imageUrlKey, uniqueUrls]);

  useEffect(() => {
    if (openIndex != null && openIndex >= images.length) setOpenIndex(null);
  }, [images.length, openIndex]);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.scrollLeft = (viewport.scrollWidth - viewport.clientWidth) / 2;
    viewport.scrollTop = (viewport.scrollHeight - viewport.clientHeight) / 2;
  }, [openIndex, zoomIndex]);

  if (images.length === 0) {
    return emptyText ? (
      <Typography variant="caption" color="text.secondary">
        {emptyText}
      </Typography>
    ) : null;
  }

  const move = (offset: number) => {
    setZoomIndex(0);
    setOpenIndex((current) => {
      if (current == null || images.length === 0) return current;
      return (current + offset + images.length) % images.length;
    });
  };
  const currentImage = openIndex == null ? null : images[openIndex];
  const currentLoaded = currentImage ? loaded?.[currentImage.url] : null;
  const canZoom = !!currentLoaded?.objectUrl;
  const changeZoom = (offset: number) => {
    if (canZoom) setZoomIndex((current) => Math.max(0, Math.min(zoomLevels.length - 1, current + offset)));
  };
  const zoom = zoomLevels[zoomIndex];

  return (
    <>
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
        {images.map((image, index) => {
          const state = loaded?.[image.url];
          return (
            <Box key={`${image.url}-${index}`}>
              <Box
                component="button"
                type="button"
                aria-label={`Open ${image.alt || `image ${index + 1}`}`}
                onClick={() => {
                  if (state?.objectUrl) {
                    setZoomIndex(0);
                    setOpenIndex(index);
                  }
                }}
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
              {onReplace && (
                <Button
                  size="small"
                  onClick={() => onReplace(image, index)}
                  aria-label={`Replace ${image.alt || `image ${index + 1}`}`}
                >
                  Replace
                </Button>
              )}
            </Box>
          );
        })}
      </Stack>

      <Dialog
        open={openIndex != null}
        onClose={() => setOpenIndex(null)}
        aria-labelledby={captionId}
        maxWidth={false}
        onKeyDown={(event) => {
          if (event.key === '+' || event.key === '=') changeZoom(1);
          if (event.key === '-') changeZoom(-1);
          if (event.key === '0') setZoomIndex(0);
          if (zoom > 1 && event.target === viewportRef.current) return;
          if (images.length > 1 && event.key === 'ArrowLeft') move(-1);
          if (images.length > 1 && event.key === 'ArrowRight') move(1);
        }}
        PaperProps={{ sx: { bgcolor: 'transparent', boxShadow: 'none', backgroundImage: 'none', m: 1,
          width: 'min(1100px, calc(100vw - 16px))', maxHeight: 'calc(100dvh - 16px)' } }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}
          sx={{ bgcolor: 'background.paper', color: 'text.primary', borderRadius: 2, pl: 1.5, mb: 1 }}>
          <Typography id={captionId} component="h2" variant="subtitle2" sx={{ overflowWrap: 'anywhere' }}>
            {currentImage?.alt || 'Attachment image'}{images.length > 1 ? ` · ${(openIndex ?? 0) + 1} of ${images.length}` : ''}
          </Typography>
          <IconButton aria-label="Close image viewer" onClick={() => setOpenIndex(null)}>
            <CloseIcon />
          </IconButton>
        </Stack>
        <DialogContent ref={viewportRef} tabIndex={0} aria-label="Image preview area"
          sx={{ p: 0, flex: '0 1 auto', height: 'min(70dvh, 780px)', minHeight: 0,
            overflow: zoom > 1 ? 'auto' : 'hidden', overscrollBehavior: 'contain' }}>
          <Box sx={{ width: `${zoom * 100}%`, height: `${zoom * 100}%`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {currentLoaded?.objectUrl && currentImage ? (
              <Box component="img" src={currentLoaded.objectUrl} alt={currentImage.alt || 'Attachment image'}
                sx={{ display: 'block', width: '100%', height: '100%', minHeight: 0, objectFit: 'contain', borderRadius: 2 }} />
            ) : currentLoaded?.error ? (
              <Typography sx={{ bgcolor: 'background.paper', color: 'text.primary', p: 2, borderRadius: 2 }}>
                Image could not be loaded.
              </Typography>
            ) : <CircularProgress aria-label="Loading image" />}
          </Box>
        </DialogContent>
        <Stack direction="row" justifyContent="center" alignItems="center" sx={{ bgcolor: 'background.paper',
          color: 'text.primary', borderRadius: 2, mt: 1, alignSelf: 'center' }}>
          {images.length > 1 && (
            <Tooltip title="Previous image"><IconButton aria-label="Previous image" onClick={() => move(-1)}>
              <NavigateBeforeIcon />
            </IconButton></Tooltip>
          )}
          <IconButton aria-label="Zoom out" disabled={!canZoom || zoomIndex === 0} onClick={() => changeZoom(-1)}>
            <ZoomOutIcon />
          </IconButton>
          <Button aria-label={`Reset image zoom, current zoom ${zoom * 100}%`} onClick={() => setZoomIndex(0)} disabled={!canZoom}>
            {zoom * 100}%
          </Button>
          <IconButton aria-label="Zoom in" disabled={!canZoom || zoomIndex === zoomLevels.length - 1} onClick={() => changeZoom(1)}>
            <ZoomInIcon />
          </IconButton>
          {images.length > 1 && (
            <Tooltip title="Next image"><IconButton aria-label="Next image" onClick={() => move(1)}>
              <NavigateNextIcon />
            </IconButton></Tooltip>
          )}
        </Stack>
      </Dialog>
    </>
  );
}
