import { BuiltTicketReport, REPORT_COLUMNS, REPORT_SECTIONS, REPORT_SUPPORT_TYPES } from '@/lib/api/ticket-report-builder';

export interface ReportBlock { id: string; title: string; headers: string[]; rows: string[][]; rowKeys?: string[]; supportTypes?: Array<string | null> }
// Report-card outline variant: share these exact colors between preview, legend and print.
const SUPPORT_OUTLINES: Record<string, string> = {
  desktop_support: '#1976d2', it_support: '#00897b', pantawid_ict_support: '#9c27b0', specialized_concerns: '#ed6c02',
};
export function reportSupportStyle(type: string | null | undefined) {
  return { label: type ? REPORT_SUPPORT_TYPES[type] ?? 'Unspecified support type' : 'Unspecified support type', color: type ? SUPPORT_OUTLINES[type] ?? '#757575' : '#757575' };
}
export function reportSupportLegend(block: ReportBlock) {
  const present = new Set(block.supportTypes ?? []);
  const ordered = [...Object.keys(REPORT_SUPPORT_TYPES).filter(type => present.has(type)),
    ...[...present].filter(type => !type || !REPORT_SUPPORT_TYPES[type])];
  return ordered.map(reportSupportStyle);
}
const number = (value: number | null) => value === null ? 'Unavailable' : value.toLocaleString('en-PH', { maximumFractionDigits: 2 });
const date = (value: string | null | undefined) => value ? new Date(value).toLocaleString('en-PH', { timeZone: 'Asia/Manila' }) : 'Unavailable';
export function reportMetadata(report: BuiltTicketReport) {
  const supportType = report.configuration.ticketType;
  const supportScope = supportType === null ? 'All support types' : REPORT_SUPPORT_TYPES[supportType] ?? supportType;
  return `${new Date(`${report.year}-${String(report.month).padStart(2, '0')}-01T00:00:00+08:00`).toLocaleDateString('en-PH', { month: 'long', year: 'numeric', timeZone: 'Asia/Manila' })}${report.monthToDate ? ' · Month to date' : ''} · ${report.scope} · ${supportScope} · Generated ${date(report.generatedAt)}`;
}
export function reportWarnings(report: BuiltTicketReport): string[] {
  const s = report.summary, warnings: string[] = [];
  if (s.unknownHistoryTickets) warnings.push(`${s.unknownHistoryTickets} source ticket(s) have incomplete interruption history: exact pauses/freezes were not fully recorded for this period. “Not recorded” is unknown, not zero. Summary counts show recorded minimums; averages exclude incomplete records. Older unrecorded events may be missing from the interruption list.`);
  if (s.estimatedTimingTickets) warnings.push(`${s.estimatedTimingTickets} completed ticket(s) use estimated historical active-time calculations. Saved-deadline SLA classification remains separate.`);
  if (s.missingCompletionTickets) warnings.push(`${s.missingCompletionTickets} terminal ticket(s) have no usable completion timestamp and cannot be placed in a completed-month total.`);
  return warnings;
}
export const REPORT_METHOD = 'Completed totals and SLA use approved effective completion dates. Pause/freeze activity is clipped to the selected month and effective completion. Business durations exclude lunch, outside-office hours and non-office days; applicable ticket-specific OT dates count. Average frequency = recorded occurrences / affected tickets with complete monthly history. Average duration = business minutes / occurrences for those records. SLA compliance = Met / (Met + Missed). No classified tickets means unavailable, not 0%. Cancelled, duplicate and requester-closed records are excluded. Assignment and calendar settings reflect current records; this is a generated view, not an archived report.';
export const REPORT_HISTORY_HELP = 'Pause/Freeze count is the number of recorded occurrences in the selected month. Minutes count only office working time, excluding lunch and non-office time. 0 means no recorded activity with complete history. Not recorded means exact history is unavailable. Incomplete means recording did not cover the full period; it does not indicate an error with the ticket or its SLA.';

