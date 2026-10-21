import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repository = path.resolve(root, '..');
const errors = [];
const markdown = [];
const graph = new Map();
const declarations = new Map();
const documentIds = new Map();
let externalLinks = 0;
let localLinks = 0;

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const target = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) {
      errors.push('Symlinks are not traversed: ' + relative(target));
    } else if (entry.isDirectory()) walk(target);
    else if (entry.name.endsWith('.md')) markdown.push(target);
  }
}
function relative(file) { return path.relative(root, file).split(path.sep).join('/'); }
function stripFences(text, file) {
  let fence = null;
  const lines = text.split(/\r?\n/);
  const visible = lines.map((line) => {
    const marker = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (marker) {
      if (!fence) fence = { char: marker[1][0], size: marker[1].length };
      else if (marker[1][0] === fence.char && marker[1].length >= fence.size && !marker[2].trim()) fence = null;
      return '';
    }
    return fence ? '' : line;
  });
  if (fence) errors.push(relative(file) + ': unclosed code fence');
  return visible;
}
function inside(directory, file) {
  const rel = path.relative(directory, file);
  return rel === '' || (!rel.startsWith('..' + path.sep) && rel !== '..' && !path.isAbsolute(rel));
}

walk(root);
const required = ['MASTER.md', 'INDEX.md', 'README.md', 'application/PROFILE.md',
  'governance/context-loading.md', 'governance/rule-authoring.md',
  'quality/validation-matrix.md', 'inventory/canonical-implementations.md',
  'templates/pattern-template.md', 'templates/element-pattern-template.md'];
for (const file of required) if (!fs.existsSync(path.join(root, file))) errors.push('Required file missing: ' + file);

for (const file of markdown) {
  const text = fs.readFileSync(file, 'utf8');
  const name = relative(file);
  const visibleLines = stripFences(text, file);
  const visible = visibleLines.join('\n');
  if (!/^#\s+\S/m.test(visible)) errors.push(name + ': missing title');
  const id = text.match(/^---\r?\n[\s\S]*?^id:\s*["']?([^"'\r\n]+)["']?\s*$/m)?.[1]?.trim();
  if (id) {
    if (documentIds.has(id)) errors.push('Duplicate document ID ' + id + ': ' + documentIds.get(id) + ', ' + name);
    else documentIds.set(id, name);
  }
  const targets = new Set();
  for (const match of visible.matchAll(/\[[^\]\n]+\]\((<[^>]+>|[^\s)]+)(?:\s+"[^"]*")?\)/g)) {
    let href = match[1].replace(/^<|>$/g, '');
    if (/^[a-z][a-z\d+.-]*:/i.test(href) || href.startsWith('//')) { externalLinks++; continue; }
    if (href.startsWith('#')) continue;
    href = href.split('#')[0].split('?')[0];
    try { href = decodeURIComponent(href); } catch { errors.push(name + ': invalid URL encoding ' + href); continue; }
    const target = path.resolve(path.dirname(file), href);
    localLinks++;
    if (!inside(repository, target)) errors.push(name + ': link leaves repository: ' + href);
    else if (!fs.existsSync(target)) errors.push(name + ': missing link target: ' + href);
    else if (inside(root, target) && target.endsWith('.md')) targets.add(target);
  }
  graph.set(file, targets);

  for (let lineIndex = 0; lineIndex < visibleLines.length; lineIndex++) {
    const line = visibleLines[lineIndex];
    const matches = [...line.matchAll(/\b([A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+-\d{3})\b/g)];
    for (let index = 0; index < matches.length; index++) {
      const match = matches[index];
      const before = line.slice(0, match.index);
      const after = line.slice(match.index + match[0].length).replace(/^(?:\*\*|`)/, '').trimStart();
      const atStart = /^\s*(?:[-*]\s*)?(?:\*\*|`)?$/.test(before);
      const immediate = /^(MUST(?: NOT)?|SHOULD|MAY)\b/.test(after);
      if (!atStart && !immediate) continue; // ordinary references are not declarations
      const segment = line.slice(match.index, matches[index + 1]?.index ?? line.length);
      if (!/\b(?:MUST|SHOULD|MAY)\b/.test(segment)) errors.push(name + ':' + (lineIndex + 1) + ': rule lacks strength: ' + match[1]);
      const location = name + ':' + (lineIndex + 1);
      if (declarations.has(match[1])) errors.push('Duplicate rule ' + match[1] + ': ' + declarations.get(match[1]) + ', ' + location);
      else declarations.set(match[1], location);
    }
  }
}

const reachable = new Set();
const pending = [path.join(root, 'INDEX.md')];
while (pending.length) {
  const file = pending.pop();
  if (reachable.has(file)) continue;
  reachable.add(file);
  for (const target of graph.get(file) ?? []) pending.push(target);
}
for (const file of markdown) if (!reachable.has(file)) errors.push('Not reachable from INDEX.md: ' + relative(file));

const agents = fs.readFileSync(path.join(repository, 'AGENTS.md'), 'utf8');
if (!agents.includes('context/MASTER.md') || !agents.includes('context/application/PROFILE.md')) errors.push('AGENTS.md must route to the master and application profile.');

const summary = {
  markdownFiles: markdown.length,
  documentIds: documentIds.size,
  ruleDeclarations: declarations.size,
  localLinks,
  externalReferencesNotNetworkChecked: externalLinks,
  reachableFromIndex: reachable.size,
  errors: errors.length,
};
console.log(JSON.stringify(summary, null, 2));
for (const error of errors) console.error('- ' + error);
if (errors.length) process.exitCode = 1;
