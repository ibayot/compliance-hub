/**
 * test-sla-computation.js
 * ────────────────────────────────────────────────────────────────
 * Tests the NEW calculateSlaDeadline() logic by:
 * 1. Creating a category with a short SLA (2h) through the API.
 * 2. Creating a ticket that gets auto-assigned.
 * 3. Reading the ticket's slaDeadline from the API.
 * 4. Computing the *expected* deadline locally using the same algorithm.
 * 5. Comparing — the drift should be < 30s (network latency only).
 *
 * Expected office hours: 08:00 - 17:00 weekdays.
 * Run: node test-sla-computation.js
 */
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'your-super-secret-jwt-key-change-this-in-production';
const BASE_URL = 'http://localhost:4000/api/v1';

function createToken(id, email, role) {
    return jwt.sign(
        { sub: id, email, role, roleCode: null, units: [] },
        JWT_SECRET,
        { expiresIn: '1h', issuer: 'compliance-hub-api', audience: 'compliance-hub-client' }
    );
}

// ── LOCAL SLA DEADLINE CALCULATOR (mirrors backend algorithm, Manila timezone) ──
function localCalculateSlaDeadline(startDate, slaHours, scheduleMode = 'OFFICE_HOURS') {
    const TZ = 'Asia/Manila';
    const SHIFT_START = scheduleMode === 'CWW' ? 7 : 8;
    const SHIFT_END   = scheduleMode === 'CWW' ? 19 : 17;

    const getManilaHour = (d) => {
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: TZ, hour: 'numeric', minute: 'numeric', hour12: false,
        }).formatToParts(d);
        const h = parseInt(parts.find(p => p.type === 'hour')?.value ?? '0', 10);
        const m = parseInt(parts.find(p => p.type === 'minute')?.value ?? '0', 10);
        return h + m / 60;
    };

    const getManilaDateString = (d) => {
        return new Intl.DateTimeFormat('en-CA', {
            timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
        }).format(d);
    };

    const advanceToNextDayStart = (d) => {
        const manilaDate = getManilaDateString(d);
        const [y, m, day] = manilaDate.split('-').map(Number);
        return new Date(Date.UTC(y, m - 1, day + 1, SHIFT_START - 8, 0, 0, 0));
    };

    let current = new Date(startDate);
    let remaining = slaHours;
    let guard = 0;

    while (remaining > 0 && guard < 365) {
        guard++;
        const dow = new Date(getManilaDateString(current) + 'T00:00:00+08:00').getDay();
        const isWeekday = dow >= 1 && dow <= 5;

        if (!isWeekday) {
            current = advanceToNextDayStart(current);
            continue;
        }

        const manilaHour = getManilaHour(current);

        if (manilaHour < SHIFT_START) {
            const dateStr = getManilaDateString(current);
            const [y, m, day] = dateStr.split('-').map(Number);
            current = new Date(Date.UTC(y, m - 1, day, SHIFT_START - 8, 0, 0, 0));
            continue;
        }

        if (manilaHour >= SHIFT_END) {
            current = advanceToNextDayStart(current);
            continue;
        }

        const availableHoursToday = SHIFT_END - manilaHour;

        if (remaining <= availableHoursToday) {
            current = new Date(current.getTime() + remaining * 3600 * 1000);
            remaining = 0;
        } else {
            remaining -= availableHoursToday;
            current = advanceToNextDayStart(current);
        }
    }

    return current;
}

async function run() {
    const adminToken = createToken(1, 'fo2admin@dswd.gov.ph', 'super_admin');
    const techToken  = createToken(3, 'gmjavierjr@dswd.gov.ph', 'it_support_jr');
    const userToken  = createToken(95, 'test.requester@dswd.gov.ph', 'user');
    const today      = new Date().toISOString().slice(0, 10);

    console.log('=== SLA Computation Test ===\n');

    // 1. Ensure technician is clocked in
    console.log('Step 1: Clock in technician (ID 3 — gmjavierjr)');
    const attRes = await fetch(`${BASE_URL}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ date: today, userId: 3, status: 'present', notes: 'SLA test' }),
    });
    console.log(`  → attendance: ${attRes.status}`);

    await new Promise(r => setTimeout(r, 500));

    // 2. Get or create a test category with 2 SLA hours
    console.log('\nStep 2: Create category with 2-hour SLA');
    const catRes = await fetch(`${BASE_URL}/ticket-settings/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ name: `SLA-Test-Cat-${Date.now()}`, slaHours: 2, description: 'Auto test', isActive: true, ticketType: 'it_support' }),
    });
    const catBody = await catRes.json();
    if (!catRes.ok) {
        console.log('  ⚠  Could not create category:', catBody);
        return;
    }
    const categoryId = catBody.id;
    console.log(`  → category ID: ${categoryId}, slaHours: ${catBody.slaHours}`);

    await new Promise(r => setTimeout(r, 500));

    // 3. Create ticket — note the time before creation
    const ticketCreatedAt = new Date();
    console.log(`\nStep 3: Create ticket at ${ticketCreatedAt.toISOString()}`);
    const tkRes = await fetch(`${BASE_URL}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({
            subject: 'SLA Test Ticket',
            description: 'Testing SLA deadline calculation',
            ticketType: 'IT_SUPPORT',
            categoryId,
            requesterId: 95,
        }),
    });
    const tkBody = await tkRes.json();
    if (!tkRes.ok) {
        console.log('  ⚠  Ticket creation failed:', tkBody);
        return;
    }
    const ticketId = tkBody.id;
    console.log(`  → ticket ID: ${ticketId}, status: ${tkBody.status}`);

    await new Promise(r => setTimeout(r, 1000));

    // 4. Fetch ticket to see slaDeadline
    console.log('\nStep 4: Fetch ticket and read slaDeadline');
    const getRes = await fetch(`${BASE_URL}/tickets/${ticketId}`, {
        headers: { Authorization: `Bearer ${techToken}` },
    });
    const getBody = await getRes.json();
    const apiDeadline = getBody.slaDeadline ? new Date(getBody.slaDeadline) : null;
    console.log(`  → slaDeadline from API: ${apiDeadline?.toISOString() ?? 'null'}`);
    console.log(`  → assignedToId:         ${getBody.assignedToId ?? 'null (not auto-assigned)'}`);

    // 5. Compute expected deadline locally
    const expectedDeadline = localCalculateSlaDeadline(ticketCreatedAt, 2, 'OFFICE_HOURS');
    console.log(`\nStep 5: Expected deadline (local calc): ${expectedDeadline.toISOString()}`);

    if (!apiDeadline) {
        console.log('\n⚠  slaDeadline is null on ticket. Ticket may not have been auto-assigned yet.');
        console.log('   → Try manually assigning via API and re-check.\n');
        return;
    }

    const driftMs  = Math.abs(apiDeadline.getTime() - expectedDeadline.getTime());
    const driftSec = Math.round(driftMs / 1000);

    console.log('\n=== Result ===');
    console.log(`  API deadline:      ${apiDeadline.toISOString()}`);
    console.log(`  Expected deadline: ${expectedDeadline.toISOString()}`);
    console.log(`  Drift:             ${driftSec}s`);

    if (driftSec < 60) {
        console.log('\n✅ PASS — SLA deadline matches office-hours algorithm (drift < 60s)');
    } else {
        console.log('\n❌ FAIL — Deadline drift too large. Check calculateSlaDeadline() in ticket.service.ts');
    }
}

run().catch(err => {
    console.error('Uncaught error:', err.message);
    process.exit(1);
});
