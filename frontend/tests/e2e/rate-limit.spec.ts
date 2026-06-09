import { test, expect } from '@playwright/test';

test.describe('Rate Limiting & Security Measure', () => {
  test('Spamming the API triggers a 429 Too Many Requests response with Security Measure message', async ({ request }) => {
    // Note: The Docker instance is configured with RATE_LIMIT_MAX_REQUESTS=4000.
    // Instead of waiting or hitting it 4000 times which could crash the test runner,
    // we assume the user has either temporarily lowered the limit OR we run a heavy burst.
    // For this e2e test to actually run without timing out, we will attempt to hit the API 
    // up to 4500 times in rapid succession using Promise.all in batches.
    
    test.setTimeout(120000); // 2 minutes timeout

    let got429 = false;
    let responseMessage = '';

    const batchSize = 200;
    const totalRequests = 4500;
    let p = 0;

    for (let i = 0; i < totalRequests; i += batchSize) {
      const promises = [];
      for (let j = 0; j < batchSize; j++) {
        promises.push(request.get('/api/health'));
        p++;
      }

      const responses = await Promise.all(promises);
      
      for (const res of responses) {
        if (res.status() === 429) {
          got429 = true;
          const body = await res.json();
          responseMessage = body.message;
          console.log(responseMessage + p);
          break;
        }
      }

      if (got429) {
        break;
      }
    }

    expect(got429).toBe(true);
    expect(responseMessage).toContain('Security Measure Triggered');
  });
});
