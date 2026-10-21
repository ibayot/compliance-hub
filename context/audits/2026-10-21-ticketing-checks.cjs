// Read-only ticketing source inventory and isolated reproductions.
// Does not create an application, contact services, or write a database.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const ts = require(path.join(root, 'backend/node_modules/typescript'));
const { ValidationPipe } = require(path.join(root, 'backend/node_modules/@nestjs/common'));

function read(relative) { return fs.readFileSync(path.join(root, relative), 'utf8'); }
function walk(relative) {
  const absolute = path.join(root, relative);
  if (!fs.existsSync(absolute)) return [];
  if (!fs.statSync(absolute).isDirectory()) return [relative];
  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? walk(relative + '/' + entry.name) : [relative + '/' + entry.name]);
}
function method(relative, className, name, environment = {}) {
  const text = read(relative);
  const ast = ts.createSourceFile(relative, text, ts.ScriptTarget.Latest, true);
  const declaration = ast.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === className);
  const member = declaration.members.find(node => node.name?.getText(ast) === name);
  assert(member, name);
  let code = member.getText(ast).replace(/^(?:private|protected|public)\s+/, '');
  code = code.startsWith('async ') ? code.replace(/^async /, 'async function ') : 'function ' + code;
  const js = ts.transpileModule('module.exports = ' + code, { compilerOptions: {
    target: ts.ScriptTarget.ES2021, module: ts.ModuleKind.CommonJS,
  }}).outputText;
  const keys = Object.keys(environment);
  return new Function(...keys, 'const module = { exports: null }; ' + js + '; return module.exports;')(...keys.map(key => environment[key]));
}
function callback(relative, name, environment) {
  const ast = ts.createSourceFile(relative, read(relative), ts.ScriptTarget.Latest, true);
  let declaration;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === name) declaration = node;
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert(declaration && ts.isCallExpression(declaration.initializer), name);
  const expression = declaration.initializer.arguments[0].getText(ast);
  const js = ts.transpileModule('module.exports = ' + expression, { compilerOptions: {
    target: ts.ScriptTarget.ES2021, module: ts.ModuleKind.CommonJS,
  }}).outputText;
  const keys = Object.keys(environment);
  return new Function(...keys, 'const module = { exports: null }; ' + js + '; return module.exports;')(...keys.map(key => environment[key]));
}
const directories = [
  'backend/src/modules/tickets',
  'frontend/src/app/(app)/operations/tickets',
  'frontend/src/app/(app)/operations/reports',
  'frontend/src/app/(app)/operations/settings',
  'frontend/src/app/(app)/operations/knowledge-base',
  'frontend/src/app/(app)/operations/duties',
  'frontend/src/app/(app)/admin/attendance',
  'frontend/src/app/rate',
];
const shared = [
  'frontend/src/app/(app)/dashboard/page.tsx', 'frontend/src/app/api/references.ts',
  'frontend/src/components/WeeklyTicketPerformance.tsx', 'frontend/src/components/TicketPageActions.tsx',
  'frontend/src/components/TicketActionsMenu.tsx', 'frontend/src/components/TicketCancelButton.tsx',
  'frontend/src/components/TicketImageDropzone.tsx', 'frontend/src/components/SearchableSelect.tsx',
  'frontend/src/components/SafeRichText.tsx', 'frontend/src/components/AuthImage.tsx',
  'frontend/src/components/layout/ResponsiveTable.tsx', 'frontend/src/components/layout/Sidebar.tsx',
  'frontend/src/components/layout/AppBar.tsx', 'frontend/src/contexts/AuthContext.tsx',
  'frontend/src/lib/api/client.ts', 'frontend/src/lib/api/public-rating.ts',
  'frontend/src/lib/utils/useSse.ts', 'frontend/src/lib/utils/ticket-sla-summary.ts',
  'frontend/src/lib/utils/ticket-sla-status.ts', 'frontend/src/lib/utils/ticket-colors.ts',
  'frontend/src/lib/utils/ticket-detail-actions.ts', 'frontend/src/lib/utils/ticket-filter-layout.ts',
  'frontend/src/lib/utils/ticket-list-entry.ts', 'frontend/src/lib/utils/requester-options.ts',
  'frontend/src/App.tsx', 'frontend/src/lib/theme.ts',
  'backend/src/apps/ticketing-service.main.ts', 'backend/src/apps/ticketing-service.module.ts',
  'backend/src/apps/ticketing-jwt.strategy.ts', 'backend/src/apps/gateway.main.ts',
  'backend/src/common/guards/capability.guard.ts', 'backend/src/common/guards/internal-service.guard.ts',
  'backend/src/common/security/security-validators.ts', 'backend/src/common/events/sse.service.ts',
  'backend/src/shared/filters/global-exception.filter.ts', 'backend/src/common/interceptors/upload-bulkhead.interceptor.ts',
  'backend/Dockerfile', 'frontend/Dockerfile', 'docker-compose.yml', 'frontend/capacitor.config.ts',
  'backend/package.json', 'frontend/package.json',
];
const files = [...new Set([...directories.flatMap(walk), ...shared])]
  .filter(file => fs.existsSync(path.join(root, file)) && !/\.(?:spec|test)\.tsx?$/.test(file)).sort();
