import type { RoleCapabilityRecord } from '@/lib/api/users';

type CapabilityKey = Exclude<keyof RoleCapabilityRecord, 'id' | 'roleValue'>;
export interface CapabilityCategory {
  name: string;
  columns: Array<{ key: CapabilityKey; label: string; description: string }>;
}

// Presentation groups only. Moving a column never changes a stored permission.
export const CAPABILITY_CATEGORIES: CapabilityCategory[] = [
  { name: 'Ticket Access & Administration', columns: [
    { key: 'isTicketModuleAccess', label: 'Ticket Module', description: 'Access the ticket module and submit requests' },
    { key: 'isAllTickets', label: 'See All Tickets', description: 'View all tickets rather than only permitted personal/assigned tickets' },
    { key: 'isTicketSettingsFocal', label: 'Ticket Admin', description: 'Administer ticket settings and ticket operations' },
    { key: 'isTicketFocal', label: 'Assign Tickets', description: 'Manually assign and reassign tickets' },
    { key: 'isTicketRequesterCorrection', label: 'Record Correction', description: 'Correct Requested For or Assigned To within permitted ticket states' },
    { key: 'isTicketResolutionTimeOverride', label: 'Resolution Time Correction', description: 'Correct effective resolution time with required proof' },
    { key: 'isTicketCancellation', label: 'Cancel Tickets', description: 'Cancel Open, Assigned or In Progress tickets with a reason; regular requesters remain limited to their own requests/filings' },
  ] },
  { name: 'Support Pools & Escalation', columns: [
    { key: 'isDesktop', label: 'Desktop', description: 'Handle desktop/hardware support tickets' },
    { key: 'isItSupport', label: 'IT Support', description: 'Handle IT/software support tickets' },
    { key: 'isPantawidIct', label: 'Pantawid ICT', description: 'Handle Pantawid ICT support tickets' },
    { key: 'isSpecializedSupport', label: 'Specialized', description: 'May be manually assigned Specialized Concerns tickets' },
    { key: 'isEscalationFocal', label: 'Escalation Focal', description: 'Can receive escalated tickets' },
  ] },
  { name: 'Knowledge Base & Ticket Reports', columns: [
    { key: 'isTicketPerformanceAccess', label: 'Performance Summary', description: 'View staff-wide weekly performance on the dashboard without granting report management' },
    { key: 'isKnowledgeBaseManage', label: 'Knowledge Base Manage', description: 'Create and edit Knowledge Base articles' },
    { key: 'isTicketReportsAccess', label: 'Ticket Reports View', description: 'View permitted assignee Overview, Ratings and Performance reports' },
    { key: 'isTicketReportsManage', label: 'Ticket Reports Manage', description: 'View all assignees, Issues and SLA Insights' },
  ] },
  { name: 'Attendance & Staff Availability', columns: [
    { key: 'isAttendanceAccess', label: 'Attendance View', description: 'Access attendance and office-day views' },
    { key: 'isAttendanceManage', label: 'Attendance Manage', description: 'Manage attendance and office-day records' },
    { key: 'isAttendanceEligible', label: 'Attendance Eligible', description: 'Include staff with this capability in attendance tracking' },
    { key: 'isIto', label: 'Non-Technician Staff Group', description: 'Classify non-technician ITO staff for attendance grouping; this is not ticket-administrator access' },
  ] },
  { name: 'Duties & Meetings', columns: [
    { key: 'isDutyViewerAccess', label: 'Duty Viewer', description: 'View duty cards and the monthly duty map' },
    { key: 'isDutyAdminAccess', label: 'Duty Administrator', description: 'Manage duty rosters, logs, exceptions, meetings and attendance release' },
  ] },
  { name: 'User, Role & Unit Management', columns: [
    { key: 'isStaffDirectoryAccess', label: 'Staff Directory View', description: 'Look up staff across units without account-management permissions' },
    { key: 'isUserManagementView', label: 'User Mgt View', description: 'Create, edit, reset and disable regular accounts only' },
    { key: 'isUserManagementAdmin', label: 'User Mgt Admin', description: 'Manage user accounts within account-administration safeguards' },
    { key: 'isSystemRolesAccess', label: 'System Roles Access', description: 'Access System Role Definitions' },
    { key: 'isUserManagementRolesManage', label: 'Role Definition Manage', description: 'Create, edit and delete role definitions' },
    { key: 'isRoleCapabilitiesAccess', label: 'Capabilities Admin', description: 'Access and administer the Role Capabilities Matrix' },
    { key: 'isUnitsAccess', label: 'Units View', description: 'View organizational units' },
    { key: 'isUnitsManage', label: 'Units Manage', description: 'Create, edit and delete organizational units' },
  ] },
  { name: 'Compliance, KPI & Metrics', columns: [
    { key: 'isFocal', label: 'Focal Access', description: 'Compliance document and focal-level access; ticket permissions have separate controls' },
    { key: 'isKpiAccess', label: 'KPI View', description: 'Access KPI dashboards and monitoring records' },
    { key: 'isKpiManage', label: 'KPI Manage', description: 'Create and update KPI master and monitoring records' },
    { key: 'isMetricsAccess', label: 'Metrics View', description: 'Access the Metrics module' },
    { key: 'isMetricsManage', label: 'Metrics Manage', description: 'Create and edit metric templates' },
    { key: 'isMetricsDelete', label: 'Metrics Delete', description: 'Delete metric templates' },
    { key: 'isReviewsAccess', label: 'Reviews View', description: 'View document reviews and comparisons' },
    { key: 'isReviewsManage', label: 'Reviews Manage', description: 'Submit reviews and create version comparisons' },
    { key: 'isReportsAccess', label: 'Compliance Reports', description: 'Access consolidated compliance reports' },
  ] },
  { name: 'Incidents & Cybersecurity', columns: [
    { key: 'isIncidentsAccess', label: 'Incidents View', description: 'View incident records and statistics' },
    { key: 'isIncidentsManage', label: 'Incidents Manage', description: 'Create and update incident records' },
    { key: 'isIncidentsDelete', label: 'Incidents Delete', description: 'Delete incident records' },
    { key: 'isCybersecurityAccess', label: 'Cybersecurity View', description: 'View cybersecurity measurements' },
    { key: 'isCybersecurityManage', label: 'Cybersecurity Manage', description: 'Create and update cybersecurity measurements' },
    { key: 'isCybersecurityDelete', label: 'Cybersecurity Delete', description: 'Delete cybersecurity measurements' },
  ] },
  { name: 'Documents, Records & MoV', columns: [
    { key: 'isDocumentsAccess', label: 'Documents View', description: 'Access the Documents module' },
    { key: 'isDocumentsManage', label: 'Documents Manage', description: 'Manage document records' },
    { key: 'isDocumentsDelete', label: 'Documents Delete', description: 'Delete document records' },
    { key: 'isRepositoryAccess', label: 'Repository', description: 'Access the Repository module' },
    { key: 'isDocumentTypesManage', label: 'Document Types Manage', description: 'Manage reportorial document types' },
    { key: 'isMovAccess', label: 'MoV View', description: 'Access MoV Builder' },
    { key: 'isMovManage', label: 'MoV Manage', description: 'Save, edit and delete MoV artifacts' },
  ] },
  { name: 'Issuances & Compliance Assessments', columns: [
    { key: 'isIssuancesAccess', label: 'Issuances View', description: 'Access the Issuances module' },
    { key: 'isIssuancesManage', label: 'Issuances Manage', description: 'Manage issuance records, sources, relationships and lifecycle' },
    { key: 'isIssuancesReview', label: 'Applicability Review', description: 'Include or exclude applicability candidates' },
    { key: 'isIssuancesAssessmentManage', label: 'Assessments Manage', description: 'Manage compliance assessments and evidence' },
    { key: 'isIssuancesConfigure', label: 'Compliance Domains', description: 'Manage controlled compliance domains' },
  ] },
  { name: 'Application Settings & Audit', columns: [
    { key: 'isGlobalSettingsAccess', label: 'Global Settings Admin', description: 'Manage routing, work hours and schedules in Settings' },
    { key: 'isSecuritySettingsAccess', label: 'Security Settings Admin', description: 'Configure sign-in, passwords and permitted email domains' },
    { key: 'isSmtpSettingsAccess', label: 'SMTP Admin', description: 'Manage SMTP credentials and email delivery settings' },
    { key: 'isChangelogManagement', label: 'Changelog Admin', description: 'Create and publish capability-targeted application updates' },
    { key: 'isAuditAccess', label: 'Audit Logs', description: 'Access audit log records' },
  ] },
];
