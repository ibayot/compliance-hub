'use client';

import React, { useEffect, useState } from 'react';
import { Box, Button, Typography, CircularProgress } from '@mui/material';
import { useSnackbar } from 'notistack';
import {
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  NavigateBefore as PrevIcon,
  NavigateNext as NextIcon,
} from '@mui/icons-material';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface DocumentViewerProps {
  /** Blob URL pointing to the document content */
  pdfUrl: string;
  /** MIME type of the document content: 'application/pdf' or 'text/html' */
  mimeType?: string;
  /** Viewer label/title for HTML iframe */
  viewerTitle?: string;
}

/** Renders a document inline. Supports PDF (react-pdf) and HTML (styled iframe) previews. */
export default function DocumentViewer({ pdfUrl, mimeType = 'application/pdf', viewerTitle = 'Document Viewer' }: DocumentViewerProps) {
  const { enqueueSnackbar } = useSnackbar();
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [htmlPreviewUrl, setHtmlPreviewUrl] = useState<string | null>(null);

  const isHtml = mimeType === 'text/html' || mimeType?.startsWith('text/html');

  useEffect(() => {
    if (!isHtml) {
      setHtmlPreviewUrl((previousUrl) => {
        if (previousUrl && previousUrl.startsWith('blob:')) {
          URL.revokeObjectURL(previousUrl);
        }
        return null;
      });
      return;
    }

    let isCancelled = false;
    const filenameHeadingRegex = /(<h1\b[^>]*>)\s*([A-Za-z0-9_.\- ]+\.(?:docx|pdf|xlsx|xls|pptx|ppt))\s*(<\/h1>)/i;
    const headerDisplayNameRegex = /(<div\s+class="display-name"[^>]*>)([\s\S]*?)(<\/div>)/i;

    (async () => {
      try {
        const response = await fetch(pdfUrl);
        const htmlText = await response.text();
        let normalizedHtml = htmlText;

        if (filenameHeadingRegex.test(normalizedHtml)) {
          normalizedHtml = normalizedHtml.replace(filenameHeadingRegex, `$1${viewerTitle}$3`);
        }

        if (headerDisplayNameRegex.test(normalizedHtml)) {
          normalizedHtml = normalizedHtml.replace(headerDisplayNameRegex, `$1${viewerTitle}$3`);
        }

        const normalizedBlobUrl = URL.createObjectURL(new Blob([normalizedHtml], { type: 'text/html' }));
        if (isCancelled) {
          URL.revokeObjectURL(normalizedBlobUrl);
          return;
        }

        setHtmlPreviewUrl((previousUrl) => {
          if (previousUrl && previousUrl.startsWith('blob:')) {
            URL.revokeObjectURL(previousUrl);
          }
          return normalizedBlobUrl;
        });
      } catch {
        if (!isCancelled) {
          setHtmlPreviewUrl(null);
        }
      }
    })();

    return () => {
      isCancelled = true;
      setHtmlPreviewUrl((previousUrl) => {
        if (previousUrl && previousUrl.startsWith('blob:')) {
          URL.revokeObjectURL(previousUrl);
        }
        return null;
      });
    };
  }, [isHtml, pdfUrl, viewerTitle]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
    setError(null);
  };

  const onDocumentLoadError = (err: Error) => {
    setError('Failed to load PDF preview. The file may still be processing.');
    enqueueSnackbar('Failed to load PDF preview. The file may still be processing.', { variant: 'error' });
    setLoading(false);
    console.error('PDF load error:', err);
  };

  const goToPrevPage = () => setPageNumber((prev) => Math.max(prev - 1, 1));
  const goToNextPage = () => setPageNumber((prev) => Math.min(prev + 1, numPages));
  const zoomIn = () => setScale((prev) => Math.min(prev + 0.2, 3.0));
  const zoomOut = () => setScale((prev) => Math.max(prev - 0.2, 0.5));

  // --- HTML preview via sandboxed iframe ---
  if (isHtml) {
    return (
      <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            px: 2,
            py: 1,
            bgcolor: 'background.paper',
            borderRadius: 1,
            boxShadow: 1,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            HTML Document Preview — rendered from extracted content
          </Typography>
          <Button size="small" component="a" href={pdfUrl} target="_blank" rel="noopener noreferrer">
            Open in Tab
          </Button>
        </Box>
        <Box
          component="iframe"
          src={htmlPreviewUrl || pdfUrl}
          title={viewerTitle}
          sandbox="allow-same-origin allow-popups allow-scripts"
          sx={{
            width: '100%',
            height: 700,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            bgcolor: '#fff',
          }}
        />
      </Box>
    );
  }

  // --- PDF preview via react-pdf ---
  return (
    <Box sx={{ width: '100%' }}>
      {/* Controls */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
          p: 2,
          bgcolor: 'background.paper',
          borderRadius: 1,
          boxShadow: 1,
        }}
      >
        {/* Page Navigation */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            size="small"
            onClick={goToPrevPage}
            disabled={pageNumber <= 1 || loading}
            startIcon={<PrevIcon />}
          >
            Prev
          </Button>
          <Typography variant="body2">
            Page {pageNumber} of {numPages || '...'}
          </Typography>
          <Button
            size="small"
            onClick={goToNextPage}
            disabled={pageNumber >= numPages || loading}
            endIcon={<NextIcon />}
          >
            Next
          </Button>
        </Box>

        {/* Zoom Controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button size="small" onClick={zoomOut} disabled={loading} startIcon={<ZoomOutIcon />}>
            Zoom Out
          </Button>
          <Typography variant="body2">{Math.round(scale * 100)}%</Typography>
          <Button size="small" onClick={zoomIn} disabled={loading} endIcon={<ZoomInIcon />}>
            Zoom In
          </Button>
        </Box>
      </Box>

      {/* PDF Display */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 600,
          bgcolor: 'grey.100',
          borderRadius: 1,
          overflow: 'auto',
          position: 'relative',
        }}
      >
        {loading && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            <CircularProgress />
            <Typography variant="body2" sx={{ mt: 2 }}>
              Loading preview...
            </Typography>
          </Box>
        )}

        {error && (
          <Typography color="warning.main" sx={{ m: 2 }}>
            {error}
          </Typography>
        )}

        {!error && (
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading=""
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              renderTextLayer={true}
              renderAnnotationLayer={true}
            />
          </Document>
        )}
      </Box>
    </Box>
  );
}
