import { Tabs, useMediaQuery, useTheme, type TabsProps } from '@mui/material';
import { useThemeMode } from '@/contexts/ThemeModeContext';

/** Use MUI's actual vertical-tab semantics when the workbench has room for a rail. */
export default function WorkspaceTabs(props: TabsProps) {
  const { layoutPreset } = useThemeMode();
  const theme = useTheme();
  const wide = useMediaQuery(theme.breakpoints.up('lg'));
  return <Tabs {...props} className={`workspace-tabs ${props.className || ''}`} orientation={wide && layoutPreset === 'split-pane-workbench' ? 'vertical' : 'horizontal'} />;
}
