'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Card,
  CardContent,
  ListItemText,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Chip,
  TextField,
  MenuItem,
  Menu,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Link,
  FormControlLabel,
  Tooltip,
  Tabs,
  Tab,
  CircularProgress,
  Divider,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Link as LinkIcon,
  LinkOff as UnlinkIcon,
  InfoOutlined as InfoOutlinedIcon,
  Visibility as VisibilityIcon,
  MoreHoriz as MoreHorizIcon,
  CloudUpload as CloudUploadIcon,
  Download as DownloadIcon,
  Settings as SettingsIcon,
  FactCheck as FactCheckIcon,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import { issuancesApi, Issuance, CreateIssuanceDto, ComplianceDomain } from '@/app/api/references';
import { documentsApi, Document } from '@/lib/api/documents';
import { usersApi, UserRecord } from '@/lib/api/users';
import { SearchableMultiSelect, SearchableSelect } from '@/components/SearchableSelect';

const ISSUANCE_ALLOWED_KEYS = [
  'issuance_number',
  'title',
  'description',
  'issuance_type',
  'primary_register',
  'lifecycle_status',
  'applicability_status',
  'register_decision',
  'scope_profile',
  'status_reason',
  'domain_ids',
  'applicability_scope',
  'relevance_notes',
  'binding_nature',
  'adoption_basis',
  'applicable_provisions',
  'compliance_obligations',
  'required_evidence',
  'process_owner',
  'accountable_user_id',
  'frequency_cadence',
  'register_added_at',
  'is_amendment',
  'amended_issuance_number',
  'ict_amendment_notes',
  'issuing_authority',
  'issue_date',
  'issue_date_precision',
  'approval_date',
  'effectivity_date',
  'effectivity_date_precision',
  'end_date',
  'source_url',
  'attachment_file_name',
  'attachment_mime_type',
  'attachment_uploaded_at',
  'is_active',
] as const;

type IssuanceAllowedKey = (typeof ISSUANCE_ALLOWED_KEYS)[number];

const sanitizeIssuancePayload = (
  payload: Partial<CreateIssuanceDto>,
): Partial<CreateIssuanceDto> => {
  const sanitized: Partial<CreateIssuanceDto> = {};
  const nullableDateKeys = new Set([
    'issue_date',
    'approval_date',
    'effectivity_date',
    'end_date',
    'target_date',
    'last_review_date',
    'register_added_at',
  ]);
  ISSUANCE_ALLOWED_KEYS.forEach((key) => {
    const typedKey = key as IssuanceAllowedKey;
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      const value = payload[typedKey] as unknown;
      (sanitized as Record<string, unknown>)[typedKey] =
        nullableDateKeys.has(key) && value === '' ? null : value;
    }
  });
  return sanitized;
};

const formatIssuanceDate = (value?: string | null, precision?: string | null) => {
  if (!value || precision === 'unknown') return 'Date unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unknown';
  if (precision === 'year') return String(date.getUTCFullYear());
  if (precision === 'month') {
    return date.toLocaleDateString(undefined, {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });
  }
  return date.toLocaleDateString(undefined, { timeZone: 'UTC' });
};

