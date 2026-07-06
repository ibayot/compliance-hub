const jwt = require('jsonwebtoken');

const JWT_SECRET = 'your-super-secret-jwt-key-change-this-in-production';
const BASE_URL = 'http://localhost:4000/api/v1';

function createToken(id, email, role, roleCode) {
  return jwt.sign({ sub: id, email, role, roleCode, units: [] }, JWT_SECRET, { expiresIn: '1h', issuer: 'compliance-hub-api', audience: 'compliance-hub-client' });
}

async function run() {
  try {
    const requesterToken = createToken(95, 'test.requester@dswd.gov.ph', 'user', null);
    const techToken = createToken(3, 'gmjavierjr@dswd.gov.ph', 'it_support_jr', 'focal');
    const adminToken = createToken(1, 'fo2admin@dswd.gov.ph', 'super_admin', null);
    
    console.log('--- 1. Set gmjavierjr as CLOCKED IN (Present) ---');
    const today = new Date().toISOString().slice(0, 10);
    const setAttRes = await fetch(`${BASE_URL}/attendance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        date: today,
        userId: 3,
        status: 'present',
        notes: 'Test 10 clock in'
      })
    });
    
    if (!setAttRes.ok) {
        console.log(`Warning: Failed to set attendance: ${setAttRes.status} ${await setAttRes.text()}`);
    } else {
        console.log('Successfully clocked in gmjavierjr.');
    }

    // Wait a bit
    await new Promise(r => setTimeout(r, 1000));

    console.log('--- 2. Create a ticket ---');
    const createRes = await fetch(`${BASE_URL}/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${requesterToken}` },
      body: JSON.stringify({
        subject: 'Test 10 Ticket',
        description: 'Testing the SLA stall bypass.',
        ticketType: 'it_support'
      })
    });
    
    if (!createRes.ok) {
        throw new Error(`Create ticket failed: ${createRes.status} ${await createRes.text()}`);
    }
    const ticket = await createRes.json();
    console.log(`Created ticket: ${ticket.id} (${ticket.ticketNumber}) - Status: ${ticket.status}`);
    
    console.log('--- 3. Verify Assignment ---');
    if (ticket.assignedToId === 3) {
        console.log(`Ticket successfully assigned to gmjavierjr (ID: 3).`);
    } else {
        console.log(`Warning: Ticket was NOT assigned to gmjavierjr. Assigned to: ${ticket.assignedToId}`);
    }

    console.log('--- 4. Bypass Clock Out (Technician Pause) ---');
    const pauseRes = await fetch(`${BASE_URL}/tickets/technician-pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${techToken}` }
    });
    
    if (!pauseRes.ok) {
        throw new Error(`Technician pause failed: ${pauseRes.status} ${await pauseRes.text()}`);
    }
    const pauseData = await pauseRes.json();
    console.log(`Technician pause result:`, pauseData);

    console.log('--- 5. Check SLA Stalls ---');
    const getRes = await fetch(`${BASE_URL}/tickets/${ticket.id}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${requesterToken}` }
    });
    
    if (!getRes.ok) {
        throw new Error(`Get ticket failed: ${getRes.status} ${await getRes.text()}`);
    }
    const updatedTicket = await getRes.json();
    
    if (updatedTicket.slaPausedAt !== null) {
        console.log(`Success! Ticket slaPausedAt is set: ${updatedTicket.slaPausedAt}. SLA is stalled.`);
    } else {
        console.log(`Failed! Ticket slaPausedAt is null, expected it to be set.`);
    }

    console.log('Test 10 completed.');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
