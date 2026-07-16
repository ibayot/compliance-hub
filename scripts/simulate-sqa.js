const API_URL = 'http://localhost:4000/api';
const DEFAULT_PASSWORD = 'password';

const state = {
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

async function apiCall(method, endpoint, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(`API Error: ${response.status} ${response.statusText} - ${JSON.stringify(data)}`);
    err.response = { status: response.status, data };
    throw err;
  }
  return { data };
}

async function login(email, password = DEFAULT_PASSWORD) {
  const res = await apiCall('POST', '/auth/login', { email, password });
  let token = res.data.accessToken;

  if (res.data.mfaRequired) {
    const tempToken = res.data.tempToken;
    const testCode = res.data.testModeCode;
    console.log(`[MFA] Bypassing MFA for ${email} with code ${testCode}`);
    const mfaRes = await apiCall('POST', '/auth/mfa/verify', { 
      tempToken: tempToken,
      code: testCode,
      rememberDevice: false
    });
    token = mfaRes.data.accessToken;
    res.data = mfaRes.data;
  }

  if (res.data.requiresPasswordChange) {
    const res2 = await apiCall('POST', '/auth/first-login', {
      firstName: email.split('@')[0],
      lastName: 'Test',
      phone: '09123456789',
      sex: 'Male',
      unit: 'Test Unit',
      newPassword: 'Password123!',
    }, token);
    return res2.data.accessToken;
  }
  return token;
}

