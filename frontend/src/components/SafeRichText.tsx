import React from 'react';
import { Link, Typography, TypographyProps } from '@mui/material';
import ReactMarkdown from 'react-markdown';

type MarkdownNode = {
  type: string;
  value?: string;
  url?: string;
  children?: MarkdownNode[];
};

const URL_PATTERN = /(?:https?:\/\/|www\.)[^\s<>"']+/gi;
const MARKDOWN_LINK_CONTAINERS = new Set([
  'link',
  'linkReference',
  'definition',
  'code',
  'inlineCode',
  'html',
]);

const splitTrailingPunctuation = (candidate: string): [string, string] => {
  let url = candidate;
  let trailing = '';

  while (/[.,!?;:]$/.test(url)) {
    trailing = url.slice(-1) + trailing;
    url = url.slice(0, -1);
  }

  const bracketPairs: Array<[string, string]> = [
    ['(', ')'],
    ['[', ']'],
    ['{', '}'],
  ];
  for (const [opening, closing] of bracketPairs) {
    while (url.endsWith(closing)) {
      const openingCount = url.split(opening).length - 1;
      const closingCount = url.split(closing).length - 1;
      if (closingCount <= openingCount) break;
      trailing = closing + trailing;
      url = url.slice(0, -1);
    }
  }

  return [url, trailing];
};

const normalizeDetectedUrl = (url: string): string | null => {
  const candidate = /^www\./i.test(url) ? `https://${url}` : url;
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : null;
  } catch {
    return null;
  }
};

const normalizeRenderedHref = (href?: string): string | null => {
  if (!href) return null;
  if (/^www\./i.test(href)) return normalizeDetectedUrl(href);
  if (/^https?:\/\//i.test(href)) return normalizeDetectedUrl(href);
  if (/^mailto:/i.test(href) || href.startsWith('/') || href.startsWith('#')) return href;
  return null;
};

const linkifyMarkdownText = (value: string): MarkdownNode[] => {
  const nodes: MarkdownNode[] = [];
  let cursor = 0;
  URL_PATTERN.lastIndex = 0;

  for (let match = URL_PATTERN.exec(value); match; match = URL_PATTERN.exec(value)) {
    if (match.index > cursor) {
      nodes.push({ type: 'text', value: value.slice(cursor, match.index) });
    }

    const [displayUrl, trailing] = splitTrailingPunctuation(match[0]);
    const href = normalizeDetectedUrl(displayUrl);
    if (href) {
      nodes.push({
        type: 'link',
        url: href,
        children: [{ type: 'text', value: displayUrl }],
      });
    } else {
      nodes.push({ type: 'text', value: displayUrl });
    }
    if (trailing) nodes.push({ type: 'text', value: trailing });
    cursor = match.index + match[0].length;
  }

  if (cursor < value.length) nodes.push({ type: 'text', value: value.slice(cursor) });
  return nodes;
};

const transformMarkdownNode = (node: MarkdownNode): void => {
  if (!node.children || MARKDOWN_LINK_CONTAINERS.has(node.type)) return;

  const transformed: MarkdownNode[] = [];
  for (const child of node.children) {
    if (child.type === 'text' && child.value && URL_PATTERN.test(child.value)) {
      URL_PATTERN.lastIndex = 0;
      transformed.push(...linkifyMarkdownText(child.value));
    } else {
      URL_PATTERN.lastIndex = 0;
      transformMarkdownNode(child);
      transformed.push(child);
    }
  }
  node.children = transformed;
};

const remarkSafeLinkify = () => (tree: MarkdownNode) => transformMarkdownNode(tree);

const SafeAnchor = ({ href, children }: { href?: string; children?: React.ReactNode }) => {
  const safeHref = normalizeRenderedHref(href);
  if (!safeHref) return <>{children}</>;

  const external = /^https?:\/\//i.test(safeHref);
  return (
    <Link
      href={safeHref}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      onClick={(event) => event.stopPropagation()}
      sx={{ overflowWrap: 'anywhere' }}
    >
      {children}
    </Link>
  );
};

export const SafeMarkdown = ({ children }: { children: string }) => (
  <ReactMarkdown remarkPlugins={[remarkSafeLinkify]} components={{ a: SafeAnchor }}>
    {children}
  </ReactMarkdown>
);

export const LinkifiedText = ({ children, ...props }: TypographyProps) => {
  const text = typeof children === 'string' ? children : String(children ?? '');
  const content: React.ReactNode[] = [];
  let cursor = 0;
  URL_PATTERN.lastIndex = 0;

  for (let match = URL_PATTERN.exec(text); match; match = URL_PATTERN.exec(text)) {
    if (match.index > cursor) content.push(text.slice(cursor, match.index));

    const [displayUrl, trailing] = splitTrailingPunctuation(match[0]);
    const href = normalizeDetectedUrl(displayUrl);
    content.push(
      href ? (
        <SafeAnchor key={`${match.index}-${displayUrl}`} href={href}>
          {displayUrl}
        </SafeAnchor>
      ) : (
        displayUrl
      ),
    );
    if (trailing) content.push(trailing);
    cursor = match.index + match[0].length;
  }

  if (cursor < text.length) content.push(text.slice(cursor));

  return (
    <Typography {...props} sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', ...props.sx }}>
      {content}
    </Typography>
  );
};
