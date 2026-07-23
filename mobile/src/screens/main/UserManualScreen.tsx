import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Card, Title, Modal, Portal, Button, IconButton, Paragraph } from 'react-native-paper';
import { useAuthStore } from '../../store/useAuthStore';

type ManualItem = {
  title: string;
  path: string;
  details: {
    purpose: string;
    activities: Array<{ name: string; description: string }>;
    results: Array<{ name: string; description: string }>;
  };
};

const capabilityManuals: ManualItem[] = [
  {
    title: 'General Support Ticketing',
    path: 'global',
    details: {
      purpose: 'As a system user I need a centralized support portal to report technical issues so that the service team can resolve problems efficiently.',
      activities: [
        { name: 'Classify service requests', description: 'As a system user I need to categorize the problem and provide a detailed description so that the request reaches the correct support team.' },
        { name: 'Indicate request urgency', description: 'As a system user I need to specify the impact of a request so that support priorities are established appropriately.' },
        { name: 'Provide troubleshooting context', description: 'As a system user I need to add follow up notes and attach relevant files so that technicians have enough context to investigate the issue.' }
      ],
      results: [
        { name: 'Track request status', description: 'As a system user I need to monitor the progress of active requests so that I know when service restoration is expected.' },
        { name: 'Verify issue resolution', description: 'As a system user I need to review the actions taken by the technician so that I can confirm the problem is fully resolved.' }
      ]
    }
  },
  {
    title: 'Knowledge Base Access',
    path: 'global',
    details: {
      purpose: 'As a system user I need a centralized repository of troubleshooting guides so that I can resolve common technical issues independently.',
      activities: [
        { name: 'Search troubleshooting guides', description: 'As a system user I need to browse published articles so that recurring technical issues are resolved using established methods.' }
      ],
      results: [
        { name: 'Access technical solutions', description: 'As a system user I need to read detailed resolution procedures so that I can apply fixes without waiting for support staff.' }
      ]
    }
  },
  {
    title: 'Account Profile',
    path: 'global',
    details: {
      purpose: 'As a system user I need to view my account information so that I can confirm my identity and contact details.',
      activities: [
        { name: 'Review account details', description: 'As a system user I need to check my assigned role and unit so that my support requests are categorized accurately.' }
      ],
      results: [
        { name: 'Verify identity information', description: 'As a system user I need to confirm my profile settings so that my access levels remain correct.' }
      ]
    }
  },
  {
    title: 'Support and Ticket Management',
    path: 'isSupportStaff',
    details: {
      purpose: 'As an IT support professional I need tools to manage user requests and track service agreements so that technical issues are resolved efficiently.',
      activities: [
        { name: 'Assign support requests', description: 'As an IT support professional I need to assign requests to myself or transfer them to other technicians based on expertise so that work is distributed fairly.' },
        { name: 'Update operational progress', description: 'As an IT support professional I need to transition requests through operational states so that the current progress is accurately reflected.' },
        { name: 'Document issue resolution', description: 'As an IT support professional I need to document the root cause and corrective actions taken so that future reference is available for similar issues.' }
      ],
      results: [
        { name: 'Monitor active workload', description: 'As an IT support professional I need to view prioritized queues of active and overdue requests so that I can focus on urgent tasks.' },
        { name: 'Track service deadlines', description: 'As an IT support professional I need to monitor countdown timers for resolution deadlines so that service breaches are prevented.' },
        { name: 'Review ticket history', description: 'As an IT support professional I need access to assignment and status history so that previous actions remain visible and traceable.' }
      ]
    }
  },
  {
    title: 'Escalation Handling',
    path: 'isEscalationFocal',
    details: {
      purpose: 'As an escalation focal I need specialized access to delayed support requests so that blocked issues are unblocked quickly.',
      activities: [
        { name: 'Intervene on stalled requests', description: 'As an escalation focal I need to assume responsibility for tickets that have breached service agreements so that specialized attention is applied.' }
      ],
      results: [
        { name: 'Monitor critical delays', description: 'As an escalation focal I need to view dedicated queues for stalled tickets so that high risk delays receive immediate resolution.' }
      ]
    }
  },
  {
    title: 'Ticketing Configuration',
    path: 'isTicketSettingsFocal',
    details: {
      purpose: 'As a ticket administrator I need to configure routing strategies and escalation paths so that the help desk operates according to organizational requirements.',
      activities: [
        { name: 'Maintain ticket categories', description: 'As a ticket administrator I need to manage request categories and define response expectations so that support operations remain organized.' },
        { name: 'Establish routing rules', description: 'As a ticket administrator I need to define automatic assignment strategies and set workload limits so that requests are distributed evenly among support staff.' },
        { name: 'Configure escalation paths', description: 'As a ticket administrator I need to configure rules that dictate what happens when a ticket breaches its deadline so that supervisors are notified appropriately.' }
      ],
      results: [
        { name: 'Apply routing configurations', description: 'As a ticket administrator I need to observe the immediate application of new routing or deadline rules to newly created tickets so that the help desk adapts instantly to operational changes.' }
      ]
    }
  },
  {
    title: 'Help Desk Analytics',
    path: 'isTicketSettingsFocal',
    details: {
      purpose: 'As a ticket administrator I need to generate performance analytics so that I can evaluate support team efficiency and volume trends.',
      activities: [
        { name: 'Filter resolution data', description: 'As a ticket administrator I need to specify reporting periods and technician filters so that performance metrics are targeted accurately.' }
      ],
      results: [
        { name: 'Review resolution metrics', description: 'As a ticket administrator I need to analyze average resolution times and completion volumes so that support bottlenecks are identified.' }
      ]
    }
  },
  {
    title: 'Knowledge Base Management',
    path: 'isSupportStaff',
    details: {
      purpose: 'As a support contributor I need to maintain a centralized repository of troubleshooting guides so that users can resolve common issues independently.',
      activities: [
        { name: 'Publish support articles', description: 'As a support contributor I need to write and categorize resolution procedures so that technical knowledge is captured permanently.' }
      ],
      results: [
        { name: 'Search troubleshooting solutions', description: 'As a support contributor I need to browse published articles so that recurring technical issues are resolved using standardized methods.' }
      ]
    }
  },
  {
    title: 'Attendance Monitoring',
    path: 'isAttendanceAccess',
    details: {
      purpose: 'As an operational monitor I need to view the daily attendance of support staff so that I can understand current support capacity.',
      activities: [
        { name: 'Select operational dates', description: 'As an operational monitor I need to navigate calendar dates so that I can review historical or current staff availability.' }
      ],
      results: [
        { name: 'View staff availability', description: 'As an operational monitor I need to view a list of technicians alongside their current attendance status so that I know who is available for assignment.' },
        { name: 'Review login records', description: 'As an operational monitor I need to review read only logs detailing when staff authenticated into the system so that operational awareness is maintained.' }
      ]
    }
  },
  {
    title: 'Attendance Administration',
    path: 'isAttendanceManage',
    details: {
      purpose: 'As an attendance manager I need to define scheduled office days and correct daily records so that the automated ticket routing engine assigns work accurately.',
      activities: [
        { name: 'Establish office schedules', description: 'As an attendance manager I need to set expected working days for specific personnel so that baseline availability is established.' },
        { name: 'Maintain attendance records', description: 'As an attendance manager I need to override a technician status with mandatory remarks so that inaccuracies or leave requests are accommodated.' }
      ],
      results: [
        { name: 'Update assignment routing', description: 'As an attendance manager I need to observe the immediate reflection of the new status so that the ticket assignment engine updates routing availability.' },
        { name: 'Review attendance audits', description: 'As an attendance manager I need to review recorded manual overrides in the compliance trail so that attendance changes remain transparent.' }
      ]
    }
  },
  {
    title: 'Document Repository Upload',
    path: 'isDocumentsAccess',
    details: {
      purpose: 'As a compliance contributor I need to upload documents and track pending reviews so that organizational policies are properly vetted and stored.',
      activities: [
        { name: 'Submit compliance documents', description: 'As a compliance contributor I need to upload files so that the system can process the text and evaluate compliance requirements automatically.' },
        { name: 'Categorize policy submissions', description: 'As a compliance contributor I need to define the document type owning unit and effective dates so that files are categorized correctly.' }
      ],
      results: [
        { name: 'Track pending submissions', description: 'As a compliance contributor I need to view a list of documents currently undergoing compliance review so that submission progress is tracked.' },
        { name: 'View integrated documents', description: 'As a compliance contributor I need to read document content directly within the application so that downloading files is unnecessary.' }
      ]
    }
  },
  {
    title: 'Compliance Document Review',
    path: 'isReviewsAccess',
    details: {
      purpose: 'As a compliance reviewer I need to evaluate drafted documents against required standards so that only compliant policies are approved for organizational use.',
      activities: [
        { name: 'Evaluate compliance submissions', description: 'As a compliance reviewer I need to approve or reject a document based on content analysis so that organizational standards are upheld.' },
        { name: 'Provide review feedback', description: 'As a compliance reviewer I need to document observations and recommendations so that revisions can be completed effectively.' }
      ],
      results: [
        { name: 'Confirm repository transfers', description: 'As a compliance reviewer I need to confirm that fully approved documents move into the final repository so that they become official policy.' },
        { name: 'Track revision workflows', description: 'As a compliance reviewer I need to ensure rejected documents return to the contributor queue so that revisions can take place.' }
      ]
    }
  },
  {
    title: 'Official Document Repository',
    path: 'isRepositoryAccess',
    details: {
      purpose: 'As a compliance reader I need access to the final approved policies and manuals so that I can reference official organizational guidelines.',
      activities: [
        { name: 'Search official records', description: 'As a compliance reader I need to search for approved documents using keywords and categories so that I can find relevant policies quickly.' }
      ],
      results: [
        { name: 'Access official documents', description: 'As a compliance reader I need to view or download finalized compliance materials so that I can adhere to established procedures.' }
      ]
    }
  },
  {
    title: 'Regulatory Issuances Management',
    path: 'isIssuancesAccess',
    details: {
      purpose: 'As a compliance mapper I need to link internal documents to external regulatory issuances so that external compliance obligations are demonstrably met.',
      activities: [
        { name: 'Map regulatory requirements', description: 'As a compliance mapper I need to associate external issuances with internal uploaded policies so that coverage gaps are eliminated.' }
      ],
      results: [
        { name: 'Review compliance coverage', description: 'As a compliance mapper I need to view a traceability matrix of external rules against internal documents so that regulatory alignment is proven during audits.' }
      ]
    }
  },
  {
    title: 'Means of Verification Processing',
    path: 'isMovAccess',
    details: {
      purpose: 'As a compliance contributor I need to manage objective evidence for assessments so that compliance audits are supported by factual records.',
      activities: [
        { name: 'Submit verifiable evidence', description: 'As a compliance contributor I need to upload supporting documentation demonstrating adherence to specific metric requirements so that auditors have proof of compliance.' }
      ],
      results: [
        { name: 'Access verification records', description: 'As a compliance contributor I need to view organized repositories of submitted evidence so that preparing for external audits is simplified.' }
      ]
    }
  },
  {
    title: 'Compliance Metrics Templates',
    path: 'isMetricsAccess',
    details: {
      purpose: 'As a metrics administrator I need to define automated measurement rules so that uploaded documents are evaluated for compliance instantly.',
      activities: [
        { name: 'Define evaluation criteria', description: 'As a metrics administrator I need to define required keywords mandatory headings or numeric targets so that policies are measured consistently.' },
        { name: 'Establish metric applicability', description: 'As a metrics administrator I need to restrict templates to specific document types or organizational units so that rules apply only where appropriate.' }
      ],
      results: [
        { name: 'Review compliance evaluations', description: 'As a compliance administrator I need access to document evaluation results so that compliance issues can be identified quickly.' }
      ]
    }
  },
  {
    title: 'Performance Indicator Monitoring',
    path: 'isKpiAccess',
    details: {
      purpose: 'As a performance monitor I need to view performance indicators so that I can track organizational trends and unit performance.',
      activities: [
        { name: 'Filter reporting periods', description: 'As a performance monitor I need to filter data by year and frequency so that I can view performance over specific operational cycles.' }
      ],
      results: [
        { name: 'Review performance scorecards', description: 'As a performance monitor I need to view visual dashboards displaying overall scores and performance bands so that organizational health is understood at a glance.' },
        { name: 'Analyze historical trends', description: 'As a performance monitor I need to study line charts showing performance trajectory over time so that long term improvements or declines are identified.' }
      ]
    }
  },
  {
    title: 'Performance Indicator Encoding',
    path: 'isKpiManage',
    details: {
      purpose: 'As a performance encoder I need to record actual operational data so that the system can calculate accurate attainment scores.',
      activities: [
        { name: 'Define performance targets', description: 'As a performance encoder I need to define the expected value and direction for a specific metric so that a baseline for success is established.' },
        { name: 'Record operational results', description: 'As a performance encoder I need to record the measured value for a specific unit and period so that period performance is recorded.' }
      ],
      results: [
        { name: 'Verify standardized scores', description: 'As a performance encoder I need to verify that the system calculates percentage attainment automatically so that scoring remains objective.' }
      ]
    }
  },
  {
    title: 'Consolidated Performance Reports',
    path: 'isReportsAccess',
    details: {
      purpose: 'As a management reviewer I need to generate unified performance reports so that executive decisions are based on comprehensive data.',
      activities: [
        { name: 'Generate consolidated reports', description: 'As a management reviewer I need to compile performance indicators and compliance results into a single view so that holistic organizational performance is measured.' }
      ],
      results: [
        { name: 'Review executive summaries', description: 'As a management reviewer I need to view aggregated performance data and compliance metrics so that strategic planning is supported by factual outcomes.' }
      ]
    }
  },
  {
    title: 'System Roles Administration',
    path: 'isSystemRolesAccess',
    details: {
      purpose: 'As a system administrator I need to create and assign fundamental user roles so that access levels are properly established across the organization.',
      activities: [
        { name: 'Assign organizational roles', description: 'As a system administrator I need to map specific employee accounts to established system roles so that identity tiers are maintained.' }
      ],
      results: [
        { name: 'Verify access restrictions', description: 'As a system administrator I need to observe immediate updates to navigation menus and global permissions for affected users so that security boundaries are enforced.' }
      ]
    }
  },
  {
    title: 'Role Capabilities Matrix',
    path: 'isRoleCapabilitiesAccess',
    details: {
      purpose: 'As a security administrator I need to manage granular capability settings so that specific features are finely tuned for each organizational role.',
      activities: [
        { name: 'Manage capability assignments', description: 'As a security administrator I need to enable or disable specific operational switches for a designated role tier so that access is customized precisely.' }
      ],
      results: [
        { name: 'Apply updated permissions', description: 'As a security administrator I need capability changes to take effect immediately so that assigned roles receive the appropriate functions.' }
      ]
    }
  },
  {
    title: 'SMTP Configuration',
    path: 'isSmtpSettingsAccess',
    details: {
      purpose: 'As an SMTP administrator I need to configure the email server settings so that the application can send notifications reliably.',
      activities: [
        { name: 'Configure SMTP credentials', description: 'As an SMTP administrator I need to update the host, port, user, and password settings so that email delivery remains operational.' },
        { name: 'Send test emails', description: 'As an SMTP administrator I need to trigger a test message so that I can verify the correctness of the SMTP configuration before applying it.' }
      ],
      results: [
        { name: 'Apply SMTP configurations', description: 'As an SMTP administrator I need to observe that subsequent system emails are routed through the newly configured mail server.' }
      ]
    }
  },
  {
    title: 'Security Settings Management',
    path: 'isSecuritySettingsAccess',
    details: {
      purpose: 'As a security administrator I need to manage application-wide security settings so that compliance and access protocols are enforced.',
      activities: [
        { name: 'Configure default passwords', description: 'As a security administrator I need to set the default password that is assigned to newly created or reset user accounts so that standard onboarding security is maintained.' }
      ],
      results: [
        { name: 'Apply security settings', description: 'As a security administrator I need to ensure that any user whose password matches the default password is required to change it upon their next login.' }
      ]
    }
  }
];