async function runSimulation() {
  console.log('🚀 Starting SQA Test Simulation against http://localhost:4000...\n');

  try {
    console.log('--- Suite A: Auth & User Creation ---');
    console.log('1. Logging in as super admin...');
    state.adminToken = await login('fo2admin@dswd.gov.ph', 'password123');

    console.log('2. Creating test users (User, Tech, Focal) with MFA bypassed...');
    const createUser = async (email, role) => {
      try {
        const res = await apiCall('POST', '/users', {
          email,
          role,
          firstName: email.split('@')[0],
          lastName: 'Test',
          password: 'password',
        }, state.adminToken);
        return res.data;
      } catch (err) {
        console.error('Failed to create user:', err.response?.data || err.message);
        throw err;
      }
    };

    const tech = await createUser(`tech${Date.now()}@test.com`, 'desktop_jr');
    state.techId = tech.id;
    const focal = await createUser(`focal${Date.now()}@test.com`, 'desktop_sr');
    state.focalId = focal.id;
    const user = await createUser(`user${Date.now()}@test.com`, 'user');
    state.userId = user.id;

    console.log('3. Assigning Ticket Focal capabilities to Focal user...');
    await apiCall('PATCH', '/users/role-capabilities/desktop_sr', {
      isTicketFocal: true,
      isTicketSettingsFocal: true,
      isEscalationFocal: true,
      isAllTickets: true,
      isAttendanceManage: true,
      isDesktop: true,
    }, state.adminToken);

    await apiCall('POST', '/ticket-settings/escalation-focals', {
      userId: state.focalId,
      ticketType: 'desktop_support'
    }, state.adminToken);

    console.log('4. Logging in as new users to trigger first-login password change...');
    state.techToken = await login(tech.email);
    state.focalToken = await login(focal.email);
    state.userToken = await login(user.email);

    console.log('\n--- Suite B: Settings & Attendance ---');
    console.log('1. Creating a ticket category with SLA...');
    const catRes = await apiCall('POST', '/ticket-settings/categories', {
      name: 'Hardware Issue ' + Date.now(),
      ticketType: 'desktop_support',
      slaHours: 4,
      allowablePauseHours: 2,
    }, state.focalToken);
    state.categoryId = catRes.data.id;

    console.log('2. Marking Tech as Present for today...');
    await apiCall('POST', '/attendance', {
      userId: state.techId,
      date: new Date().toISOString().split('T')[0],
      status: 'present'
    }, state.focalToken);

    console.log('\n--- Suite C: Ticket Lifecycle & SLA Multiple Timers ---');
    console.log('1. User creates 4 tickets...');
    state.ticketIds = [];
    for (let i = 0; i < 4; i++) {
      const t = await apiCall('POST', '/tickets', {
        subject: `Test Issue ${i+1}`,
        description: 'Need help',
        ticketType: 'desktop_support',
        categoryId: state.categoryId,
      }, state.userToken);
      state.ticketIds.push(t.data.id);
    }

    console.log('2. Tech logs in, tickets should auto-assign (or we manually assign)...');
    for (const tId of state.ticketIds) {
      await apiCall('PATCH', `/tickets/${tId}/assign`, { assignedToId: state.techId }, state.focalToken);
    }

    console.log('3. Verify SLA queue: Only one ticket should have isSlaWaiting = false');
    const assignedTicketsRes = await apiCall('GET', '/tickets?status=assigned', null, state.techToken);
    const assignedTickets = Array.isArray(assignedTicketsRes.data) 
      ? assignedTicketsRes.data 
      : (assignedTicketsRes.data.tickets || assignedTicketsRes.data.data || []);
      
    if (!Array.isArray(assignedTickets)) {
      console.error('assignedTickets is not an array:', assignedTicketsRes.data);
      throw new Error('Unexpected response format for GET /tickets');
    }
    console.log(`Debug: Found ${assignedTickets.length} assigned tickets.`);
    console.log('assignedTickets map:', assignedTickets.map(t => ({ id: t.id, status: t.status, isSlaWaiting: t.isSlaWaiting })));
    assignedTickets.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    
    const activeSla = assignedTickets.filter(t => t.isSlaWaiting === false);
    const queuedSla = assignedTickets.filter(t => t.isSlaWaiting === true);
    
    console.log(`   -> Active SLA tickets: ${activeSla.length} (Expected 1)`);
    console.log(`   -> Queued SLA tickets: ${queuedSla.length} (Expected 2)`);
    if (activeSla.length !== 1) console.warn('   ⚠️ Warning: SLA queue pushback logic might have failed.');

    console.log('4. Tech transitions ticket 1 and ticket 2 to IN_PROGRESS...');
    const t1Id = state.ticketIds[0];
    const t2Id = state.ticketIds[1];
    const t3Id = state.ticketIds[2];
    
    await apiCall('PATCH', `/tickets/${t1Id}`, { priority: 'low' }, state.techToken);
    await apiCall('PATCH', `/tickets/${t1Id}`, { status: 'in_progress' }, state.techToken);
    await apiCall('PATCH', `/tickets/${t2Id}`, { priority: 'medium' }, state.techToken);
    await apiCall('PATCH', `/tickets/${t2Id}`, { status: 'in_progress' }, state.techToken);

    console.log('5. Verify SLA timers: Ticket 1 (in_progress), Ticket 2 (in_progress), and Ticket 3 (assigned) should ALL run simultaneously');
    const getTix = await apiCall('GET', '/tickets', null, state.techToken);
    const allTickets = Array.isArray(getTix.data) ? getTix.data : (getTix.data.tickets || getTix.data.data || []);
    const t1 = allTickets.find(t => t.id === t1Id);
    const t2 = allTickets.find(t => t.id === t2Id);
    const t3 = allTickets.find(t => t.id === t3Id);
    
    console.log(`   -> Ticket 1 (IN_PROGRESS) isSlaWaiting: ${t1.isSlaWaiting} (should be false, running)`);
    console.log(`   -> Ticket 2 (IN_PROGRESS) isSlaWaiting: ${t2.isSlaWaiting} (should be false, running simultaneously)`);
    console.log(`   -> Ticket 3 (ASSIGNED) isSlaWaiting: ${t3.isSlaWaiting} (should be TRUE, waiting on queue)`);
    
    if (t1.isSlaWaiting === false && t2.isSlaWaiting === false && t3.isSlaWaiting === true) {
      console.log('   ✅ Success: First two SLA timers are running, third is waiting as expected!');
    } else {
      console.warn('   ⚠️ Warning: SLA timers state mismatch.');
    }

    console.log('\n--- Suite D: Escalation Flow ---');
    console.log('1. Tech escalates Ticket 4 to Focal...');
    const t4Id = state.ticketIds[3];
    await apiCall('POST', `/tickets/${t4Id}/escalate`, {
      escalatedToId: state.focalId,
      notes: 'I need help with this one',
    }, state.techToken);

    console.log('2. Tech tries to change status of Ticket 4 (should fail)...');
    try {
      await apiCall('PATCH', `/tickets/${t4Id}`, { status: 'in_progress' }, state.techToken);
      console.warn('   ⚠️ Warning: Status change was NOT blocked!');
    } catch (e) {
      console.log(`   ✅ Status change correctly blocked with error: ${e.response?.data?.message || e.message}`);
    }

    console.log('3. Focal accepts the escalation...');
    const getEscalations = await apiCall('GET', `/tickets/${t4Id}/escalations`, null, state.techToken);
    const escalations = Array.isArray(getEscalations.data) ? getEscalations.data : (getEscalations.data.data || []);
    const escId = escalations[0].id;
    await apiCall('PATCH', `/tickets/${t4Id}/escalation/${escId}/accept`, {}, state.focalToken);

    console.log('4. Verify Focal is now assigned and status is IN_PROGRESS...');
    const t4 = await apiCall('GET', `/tickets/${t4Id}`, null, state.focalToken);
    if (t4.data.assignedToId === state.focalId && t4.data.status === 'in_progress') {
      console.log('   ✅ Escalation accepted successfully');
    } else {
      console.warn('   ⚠️ Warning: Escalation acceptance failed or status mismatch');
    }

    console.log('\n--- Suite E: Overdue Auto-Unpause (Cron) ---');
    console.log('1. Manipulating DB to force Ticket 1 SLA to be overdue...');
    const { execSync } = require('child_process');
    execSync(`docker exec rictms_db mysql -u root -padmin 02_db_stg_compliance_hub_ticketing -e "UPDATE tickets SET sla_deadline = DATE_SUB(NOW(), INTERVAL 5 MINUTE) WHERE id = '${t1Id}'"`);
    
    console.log('2. Waiting 65 seconds for the cron job to run and auto-unpause Ticket 3...');
    await new Promise(resolve => setTimeout(resolve, 65000));
    
    console.log('3. Verifying Ticket 3 is now unpaused...');
    const getTixAfterCron = await apiCall('GET', '/tickets', null, state.techToken);
    const allTicketsAfter = Array.isArray(getTixAfterCron.data) ? getTixAfterCron.data : (getTixAfterCron.data.tickets || getTixAfterCron.data.data || []);
    const t3After = allTicketsAfter.find(t => t.id === t3Id);
    
    if (t3After.isSlaWaiting === false) {
      console.log('   ✅ Success: Cron job automatically started SLA timer for the next waiting ticket!');
    } else {
      console.warn('   ⚠️ Warning: Ticket 3 was NOT unpaused by the cron job.');
    }

    console.log('\n🎉 SQA Simulation completed successfully!');

  } catch (error) {
    console.error('\n❌ Simulation failed at some point:');
    if (error.response) {
      console.error(error.response.status, error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

runSimulation();
