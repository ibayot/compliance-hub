const jwt = require('jsonwebtoken');

const JWT_SECRET = 'your-super-secret-jwt-key-change-this-in-production';
const BASE_URL = 'http://localhost:4000/api/v1';

function createToken(id, email, role, roleCode) {
  return jwt.sign({ sub: id, email, role, roleCode, units: [] }, JWT_SECRET, { expiresIn: '1h', issuer: 'compliance-hub-api', audience: 'compliance-hub-client' });
}

async function run() {
  try {
    const requesterToken = createToken(27, 'test.requester.1780304054387-3444@rictms.local', 'user', null);
    const techToken = createToken(8, 'fggarcia@dswd.gov.ph', 'desktop_sr', 'focal');
    
    // 1. Create a ticket
    console.log('--- Creating Ticket ---');
    const createRes = await fetch(`${BASE_URL}/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${requesterToken}` },
      body: JSON.stringify({
        subject: 'Smoke Test Ticket',
        description: 'Testing the creation of a ticket.',
        ticketType: 'desktop_support'
      })
    });
    
    if (!createRes.ok) {
        const text = await createRes.text();
        throw new Error(`Create ticket failed: ${createRes.status} ${text}`);
    }
    const ticket = await createRes.json();
    console.log(`Created ticket: ${ticket.id} (${ticket.ticket_number})`);
    
    // 2. Assign ticket
    console.log('--- Assigning Ticket ---');
    const assignRes = await fetch(`${BASE_URL}/tickets/${ticket.id}/assign`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${techToken}` },
      body: JSON.stringify({ assignedToId: 8 })
    });
    
    if (!assignRes.ok) {
        const text = await assignRes.text();
        throw new Error(`Assign ticket failed: ${assignRes.status} ${text}`);
    }
    console.log(`Assigned ticket to technician 8`);
    
    // 3. Update to IN_PROGRESS
    console.log('--- Updating to IN_PROGRESS ---');
    const updateProgressRes = await fetch(`${BASE_URL}/tickets/${ticket.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${techToken}` },
      body: JSON.stringify({ status: 'in_progress', priority: 'medium' })
    });
    
    if (!updateProgressRes.ok) {
        const text = await updateProgressRes.text();
        throw new Error(`Update to in_progress failed: ${updateProgressRes.status} ${text}`);
    }
    console.log(`Updated to in_progress`);

    // 4. Update to RESOLVED
    console.log('--- Updating to RESOLVED ---');
    const resolveRes = await fetch(`${BASE_URL}/tickets/${ticket.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${techToken}` },
      body: JSON.stringify({ status: 'resolved', resolutionNotes: 'Fixed the issue' })
    });
    
    if (!resolveRes.ok) {
        const text = await resolveRes.text();
        throw new Error(`Update to resolved failed: ${resolveRes.status} ${text}`);
    }
    console.log(`Updated to resolved`);

    // 5. Rate ticket
    console.log('--- Rating Ticket ---');
    const rateRes = await fetch(`${BASE_URL}/tickets/${ticket.id}/satisfaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${requesterToken}` },
      body: JSON.stringify({ 
        rating: 5, 
        comment: 'Great job!', 
        formData: { 
          consentGiven: true, 
          unitSection: 'IT', 
          dateOfTransaction: new Date().toISOString(), 
          clientFirstName: 'John', 
          clientLastName: 'Doe', 
          religion: 'None', 
          sex: 'Male', 
          technicianName: 'fggarcia', 
          likert: [5,5,5,5,5,5,5,5,5] 
        } 
      })
    });
    
    if (!rateRes.ok) {
        const text = await rateRes.text();
        throw new Error(`Rate ticket failed: ${rateRes.status} ${text}`);
    }
    console.log(`Rated ticket successfully.`);
    
    console.log('Smoke test passed completely!');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
