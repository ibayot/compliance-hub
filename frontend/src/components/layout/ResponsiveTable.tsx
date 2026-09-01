import React, { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Box, IconButton, SxProps, TableContainer, Theme } from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';

type ResponsiveTableProps = {
  children: ReactNode;
  minWidth?: number | string;
  maxHeight?: number | string;
  component?: React.ElementType;
  tableContainerSx?: SxProps<Theme>;
  testId?: string;
};

/** A horizontally scrollable table with controls pinned to its visible viewport. */
export default function ResponsiveTable({
  children,
  minWidth,
  maxHeight,
  component,
  tableContainerSx,
  testId,
}: ResponsiveTableProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const syncScrollState = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const overflow = container.scrollWidth > container.clientWidth + 1;
    setHasOverflow(overflow);
    setCanScrollLeft(overflow && container.scrollLeft > 1);
    setCanScrollRight(
      overflow && container.scrollLeft + container.clientWidth < container.scrollWidth - 1,
    );
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    syncScrollState();
    container.addEventListener('scroll', syncScrollState, { passive: true });
    window.addEventListener('resize', syncScrollState);
    const observer = new ResizeObserver(syncScrollState);
    observer.observe(container);
    const mutationObserver = new MutationObserver(syncScrollState);
    mutationObserver.observe(container, { childList: true, subtree: true, attributes: true });
    requestAnimationFrame(syncScrollState);
    return () => {
      container.removeEventListener('scroll', syncScrollState);
      window.removeEventListener('resize', syncScrollState);
      observer.disconnect();
      mutationObserver.disconnect();
    };
  }, [syncScrollState, children]);

  const scroll = (direction: -1 | 1) => {
    const container = containerRef.current;
    if (!container) return;
    container.scrollBy({
      left: direction * Math.max(container.clientWidth * 0.8, 180),
      behavior: 'smooth',
    });
  };

  return (
    <Box data-testid={testId} sx={{ width: '100%', minWidth: 0 }}>
      {hasOverflow && (
        <Box
          role="toolbar"
          aria-label="Table horizontal scroll controls"
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            minHeight: 40,
            position: 'sticky',
            top: 0,
            zIndex: 6,
            bgcolor: 'background.paper',
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <IconButton
            size="small"
            disabled={!canScrollLeft}
            aria-label="Scroll table left"
            data-testid="responsive-table-scroll-left"
            onClick={() => scroll(-1)}
          >
            <ChevronLeft fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            disabled={!canScrollRight}
            aria-label="Scroll table right"
            data-testid="responsive-table-scroll-right"
            onClick={() => scroll(1)}
          >
            <ChevronRight fontSize="small" />
          </IconButton>
        </Box>
      )}
      <TableContainer
        ref={containerRef}
        {...(component ? { component } : {})}
        sx={{
          maxHeight,
          overflowX: 'auto',
          minWidth: 0,
          '& > table': minWidth ? { minWidth } : undefined,
          ...tableContainerSx,
        }}
      >
        {children}
      </TableContainer>
    </Box>
  );
}
