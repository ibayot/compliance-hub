import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { Box } from '@mui/material';
import './workspace-layout.css';

type Props = {
  children: ReactNode;
  context?: ReactNode;
  kind?: 'standard' | 'dashboard' | 'settings' | 'detail' | 'report';
  contextPosition?: 'start' | 'end';
  className?: string;
};

function hasContent(node: ReactNode): boolean {
  return Children.toArray(node).some((child) =>
    isValidElement<{ children?: ReactNode }>(child) && child.type === Fragment
      ? hasContent(child.props.children)
      : true,
  );
}

/** Explicit page regions: each workflow owns its controls, data, and actions. */
export default function WorkspaceLayout({ children, context, kind = 'standard', contextPosition = 'start', className }: Props) {
  const showContext = hasContent(context);
  const contextPanel = showContext ? <Box className="workspace-context">{context}</Box> : null;
  return (
    <Box className={['workspace-layout', className].filter(Boolean).join(' ')} data-workspace-kind={kind} data-context-position={contextPosition} data-has-context={showContext}>
      {contextPosition === 'start' && contextPanel}
      <Box className="workspace-content">{children}</Box>
      {contextPosition === 'end' && contextPanel}
    </Box>
  );
}
