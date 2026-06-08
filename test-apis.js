async function test() {
  try {
    const loginRes = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'jrcardona@dswd.gov.ph',
        password: 'password123'
      })
    });
    const loginData = await loginRes.json();
    console.log('Login success.');
    
    if (!loginData.accessToken) return;
    const token = loginData.accessToken;

    const headers = { Authorization: `Bearer ${token}` };

    const focalsRes = await fetch('http://localhost:4000/api/ticket-settings/escalation-focals?ticketType=desktop_support', { headers });
    const focals = await focalsRes.json();
    console.log('Focals:', focals);

    const supportUsersRes = await fetch('http://localhost:4000/api/attendance/technicians?ticketType=desktop_support', { headers });
    const supportUsers = await supportUsersRes.json();
    console.log('Support Users:', supportUsers.map ? supportUsers.map(u => `${u.id} - ${u.firstName} ${u.lastName} (${u.role})`) : supportUsers);

    const itoUsersRes = await fetch('http://localhost:4000/api/attendance/technicians?ticketType=ito', { headers });
    const itoUsers = await itoUsersRes.json();
    console.log('ITO Users:', itoUsers.map ? itoUsers.map(u => `${u.id} - ${u.firstName} ${u.lastName} (${u.role})`) : itoUsers);

  } catch (error) {
    console.error('Error:', error);
  }
}
test();