export default function IssuancesPage() {
  const { user, myCap } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const [allIssuances, setAllIssuances] = useState<Issuance[]>([]);
  const [domains, setDomains] = useState<ComplianceDomain[]>([]);
  const [view, setView] = useState<'official' | 'review' | 'historical'>('official');
  const [processOwnerOptions, setProcessOwnerOptions] = useState<
    Array<{ label: string; value: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIssuance, setEditingIssuance] = useState<Issuance | null>(null);
  const [mappingOpen, setMappingOpen] = useState(false);
  const [relevanceOpen, setRelevanceOpen] = useState(false);
  const [mappingLoading, setMappingLoading] = useState(false);
  const [mappingSearch, setMappingSearch] = useState('');
  const [selectedIssuance, setSelectedIssuance] = useState<Issuance | null>(null);
  const [mappedDocuments, setMappedDocuments] = useState<Document[]>([]);
  const [availableDocuments, setAvailableDocuments] = useState<Document[]>([]);
  const [formData, setFormData] = useState<CreateIssuanceDto>({
    issuance_number: '',
    title: '',
    description: '',
    issuance_type: '',
    primary_register: 'legal_regulatory',
    lifecycle_status: 'under_review',
    applicability_status: 'pending_review',
    register_decision: 'pending',
    scope_profile: 'core',
    status_reason: '',
    domain_ids: [],
    applicability_scope: '',
    relevance_notes: '',
    binding_nature: '',
    adoption_basis: '',
    applicable_provisions: '',
    compliance_obligations: '',
    required_evidence: '',
    evidence_location: '',
    process_owner: '',
    accountable_user_id: null,
    frequency_cadence: 'quarterly',
    compliance_status: 'not_assessed',
    gap_summary: '',
    action_required: '',
    target_date: '',
    last_review_date: '',
    quarterly_readiness: 'not_assessed',
    q1_compliance_status: 'not_assessed',
    q2_compliance_status: 'not_assessed',
    q3_compliance_status: 'not_assessed',
    q4_compliance_status: 'not_assessed',
    register_added_at: new Date().toISOString().slice(0, 10),
    is_amendment: false,
    amended_issuance_number: '',
    ict_amendment_notes: '',
    issuing_authority: '',
    issue_date: '',
    issue_date_precision: 'unknown',
    approval_date: '',
    effectivity_date: '',
    effectivity_date_precision: 'unknown',
    end_date: '',
    source_url: '',
    is_active: true,
  });
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [removeExistingAttachment, setRemoveExistingAttachment] = useState(false);
  const [filterAuthorities, setFilterAuthorities] = useState<string[]>([]);
  const [filterCategories, setFilterCategories] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRegister, setFilterRegister] = useState('all');
  const [filterScope, setFilterScope] = useState('all');
  const [filterDomain, setFilterDomain] = useState<number | 'all'>('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [actionsAnchorEl, setActionsAnchorEl] = useState<null | HTMLElement>(null);
  const [deleteConfirmIssuance, setDeleteConfirmIssuance] = useState<string | null>(null);
  const [actionsIssuance, setActionsIssuance] = useState<Issuance | null>(null);
  const [domainDialogOpen, setDomainDialogOpen] = useState(false);
  const [newDomainName, setNewDomainName] = useState('');
  const [newDomainDescription, setNewDomainDescription] = useState('');
  const [assessmentIssuance, setAssessmentIssuance] = useState<Issuance | null>(null);
  const [assessmentSaving, setAssessmentSaving] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [sourceDialogOpen, setSourceDialogOpen] = useState(false);
  const [sourceSaving, setSourceSaving] = useState(false);
  const [sourceForm, setSourceForm] = useState({
    sourceType: 'official_external',
    url: '',
    sourceOrganization: '',
    externalDocumentId: '',
    isPrimary: false,
  });
  const [relationshipDialogOpen, setRelationshipDialogOpen] = useState(false);
  const [relationshipSaving, setRelationshipSaving] = useState(false);
  const [relationshipForm, setRelationshipForm] = useState({
    targetIssuanceId: '',
    relationshipType: 'related_to',
    notes: '',
  });
  const [assessmentForm, setAssessmentForm] = useState<{
    year: number;
    quarter: number | null;
    status: string;
    readinessStatus: string;
    evidenceSummary: string;
    gapSummary: string;
  }>({
    year: new Date().getFullYear(),
    quarter: Math.floor(new Date().getMonth() / 3) + 1,
    status: 'not_assessed',
    readinessStatus: 'not_assessed',
    evidenceSummary: '',
    gapSummary: '',
  });
  const [evidenceForm, setEvidenceForm] = useState({ label: '', url: '' });
  const [actionForm, setActionForm] = useState({ action: '', owner: '', targetDate: '' });
  const [assessmentChildSaving, setAssessmentChildSaving] = useState(false);
  const canManageIssuances = !!myCap?.isIssuancesManage;
  const canReviewIssuances = !!myCap?.isIssuancesReview;
  const canAssessIssuances = !!myCap?.isIssuancesAssessmentManage;
  const canConfigureIssuances = !!myCap?.isIssuancesConfigure;

  useEffect(() => {
    fetchIssuances();
    fetchProcessOwners();
  }, []);

  useEffect(() => {
    issuancesApi
      .getDomains(canManageIssuances || canConfigureIssuances)
      .then(setDomains)
      .catch(() => setDomains([]));
  }, [canManageIssuances, canConfigureIssuances]);

  useEffect(() => {
    setPage(0);
  }, [searchTerm, filterAuthorities, filterCategories, filterRegister, filterScope, filterDomain, view, allIssuances.length]);

  const fetchIssuances = async () => {
    try {
      setLoading(true);
      const data = await issuancesApi.getAll();
      setAllIssuances(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch issuances');
    } finally {
      setLoading(false);
    }
  };

  const fetchProcessOwners = async () => {
    try {
      const users = await usersApi.list();
      const options = users
        .filter((entry: UserRecord) => entry.active && entry.isIssuancesManage === true)
        .map((entry: UserRecord) => {
          const displayName = [entry.firstName, entry.middleName, entry.lastName, entry.suffix]
            .filter(Boolean)
            .join(' ')
            .trim();
          const label = displayName || entry.email;
          return {
            label,
            value: String(entry.id),
          };
        })
        .sort((a, b) => a.label.localeCompare(b.label));

      const deduped = Array.from(new Map(options.map((option) => [option.value, option])).values());
      setProcessOwnerOptions(deduped);
    } catch {
      setProcessOwnerOptions([]);
    }
  };

  const handleOpenDialog = (issuance?: Issuance) => {
    if (!canManageIssuances) {
      return;
    }

    if (issuance) {
      setEditingIssuance(issuance);
      setAttachmentFile(null);
      setRemoveExistingAttachment(false);
      setFormData({
        issuance_number: issuance.issuance_number,
        title: issuance.title,
        description: issuance.description || '',
        issuance_type: issuance.issuance_type || '',
        primary_register: issuance.primary_register || 'legal_regulatory',
        lifecycle_status: issuance.lifecycle_status || (issuance.is_active ? 'active' : 'retired'),
        applicability_status: issuance.applicability_status || 'applicable',
        register_decision: issuance.register_decision || (issuance.is_active ? 'included' : 'excluded'),
        scope_profile: issuance.scope_profile || 'core',
        status_reason: issuance.status_reason || issuance.adoption_basis || '',
        domain_ids: issuance.domains?.map((domain) => domain.id) || [],
        applicability_scope: issuance.applicability_scope || '',
        relevance_notes: issuance.relevance_notes || '',
        binding_nature: issuance.binding_nature || '',
        adoption_basis: issuance.adoption_basis || '',
        applicable_provisions: issuance.applicable_provisions || '',
        compliance_obligations: issuance.compliance_obligations || '',
        required_evidence: issuance.required_evidence || '',
        evidence_location: issuance.evidence_location || '',
        process_owner: issuance.process_owner || '',
        accountable_user_id: issuance.accountable_user_id || null,
        frequency_cadence: issuance.frequency_cadence || 'quarterly',
        compliance_status: issuance.compliance_status || 'not_assessed',
        gap_summary: issuance.gap_summary || '',
        action_required: issuance.action_required || '',
        target_date: issuance.target_date ? issuance.target_date.split('T')[0] : '',
        last_review_date: issuance.last_review_date ? issuance.last_review_date.split('T')[0] : '',
        quarterly_readiness: issuance.quarterly_readiness || 'not_assessed',
        q1_compliance_status: issuance.q1_compliance_status || 'not_assessed',
        q2_compliance_status: issuance.q2_compliance_status || 'not_assessed',
        q3_compliance_status: issuance.q3_compliance_status || 'not_assessed',
        q4_compliance_status: issuance.q4_compliance_status || 'not_assessed',
        register_added_at: issuance.register_added_at
          ? issuance.register_added_at.split('T')[0]
          : new Date().toISOString().slice(0, 10),
        is_amendment: Boolean(issuance.is_amendment),
        amended_issuance_number: issuance.amended_issuance_number || '',
        ict_amendment_notes: issuance.ict_amendment_notes || '',
        issuing_authority: issuance.issuing_authority,
        issue_date: issuance.issue_date ? issuance.issue_date.split('T')[0] : '',
        issue_date_precision: issuance.issue_date_precision || (issuance.issue_date ? 'day' : 'unknown'),
        approval_date: issuance.approval_date ? issuance.approval_date.split('T')[0] : '',
        effectivity_date: issuance.effectivity_date ? issuance.effectivity_date.split('T')[0] : '',
        effectivity_date_precision:
          issuance.effectivity_date_precision || (issuance.effectivity_date ? 'day' : 'unknown'),
        end_date: issuance.end_date ? issuance.end_date.split('T')[0] : '',
        source_url: issuance.source_url || '',
        is_active: issuance.is_active,
      });
    } else {
      setEditingIssuance(null);
      setAttachmentFile(null);
      setRemoveExistingAttachment(false);
      setFormData({
        issuance_number: '',
        title: '',
        description: '',
        issuance_type: '',
        primary_register: 'legal_regulatory',
        lifecycle_status: 'under_review',
        applicability_status: 'pending_review',
        register_decision: 'pending',
        scope_profile: 'core',
        status_reason: '',
        domain_ids: [],
        applicability_scope: '',
        relevance_notes: '',
        binding_nature: '',
        adoption_basis: '',
        applicable_provisions: '',
        compliance_obligations: '',
        required_evidence: '',
        evidence_location: '',
        process_owner: '',
        accountable_user_id: null,
        frequency_cadence: 'quarterly',
        compliance_status: 'not_assessed',
        gap_summary: '',
        action_required: '',
        target_date: '',
        last_review_date: '',
        quarterly_readiness: 'not_assessed',
        q1_compliance_status: 'not_assessed',
        q2_compliance_status: 'not_assessed',
        q3_compliance_status: 'not_assessed',
        q4_compliance_status: 'not_assessed',
        register_added_at: new Date().toISOString().slice(0, 10),
        is_amendment: false,
        amended_issuance_number: '',
        ict_amendment_notes: '',
        issuing_authority: '',
        issue_date: '',
        issue_date_precision: 'unknown',
        approval_date: '',
        effectivity_date: '',
        effectivity_date_precision: 'unknown',
        end_date: '',
        source_url: '',
        is_active: true,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingIssuance(null);
    setAttachmentFile(null);
    setRemoveExistingAttachment(false);
  };

  const handleSubmit = async () => {
    if (!canManageIssuances) {
      return;
    }

    if (
      formData.lifecycle_status &&
      !['draft', 'under_review', 'active'].includes(formData.lifecycle_status) &&
      !formData.status_reason?.trim()
    ) {
      enqueueSnackbar('Status Reason is required for a historical lifecycle status.', {
        variant: 'warning',
      });
      return;
    }

    if (formData.register_decision === 'included' && !(formData.domain_ids?.length)) {
      enqueueSnackbar('Select at least one compliance domain before inclusion.', {
        variant: 'warning',
      });
      return;
    }
    if (formData.register_decision === 'included' && formData.lifecycle_status !== 'active') {
      enqueueSnackbar('Only an Active issuance can be included in an official register.', {
        variant: 'warning',
      });
      return;
    }
    if (
      formData.register_decision === 'included' &&
      !['applicable', 'partially_applicable'].includes(formData.applicability_status || '')
    ) {
      enqueueSnackbar('Set applicability to Applicable or Partially Applicable before inclusion.', {
        variant: 'warning',
      });
      return;
    }
    const hasIdentifiableSource = Boolean(
      formData.source_url?.trim() ||
        attachmentFile ||
        (!removeExistingAttachment && editingIssuance?.attachment_file_name) ||
        editingIssuance?.sources?.length,
    );
    if (formData.register_decision === 'included' && !hasIdentifiableSource) {
      enqueueSnackbar('Add a source URL or attachment before inclusion.', { variant: 'warning' });
      return;
    }

    try {
      if (!editingIssuance) {
        const duplicates = await issuancesApi.checkDuplicates({
          issuance_number: formData.issuance_number,
          title: formData.title,
          issuing_authority: formData.issuing_authority,
          source_url: formData.source_url,
        });
        const blockingDuplicate = duplicates.find((candidate) => candidate.blocking);
        if (blockingDuplicate) {
          enqueueSnackbar(
            `Possible duplicate: ${blockingDuplicate.issuance_number} — ${blockingDuplicate.reason}`,
            { variant: 'warning' },
          );
          return;
        }
        if (duplicates.length) {
          enqueueSnackbar(
            `Shared source detected with ${duplicates[0].issuance_number}; creation will continue because official index pages may support multiple issuances.`,
            { variant: 'info' },
          );
        }
      }
      const sanitizedPayload = sanitizeIssuancePayload(formData);
      let savedIssuance: Issuance;
      if (editingIssuance) {
        const uploadBeforeUpdate = Boolean(
          attachmentFile &&
            formData.register_decision === 'included' &&
            !formData.source_url?.trim() &&
            !editingIssuance.sources?.length &&
            !editingIssuance.attachment_file_name,
        );
        if (uploadBeforeUpdate && attachmentFile) {
          await issuancesApi.uploadAttachment(editingIssuance.id, attachmentFile);
        }
        savedIssuance = await issuancesApi.update(editingIssuance.id, sanitizedPayload);
        if (removeExistingAttachment && editingIssuance.attachment_file_name) {
          await issuancesApi.deleteAttachment(editingIssuance.id);
        }
        if (attachmentFile && !uploadBeforeUpdate) {
          await issuancesApi.uploadAttachment(savedIssuance.id, attachmentFile);
        }
      } else {
        const stageAttachmentBeforeInclusion = Boolean(
          attachmentFile &&
            formData.register_decision === 'included' &&
            !formData.source_url?.trim(),
        );
        savedIssuance = await issuancesApi.create({
          ...(sanitizedPayload as CreateIssuanceDto),
          ...(stageAttachmentBeforeInclusion ? { register_decision: 'pending' } : {}),
        });
        if (attachmentFile) await issuancesApi.uploadAttachment(savedIssuance.id, attachmentFile);
        if (stageAttachmentBeforeInclusion) {
          savedIssuance = await issuancesApi.update(savedIssuance.id, {
            register_decision: 'included',
          });
        }
      }

      handleCloseDialog();
      await fetchIssuances();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to save issuance', {
        variant: 'error',
      });
    }
  };

  const handleToggleActive = (issuance: Issuance) => {
    if (!canManageIssuances) {
      return;
    }

    handleOpenDialog({
      ...issuance,
      lifecycle_status: issuance.lifecycle_status === 'active' ? 'retired' : 'active',
      register_decision: issuance.lifecycle_status === 'active' ? 'excluded' : 'pending',
      status_reason: '',
    });
    enqueueSnackbar('Enter a concise Status Reason, then save the issuance.', { variant: 'info' });
  };

  const handleDelete = (id: string) => {
    if (!canManageIssuances) {
      return;
    }
    setDeleteConfirmIssuance(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmIssuance) return;
    try {
      await issuancesApi.delete(deleteConfirmIssuance);
      fetchIssuances();
      setDeleteConfirmIssuance(null);
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to delete issuance', {
        variant: 'error',
      });
    }
  };

  const authorityOptions = Array.from(
    new Set(
      allIssuances.map((item) => item.issuing_authority).filter((item) => Boolean(item?.trim())),
    ),
  ).sort((a, b) => a.localeCompare(b));

  const categoryOptions = Array.from(
    new Set(
      allIssuances
        .map((item) => item.issuance_type)
        .filter((item): item is string => Boolean(item?.trim())),
    ),
  ).sort((a, b) => a.localeCompare(b));

  const formatCategoryLabel = (value: string) =>
    value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

  const formatRegisterLabel = (value: string) =>
    ({
      legal_regulatory: 'Legal & Regulatory',
      standards: 'Standards',
      internal_issuances: 'Internal Issuances',
      internal_operational: 'Internal Operational Documents',
    })[value] || formatCategoryLabel(value);

  const handleRegisterDecision = async (
    issuance: Issuance,
    decision: 'included' | 'excluded',
  ) => {
    const reason = window.prompt(
      decision === 'included'
        ? 'State why this issuance satisfies organizational applicability and ICT relevance.'
        : 'State why this issuance is excluded from the official registers.',
    );
    if (!reason?.trim()) return;
    try {
      await issuancesApi.decideRegister(issuance.id, decision, {
        reason: reason.trim(),
        applicabilityStatus:
          decision === 'included'
            ? issuance.applicability_status === 'partially_applicable'
              ? 'partially_applicable'
              : 'applicable'
            : issuance.applicability_status,
        domainIds: issuance.domains?.map((domain) => domain.id),
      });
      enqueueSnackbar(
        decision === 'included' ? 'Issuance included in the official register.' : 'Issuance excluded and retained in history.',
        { variant: 'success' },
      );
      await fetchIssuances();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to save the register decision', {
        variant: 'error',
      });
    }
  };

  const openAssessmentDialog = (issuance: Issuance) => {
    const year = new Date().getFullYear();
    const quarter = Math.floor(new Date().getMonth() / 3) + 1;
    const existing = issuance.assessments?.find(
      (assessment) => Number(assessment.year) === year && Number(assessment.quarter) === quarter,
    );
    setAssessmentIssuance(issuance);
    setAssessmentForm({
      year,
      quarter,
      status: existing?.status || 'not_assessed',
      readinessStatus: existing?.readinessStatus || 'not_assessed',
      evidenceSummary: existing?.evidenceSummary || '',
      gapSummary: existing?.gapSummary || '',
    });
  };

  const selectAssessmentPeriod = (year: number, quarter: number | null) => {
    const existing = assessmentIssuance?.assessments?.find(
      (assessment) =>
        Number(assessment.year) === Number(year) &&
        (quarter === null ? assessment.quarter == null : Number(assessment.quarter) === quarter),
    );
    setAssessmentForm((current) => ({
      ...current,
      year,
      quarter,
      status: existing?.status || 'not_assessed',
      readinessStatus: existing?.readinessStatus || 'not_assessed',
      evidenceSummary: existing?.evidenceSummary || '',
      gapSummary: existing?.gapSummary || '',
    }));
  };

  const saveAssessment = async () => {
    if (!assessmentIssuance) return;
    try {
      setAssessmentSaving(true);
      await issuancesApi.saveAssessment(assessmentIssuance.id, assessmentForm);
      enqueueSnackbar('Compliance assessment saved.', { variant: 'success' });
      const refreshed = await issuancesApi.getById(assessmentIssuance.id);
      setAssessmentIssuance(refreshed);
      await fetchIssuances();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to save the assessment', {
        variant: 'error',
      });
    } finally {
      setAssessmentSaving(false);
    }
  };

  const activeAssessment = assessmentIssuance?.assessments?.find(
    (assessment) =>
      Number(assessment.year) === assessmentForm.year &&
      (assessmentForm.quarter === null
        ? assessment.quarter == null
        : Number(assessment.quarter) === assessmentForm.quarter),
  );

  const refreshAssessmentIssuance = async () => {
    if (!assessmentIssuance) return;
    const refreshed = await issuancesApi.getById(assessmentIssuance.id);
    setAssessmentIssuance(refreshed);
    await fetchIssuances();
  };

  const addAssessmentEvidence = async () => {
    if (!assessmentIssuance || !activeAssessment || !evidenceForm.label.trim() || !evidenceForm.url.trim()) return;
    try {
      setAssessmentChildSaving(true);
      await issuancesApi.addAssessmentEvidence(assessmentIssuance.id, activeAssessment.id, {
        label: evidenceForm.label,
        url: evidenceForm.url,
      });
      setEvidenceForm({ label: '', url: '' });
      await refreshAssessmentIssuance();
      enqueueSnackbar('Assessment evidence linked.', { variant: 'success' });
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to link assessment evidence', { variant: 'error' });
    } finally {
      setAssessmentChildSaving(false);
    }
  };

  const removeAssessmentEvidence = async (evidenceId: string) => {
    if (!assessmentIssuance || !activeAssessment) return;
    try {
      setAssessmentChildSaving(true);
      await issuancesApi.removeAssessmentEvidence(assessmentIssuance.id, activeAssessment.id, evidenceId);
      await refreshAssessmentIssuance();
    } finally {
      setAssessmentChildSaving(false);
    }
  };

  const addRemediationAction = async () => {
    if (!assessmentIssuance || !activeAssessment || !actionForm.action.trim()) return;
    try {
      setAssessmentChildSaving(true);
      await issuancesApi.addRemediationAction(assessmentIssuance.id, activeAssessment.id, {
        action: actionForm.action,
        owner: actionForm.owner,
        targetDate: actionForm.targetDate || undefined,
      });
      setActionForm({ action: '', owner: '', targetDate: '' });
      await refreshAssessmentIssuance();
      enqueueSnackbar('Corrective action added.', { variant: 'success' });
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to add corrective action', { variant: 'error' });
    } finally {
      setAssessmentChildSaving(false);
    }
  };

  const updateRemediationStatus = async (actionId: string, status: string) => {
    if (!assessmentIssuance || !activeAssessment) return;
    try {
      setAssessmentChildSaving(true);
      await issuancesApi.updateRemediationAction(assessmentIssuance.id, activeAssessment.id, actionId, { status });
      await refreshAssessmentIssuance();
    } finally {
      setAssessmentChildSaving(false);
    }
  };

  const removeRemediationAction = async (actionId: string) => {
    if (!assessmentIssuance || !activeAssessment) return;
    try {
      setAssessmentChildSaving(true);
      await issuancesApi.removeRemediationAction(assessmentIssuance.id, activeAssessment.id, actionId);
      await refreshAssessmentIssuance();
    } finally {
      setAssessmentChildSaving(false);
    }
  };

  const reloadDomains = async (includeInactive = canConfigureIssuances) => {
    const rows = await issuancesApi.getDomains(includeInactive);
    setDomains(rows);
  };

  const handleCreateDomain = async () => {
    if (!newDomainName.trim()) return;
    try {
      await issuancesApi.createDomain({
        code: newDomainName,
        name: newDomainName,
        description: newDomainDescription,
        sortOrder: domains.length * 10 + 10,
      });
      setNewDomainName('');
      setNewDomainDescription('');
      await reloadDomains(true);
      enqueueSnackbar('Compliance domain added.', { variant: 'success' });
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to add compliance domain', {
        variant: 'error',
      });
    }
  };

  const handleToggleDomain = async (domain: ComplianceDomain) => {
    try {
      await issuancesApi.updateDomain(domain.id, { isActive: !domain.isActive });
      await reloadDomains(true);
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to update compliance domain', {
        variant: 'error',
      });
    }
  };

  const filteredIssuances = allIssuances.filter((issuance) => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const searchMatch =
      !normalizedSearch ||
      [
        issuance.issuance_number,
        issuance.title,
        issuance.description,
        issuance.issuance_type,
        issuance.issuing_authority,
        issuance.applicable_provisions,
        issuance.compliance_obligations,
        issuance.required_evidence,
        issuance.process_owner,
        issuance.source_url,
        ...((issuance.domains || []).map((domain) => domain.name)),
        ...((issuance.sources || []).flatMap((source) => [
          source.sourceType,
          source.url,
          source.sourceOrganization,
          source.externalDocumentId,
        ])),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch));
    const authorityMatch =
      filterAuthorities.length === 0 || filterAuthorities.includes(issuance.issuing_authority);
    const categoryMatch =
      filterCategories.length === 0 || filterCategories.includes(issuance.issuance_type || '');
    const historicalLifecycle = ['superseded', 'repealed', 'revoked', 'expired', 'retired'].includes(
      issuance.lifecycle_status,
    );
    const viewMatch =
      view === 'official'
        ? issuance.register_decision === 'included' && issuance.lifecycle_status === 'active'
        : view === 'review'
          ? issuance.register_decision === 'pending' && !historicalLifecycle
          : issuance.register_decision === 'excluded' || historicalLifecycle;
    const registerMatch =
      filterRegister === 'all' || issuance.primary_register === filterRegister;
    const scopeMatch = filterScope === 'all' || issuance.scope_profile === filterScope;
    const domainMatch =
      filterDomain === 'all' || issuance.domains?.some((domain) => domain.id === filterDomain);

    return searchMatch && authorityMatch && categoryMatch && viewMatch && registerMatch && scopeMatch && domainMatch;
  });

  const pagedIssuances = filteredIssuances.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  );

  const openBlobInNewTab = (blob: Blob, fallbackFileName: string) => {
    const objectUrl = URL.createObjectURL(blob);
    const opened = window.open(objectUrl, '_blank', 'noopener,noreferrer');
    if (!opened) {
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = fallbackFileName;
      anchor.click();
    }

    setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
    }, 60000);
  };

  const handleViewAttachment = async (issuance: Issuance) => {
    try {
      const blob = await issuancesApi.viewAttachment(issuance.id);
      openBlobInNewTab(
        blob,
        issuance.attachment_file_name || `${issuance.issuance_number}-attachment`,
      );
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to open attachment', {
        variant: 'error',
      });
    }
  };

  const handleDownloadAttachment = async (issuance: Issuance) => {
    try {
      const blob = await issuancesApi.downloadAttachment(issuance.id);
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = issuance.attachment_file_name || `${issuance.issuance_number}-attachment`;
      anchor.click();
      URL.revokeObjectURL(objectUrl);
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to download attachment', {
        variant: 'error',
      });
    }
  };

  const handleTitleClick = async (issuance: Issuance) => {
    if (issuance.source_url) {
      window.open(issuance.source_url, '_blank', 'noopener,noreferrer');
      return;
    }

    if (issuance.attachment_file_name) {
      await handleViewAttachment(issuance);
    }
  };

  const openActionsMenu = (event: React.MouseEvent<HTMLElement>, issuance: Issuance) => {
    setActionsAnchorEl(event.currentTarget);
    setActionsIssuance(issuance);
  };

  const closeActionsMenu = () => {
    setActionsAnchorEl(null);
    setActionsIssuance(null);
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const openMappingDialog = async (issuance: Issuance) => {
    try {
      setMappingOpen(true);
      setMappingLoading(true);
      setMappingSearch('');
      setSelectedIssuance(issuance);

      const [issuanceDetails, docs] = await Promise.all([
        issuancesApi.getById(issuance.id),
        documentsApi.listDocuments({ page: 1, limit: 200 }),
      ]);

      const linkedDocs = (issuanceDetails.documents || []) as Document[];
      setMappedDocuments(linkedDocs);
      setAvailableDocuments((docs.data || []).filter((document) => document.status === 'ready'));
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to load mapping details', {
        variant: 'error',
      });
    } finally {
      setMappingLoading(false);
    }
  };

  const closeMappingDialog = () => {
    setMappingOpen(false);
    setMappingLoading(false);
    setMappingSearch('');
    setSelectedIssuance(null);
    setMappedDocuments([]);
    setAvailableDocuments([]);
  };

  const openRelevanceDialog = async (issuance: Issuance) => {
    setSelectedIssuance(issuance);
    setRelevanceOpen(true);
    try {
      setDetailsLoading(true);
      setSelectedIssuance(await issuancesApi.getById(issuance.id));
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to load issuance details', {
        variant: 'error',
      });
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeRelevanceDialog = () => {
    setRelevanceOpen(false);
    setSelectedIssuance(null);
    setSourceDialogOpen(false);
    setRelationshipDialogOpen(false);
  };

  const refreshSelectedIssuance = async () => {
    if (!selectedIssuance) return;
    setSelectedIssuance(await issuancesApi.getById(selectedIssuance.id));
    await fetchIssuances();
  };

  const saveSource = async () => {
    if (!canManageIssuances || !selectedIssuance || !sourceForm.url.trim()) return;
    try {
      setSourceSaving(true);
      await issuancesApi.addSource(selectedIssuance.id, {
        ...sourceForm,
        url: sourceForm.url.trim(),
        sourceOrganization: sourceForm.sourceOrganization.trim() || undefined,
        externalDocumentId: sourceForm.externalDocumentId.trim() || undefined,
      });
      enqueueSnackbar('Issuance source added.', { variant: 'success' });
      setSourceDialogOpen(false);
      setSourceForm({
        sourceType: 'official_external',
        url: '',
        sourceOrganization: '',
        externalDocumentId: '',
        isPrimary: false,
      });
      await refreshSelectedIssuance();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to add the source', {
        variant: 'error',
      });
    } finally {
      setSourceSaving(false);
    }
  };

  const saveRelationship = async () => {
    if (!canManageIssuances || !selectedIssuance || !relationshipForm.targetIssuanceId) return;
    try {
      setRelationshipSaving(true);
      await issuancesApi.addRelationship(selectedIssuance.id, {
        ...relationshipForm,
        notes: relationshipForm.notes.trim() || undefined,
      });
      enqueueSnackbar('Issuance relationship added.', { variant: 'success' });
      setRelationshipDialogOpen(false);
      setRelationshipForm({
        targetIssuanceId: '',
        relationshipType: 'related_to',
        notes: '',
      });
      await refreshSelectedIssuance();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to add the relationship', {
        variant: 'error',
      });
    } finally {
      setRelationshipSaving(false);
    }
  };

  const removeRelationship = async (relationshipId: string) => {
    if (!canManageIssuances || !selectedIssuance) return;
    if (!window.confirm('Remove this issuance relationship?')) return;
    try {
      await issuancesApi.removeRelationship(selectedIssuance.id, relationshipId);
      enqueueSnackbar('Issuance relationship removed.', { variant: 'success' });
      await refreshSelectedIssuance();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to remove the relationship', {
        variant: 'error',
      });
    }
  };

  const handleLinkDocument = async (documentId: string) => {
    if (!selectedIssuance || !canManageIssuances) {
      return;
    }

    try {
      await issuancesApi.linkDocument(selectedIssuance.id, documentId);
      await openMappingDialog(selectedIssuance);
      await fetchIssuances();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to link document', {
        variant: 'error',
      });
    }
  };

  const handleUnlinkDocument = async (documentId: string) => {
    if (!selectedIssuance || !canManageIssuances) {
      return;
    }

    try {
      await issuancesApi.unlinkDocument(selectedIssuance.id, documentId);
      await openMappingDialog(selectedIssuance);
      await fetchIssuances();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to unlink document', {
        variant: 'error',
      });
    }
  };

  const mappedDocumentIds = new Set(mappedDocuments.map((document) => document.id));
  const filteredDocuments = availableDocuments.filter((document) => {
    const normalizedSearch = mappingSearch.trim().toLowerCase();
    if (!normalizedSearch) {
      return true;
    }

    return (
      document.title.toLowerCase().includes(normalizedSearch) ||
      document.document_type.toLowerCase().includes(normalizedSearch) ||
      (document.unit?.name || '').toLowerCase().includes(normalizedSearch)
    );
  });

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Reference Issuances</Typography>
        <Box display="flex" gap={1}>
          {canConfigureIssuances && (
            <Button
              variant="outlined"
              startIcon={<SettingsIcon />}
              onClick={() => {
                void reloadDomains(true);
                setDomainDialogOpen(true);
              }}
            >
              Domains
            </Button>
          )}
          {canManageIssuances && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
              Add Issuance
            </Button>
          )}
        </Box>
      </Box>

      {!canManageIssuances && (
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Read-only view. Issuance CRUD and document mapping actions are available to compliance and
          super admin roles.
        </Typography>
      )}

      <Card sx={{ mb: 2 }}>
        <Tabs
          value={view}
          onChange={(_, value) => setView(value)}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="Issuance register views"
        >
          <Tab value="official" label="Official Registers" />
          <Tab value="review" label="Review Queue" />
          <Tab value="historical" label="Historical & Excluded" />
        </Tabs>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" gap={2} alignItems="flex-start" flexWrap="wrap">
            <TextField
              size="small"
              label="Search Issuances"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Number, title, provision, owner, domain, or source"
              sx={{ minWidth: { xs: '100%', md: 420 }, flexGrow: 1 }}
            />
            <SearchableMultiSelect
              size="small"
              label="Authority"
              value={filterAuthorities}
              options={authorityOptions.map((authority) => ({ value: authority, label: authority }))}
              onChange={setFilterAuthorities}
              placeholder="All Authorities"
              fullWidth={false}
              sx={{ minWidth: 300 }}
            />
            <SearchableMultiSelect
              size="small"
              label="Category"
              value={filterCategories}
              options={categoryOptions.map((category) => ({
                value: category,
                label: formatCategoryLabel(category),
              }))}
              onChange={setFilterCategories}
              placeholder="All Categories"
              fullWidth={false}
              sx={{ minWidth: 260 }}
            />
            <TextField
              select
              label="Register"
              value={filterRegister}
              onChange={(e) => setFilterRegister(e.target.value)}
              sx={{ minWidth: 220 }}
              size="small"
            >
              <MenuItem value="all">All Registers</MenuItem>
              {['legal_regulatory', 'standards', 'internal_issuances', 'internal_operational'].map(
                (register) => (
                  <MenuItem key={register} value={register}>
                    {formatRegisterLabel(register)}
                  </MenuItem>
                ),
              )}
            </TextField>
            <TextField
              select
              label="Scope"
              value={filterScope}
              onChange={(e) => setFilterScope(e.target.value)}
              sx={{ minWidth: 150 }}
              size="small"
            >
              <MenuItem value="all">All Scopes</MenuItem>
              <MenuItem value="core">Core ICT</MenuItem>
              <MenuItem value="extended">Extended ICT-Relevant</MenuItem>
            </TextField>
            <SearchableSelect
              label="Domain"
              value={filterDomain}
              onChange={(value) => setFilterDomain(value === null ? 'all' : value)}
              options={[
                { value: 'all', label: 'All Domains' },
                ...domains
                  .filter((domain) => domain.isActive)
                  .map((domain) => ({ value: domain.id, label: domain.name })),
              ]}
              clearable={false}
              sx={{ minWidth: 240 }}
              size="small"
              fullWidth={false}
            />
          </Box>
        </CardContent>
      </Card>

      <TableContainer component={Card}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Issuance Number</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Register & Domains</TableCell>
              <TableCell>Authority / Date</TableCell>
              <TableCell>Lifecycle & Applicability</TableCell>
              <TableCell>Scope</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredIssuances.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No issuances found
                </TableCell>
              </TableRow>
            ) : (
              pagedIssuances.map((issuance) => (
                <TableRow key={issuance.id}>
                  <TableCell>{issuance.issuance_number}</TableCell>
                  <TableCell>
                    {issuance.source_url || issuance.attachment_file_name ? (
                      <Link
                        component="button"
                        type="button"
                        underline="hover"
                        onClick={() => handleTitleClick(issuance)}
                      >
                        {issuance.title}
                      </Link>
                    ) : (
                      issuance.title
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{formatRegisterLabel(issuance.primary_register)}</Typography>
                    <Box display="flex" gap={0.5} flexWrap="wrap" mt={0.5}>
                      {issuance.domains?.map((domain) => (
                        <Chip key={domain.id} label={domain.name} size="small" variant="outlined" />
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{issuance.issuing_authority}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatIssuanceDate(issuance.issue_date, issuance.issue_date_precision)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Tooltip title={issuance.status_reason || 'No status reason recorded'} arrow>
                      <Chip
                        label={formatCategoryLabel(issuance.lifecycle_status)}
                        color={issuance.lifecycle_status === 'active' ? 'success' : 'default'}
                        size="small"
                      />
                    </Tooltip>
                    <Typography variant="caption" display="block" color="text.secondary" mt={0.5}>
                      {formatCategoryLabel(issuance.applicability_status)} · {formatCategoryLabel(issuance.register_decision)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={issuance.scope_profile === 'extended' ? 'Extended ICT-Relevant' : 'Core ICT'}
                      size="small"
                      color={issuance.scope_profile === 'extended' ? 'warning' : 'primary'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={(event) => openActionsMenu(event, issuance)}>
                      <MoreHorizIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={filteredIssuances.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 20, 50]}
        />
      </TableContainer>

      <Menu
        anchorEl={actionsAnchorEl}
        open={Boolean(actionsAnchorEl && actionsIssuance)}
        onClose={closeActionsMenu}
      >
        <MenuItem
          onClick={() => {
            if (actionsIssuance) {
              openRelevanceDialog(actionsIssuance);
            }
            closeActionsMenu();
          }}
        >
          <ListItemIcon>
            <InfoOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="View Details" />
        </MenuItem>
        {canManageIssuances && (
          <MenuItem
            onClick={() => {
              if (actionsIssuance) {
                openMappingDialog(actionsIssuance);
              }
              closeActionsMenu();
            }}
          >
            <ListItemIcon>
              <LinkIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Map Documents" />
          </MenuItem>
        )}
        {canAssessIssuances && actionsIssuance && (
          <MenuItem
            onClick={() => {
              openAssessmentDialog(actionsIssuance);
              closeActionsMenu();
            }}
          >
            <ListItemIcon>
              <FactCheckIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Record Assessment" />
          </MenuItem>
        )}
        {actionsIssuance?.attachment_file_name && (
          <MenuItem
            onClick={() => {
              if (actionsIssuance) {
                handleViewAttachment(actionsIssuance);
              }
              closeActionsMenu();
            }}
          >
            <ListItemIcon>
              <VisibilityIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="View Attached File" />
          </MenuItem>
        )}
        {actionsIssuance?.attachment_file_name && (
          <MenuItem
            onClick={() => {
              if (actionsIssuance) {
                handleDownloadAttachment(actionsIssuance);
              }
              closeActionsMenu();
            }}
          >
            <ListItemIcon>
              <DownloadIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Download Attachment" />
          </MenuItem>
        )}
        {canManageIssuances && actionsIssuance && (
          <MenuItem
            onClick={() => {
              handleToggleActive(actionsIssuance);
              closeActionsMenu();
            }}
          >
            <ListItemIcon>
              {actionsIssuance.is_active ? (
                <UnlinkIcon fontSize="small" />
              ) : (
                <LinkIcon fontSize="small" />
              )}
            </ListItemIcon>
            <ListItemText primary={actionsIssuance.is_active ? 'Deactivate' : 'Activate'} />
          </MenuItem>
        )}
        {canReviewIssuances &&
          actionsIssuance?.lifecycle_status === 'active' &&
          actionsIssuance.register_decision !== 'included' && (
          <MenuItem
            onClick={() => {
              if (actionsIssuance) void handleRegisterDecision(actionsIssuance, 'included');
              closeActionsMenu();
            }}
          >
            <ListItemIcon><LinkIcon fontSize="small" color="success" /></ListItemIcon>
            <ListItemText primary="Include in Register" />
          </MenuItem>
        )}
        {canReviewIssuances && actionsIssuance?.register_decision !== 'excluded' && (
          <MenuItem
            onClick={() => {
              if (actionsIssuance) void handleRegisterDecision(actionsIssuance, 'excluded');
              closeActionsMenu();
            }}
          >
            <ListItemIcon><UnlinkIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary="Exclude from Register" />
          </MenuItem>
        )}
        {canManageIssuances && actionsIssuance && (
          <MenuItem
            onClick={() => {
              handleOpenDialog(actionsIssuance);
              closeActionsMenu();
            }}
          >
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Edit" />
          </MenuItem>
        )}
        {canManageIssuances && actionsIssuance && (
          <MenuItem
            onClick={() => {
              handleDelete(actionsIssuance.id);
              closeActionsMenu();
            }}
          >
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText primary={actionsIssuance.lifecycle_status === 'draft' ? 'Delete Draft' : 'Retire'} />
          </MenuItem>
        )}
      </Menu>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editingIssuance ? 'Edit Issuance' : 'Add Issuance'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Issuance Number"
              value={formData.issuance_number}
              onChange={(e) => setFormData({ ...formData, issuance_number: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={3}
              fullWidth
            />
            <TextField
              select
              label="Issuance Type"
              value={formData.issuance_type || ''}
              onChange={(e) => setFormData({ ...formData, issuance_type: e.target.value })}
              fullWidth
            >
              <MenuItem value="">None</MenuItem>
              <MenuItem value="law">Law</MenuItem>
              <MenuItem value="circular">Circular</MenuItem>
              <MenuItem value="memorandum">Memorandum</MenuItem>
              <MenuItem value="irr">IRR</MenuItem>
              <MenuItem value="standard">Standard</MenuItem>
              <MenuItem value="executive_order">Executive Order</MenuItem>
              <MenuItem value="plan">Plan</MenuItem>
              <MenuItem value="guideline">Guideline</MenuItem>
            </TextField>
            <TextField
              select
              label="Primary Register"
              value={formData.primary_register || 'legal_regulatory'}
              onChange={(e) => setFormData({ ...formData, primary_register: e.target.value })}
              fullWidth
            >
              <MenuItem value="legal_regulatory">Legal & Regulatory</MenuItem>
              <MenuItem value="standards">Standards</MenuItem>
              <MenuItem value="internal_issuances">Internal Issuances</MenuItem>
              <MenuItem value="internal_operational">Internal Operational Documents</MenuItem>
            </TextField>
            <TextField
              select
              label="Lifecycle Status"
              value={formData.lifecycle_status || 'under_review'}
              onChange={(e) => setFormData({ ...formData, lifecycle_status: e.target.value })}
              fullWidth
            >
              {['draft', 'under_review', 'active', 'amended', 'superseded', 'repealed', 'revoked', 'expired', 'retired'].map(
                (status) => <MenuItem key={status} value={status}>{formatCategoryLabel(status)}</MenuItem>,
              )}
            </TextField>
            <TextField
              select
              label="Applicability"
              value={formData.applicability_status || 'pending_review'}
              onChange={(e) => setFormData({ ...formData, applicability_status: e.target.value })}
              disabled={!canReviewIssuances}
              helperText={
                canReviewIssuances
                  ? 'Record the organizational applicability decision.'
                  : 'Requires the Issuances Review capability.'
              }
              fullWidth
            >
              <MenuItem value="pending_review">Pending Review</MenuItem>
              <MenuItem value="applicable">Applicable</MenuItem>
              <MenuItem value="partially_applicable">Partially Applicable</MenuItem>
              <MenuItem value="not_applicable">Not Applicable</MenuItem>
            </TextField>
            <TextField
              select
              label="Register Decision"
              value={formData.register_decision || 'pending'}
              onChange={(e) => setFormData({ ...formData, register_decision: e.target.value })}
              disabled
              helperText="Use the Include in Register or Exclude from Register review action to record a reasoned decision."
              fullWidth
            >
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="included">Included</MenuItem>
              <MenuItem value="excluded">Excluded</MenuItem>
            </TextField>
            <TextField
              select
              label="Scope Profile"
              value={formData.scope_profile || 'core'}
              onChange={(e) => setFormData({ ...formData, scope_profile: e.target.value })}
              fullWidth
            >
              <MenuItem value="core">Core ICT</MenuItem>
              <MenuItem value="extended">Extended ICT-Relevant</MenuItem>
            </TextField>
            <SearchableMultiSelect
              label="Compliance Domains"
              value={formData.domain_ids || []}
              onChange={(domainIds) => setFormData({ ...formData, domain_ids: domainIds })}
              options={domains
                .filter(
                  (domain) => domain.isActive || (formData.domain_ids || []).includes(domain.id),
                )
                .map((domain) => ({
                  value: domain.id,
                  label: domain.isActive ? domain.name : `${domain.name} (Inactive)`,
                }))}
              helperText="An issuance may affect multiple domains without duplicating the record."
              fullWidth
            />
            <TextField
              label="Applicability Scope"
              value={formData.applicability_scope || ''}
              onChange={(e) => setFormData({ ...formData, applicability_scope: e.target.value })}
              multiline
              rows={5}
              fullWidth
              placeholder="Describe detailed operational scope (who is covered, what processes/systems are affected, governance boundaries, lifecycle stages, and exceptions)."
            />
            <TextField
              label="Relevance Notes"
              value={formData.relevance_notes || ''}
              onChange={(e) => setFormData({ ...formData, relevance_notes: e.target.value })}
              multiline
              rows={6}
              fullWidth
              placeholder="Provide in-depth rationale: legal/operational basis, control objectives, implementation implications, affected teams, compliance evidence expected, and replacement/supersession context if applicable."
            />
            <TextField
              select
              label="Binding Nature"
              value={formData.binding_nature || ''}
              onChange={(e) => setFormData({ ...formData, binding_nature: e.target.value })}
              fullWidth
            >
              <MenuItem value="">None</MenuItem>
              <MenuItem value="mandatory">Mandatory</MenuItem>
              <MenuItem value="adopted">Adopted</MenuItem>
              <MenuItem value="contractual">Contractual</MenuItem>
              <MenuItem value="voluntary">Voluntary</MenuItem>
              <MenuItem value="reference">Reference</MenuItem>
            </TextField>
            <TextField
              label="Adoption Basis"
              value={formData.adoption_basis || ''}
              onChange={(e) => setFormData({ ...formData, adoption_basis: e.target.value })}
              multiline
              rows={2}
              fullWidth
              helperText="For standards and voluntary references, state how or why the organization adopted or uses it."
            />
            <TextField
              label="Status Reason"
              value={formData.status_reason || ''}
              onChange={(e) => setFormData({ ...formData, status_reason: e.target.value })}
              multiline
              rows={2}
              fullWidth
              required={!['draft', 'under_review', 'active'].includes(formData.lifecycle_status || '')}
              helperText="Explain exclusions and historical lifecycle states without changing whether the source instrument is legally active."
            />
            <TextField
              label="Applicable Provisions"
              value={formData.applicable_provisions || ''}
              onChange={(e) => setFormData({ ...formData, applicable_provisions: e.target.value })}
              multiline
              rows={3}
              fullWidth
            />
            <TextField
              label="Compliance Obligations"
              value={formData.compliance_obligations || ''}
              onChange={(e) => setFormData({ ...formData, compliance_obligations: e.target.value })}
              multiline
              rows={3}
              fullWidth
            />
            <TextField
              label="Required Evidence (MoV)"
              value={formData.required_evidence || ''}
              onChange={(e) => setFormData({ ...formData, required_evidence: e.target.value })}
              multiline
              rows={2}
              fullWidth
            />
            <TextField
              label="Owning Unit / Function"
              value={formData.process_owner || ''}
              onChange={(event) => setFormData({ ...formData, process_owner: event.target.value })}
              fullWidth
              helperText="Use a durable office, section, team, or governance function rather than a person's name."
            />
            <SearchableSelect
              label="Accountable Person"
              value={formData.accountable_user_id ? String(formData.accountable_user_id) : ''}
              options={[{ value: '', label: 'None' }, ...processOwnerOptions]}
              onChange={(accountableUserId) =>
                setFormData({
                  ...formData,
                  accountable_user_id: accountableUserId ? Number(accountableUserId) : null,
                })
              }
              clearable
            />
            <TextField
              select
              label="Frequency / Cadence"
              value={formData.frequency_cadence || 'quarterly'}
              onChange={(e) => setFormData({ ...formData, frequency_cadence: e.target.value })}
              fullWidth
            >
              <MenuItem value="monthly">Monthly</MenuItem>
              <MenuItem value="quarterly">Quarterly</MenuItem>
              <MenuItem value="semestral">Semestral</MenuItem>
              <MenuItem value="annual">Annual</MenuItem>
              <MenuItem value="event_driven">Event-driven</MenuItem>
            </TextField>
            <TextField
              label="Register Added Date"
              type="date"
              value={formData.register_added_at || ''}
              onChange={(e) => setFormData({ ...formData, register_added_at: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              select
              label="Is Amendment"
              value={formData.is_amendment ? 'yes' : 'no'}
              onChange={(e) => setFormData({ ...formData, is_amendment: e.target.value === 'yes' })}
              fullWidth
            >
              <MenuItem value="no">No</MenuItem>
              <MenuItem value="yes">Yes</MenuItem>
            </TextField>
            {formData.is_amendment ? (
              <>
                <TextField
                  label="Amended Issuance Number"
                  value={formData.amended_issuance_number || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, amended_issuance_number: e.target.value })
                  }
                  fullWidth
                  placeholder="e.g. RA-9184"
                />
                <TextField
                  label="ICT Related Amendment Notes"
                  value={formData.ict_amendment_notes || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, ict_amendment_notes: e.target.value })
                  }
                  multiline
                  rows={4}
                  fullWidth
                  placeholder="Describe which ICT provisions were introduced/expanded by this amendment."
                />
              </>
            ) : null}
            <TextField
              label="Issuing Authority"
              value={formData.issuing_authority}
              onChange={(e) => setFormData({ ...formData, issuing_authority: e.target.value })}
              placeholder="e.g. CHED"
              required
              fullWidth
            />
            <TextField
              label="Issue Date"
              type="date"
              value={formData.issue_date || ''}
              onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              select
              label="Issue Date Precision"
              value={formData.issue_date_precision || 'unknown'}
              onChange={(e) => setFormData({ ...formData, issue_date_precision: e.target.value })}
              fullWidth
            >
              <MenuItem value="day">Exact Day</MenuItem>
              <MenuItem value="month">Month Known</MenuItem>
              <MenuItem value="year">Year Known</MenuItem>
              <MenuItem value="unknown">Unknown</MenuItem>
            </TextField>
            <TextField
              label="Approval Date"
              type="date"
              value={formData.approval_date || ''}
              onChange={(e) => setFormData({ ...formData, approval_date: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Effectivity Date"
              type="date"
              value={formData.effectivity_date || ''}
              onChange={(e) => setFormData({ ...formData, effectivity_date: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              select
              label="Effectivity Date Precision"
              value={formData.effectivity_date_precision || 'unknown'}
              onChange={(e) => setFormData({ ...formData, effectivity_date_precision: e.target.value })}
              fullWidth
            >
              <MenuItem value="day">Exact Day</MenuItem>
              <MenuItem value="month">Month Known</MenuItem>
              <MenuItem value="year">Year Known</MenuItem>
              <MenuItem value="unknown">Unknown</MenuItem>
            </TextField>
            <TextField
              label="End / Expiry Date"
              type="date"
              value={formData.end_date || ''}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Source URL"
              value={formData.source_url}
              onChange={(e) => setFormData({ ...formData, source_url: e.target.value })}
              fullWidth
            />
            {editingIssuance?.attachment_file_name && (
              <Typography variant="body2" color="text.secondary">
                Current Attachment: {editingIssuance.attachment_file_name}
              </Typography>
            )}
            <Button component="label" variant="outlined" startIcon={<CloudUploadIcon />}>
              {attachmentFile
                ? `Selected: ${attachmentFile.name}`
                : 'Upload Attachment (PDF/DOC/DOCX)'}
              <input
                hidden
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(event) => {
                  const file = event.target.files?.[0] || null;
                  setAttachmentFile(file);
                }}
              />
            </Button>
            {editingIssuance?.attachment_file_name && (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={removeExistingAttachment}
                    onChange={(event) => setRemoveExistingAttachment(event.target.checked)}
                    disabled={Boolean(attachmentFile)}
                  />
                }
                label="Remove current attachment"
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingIssuance ? 'Save' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={mappingOpen} onClose={closeMappingDialog} maxWidth="lg" fullWidth>
        <DialogTitle>
          Document Mapping {selectedIssuance ? `• ${selectedIssuance.issuance_number}` : ''}
        </DialogTitle>
        <DialogContent>
          {mappingLoading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <Typography>Loading mapping data...</Typography>
            </Box>
          ) : (
            <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Search Documents"
                value={mappingSearch}
                onChange={(e) => setMappingSearch(e.target.value)}
                placeholder="Search by title, type, or unit"
                fullWidth
                size="small"
              />

              <Typography variant="subtitle1" fontWeight={600}>
                Linked Documents ({mappedDocuments.length})
              </Typography>
              {mappedDocuments.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No documents currently linked.
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {mappedDocuments.map((document) => (
                    <Box
                      key={`linked-${document.id}`}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        p: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                      }}
                    >
                      <Box>
                        <Typography fontWeight={600}>{document.title}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {document.document_type} • {document.year}-{document.period} •{' '}
                          {document.unit?.name || 'No Unit'}
                        </Typography>
                      </Box>
                      {canManageIssuances && (
                        <Button
                          size="small"
                          color="warning"
                          startIcon={<UnlinkIcon />}
                          onClick={() => handleUnlinkDocument(document.id)}
                        >
                          Unlink
                        </Button>
                      )}
                    </Box>
                  ))}
                </Box>
              )}

              <Typography variant="subtitle1" fontWeight={600}>
                Available Ready/Compliant Documents
              </Typography>
              {filteredDocuments.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No documents matched your search.
                </Typography>
              ) : (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                    maxHeight: 320,
                    overflowY: 'auto',
                  }}
                >
                  {filteredDocuments.map((document) => {
                    const isLinked = mappedDocumentIds.has(document.id);
                    return (
                      <Box
                        key={`available-${document.id}`}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          p: 1,
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1,
                          bgcolor: isLinked ? 'action.hover' : 'inherit',
                        }}
                      >
                        <Box>
                          <Typography fontWeight={600}>{document.title}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {document.document_type} • {document.year}-{document.period} •{' '}
                            {document.unit?.name || 'No Unit'}
                          </Typography>
                        </Box>
                        {isLinked ? (
                          <Chip label="Linked" size="small" color="success" />
                        ) : canManageIssuances ? (
                          <Button
                            size="small"
                            startIcon={<LinkIcon />}
                            onClick={() => handleLinkDocument(document.id)}
                          >
                            Link
                          </Button>
                        ) : (
                          <Chip label="Not Linked" size="small" variant="outlined" />
                        )}
                      </Box>
                    );
                  })}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeMappingDialog}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={relevanceOpen} onClose={closeRelevanceDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          Applicability and Relevance{' '}
          {selectedIssuance ? `• ${selectedIssuance.issuance_number}` : ''}
        </DialogTitle>
        <DialogContent dividers>
          {detailsLoading ? (
            <Box display="flex" alignItems="center" justifyContent="center" minHeight={240}>
              <CircularProgress aria-label="Loading issuance details" />
            </Box>
          ) : selectedIssuance ? (
            <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Title
                </Typography>
                <Typography variant="body1" fontWeight={600}>
                  {selectedIssuance.title}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Issuance Type
                </Typography>
                <Typography variant="body1">
                  {selectedIssuance.issuance_type || 'Not specified'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Applicability Scope
                </Typography>
                <Typography variant="body1">
                  {selectedIssuance.applicability_scope || 'No applicability scope provided.'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Relevance Notes
                </Typography>
                <Typography variant="body1">
                  {selectedIssuance.relevance_notes ||
                    selectedIssuance.description ||
                    'No relevance notes provided.'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Binding Nature
                </Typography>
                <Typography variant="body1">
                  {selectedIssuance.binding_nature || 'Not specified'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Register / Lifecycle / Applicability
                </Typography>
                <Typography variant="body1">
                  {formatRegisterLabel(selectedIssuance.primary_register)} ·{' '}
                  {formatCategoryLabel(selectedIssuance.lifecycle_status)} ·{' '}
                  {formatCategoryLabel(selectedIssuance.applicability_status)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Status Reason</Typography>
                <Typography variant="body1">
                  {selectedIssuance.status_reason || 'No status reason recorded.'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Adoption Basis</Typography>
                <Typography variant="body1">
                  {selectedIssuance.adoption_basis || 'Not specified'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Compliance Domains</Typography>
                <Typography variant="body1">
                  {selectedIssuance.domains?.map((domain) => domain.name).join(', ') || 'Not specified'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Applicable Provisions
                </Typography>
                <Typography variant="body1">
                  {selectedIssuance.applicable_provisions || 'Not specified'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Compliance Obligations
                </Typography>
                <Typography variant="body1">
                  {selectedIssuance.compliance_obligations || 'Not specified'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Required Evidence (MoV)
                </Typography>
                <Typography variant="body1">
                  {selectedIssuance.required_evidence || 'Not specified'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Owning Unit / Function
                </Typography>
                <Typography variant="body1">
                  {selectedIssuance.process_owner || 'Not specified'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Accountable Person
                </Typography>
                <Typography variant="body1">
                  {processOwnerOptions.find(
                    (option) => option.value === String(selectedIssuance.accountable_user_id || ''),
                  )?.label || 'Not assigned'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Register Added Date
                </Typography>
                <Typography variant="body1">
                  {selectedIssuance.register_added_at
                    ? selectedIssuance.register_added_at.split('T')[0]
                    : 'Not specified'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary" mb={0.5}>
                  Period Assessments
                </Typography>
                {selectedIssuance.assessments?.length ? (
                  <Box display="flex" flexDirection="column" gap={0.75}>
                    {[...selectedIssuance.assessments]
                      .sort(
                        (left, right) =>
                          Number(right.year) - Number(left.year) ||
                          Number(right.quarter || 0) - Number(left.quarter || 0),
                      )
                      .map((assessment) => (
                        <Typography key={assessment.id} variant="body2">
                          {assessment.year} {assessment.quarter ? `Q${assessment.quarter}` : 'Annual'} ·{' '}
                          {formatCategoryLabel(assessment.status)} ·{' '}
                          {formatCategoryLabel(assessment.readinessStatus || 'not_assessed')}
                        </Typography>
                      ))}
                  </Box>
                ) : (
                  <Typography variant="body1">No period assessment recorded.</Typography>
                )}
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Amendment
                </Typography>
                <Typography variant="body1">
                  {selectedIssuance.is_amendment
                    ? `Yes • Amends ${selectedIssuance.amended_issuance_number || 'N/A'}`
                    : 'No'}
                </Typography>
              </Box>
              {selectedIssuance.is_amendment ? (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    ICT Related Amendment Notes
                  </Typography>
                  <Typography variant="body1">
                    {selectedIssuance.ict_amendment_notes || 'No ICT amendment notes provided.'}
                  </Typography>
                </Box>
              ) : null}
              <Divider />
              <Box>
                <Box display="flex" justifyContent="space-between" alignItems="center" gap={2} mb={1}>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={600}>Sources and Provenance</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Identifies where the issuance record came from and which source is authoritative.
                    </Typography>
                  </Box>
                  {canManageIssuances && (
                    <Button
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={() => setSourceDialogOpen(true)}
                    >
                      Add Source
                    </Button>
                  )}
                </Box>
                {selectedIssuance.sources?.length ? (
                  <Box display="flex" flexDirection="column" gap={1}>
                    {selectedIssuance.sources.map((source) => (
                      <Box
                        key={source.id}
                        sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.25 }}
                      >
                        <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                          <Chip size="small" label={formatCategoryLabel(source.sourceType)} />
                          {source.isPrimary && <Chip size="small" color="primary" label="Primary" />}
                          <Chip
                            size="small"
                            color={source.verifiedAt ? 'success' : 'warning'}
                            label={source.verifiedAt ? `Verified ${source.verifiedAt.split('T')[0]}` : 'Not verified'}
                          />
                          {canManageIssuances && (
                            <Button
                              size="small"
                              onClick={async () => {
                                if (!selectedIssuance) return;
                                await issuancesApi.verifySource(selectedIssuance.id, source.id);
                                setSelectedIssuance(await issuancesApi.getById(selectedIssuance.id));
                                enqueueSnackbar('Source verification date updated.', { variant: 'success' });
                              }}
                            >
                              Verify Now
                            </Button>
                          )}
                        </Box>
                        {source.url && (
                          <Link href={source.url} target="_blank" rel="noopener noreferrer" display="block" mt={0.75}>
                            {source.url}
                          </Link>
                        )}
                        {(source.sourceOrganization || source.externalDocumentId || source.originalFileName) && (
                          <Typography variant="body2" color="text.secondary" mt={0.5}>
                            {[
                              source.sourceOrganization,
                              source.externalDocumentId && `Document ID: ${source.externalDocumentId}`,
                              source.originalFileName,
                            ].filter(Boolean).join(' · ')}
                          </Typography>
                        )}
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">No source provenance recorded.</Typography>
                )}
              </Box>
              <Divider />
              <Box>
                <Box display="flex" justifyContent="space-between" alignItems="center" gap={2} mb={1}>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={600}>Issuance Relationships</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Shows amendments, superseding issuances, implementation bases, and related records.
                    </Typography>
                  </Box>
                  {canManageIssuances && (
                    <Button
                      size="small"
                      startIcon={<LinkIcon />}
                      onClick={() => setRelationshipDialogOpen(true)}
                    >
                      Add Relationship
                    </Button>
                  )}
                </Box>
                {selectedIssuance.outgoingRelationships?.length || selectedIssuance.incomingRelationships?.length ? (
                  <Box display="flex" flexDirection="column" gap={1}>
                    {selectedIssuance.outgoingRelationships?.map((relationship) => (
                      <Box
                        key={`outgoing-${relationship.id}`}
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                        gap={2}
                        sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.25 }}
                      >
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            This issuance {formatCategoryLabel(relationship.relationshipType).toLowerCase()} {relationship.targetIssuance?.issuance_number || 'another issuance'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {relationship.targetIssuance?.title || 'Target issuance'}
                            {relationship.notes ? ` · ${relationship.notes}` : ''}
                          </Typography>
                        </Box>
                        {canManageIssuances && (
                          <IconButton
                            size="small"
                            color="error"
                            aria-label="Remove issuance relationship"
                            onClick={() => void removeRelationship(relationship.id)}
                          >
                            <UnlinkIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                    ))}
                    {selectedIssuance.incomingRelationships?.map((relationship) => (
                      <Box
                        key={`incoming-${relationship.id}`}
                        sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.25 }}
                      >
                        <Typography variant="body2" fontWeight={600}>
                          {relationship.sourceIssuance?.issuance_number || 'Another issuance'} {formatCategoryLabel(relationship.relationshipType).toLowerCase()} this issuance
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {relationship.sourceIssuance?.title || 'Source issuance'}
                          {relationship.notes ? ` · ${relationship.notes}` : ''}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">No issuance relationships recorded.</Typography>
                )}
              </Box>
              <Divider />
              <Box>
                <Typography variant="subtitle1" fontWeight={600} mb={1}>Lifecycle History</Typography>
                {selectedIssuance.lifecycleHistory?.length ? (
                  <Box display="flex" flexDirection="column" gap={1}>
                    {[...selectedIssuance.lifecycleHistory]
                      .sort((left, right) => new Date(right.changedAt).getTime() - new Date(left.changedAt).getTime())
                      .map((history) => (
                        <Box key={history.id}>
                          <Typography variant="body2" fontWeight={600}>
                            {history.fromStatus
                              ? `${formatCategoryLabel(history.fromStatus)} → ${formatCategoryLabel(history.toStatus)}`
                              : formatCategoryLabel(history.toStatus)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {history.reason} · {new Date(history.changedAt).toLocaleString()}
                          </Typography>
                        </Box>
                      ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">No lifecycle changes recorded.</Typography>
                )}
              </Box>
              <Divider />
              <Box>
                <Typography variant="subtitle1" fontWeight={600} mb={1}>Register Decision History</Typography>
                {selectedIssuance.registerDecisionHistory?.length ? (
                  <Box display="flex" flexDirection="column" gap={1}>
                    {[...selectedIssuance.registerDecisionHistory]
                      .sort((left, right) => new Date(right.decidedAt).getTime() - new Date(left.decidedAt).getTime())
                      .map((decision) => (
                        <Box key={decision.id}>
                          <Typography variant="body2" fontWeight={600}>
                            {formatCategoryLabel(decision.decision)} · {formatCategoryLabel(decision.applicabilityStatus)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {decision.reason} · {new Date(decision.decidedAt).toLocaleString()}
                          </Typography>
                        </Box>
                      ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">No register decision recorded.</Typography>
                )}
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Mapped Documents
                </Typography>
                <Typography variant="body1">{selectedIssuance.documents?.length || 0}</Typography>
              </Box>
            </Box>
          ) : (
            <Typography sx={{ pt: 1 }}>No issuance selected.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeRelevanceDialog}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={sourceDialogOpen}
        onClose={() => !sourceSaving && setSourceDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Add Issuance Source</DialogTitle>
        <DialogContent dividers>
          <Box display="flex" flexDirection="column" gap={2} pt={0.5}>
            <TextField
              select
              label="Source Type"
              value={sourceForm.sourceType}
              onChange={(event) => setSourceForm({ ...sourceForm, sourceType: event.target.value })}
              fullWidth
            >
              <MenuItem value="official_external">Official External Source</MenuItem>
              <MenuItem value="official_internal">Official Internal Source</MenuItem>
              <MenuItem value="google_drive">Google Drive</MenuItem>
              <MenuItem value="reference_link">Reference Link</MenuItem>
            </TextField>
            <TextField
              label="Source URL"
              type="url"
              required
              value={sourceForm.url}
              onChange={(event) => setSourceForm({ ...sourceForm, url: event.target.value })}
              helperText="Use the direct, identifiable location of the issuance."
              fullWidth
            />
            <TextField
              label="Source Organization"
              value={sourceForm.sourceOrganization}
              onChange={(event) => setSourceForm({ ...sourceForm, sourceOrganization: event.target.value })}
              fullWidth
            />
            <TextField
              label="External Document ID"
              value={sourceForm.externalDocumentId}
              onChange={(event) => setSourceForm({ ...sourceForm, externalDocumentId: event.target.value })}
              fullWidth
            />
            <FormControlLabel
              control={(
                <Checkbox
                  checked={sourceForm.isPrimary}
                  onChange={(event) => setSourceForm({ ...sourceForm, isPrimary: event.target.checked })}
                />
              )}
              label="Use as the primary source"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSourceDialogOpen(false)} disabled={sourceSaving}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => void saveSource()}
            disabled={sourceSaving || !sourceForm.url.trim()}
          >
            {sourceSaving ? 'Saving...' : 'Add Source'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={relationshipDialogOpen}
        onClose={() => !relationshipSaving && setRelationshipDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Issuance Relationship</DialogTitle>
        <DialogContent dividers>
          <Box display="flex" flexDirection="column" gap={2} pt={0.5}>
            <SearchableSelect
              label="Related Issuance"
              value={relationshipForm.targetIssuanceId}
              options={allIssuances
                .filter((issuance) => issuance.id !== selectedIssuance?.id)
                .map((issuance) => ({
                  value: issuance.id,
                  label: `${issuance.issuance_number} — ${issuance.title}`,
                }))}
              onChange={(targetIssuanceId) =>
                setRelationshipForm({ ...relationshipForm, targetIssuanceId: targetIssuanceId || '' })
              }
              required
              clearable
            />
            <TextField
              select
              label="Relationship"
              value={relationshipForm.relationshipType}
              onChange={(event) =>
                setRelationshipForm({ ...relationshipForm, relationshipType: event.target.value })
              }
              fullWidth
            >
              <MenuItem value="implements">Implements</MenuItem>
              <MenuItem value="amends">Amends</MenuItem>
              <MenuItem value="supersedes">Supersedes</MenuItem>
              <MenuItem value="repeals">Repeals</MenuItem>
              <MenuItem value="supplements">Supplements</MenuItem>
              <MenuItem value="clarifies">Clarifies</MenuItem>
              <MenuItem value="pursuant_to">Pursuant To</MenuItem>
              <MenuItem value="related_to">Related To</MenuItem>
            </TextField>
            <TextField
              label="Relationship Notes"
              value={relationshipForm.notes}
              onChange={(event) => setRelationshipForm({ ...relationshipForm, notes: event.target.value })}
              multiline
              minRows={3}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRelationshipDialogOpen(false)} disabled={relationshipSaving}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => void saveRelationship()}
            disabled={relationshipSaving || !relationshipForm.targetIssuanceId}
          >
            {relationshipSaving ? 'Saving...' : 'Add Relationship'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(assessmentIssuance)}
        onClose={() => !assessmentSaving && setAssessmentIssuance(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Compliance Assessment</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" fontWeight={600} mb={2}>
            {assessmentIssuance?.issuance_number} · {assessmentIssuance?.title}
          </Typography>
          <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={2}>
            <TextField
              label="Assessment Year"
              type="number"
              value={assessmentForm.year}
              onChange={(event) =>
                selectAssessmentPeriod(Number(event.target.value), assessmentForm.quarter)
              }
              inputProps={{ min: 2000, max: 2200 }}
              fullWidth
            />
            <TextField
              select
              label="Quarter"
              value={assessmentForm.quarter ?? ''}
              onChange={(event) =>
                selectAssessmentPeriod(
                  assessmentForm.year,
                  event.target.value === '' ? null : Number(event.target.value),
                )
              }
              fullWidth
            >
              <MenuItem value="">Annual</MenuItem>
              {[1, 2, 3, 4].map((quarter) => (
                <MenuItem key={quarter} value={quarter}>Q{quarter}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Compliance Status"
              value={assessmentForm.status}
              onChange={(event) =>
                setAssessmentForm({ ...assessmentForm, status: event.target.value })
              }
              fullWidth
            >
              <MenuItem value="not_assessed">Not Assessed</MenuItem>
              <MenuItem value="compliant">Compliant</MenuItem>
              <MenuItem value="partial">Partial</MenuItem>
              <MenuItem value="non_compliant">Non-Compliant</MenuItem>
              <MenuItem value="not_applicable">Not Applicable</MenuItem>
            </TextField>
            <TextField
              select
              label="Readiness"
              value={assessmentForm.readinessStatus}
              onChange={(event) =>
                setAssessmentForm({ ...assessmentForm, readinessStatus: event.target.value })
              }
              fullWidth
            >
              <MenuItem value="not_assessed">Not Assessed</MenuItem>
              <MenuItem value="ready">Ready</MenuItem>
              <MenuItem value="needs_update">Needs Update</MenuItem>
              <MenuItem value="missing_evidence">Missing Evidence</MenuItem>
            </TextField>
            <TextField
              label="Evidence Summary"
              value={assessmentForm.evidenceSummary}
              onChange={(event) =>
                setAssessmentForm({ ...assessmentForm, evidenceSummary: event.target.value })
              }
              multiline
              minRows={3}
              fullWidth
              sx={{ gridColumn: { sm: '1 / -1' } }}
              helperText="Record the evidence available for this assessment period."
            />
            <TextField
              label="Finding / Gap Summary"
              value={assessmentForm.gapSummary}
              onChange={(event) =>
                setAssessmentForm({ ...assessmentForm, gapSummary: event.target.value })
              }
              multiline
              minRows={3}
              fullWidth
              sx={{ gridColumn: { sm: '1 / -1' } }}
              helperText="Record the concise assessment finding and the current compliance gap."
            />
           </Box>
          <Divider sx={{ my: 3 }} />
          {!activeAssessment ? (
            <Typography variant="body2" color="text.secondary">
              Save this assessment period before linking evidence or adding corrective actions.
            </Typography>
          ) : (
            <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={3}>
              <Box>
                <Typography variant="subtitle1" fontWeight={700} mb={1}>Evidence</Typography>
                {(activeAssessment.evidence || []).map((evidence) => (
                  <Box key={evidence.id} display="flex" alignItems="center" gap={1} mb={1}>
                    <Link href={evidence.url || '#'} target="_blank" rel="noopener noreferrer" sx={{ flex: 1 }}>
                      {evidence.label}
                    </Link>
                    <IconButton
                      size="small"
                      color="error"
                      disabled={assessmentChildSaving}
                      onClick={() => void removeAssessmentEvidence(evidence.id)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
                {(activeAssessment.evidence || []).length === 0 && (
                  <Typography variant="body2" color="text.secondary" mb={1}>No linked evidence yet.</Typography>
                )}
                <TextField
                  label="Evidence Label"
                  value={evidenceForm.label}
                  onChange={(event) => setEvidenceForm({ ...evidenceForm, label: event.target.value })}
                  fullWidth
                  size="small"
                  sx={{ mb: 1 }}
                />
                <TextField
                  label="Evidence Link"
                  value={evidenceForm.url}
                  onChange={(event) => setEvidenceForm({ ...evidenceForm, url: event.target.value })}
                  fullWidth
                  size="small"
                  sx={{ mb: 1 }}
                />
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => void addAssessmentEvidence()}
                  disabled={assessmentChildSaving || !evidenceForm.label.trim() || !evidenceForm.url.trim()}
                >
                  Link Evidence
                </Button>
              </Box>
              <Box>
                <Typography variant="subtitle1" fontWeight={700} mb={1}>Corrective Actions</Typography>
                {(activeAssessment.remediationActions || []).map((action) => (
                  <Box key={action.id} border={1} borderColor="divider" borderRadius={1} p={1} mb={1}>
                    <Box display="flex" alignItems="flex-start" gap={1}>
                      <Box flex={1}>
                        <Typography variant="body2" fontWeight={600}>{action.action}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {action.owner || 'Unassigned'}{action.targetDate ? ` · Due ${action.targetDate}` : ''}
                        </Typography>
                      </Box>
                      <TextField
                        select
                        size="small"
                        value={action.status}
                        onChange={(event) => void updateRemediationStatus(action.id, event.target.value)}
                        disabled={assessmentChildSaving}
                        sx={{ minWidth: 125 }}
                      >
                        <MenuItem value="open">Open</MenuItem>
                        <MenuItem value="in_progress">In Progress</MenuItem>
                        <MenuItem value="completed">Completed</MenuItem>
                        <MenuItem value="cancelled">Cancelled</MenuItem>
                      </TextField>
                      <IconButton
                        size="small"
                        color="error"
                        disabled={assessmentChildSaving}
                        onClick={() => void removeRemediationAction(action.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                ))}
                <TextField
                  label="Corrective Action"
                  value={actionForm.action}
                  onChange={(event) => setActionForm({ ...actionForm, action: event.target.value })}
                  fullWidth
                  size="small"
                  sx={{ mb: 1 }}
                />
                <Box display="grid" gridTemplateColumns="1fr 1fr" gap={1} mb={1}>
                  <TextField
                    label="Owner"
                    value={actionForm.owner}
                    onChange={(event) => setActionForm({ ...actionForm, owner: event.target.value })}
                    size="small"
                  />
                  <TextField
                    label="Target Date"
                    type="date"
                    value={actionForm.targetDate}
                    onChange={(event) => setActionForm({ ...actionForm, targetDate: event.target.value })}
                    InputLabelProps={{ shrink: true }}
                    size="small"
                  />
                </Box>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => void addRemediationAction()}
                  disabled={assessmentChildSaving || !actionForm.action.trim()}
                >
                  Add Corrective Action
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssessmentIssuance(null)} disabled={assessmentSaving}>Cancel</Button>
          <Button variant="contained" onClick={() => void saveAssessment()} disabled={assessmentSaving}>
            {assessmentSaving ? 'Saving...' : 'Save Assessment'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={domainDialogOpen} onClose={() => setDomainDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Compliance Domains</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Domains classify an issuance without duplicating it across registers.
          </Typography>
          <Box display="flex" flexDirection="column" gap={1} mb={3}>
            {domains.map((domain) => (
              <Box key={domain.id} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                <Box>
                  <Typography variant="body2" fontWeight={600}>{domain.name}</Typography>
                  {domain.description && (
                    <Typography variant="caption" color="text.secondary">{domain.description}</Typography>
                  )}
                </Box>
                <Button
                  size="small"
                  color={domain.isActive ? 'warning' : 'success'}
                  onClick={() => void handleToggleDomain(domain)}
                >
                  {domain.isActive ? 'Deactivate' : 'Activate'}
                </Button>
              </Box>
            ))}
          </Box>
          <Typography variant="subtitle2" mb={1}>Add Domain</Typography>
          <TextField
            label="Domain Name"
            value={newDomainName}
            onChange={(event) => setNewDomainName(event.target.value)}
            fullWidth
            sx={{ mb: 1.5 }}
          />
          <TextField
            label="Description"
            value={newDomainDescription}
            onChange={(event) => setNewDomainDescription(event.target.value)}
            multiline
            rows={2}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDomainDialogOpen(false)}>Close</Button>
          <Button variant="contained" onClick={() => void handleCreateDomain()} disabled={!newDomainName.trim()}>
            Add Domain
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!deleteConfirmIssuance} onClose={() => setDeleteConfirmIssuance(null)}>
        <DialogTitle>Confirm Removal</DialogTitle>
        <DialogContent>
          <Typography>
            Unused drafts are deleted. All other records are retired and retained in historical
            traceability instead of being permanently removed.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmIssuance(null)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            Continue
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