export default function UserManualScreen() {
  const { user } = useAuthStore();
  const [selectedManual, setSelectedManual] = useState<ManualItem | null>(null);

  // In the mobile app, we simplify capability checks. Admin sees all, standard sees global/support.
  const hasCapabilityAccess = (capKey: string): boolean => {
    if (!user) return false;
    if (user.role === 'super_admin') return true;
    if (capKey === 'global') return true;
    // We mock basic access based on roles for mobile
    if (capKey === 'isSupportStaff' && (user.role === 'support' || user.role === 'focal')) return true;
    
    return false;
  };

  const visibleItems = useMemo(() => {
    return capabilityManuals.filter(item => hasCapabilityAccess(item.path));
  }, [user]);

  return (
    <View style={styles.container}>
      <Text style={styles.subtitle}>
        Welcome to the application user manual. The topics below are curated specifically for your role.
      </Text>
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {visibleItems.map((item, index) => (
          <TouchableOpacity key={index} onPress={() => setSelectedManual(item)}>
            <Card style={styles.card}>
              <Card.Content>
                <Title>{item.title}</Title>
                <Paragraph numberOfLines={3} style={{ color: 'gray' }}>
                  {item.details.purpose}
                </Paragraph>
              </Card.Content>
            </Card>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Portal>
        <Modal 
          visible={!!selectedManual} 
          onDismiss={() => setSelectedManual(null)} 
          contentContainerStyle={styles.modalContainer}
        >
          {selectedManual && (
            <View style={{ flex: 1 }}>
              <View style={styles.modalHeader}>
                <Title style={{ flex: 1, marginRight: 16 }}>{selectedManual.title}</Title>
                <IconButton icon="close" onPress={() => setSelectedManual(null)} />
              </View>
              
              <ScrollView>
                <Text style={styles.sectionTitle}>Purpose:</Text>
                <Paragraph style={styles.paragraph}>{selectedManual.details.purpose}</Paragraph>

                <Text style={styles.sectionTitle}>Activities</Text>
                {selectedManual.details.activities.map((act, idx) => (
                  <View key={idx} style={styles.listItem}>
                    <Text style={styles.itemTitle}>{act.name}</Text>
                    <Paragraph style={styles.paragraph}>{act.description}</Paragraph>
                  </View>
                ))}

                <Text style={styles.sectionTitle}>Results</Text>
                {selectedManual.details.results.map((res, idx) => (
                  <View key={idx} style={styles.listItem}>
                    <Text style={styles.itemTitle}>{res.name}</Text>
                    <Paragraph style={styles.paragraph}>{res.description}</Paragraph>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6'
  },
  subtitle: {
    padding: 16,
    color: 'gray',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderColor: '#E5E7EB'
  },
  scrollContent: {
    padding: 16
  },
  card: {
    marginBottom: 16,
    backgroundColor: 'white'
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
    maxHeight: '90%'
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
    paddingBottom: 8
  },
  sectionTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginTop: 16,
    marginBottom: 8,
    color: '#0F52BA'
  },
  paragraph: {
    color: '#4B5563',
    lineHeight: 20
  },
  listItem: {
    marginBottom: 12,
    paddingLeft: 12,
    borderLeftWidth: 3,
    borderColor: '#BFDBFE'
  },
  itemTitle: {
    fontWeight: 'bold',
    marginBottom: 4
  }
});