const routes = [];
const signals = [];
const inventory = files.map(file => {
  const text = read(file);
  const line = position => text.slice(0, position).split('\n').length;
  if (/controllers\/.*\.ts$/.test(file)) {
    const ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
    for (const node of ast.statements.filter(ts.isClassDeclaration)) {
      const classDecorators = ts.getDecorators(node)?.map(item => item.getText(ast)) ?? [];
      for (const member of node.members.filter(ts.isMethodDeclaration)) {
        const decorators = ts.getDecorators(member)?.map(item => item.getText(ast)) ?? [];
        if (!decorators.some(value => /^@(Get|Post|Put|Patch|Delete|Sse)\b/.test(value))) continue;
        routes.push({ file, line: line(member.getStart(ast)), method: member.name.getText(ast),
          classDecorators, decorators,
          parameters: member.parameters.map(parameter => ({
            name: parameter.name.getText(ast), type: parameter.type?.getText(ast),
            decorators: ts.getDecorators(parameter)?.map(item => item.getText(ast)) ?? [],
          })) });
      }
    }
  }
  for (const [kind, regex] of [
    ['erased-partial-body', /@Body\(\)\s+\w+:\s*Partial<[^>]+>/g],
    ['hard-coded-color', /#[0-9a-fA-F]{3,8}\b/g],
    ['unsafe-html-sink', /dangerouslySetInnerHTML/g],
    ['any-type', /\bany\b/g],
    ['native-confirm', /window\.(?:confirm|alert)\(/g],
    ['direct-fetch', /\bfetch\(/g],
  ]) {
    const matches = [...text.matchAll(regex)];
    if (matches.length) signals.push({ file, kind, count: matches.length, lines: matches.slice(0, 12).map(match => line(match.index)) });
  }
  return { file, lines: text.split(/\r?\n/).length,
    sha256: crypto.createHash('sha256').update(text).digest('hex'),
    evidence: 'inventory/static scan; not an individual semantic compliance pass' };
});

(async () => {
  const probes = [];
  const calculateBusinessSeconds = method('backend/src/modules/tickets/services/ticket.service.ts', 'TicketService', 'calculateBusinessSeconds');
  const context = { attendanceService: { isOfficeDay: async () => true } };
  const config = { scheduleMode: 'OFFICE_HOURS', officeClockin: '08:00:00', officeClockout: '17:00:00' };
  const start = new Date('2026-01-01T08:00:00+08:00');
  const end = new Date('2026-07-01T08:00:00+08:00');
  const expectedHours = (end - start) / 86400000 * 8;
  const actualHours = await calculateBusinessSeconds.call(context, start, end, config, new Map()) / 3600;
  assert(actualHours < expectedHours);
  probes.push({ id: 'AUD-01', result: 'confirmed', description: '365 loop iterations silently truncate long SLA intervals',
    expectedHours, actualHours, fixture: 'All dates are office days; 08:00-17:00 with lunch excluded.' });

  const calculateActive = method('backend/src/modules/tickets/services/ticket.service.ts', 'TicketService', 'calculateTicketActiveResolutionHours');
  const corrected = new Date('2026-10-20T11:00:00+08:00');
  const creditedAfterCorrection = await calculateActive.call({ calculateBusinessSeconds: async () => 7200 },
    { slaStartedAt: new Date('2026-10-20T09:00:00+08:00'), accumulatedPauseSeconds: 3600 }, corrected, config);
  assert.equal(creditedAfterCorrection, 1);
  probes.push({ id: 'AUD-02', result: 'confirmed calculation limitation',
    description: 'Aggregate pause credits are subtracted without clipping to corrected completion.',
    fixture: 'Verified work ended11:00; a one-hour pause occurred13:00-14:00 before late status update.',
    expectedActiveHoursForFixture: 2, actualActiveHours: creditedAfterCorrection });

  const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
  const rawPatch = { id: 'different-row', status: 'not-a-status' };
  const acceptedPatch = await pipe.transform(rawPatch, { type: 'body', metatype: Object, data: undefined });
  assert.equal(acceptedPatch.id, 'different-row');
  const saveReservation = method('backend/src/modules/tickets/services/duty.service.ts', 'DutyService', 'saveReservation', {
    DutyReservationStatus: { CONFIRMED: 'confirmed', SCHEDULED: 'scheduled', CANCELLED: 'cancelled' },
  });
  let saved;
  const existing = { id: 'requested-row', venueType: 'CONFERENCE', meetingDate: '2026-10-21',
    status: 'scheduled', createdById: 1, startTime: '09:00', endTime: '10:00' };
  await saveReservation.call({
    getAccess: async () => ({ admin: true, canSchedule: true }), today: () => '2026-10-21',
    assertDutyType: value => value, meetingSlot: () => 'AM',
    reservationRepo: { findOne: async () => existing, find: async () => [],
      create: value => value, save: async value => { saved = value; return value; } },
    relieverRepo: { delete: async () => {} }, reconcileToday: async () => {},
    sse: { emitDutyUpdated() {} },
  }, { id: 7 }, acceptedPatch, 'requested-row');
  assert.equal(saved.id, 'different-row');
  assert.equal(saved.status, 'not-a-status');
  probes.push({ id: 'AUD-03', result: 'confirmed',
    description: 'Object/Partial DTO bypasses runtime field validation and raw spread accepts alternate ID/status.',
    savedId: saved.id, savedStatus: saved.status, effect: 'Mock repository only; no database contacted.' });

  const isHelpful = await pipe.transform('false', { type: 'body', metatype: Boolean, data: 'isHelpful' });
  const rateArticle = method('backend/src/modules/tickets/services/knowledge-base.service.ts', 'KnowledgeBaseService', 'rateArticle');
  const article = { id: 1, helpfulCount: 0, unhelpfulCount: 0 };
  await rateArticle.call({ kbRepo: { findOne: async () => article, save: async value => value } }, 1, isHelpful);
  assert.equal(article.helpfulCount, 1);
  probes.push({ id: 'AUD-04', result: 'confirmed',
    description: 'String false passes body primitive boundary and increments helpful count.',
    transformedType: typeof isHelpful, helpfulCount: article.helpfulCount, unhelpfulCount: article.unhelpfulCount });

  const sse = read('frontend/src/lib/utils/useSse.ts');
  assert(sse.includes("fetch('/api/events/token'"));
  assert(sse.includes('new EventSource('));
  probes.push({ id: 'AUD-05', result: 'source-confirmed; device execution pending',
    description: 'Native SSE uses relative token and stream URLs instead of the configured API base.' });

  const dockerfile = read('frontend/Dockerfile');
  const uploadController = read('backend/src/modules/tickets/controllers/ticket.controller.ts');
  assert(dockerfile.includes('client_max_body_size 10M'));
  assert(uploadController.includes("FilesInterceptor('attachments', 5"));
  assert(uploadController.includes('fileSize: 10 * 1024 * 1024'));
  probes.push({ id: 'AUD-06', result: 'configuration-confirmed; proxy execution pending',
    description: 'Proxy total body10MiB conflicts with5 attachments up to10MiB each and multipart overhead.' });

  const pending = new Map();
  let displayedArticles;
  const fetchArticles = callback('frontend/src/app/(app)/operations/knowledge-base/page.tsx', 'fetchArticles', {
    knowledgeBaseApi: { search: query => new Promise(resolve => pending.set(query, resolve)) },
    setLoading() {}, enqueueSnackbar() {}, setArticles: value => { displayedArticles = value; },
  });
  const oldRequest = fetchArticles('old query');
  const newRequest = fetchArticles('new query');
  pending.get('new query')(['new results']);
  await newRequest;
  pending.get('old query')(['old results']);
  await oldRequest;
  assert.deepEqual(displayedArticles, ['old results']);
  probes.push({ id: 'AUD-07', result: 'confirmed callback reproduction; browser execution pending',
    description: 'An older Knowledge Base search response overwrites the latest query results.',
    requestedQuery: 'new query', displayedResults: displayedArticles });

  const totals = { files: files.length, lines: inventory.reduce((sum, file) => sum + file.lines, 0),
    routes: routes.length, signals: signals.length };
  const mode = process.argv[2];
  const result = mode === '--inventory' ? inventory
    : mode === '--routes' ? routes.map(({file,line,method,classDecorators,decorators}) => ({file,line,method,classDecorators,decorators}))
    : mode === '--signals' ? signals
    : { scope: 'ticketing owned source plus shared boundaries', totals, isolatedProbes: probes };
  console.log(JSON.stringify(result, null, 2));
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
