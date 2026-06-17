const { DataSource } = require('typeorm');
const ds = new DataSource({ type: 'mysql', host: 'localhost', port: 3306, username: 'root', password: '', database: 'compliance_hub_users' });

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function stripSensitiveData(text, users) {
    if (!text) return '';
    let clean = text;

    for (const user of users) {
        if (user.first_name && user.first_name.length > 2) {
            const fnRegex = new RegExp('\\b' + escapeRegExp(user.first_name) + '\\b', 'gi');
            clean = clean.replace(fnRegex, '[NAME_REMOVED]');
        }
        if (user.last_name && user.last_name.length > 2) {
            const lnRegex = new RegExp('\\b' + escapeRegExp(user.last_name) + '\\b', 'gi');
            clean = clean.replace(lnRegex, '[NAME_REMOVED]');
        }
        if (user.email && user.email.length > 5) {
            const emRegex = new RegExp(escapeRegExp(user.email), 'gi');
            clean = clean.replace(emRegex, '[EMAIL_REMOVED]');
        }
    }

    clean = clean.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_REMOVED]');
    clean = clean.replace(/\+?[0-9]{10,13}/g, '[PHONE_REMOVED]');
    return clean;
}

ds.initialize().then(async () => {
    const users = await ds.query('SELECT first_name, last_name, email FROM users');

    // Create a fake ticket using one of the names from the DB to test if it gets scrubbed
    const sampleFirstName = users[1]?.first_name || 'John';
    const sampleLastName = users[1]?.last_name || 'Doe';
    const sampleEmail = users[1]?.email || 'test@test.com';

    const subject = 'Printer not working for ' + sampleFirstName;
    const description = 'Hi, my name is ' + sampleFirstName + ' ' + sampleLastName + '. My email is ' + sampleEmail + ' and phone is 09123456789. The printer is broken.';
    const resolutionNotes = 'I helped ' + sampleFirstName + ' fix the printer. Contacted them at 09123456789.';
    const resolutionSteps = '1. Open printer cover\n2. Remove paper jam\n3. Restart printer';

    const cleanSubject = await stripSensitiveData(subject, users);
    const cleanDesc = await stripSensitiveData(description, users);
    const cleanNotes = await stripSensitiveData(resolutionNotes, users);
    const cleanSteps = await stripSensitiveData(resolutionSteps, users);

    console.log('--- ORIGINAL TICKET DETAILS ---');
    console.log('Subject:', subject);
    console.log('Description:', description);
    console.log('Resolution Notes:', resolutionNotes);
    console.log('Resolution Steps:', resolutionSteps);

    console.log('\n--- SAMPLE PROMPT TO BE SENT TO GEMINI ---');
    const prompt = `
You are an expert IT Helpdesk Knowledge Base article generator.
We have a resolved ticket with the following details:
Subject: ${cleanSubject}
Description: ${cleanDesc}
Resolution Notes: ${cleanNotes}
Resolution Steps: ${cleanSteps}

We want to add this to our Knowledge Base.
However, we want to keep our KB clean and avoid duplicates.
Here are the existing KB articles:
ID: 1
Title: How to fix a printer jam
Content: Open cover and remove paper
---

Task:
1. Determine if this new ticket resolution is a duplicate of an existing KB article based on the problem (Subject/Description).
2. If it IS a duplicate problem but the resolution steps are different, output a JSON indicating we should UPDATE the existing KB by merging the new solution as an alternative.
3. If it is NOT a duplicate, output a JSON indicating we should CREATE a new KB article.

Output ONLY valid JSON with no markdown wrapping, in one of these two formats:
Format for CREATE:
{
  "action": "CREATE",
  "title": "A concise, general title for the problem",
  "content": "A clear, step-by-step guide on how to resolve the issue, written for an IT technician. Include alternative solutions if applicable.",
  "tags": "comma,separated,tags"
}

Format for UPDATE:
{
  "action": "UPDATE",
  "existing_id": <number>,
  "merged_content": "The original content of the existing KB, updated nicely to include this new alternative resolution method."
}
`;
    console.log(prompt);
}).catch(console.error).finally(() => ds.destroy());
