import fs from 'node:fs/promises';

const api = 'http://localhost:4100/api';
const samplePath = 'c:/Users/mjdibay/sample-upload.docx';

async function login() {
  const candidates = [
    { email: 'admin@rictms.edu.ph', password: 'password123' },
    { email: 'admin@rictms.gov.ph', password: 'Admin123!' },
    { email: 'admin@rictms.gov.ph', password: 'password123' },
  ];

  for (const candidate of candidates) {
    const response = await fetch(`${api}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(candidate),
    });

    if (!response.ok) {
      continue;
    }

    const payload = await response.json();
    if (payload?.accessToken) {
      return payload.accessToken;
    }
  }

  throw new Error('Unable to authenticate with known credentials');
}

async function main() {
  const token = await login();
  const authHeaders = { Authorization: `Bearer ${token}` };

  const unitsResponse = await fetch(`${api}/units`, { headers: authHeaders });
  const units = await unitsResponse.json();
  const unitId = Array.isArray(units) && units.length > 0 ? units[0].id : null;
  if (!unitId) {
    throw new Error('No unit available for smoke upload test');
  }

  const sampleBuffer = await fs.readFile(samplePath);
  const results = [];

  for (let i = 1; i <= 5; i += 1) {
    const form = new FormData();
    form.append('title', `Smoke Blob Upload ${i} ${Date.now()}`);
    form.append('document_type', 'SmokeReport');
    form.append('period', `Q${i}`);
    form.append('year', '2026');
    form.append('unit_id', String(unitId));
    form.append(
      'file',
      new Blob([sampleBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
      'sample-upload.docx',
    );

    const uploadResponse = await fetch(`${api}/documents`, {
      method: 'POST',
      headers: authHeaders,
      body: form,
    });

    if (!uploadResponse.ok) {
      results.push({
        iteration: i,
        finalStatus: 'upload_failed',
        uploadStatus: uploadResponse.status,
      });
      continue;
    }

    const uploaded = await uploadResponse.json();
    const documentId = uploaded?.id;

    let finalStatus = 'pending';
    for (let poll = 0; poll < 20; poll += 1) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      const docResponse = await fetch(`${api}/documents/${documentId}`, {
        headers: authHeaders,
      });

      if (!docResponse.ok) {
        continue;
      }

      const docPayload = await docResponse.json();
      finalStatus = docPayload?.status ?? finalStatus;
      if (finalStatus === 'ready' || finalStatus === 'failed') {
        break;
      }
    }

    const versionsResponse = await fetch(`${api}/documents/${documentId}/versions`, {
      headers: authHeaders,
    });
    const versions = await versionsResponse.json();
    const versionId = Array.isArray(versions) && versions.length > 0 ? versions[0].id : null;

    const downloadResponse = await fetch(
      `${api}/documents/${documentId}/versions/${versionId}/download`,
      { headers: authHeaders },
    );

    const previewResponse = await fetch(
      `${api}/documents/${documentId}/versions/${versionId}/preview`,
      { headers: authHeaders },
    );

    results.push({
      iteration: i,
      documentId,
      versionId,
      finalStatus,
      uploadStatus: uploadResponse.status,
      downloadStatus: downloadResponse.status,
      downloadType: downloadResponse.headers.get('content-type'),
      downloadLength: Number(downloadResponse.headers.get('content-length') || 0),
      previewStatus: previewResponse.status,
      previewType: previewResponse.headers.get('content-type'),
      previewLength: Number(previewResponse.headers.get('content-length') || 0),
      previewOk: previewResponse.ok,
    });
  }

  await fs.writeFile(
    'c:/Users/mjdibay/source/repos/Compliance Hub/smoke-artifacts/blob-smoke-results.json',
    JSON.stringify(results, null, 2),
    'utf8',
  );

  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
