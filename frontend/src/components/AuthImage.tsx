import React, { useState, useEffect } from 'react';
import { Box, CircularProgress, Dialog, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { apiClient } from '@/lib/api/client';

interface AuthImageProps {
  url: string;
  alt?: string;
  style?: React.CSSProperties;
}

export function AuthImage({ url, alt = 'Image', style }: AuthImageProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchImage = async () => {
      try {
        const response = await apiClient.get(url, { responseType: 'blob' });
        if (active) {
          const blob = response.data;
          console.log(`AuthImage downloaded Blob - Size: ${blob.size}, Type: ${blob.type}`);
          const blobUrl = URL.createObjectURL(blob);
          setObjectUrl(blobUrl);
          setLoading(false);
        }
      } catch (err) {
        console.error('AuthImage load error for URL:', url, err);
        if (active) {
          setError(true);
          setLoading(false);
        }
      }
    };
    fetchImage();
    return () => {
      active = false;
      // Object URL cleanup is handled carefully here, but because StrictMode runs this twice, 
      // we only revoke on unmount to prevent accidentally destroying a valid blob URL.
      // A more robust app might keep a global cache of blob URLs per endpoint.
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [url]);

  if (loading) return <CircularProgress size={24} />;
  if (error) return <Typography color="error" variant="caption">Failed to load image</Typography>;

  return (
    <>
      <img
        src={objectUrl || ''}
        alt={alt}
        style={{ ...style, cursor: 'pointer' }}
        onClick={() => setOpen(true)}
      />
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="lg">
        <Box sx={{ position: 'relative', bgcolor: 'black', textAlign: 'center', p: 4, minWidth: '300px' }}>
          <IconButton
            onClick={() => setOpen(false)}
            sx={{ position: 'absolute', top: 8, right: 8, color: 'white' }}
          >
            <CloseIcon />
          </IconButton>
          <img
            src={objectUrl || ''}
            alt={alt}
            style={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain' }}
          />
        </Box>
      </Dialog>
    </>
  );
}