export function reportBlocks(report: BuiltTicketReport): ReportBlock[] {
  const s = report.summary;
  const blocks: ReportBlock[] = [{ id: 'summary', title: 'Monthly Summary', headers: ['Metric', 'Result'], rows: [
    ['Tickets received', number(s.received)], ['Tickets completed', number(s.completed)],
    ['SLA Met', number(s.slaMet)], ['SLA Missed', number(s.slaMissed)], ['SLA unavailable', number(s.slaUnavailable)],
    ['SLA compliance', s.slaCompliancePercent === null ? 'Unavailable' : `${number(s.slaCompliancePercent)}%`],
    ...(['pause', 'freeze'] as const).flatMap(kind => {
      const label = kind === 'pause' ? 'Pause' : 'Freeze', value = s[kind];
      return [[`${label}: affected tickets${s.unknownHistoryTickets ? ' (recorded minimum)' : ''}`, number(value.tickets)],
        [`${label}: occurrences${s.unknownHistoryTickets ? ' (recorded minimum)' : ''}`, number(value.occurrences)],
        [`${label}: business minutes${s.unknownHistoryTickets ? ' (recorded minimum)' : ''}`, number(value.businessMinutes)],
        [`${label}: average occurrences per affected ticket`, number(value.averageFrequency)],
        [`${label}: average business minutes per occurrence`, number(value.averageMinutes)],
        [`${label}: tickets / occurrences eligible for averages`, `${number(value.averageEligibleTickets)} / ${number(value.averageEligibleOccurrences)}`]];
    }),
  ] }];
  for (const section of report.configuration.sections) {
    if (section === 'ratings') {
      blocks.push({ id: section, title: 'Ratings', headers: ['Metric', 'Result'], rows: [
        ['Rated tickets', number(report.ratings?.ratedTickets ?? 0)], ['Average rating (out of 5)', number(report.ratings?.average ?? null)],
      ] });
    } else {
      const groups = report.breakdowns[section] ?? [];
      blocks.push({ id: section, title: REPORT_SECTIONS[section],
        headers: section === 'issues' ? ['Issue', 'Category', 'Completed', 'SLA Met', 'SLA Missed'] : ['Group', 'Completed', 'SLA Met', 'SLA Missed'],
        rowKeys: groups.map((row, index) => row.id ?? `${row.label}:${row.category ?? ''}:${index}`),
        rows: groups.map(row => [row.label, ...(section === 'issues' ? [row.category ?? 'Unspecified'] : []), number(row.tickets), number(row.slaMet), number(row.slaMissed)]) });
    }
  }
  if (report.configuration.includeTicketList) blocks.push({ id: 'tickets', title: `Ticket list (${report.listCount})`,
    supportTypes: report.rows.map(row => row.ticketType ?? null), rowKeys: report.rows.map(row => row.ticketId),
    headers: ['Ticket', ...report.configuration.columns.map(column => REPORT_COLUMNS[column]), 'Pause count', 'Freeze count', 'Pause minutes', 'Freeze minutes', 'History', 'SLA'],
    rows: report.rows.map(row => [row.ticketNumber, ...report.configuration.columns.map(column => column === 'createdAt' || column === 'completedAt'
      ? date(row[column]) : (column === 'status' || column === 'priority' ? row[column]?.replace(/_/g, ' ') : row[column]) ?? 'Unavailable'), row.pauseCount === null ? 'Not recorded' : number(row.pauseCount), row.freezeCount === null ? 'Not recorded' : number(row.freezeCount),
      row.pauseMinutes === null ? 'Not recorded' : number(row.pauseMinutes), row.freezeMinutes === null ? 'Not recorded' : number(row.freezeMinutes), row.historyQuality, row.sla ?? 'Not applicable']) });
  return blocks;
}

