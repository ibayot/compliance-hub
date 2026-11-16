import { Tabs, type TabsProps } from '@mui/material';

export default function StickyTabs({ className, sx, ...props }: TabsProps) {
  return <Tabs {...props} className={['app-sticky-tabs', className].filter(Boolean).join(' ')}
    sx={[{ bgcolor: 'background.paper' }, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]} />;
}
