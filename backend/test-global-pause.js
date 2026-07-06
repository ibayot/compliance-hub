const jwt = require('jsonwebtoken');

const JWT_SECRET = 'your-super-secret-jwt-key-change-this-in-production';
const BASE_URL = 'http://localhost:4000/api/v1';

function createToken(id, email, role, roleCode) {
    return jwt.sign({ sub: id, email, role, roleCode, units: [] }, JWT_SECRET, { expiresIn: '1h', issuer: 'compliance-hub-api', audience: 'compliance-hub-client' });
}

async function run() {
    try {
        const requesterToken = createToken(95, 'test.requester@dswd.gov.ph', 'user', null);
        const adminToken = createToken(1, 'fo2admin@dswd.gov.ph', 'super_admin', null);

        // Tech 1: gmjavierjr (ID: 3, it_support_jr)
        // Tech 2: jrcardona (ID: 6, desktop_jr)
        // Tech 3: fggarcia (ID: 8, desktop_sr)
        const technicians = [
            { id: 3, email: 'gmjavierjr@dswd.gov.ph', role: 'it_support_jr' },
            { id: 6, email: 'jrcardona@dswd.gov.ph', role: 'desktop_jr' },
            { id: 8, email: 'fggarcia@dswd.gov.ph', role: 'desktop_sr' }
        ];

        console.log('--- 1. Set multiple technicians as CLOCKED IN (Present) ---');
        const today = new Date().toISOString().slice(0, 10);

        for (const tech of technicians) {
            const setAttRes = await fetch(`${BASE_URL}/attendance`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
                body: JSON.stringify({
                    date: today,
                    userId: tech.id,
                    status: 'present',
                    notes: 'Global pause test'
                })
            });
            if (!setAttRes.ok) {
                console.log(`Warning: Failed to set attendance for ${tech.email}: ${setAttRes.status} ${await setAttRes.text()}`);
            } else {
                console.log(`Successfully clocked in ${tech.email}`);
            }
        }

        // Wait a bit
        await new Promise(r => setTimeout(r, 1000));

        console.log('\n--- 1.5 Create a Category with SLA ---');
        const catRes = await fetch(`${BASE_URL}/ticket-settings/categories`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
            body: JSON.stringify({
                name: `Global Pause SLA Cat ${Date.now()}`,
                description: 'For testing SLA',
                ticketType: 'desktop_support',
                slaHours: 4,
                isActive: true
            })
        });
        if (!catRes.ok) throw new Error('Failed to create category');
        const category = await catRes.json();
        console.log(`Created SLA Category: ${category.id}`);

        console.log('\n--- 2. Create multiple tickets ---');
        const createdTickets = [];
        const ticketPayloads = [
            { subject: 'Global Test Ticket 1', description: 'Testing global pause', ticketType: 'desktop_support', categoryId: category.id },
            { subject: 'Global Test Ticket 2', description: 'Testing global pause', ticketType: 'desktop_support', categoryId: category.id }
        ];

        for (let i = 0; i < ticketPayloads.length; i++) {
            const createRes = await fetch(`${BASE_URL}/tickets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${requesterToken}` },
                body: JSON.stringify(ticketPayloads[i])
            });

            if (!createRes.ok) {
                throw new Error(`Create ticket failed: ${createRes.status} ${await createRes.text()}`);
            }
            const ticket = await createRes.json();
            console.log(`Created ticket: ${ticket.id} (${ticket.ticketNumber}) - Assigned to ID: ${ticket.assignedToId}`);
            createdTickets.push(ticket);
        }

        console.log('\n--- 3. Trigger Global Pause ---');
        const pauseRes = await fetch(`${BASE_URL}/tickets/global-pause`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` }
        });

        if (!pauseRes.ok) {
            throw new Error(`Global pause failed: ${pauseRes.status} ${await pauseRes.text()}`);
        }
        const pauseData = await pauseRes.json();
        console.log(`Global pause result:`, pauseData);

        console.log('\n--- 4. Verify SLA Stalled (PAUSE) ---');
        let pauseSuccess = true;
        for (const ticket of createdTickets) {
            const getRes = await fetch(`${BASE_URL}/tickets/${ticket.id}`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${requesterToken}` }
            });
            const updatedTicket = await getRes.json();
            if (updatedTicket.slaPausedAt !== null) {
                console.log(`Ticket ${updatedTicket.ticketNumber} successfully stalled at ${updatedTicket.slaPausedAt}`);
            } else {
                console.log(`Failed! Ticket ${updatedTicket.ticketNumber} slaPausedAt is null.`);
                pauseSuccess = false;
            }
        }

        if (pauseSuccess) {
            console.log('-> ALL tickets successfully paused!');
        }

        // Wait a bit
        await new Promise(r => setTimeout(r, 15000));

        console.log('\n--- 5. Trigger Global Resume ---');
        const resumeRes = await fetch(`${BASE_URL}/tickets/global-resume`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` }
        });

        if (!resumeRes.ok) {
            throw new Error(`Global resume failed: ${resumeRes.status} ${await resumeRes.text()}`);
        }
        const resumeData = await resumeRes.json();
        console.log(`Global resume result:`, resumeData);

        console.log('\n--- 6. Verify SLA Resumed and Check Deadline Difference ---');
        let resumeSuccess = true;
        for (const ticket of createdTickets) {
            const getRes = await fetch(`${BASE_URL}/tickets/${ticket.id}`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${requesterToken}` }
            });
            const updatedTicket = await getRes.json();
            if (updatedTicket.slaPausedAt === null) {
                const origDeadline = new Date(ticket.slaDeadline).getTime();
                const newDeadline = new Date(updatedTicket.slaDeadline).getTime();
                const diffMs = newDeadline - origDeadline;
                const diffSecs = Math.round(diffMs / 1000);

                console.log(`\nTicket ${updatedTicket.ticketNumber} successfully resumed.`);
                console.log(`- Original SLA Deadline: ${new Date(origDeadline).toISOString()}`);
                console.log(`- New SLA Deadline:      ${new Date(newDeadline).toISOString()}`);
                console.log(`- Deadline shifted by:   ${diffMs} ms (${diffSecs} seconds)`);
                console.log(`- Accumulated Pause:     ${updatedTicket.accumulatedPauseSeconds} seconds`);
            } else {
                console.log(`\nFailed! Ticket ${updatedTicket.ticketNumber} slaPausedAt is STILL ${updatedTicket.slaPausedAt}.`);
                resumeSuccess = false;
            }
        }

        if (resumeSuccess) {
            console.log('-> ALL tickets successfully resumed!');
        }

        console.log('\nGlobal Pause/Resume Test completed.');
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
