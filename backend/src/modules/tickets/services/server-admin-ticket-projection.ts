export type ServerAdminRequestType = 'create' | 'enable' | 'disable' | 'Others';
export type EmployeeIdSource = 'requester' | 'subject' | 'description' | 'subject_and_description' | null;

export interface ServerAdminTicketRow {
  ticket_id: string;
  ticket_number: string;
  status: 'assigned' | 'in_progress';
  subject: string;
  description: string;
  requester_staff_id: string | null;
  category_name: string | null;
  issue_type_name: string | null;
}

export interface ServerAdminTicketProjection {
  ticket_id: string;
  ticket_number: string;
  status: 'assigned' | 'in_progress';
  emp_id: string | null;
  emp_id_source: EmployeeIdSource;
  request_type: ServerAdminRequestType;
  requires_review: boolean;
  review_reasons: string[];
}

const normalized = (value: string | null) => String(value ?? '').trim().replace(/\s+/g, ' ').replace(/\s*\/\s*/g, '/').toLowerCase();
const validEmployeeId = (value: string) => /^(?:02\d{4}|2\d{4,5})$/.test(value);
const employeeIds = (text: string) => [...new Set([...String(text ?? '').matchAll(/(?<!\d)(?:02\d{4}|2\d{4,5})(?!\d)/g)].map(match => match[0]))];

/** A read-only projection: text overrides never rewrite the requester or original ticket. */
export function projectServerAdminTicket(row: ServerAdminTicketRow): ServerAdminTicketProjection {
  const review_reasons: string[] = [];
  const subjectIds = employeeIds(row.subject);
  const descriptionIds = employeeIds(row.description);
  const candidates = [...new Set([...subjectIds, ...descriptionIds])];
  let emp_id: string | null = null;
  let emp_id_source: EmployeeIdSource = null;
  if (candidates.length > 1) {
    review_reasons.push('conflicting_employee_ids');
  } else if (candidates.length === 1) {
    emp_id = candidates[0];
    emp_id_source = subjectIds.length && descriptionIds.length ? 'subject_and_description' : subjectIds.length ? 'subject' : 'description';
  } else {
    const requesterId = String(row.requester_staff_id ?? '').trim();
    if (validEmployeeId(requesterId)) { emp_id = requesterId; emp_id_source = 'requester'; }
    else review_reasons.push(requesterId ? 'invalid_requester_employee_id' : 'missing_employee_id');
  }

  let request_type: ServerAdminRequestType = 'Others';
  if (normalized(row.category_name) === 'active directory management') {
    const issue = normalized(row.issue_type_name);
    if (issue === 'active directory account creation') request_type = 'create';
    else if (issue === 'active directory account enable/disable') {
      const text = `${row.subject}\n${row.description}`;
      const enable = /\b(?:re[ -]?)?(?:enable[ds]?|enabling|activate[ds]?|activating|activation)\b/i.test(text);
      const disable = /\b(?:disable[ds]?|disabling|deactivate[ds]?|deactivating|deactivation)\b/i.test(text);
      const negatedAction = /\b(?:not|never|don['’]t|huwag|wag)\s+(?:\w+\s+){0,3}(?:(?:re[ -]?)?(?:enable\w*|activate\w*)|disable\w*|deactivate\w*)\b/i.test(text);
      if (enable !== disable && !negatedAction) request_type = enable ? 'enable' : 'disable';
      else review_reasons.push('unclear_enable_disable_action');
    }
  }
  return { ticket_id: row.ticket_id, ticket_number: row.ticket_number, status: row.status,
    emp_id, emp_id_source, request_type, requires_review: review_reasons.length > 0, review_reasons };
}