/** Reuses the exact preview dataset. All ticket/template values enter the document as text. */
export function printTicketReport(report: BuiltTicketReport): boolean {
  const target = window.open('', '_blank', 'width=1100,height=800');
  if (!target) return false;
  const doc = target.document;
  doc.title = report.configuration.title;
  const style = doc.createElement('style');
  style.textContent = '@page{size:A4 landscape;margin:12mm}body{font:12px Arial,sans-serif;color:#111}h1{font-size:22px}h2{font-size:16px;margin-top:22px;color:#1565c0;break-after:avoid}p{line-height:1.5}table{border-collapse:collapse;width:100%;margin-bottom:16px;overflow-wrap:anywhere}th,td{border:1px solid #bbb;padding:7px;text-align:left}th{background:#1976d2;color:white}tbody tr:nth-child(even){background:#f4f7fb}thead{display:table-header-group}tr{break-inside:avoid}.warning{border-left:3px solid #9a6700;padding-left:8px}.ticket-card{border:1px solid #bbcddd;border-radius:5px;margin:12px 0;break-inside:avoid}.ticket-id{font-size:15px;color:#1565c0;background:#eaf2fc;padding:10px;margin:0}.ticket-fields{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px 20px;padding:12px}.ticket-field{overflow-wrap:anywhere}.ticket-label{display:block;font-weight:bold;color:#41556b;margin-bottom:4px}.ticket-value{white-space:pre-wrap}*{print-color-adjust:exact;-webkit-print-color-adjust:exact}';
  doc.head.append(style);
  const add = (tag: string, text: string, parent: HTMLElement = doc.body) => {
    const element = doc.createElement(tag); element.textContent = text; parent.append(element); return element;
  };
  add('h1', report.configuration.title); const metadata = add('p', reportMetadata(report));
  metadata.style.fontWeight = '700'; metadata.style.fontStyle = 'italic';
  for (const warning of reportWarnings(report)) add('p', warning).className = 'warning';
  add('p', REPORT_METHOD);
  for (const block of reportBlocks(report)) {
    add('h2', block.title);
    if (block.id === 'tickets') {
      add('p', `List basis: ${report.configuration.listBasis}. ${REPORT_HISTORY_HELP}`);
      const legend = add('div', ''); legend.setAttribute('aria-label', 'Support type legend');
      legend.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin:12px 0';
      for (const support of reportSupportLegend(block)) {
        const item = add('span', support.label, legend);
        item.style.cssText = `border:2px solid ${support.color};border-radius:5px;padding:4px 8px`;
      }
      for (const [rowIndex, values] of block.rows.entries()) {
        const support = reportSupportStyle(block.supportTypes?.[rowIndex]);
        const card = add('article', ''); card.className = 'ticket-card';
        card.style.border = `2px solid ${support.color}`;
        add('h3', values[0], card).className = 'ticket-id';
        const supportLabel = add('p', support.label, card); supportLabel.style.cssText = 'margin:8px 12px;font-weight:bold';
        const fields = add('div', '', card); fields.className = 'ticket-fields';
        values.slice(1).forEach((value, index) => {
          const field = add('div', '', fields); field.className = 'ticket-field';
          if (block.headers[index + 1] === 'Description') field.style.gridColumn = '1 / -1';
          add('span', block.headers[index + 1], field).className = 'ticket-label';
          add('span', value, field).className = 'ticket-value';
        });
      }
      if (!block.rows.length) add('p', 'No matching records.');
      continue;
    }
    const table = doc.createElement('table'), head = doc.createElement('thead'), body = doc.createElement('tbody'), header = doc.createElement('tr');
    for (const text of block.headers) add('th', text, header);
    head.append(header); table.append(head, body); doc.body.append(table);
    for (const values of block.rows) { const row = doc.createElement('tr'); for (const text of values) add('td', text, row); body.append(row); }
    if (!block.rows.length) { const row = doc.createElement('tr'); const cell = add('td', 'No matching records.', row); cell.setAttribute('colspan', String(block.headers.length)); body.append(row); }
  }
  target.opener = null;
  target.focus(); target.setTimeout(() => target.print(), 250);
  return true;
}
