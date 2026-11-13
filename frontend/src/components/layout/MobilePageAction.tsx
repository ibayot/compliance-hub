import { useEffect, useState } from 'react';
import { Add, Edit } from '@mui/icons-material';
import { Fab, Tooltip, useMediaQuery, useTheme } from '@mui/material';
import { useMobileNavigation } from '@/contexts/MobileNavigationContext';

export default function MobilePageAction() {
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down('md'));
  const { pageAction } = useMobileNavigation();
  const button = pageAction?.button;
  const [availableButton, setAvailableButton] = useState<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!mobile || !button || typeof IntersectionObserver === 'undefined') return;

    let observer: IntersectionObserver | undefined;
    let outside = false;
    const update = () => setAvailableButton(outside && !button.disabled ? button : null);
    const header = document.getElementById('app-top-bar');
    const nav = document.getElementById('app-mobile-nav');
    const observe = () => {
      observer?.disconnect();
      const top = Math.ceil(Math.max(0, header?.getBoundingClientRect().bottom ?? 0));
      const bottom = Math.ceil(Math.max(0, nav ? window.innerHeight - nav.getBoundingClientRect().top : 0));
      observer = new IntersectionObserver(([entry]) => {
        outside = !entry.isIntersecting && entry.boundingClientRect.height > 0;
        update();
      }, { rootMargin: `-${top}px 0px -${bottom}px 0px` });
      observer.observe(button);
    };

    const chromeSize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(observe);
    if (header) chromeSize?.observe(header);
    if (nav) chromeSize?.observe(nav);
    const availability = new MutationObserver(update);
    availability.observe(button, { attributes: true, attributeFilter: ['disabled'] });
    window.addEventListener('resize', observe);
    observe();
    return () => {
      observer?.disconnect();
      chromeSize?.disconnect();
      availability.disconnect();
      window.removeEventListener('resize', observe);
      setAvailableButton(null);
    };
  }, [mobile, button]);

  if (!mobile || !pageAction || button !== availableButton) return null;

  return (
    <Tooltip title={pageAction.label} describeChild>
      <Fab
        size="small"
        color="primary"
        aria-label={pageAction.label}
        onClick={() => pageAction.button.click()}
        sx={{
          position: 'fixed',
          right: 'max(12px, env(safe-area-inset-right))',
          bottom: 'calc(72px + env(safe-area-inset-bottom))',
          width: 48,
          height: 48,
          zIndex: theme.zIndex.appBar + 1,
          boxShadow: 4,
          'body:has(input:is([type="text"], [type="search"], [type="email"], [type="password"], [type="number"], [type="tel"], [type="url"], :not([type])):focus, textarea:focus, [contenteditable="true"]:focus) &': {
            display: 'none',
          },
          '@media print': { display: 'none' },
        }}
      >
        {pageAction.icon === 'edit' ? <Edit /> : <Add />}
      </Fab>
    </Tooltip>
  );
}
