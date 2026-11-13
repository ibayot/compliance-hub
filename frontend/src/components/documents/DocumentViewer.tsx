'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, Typography, CircularProgress } from '@mui/material';
import { useSnackbar } from 'notistack';
import {
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  NavigateBefore as PrevIcon,
  NavigateNext as NextIcon,
} from '@mui/icons-material';
import { Document, Page, pdfjs } from 'react-pdf';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

interface DocumentViewerProps {
  previewBlob: Blob;
  /** MIME type of the document content: 'application/pdf' or 'text/html' */
  mimeType?: string;
  /** Viewer label/title for HTML iframe */
  viewerTitle?: string;
}

/** Renders a document inline. Supports PDF (react-pdf) and HTML (styled iframe) previews. */
export default function DocumentViewer({
  previewBlob,
  mimeType = 'application/pdf',
  viewerTitle = 'Document Viewer',
}: DocumentViewerProps) {
  const { enqueueSnackbar } = useSnackbar();
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [htmlPreview, setHtmlPreview] = useState<{ source: Blob; markup: string | null }>();
  const [pdfFile, setPdfFile] = useState<{ source: Blob; file: { data: Uint8Array } }>();
  const pdfViewport = useRef<HTMLDivElement>(null);
  const [pdfWidth, setPdfWidth] = useState(0);

  const isHtml = mimeType === 'text/html' || mimeType?.startsWith('text/html');

  useEffect(() => {
    let active = true;
    if (!isHtml) {
      // The authorized API request already returned the file. Reading its bytes
      // avoids a second fetch through a blob URL and its browser CSP restrictions.
      void previewBlob.arrayBuffer().then((buffer) => {
        if (active) setPdfFile({ source: previewBlob, file: { data: new Uint8Array(buffer) } });
      }).catch(() => {
        if (!active) return;
        setError('Could not read the PDF preview.');
        setLoading(false);
      });
      return () => { active = false; };
    }

    const filenameHeadingRegex =
      /(<h1\b[^>]*>)\s*([A-Za-z0-9_.\- ]+\.(?:docx|pdf|xlsx|xls|pptx|ppt))\s*(<\/h1>)/i;
    const headerDisplayNameRegex = /(<div\s+class="display-name"[^>]*>)([\s\S]*?)(<\/div>)/i;

    (async () => {
      try {
        const htmlText = await previewBlob.text();
        const safeTitle = viewerTitle.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const normalizedHtml = htmlText.replace(filenameHeadingRegex, (_, start, _name, end) => start + safeTitle + end)
          .replace(headerDisplayNameRegex, (_, start, _name, end) => start + safeTitle + end);
        const policy = '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src data:; style-src \'unsafe-inline\'; base-uri \'none\'; form-action \'none\'">';
        const markup = /<head\b[^>]*>/i.test(normalizedHtml)
          ? normalizedHtml.replace(/<head\b[^>]*>/i, (head) => head + policy)
          : policy + normalizedHtml;
        if (active) setHtmlPreview({ source: previewBlob, markup });
      } catch {
        if (active) setHtmlPreview({ source: previewBlob, markup: null });
      }
    })();

    return () => { active = false; };
  }, [isHtml, previewBlob, viewerTitle]);

  useEffect(() => {
    const container = pdfViewport.current;
    if (isHtml || !container) return;
    const measure = () => {
      if (container.clientWidth > 0) setPdfWidth(Math.min(800, container.clientWidth));
    };
    measure();
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : undefined;
    observer?.observe(container);
    window.addEventListener('resize', measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [isHtml]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
    setError(null);
  };

  const onDocumentLoadError = (err: Error) => {
    setError('Failed to load PDF preview. The file may still be processing.');
    enqueueSnackbar('Failed to load PDF preview. The file may still be processing.', {
      variant: 'error',
    });
    setLoading(false);
    console.error('PDF load error:', err);
  };

  const goToPrevPage = () => setPageNumber((prev) => Math.max(prev - 1, 1));
  const goToNextPage = () => setPageNumber((prev) => Math.min(prev + 1, numPages));
  const zoomIn = () => setScale((prev) => Math.min(prev + 0.2, 3.0));
  const zoomOut = () => setScale((prev) => Math.max(prev - 0.2, 0.5));

  // --- HTML preview via sandboxed iframe ---
  if (isHtml) {
    const current = htmlPreview?.source === previewBlob ? htmlPreview : undefined;
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
        </Box>
        {current?.markup ? <Box
          component="iframe"
          srcDoc={current.markup}
          title={viewerTitle}
          sandbox=""
          sx={{
            width: '100%',
            height: { xs: '62dvh', sm: 700 },
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            bgcolor: '#fff',
          }}
        /> : <Typography role={current ? 'alert' : 'status'} p={2}>
          {current ? 'Could not open the document preview.' : 'Loading document preview…'}
        </Typography>}
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
          flexWrap: 'wrap',
          gap: 1,
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
          p: { xs: 1, sm: 2 },
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
        ref={pdfViewport}
        sx={{
          display: 'flex',
          alignItems: 'center',
          minHeight: { xs: 280, sm: 480 },
          bgcolor: 'action.hover',
          borderRadius: 1,
          overflow: 'auto',
          position: 'relative',
          '& .document-pdf': { flexShrink: 0, mx: 'auto' },
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

        {!error && pdfFile?.source === previewBlob && (
          <Document
            file={pdfFile.file}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading=""
            className="document-pdf"
          >
            <Page
              pageNumber={pageNumber}
              width={pdfWidth || undefined}
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
