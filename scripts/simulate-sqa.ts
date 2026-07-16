import { assert } from 'console';

const API_URL = 'http://localhost:4000/api';
const DEFAULT_PASSWORD = 'password';

const state: any = {
  adminToken: '',
  techToken: '',
  userToken: '',
  focalToken: '',
  adminId: null,
  techId: null,
  userId: null,
  focalId: null,
  ticketIds: [],
  categoryId: null,
};

async function apiCall(method: string, endpoint: string, body?: any, token?: string) {
  const headers: any = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(`API Error: ${response.status} ${response.statusText} - ${JSON.stringify(data)}`);
    (err as any).response = { status: response.status, data };
    throw err;
  }
  return { data };
}

async function login(email: string, password: string = DEFAULT_PASSWORD) {
  const res = await apiCall('POST', '/auth/login', { email, password });
  if (res.data.requiresPasswordChange) {
    const tempToken = res.data.accessToken;
    const res2 = await apiCall('POST', '/auth/first-login', {
      firstName: email.split('@')[0],
      lastName: 'Test',
      phone: '09123456789',
      sex: 'Male',
      unit: 'Test Unit',
      newPassword: 'Password123!',
    }, tempToken);
    return res2.data.accessToken;
  }
  return res.data.accessToken;
}

async function runSimulation() {
  console.log('🚀 Starting SQA Test Simulation against http://localhost:4000...\n');

  try {
    console.log('--- Suite A: Auth & User Creation ---');
    console.log('1. Logging in as super admin (assuming admin@admin.com exists)...');
    try {
      state.adminToken = await login('admin@admin.com', 'admin');
    } catch (e) {
      state.adminToken = await login('admin@admin.com', 'password');
    }

    console.log('2. Creating test users (User, Tech, Focal) with MFA completely bypassed...');
    const createUser = async (email: string, role: string) => {
      const res = await apiCall('POST', '/users', {
        email,
        role,
        firstName: email.split('@')[0],
        lastName: 'Test',
        mfaEnabled: false, // Bypass MFA
      }, state.adminToken);
      return res.data;
    };

    const tech = await createUser(`tech${Date.now()}@test.com`, 'desktop_jr');
    state.techId = tech.id;
    const focal = await createUser(`focal${Date.now()}@test.com`, 'desktop_sr');
    state.focalId = focal.id;
    const user = await createUser(`user${Date.now()}@test.com`, 'user');
    state.userId = user.id;

    console.log('3. Assigning Ticket Focal capabilities to Focal user...');
    await apiCall('PUT', '/roles/desktop_sr', {
      isTicketFocal: true,
      isTicketSettingsFocal: true,
      isEscalationFocal: true,
      isAllTickets: true,
    }, state.adminToken);

    console.log('4. Logging in as new users to trigger first-login password change...');
    state.techToken = await login(tech.email);
    state.focalToken = await login(focal.email);
    state.userToken = await login(user.email);

    console.log('\n--- Suite B: Settings & Attendance ---');
    console.log('1. Creating a ticket category with SLA...');
    const catRes = await apiCall('POST', '/ticket-settings/categories', {
      name: 'Hardware Issue ' + Date.now(),
      ticketType: 'Desktop Support',
      slaHours: 4,
      allowablePauseHours: 2,
    }, state.focalToken);
    state.categoryId = catRes.data.id;

    console.log('2. Marking Tech as Present for today...');
    await apiCall('PUT', `/attendance/${state.techId}/status`, { status: 'Present' }, state.focalToken);

    console.log('\n--- Suite C: Ticket Lifecycle & SLA Multiple Timers ---');
    console.log('1. User creates 3 tickets...');
    for (let i = 0; i < 3; i++) {
      const t = await apiCall('POST', '/tickets', {
        subject: `Test Issue ${i+1}`,
        description: 'Need help',
        ticketType: 'Desktop Support',
        categoryId: state.categoryId,
      }, state.userToken);
      state.ticketIds.push(t.data.id);
    }

    console.log('2. Tech logs in, tickets should auto-assign (or we manually assign)...');
    for (const tId of state.ticketIds) {
      await apiCall('PUT', `/tickets/${tId}/assign`, { assignedToId: state.techId }, state.focalToken);
    }

    console.log('3. Verify SLA queue: Only one ticket should have isSlaWaiting = false');
    const getTechTickets = await apiCall('GET', '/tickets', null, state.techToken);
    const assignedTickets = getTechTickets.data.data.filter((t: any) => t.status === 'assigned');
    // Sort by created at to know which one is top of queue
    assignedTickets.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    
    const activeSla = assignedTickets.filter((t: any) => t.isSlaWaiting === false);
    const queuedSla = assignedTickets.filter((t: any) => t.isSlaWaiting === true);
    
    console.log(`   -> Active SLA tickets: ${activeSla.length} (Expected 1)`);
    console.log(`   -> Queued SLA tickets: ${queuedSla.length} (Expected 2)`);
    if (activeSla.length !== 1) console.warn('   ⚠️ Warning: SLA queue pushback logic might have failed.');

    console.log('4. Tech transitions ticket 2 to IN_PROGRESS...');
    // We intentionally pick a ticket that was in the queue (isSlaWaiting = true)
    const t2Id = queuedSla.length > 0 ? queuedSla[0].id : state.ticketIds[1];
    await apiCall('PATCH', `/tickets/${t2Id}`, { status: 'in_progress' }, state.techToken);

    console.log('5. Verify SLA timers: Ticket 1 (assigned) and Ticket 2 (in_progress) should both run simultaneously');
    const getTix = await apiCall('GET', '/tickets', null, state.techToken);
    const t1 = getTix.data.data.find((t: any) => t.id === (activeSla[0]?.id || state.ticketIds[0]));
    const t2 = getTix.data.data.find((t: any) => t.id === t2Id);
    console.log(`   -> Ticket 1 isSlaWaiting: ${t1.isSlaWaiting} (should be false, running)`);
    console.log(`   -> Ticket 2 isSlaWaiting: ${t2.isSlaWaiting} (should be false, running simultaneously)`);
    if (t1.isSlaWaiting === false && t2.isSlaWaiting === false) {
      console.log('   ✅ Success: Both SLA timers are running simultaneously as expected!');
    } else {
      console.warn('   ⚠️ Warning: SLA timers are not running simultaneously.');
    }

    console.log('6. Tech resolves Ticket 2...');
    await apiCall('PATCH', `/tickets/${t2Id}`, { status: 'resolved', resolutionNotes: 'Fixed it' }, state.techToken);

    console.log('7. User submits CSAT for Ticket 2...');
    await apiCall('POST', `/tickets/${t2Id}/satisfaction`, {
      gaveConsent: true, unitId: 1, customUnit: 'Test', sex: 'Male', age: 25, religion: 'Catholic',
      cc1: 5, cc2: 5, cc3: 5, sqd0: 5, sqd1: 5, sqd2: 5, sqd3: 5, sqd4: 5, sqd5: 5, sqd6: 5, sqd7: 5, sqd8: 5
    }, state.userToken);
    console.log('   ✅ CSAT submitted');

    console.log('\n--- Suite D: Escalation Flow ---');
    console.log('1. Tech escalates Ticket 3 to Focal...');
    const t3Id = state.ticketIds[2];
    await apiCall('POST', `/tickets/${t3Id}/escalations`, {
      escalatedToId: state.focalId,
      notes: 'I need help with this one',
    }, state.techToken);

    console.log('2. Tech tries to change status of Ticket 3 (should fail)...');
    try {
      await apiCall('PATCH', `/tickets/${t3Id}`, { status: 'in_progress' }, state.techToken);
      console.warn('   ⚠️ Warning: Status change was NOT blocked!');
    } catch (e: any) {
      console.log(`   ✅ Status change correctly blocked with error: ${e.response?.data?.message}`);
    }

    console.log('3. Focal accepts the escalation...');
    const getEscalations = await apiCall('GET', `/tickets/${t3Id}/escalations`, null, state.techToken);
    const escId = getEscalations.data[0].id;
    await apiCall('POST', `/tickets/escalations/${escId}/accept`, {}, state.focalToken);

    console.log('4. Verify Focal is now assigned and status is IN_PROGRESS...');
    const t3 = await apiCall('GET', `/tickets/${t3Id}`, null, state.focalToken);
    if (t3.data.assignedToId === state.focalId && t3.data.status === 'in_progress') {
      console.log('   ✅ Escalation accepted successfully');
    } else {
      console.warn('   ⚠️ Warning: Escalation acceptance failed or status mismatch');
    }

    console.log('\n🎉 SQA Simulation completed successfully!');

  } catch (error: any) {
    console.error('\n❌ Simulation failed at some point:');
    if (error.response) {
      console.error(error.response.status, error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

runSimulation();
