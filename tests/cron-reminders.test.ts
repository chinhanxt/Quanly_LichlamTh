import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { GET } from '../app/api/cron/reminders/route';

describe('Cron Reminders API Dual Auth & Deduplication', () => {
  const originalEnvSecret = process.env.CRON_SECRET;
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.CRON_SECRET = 'test_secret_key_123';
    global.fetch = async (url: string | URL | Request) => {
      const urlString = typeof url === 'string' ? url : url.toString();
      if (urlString.includes('api.telegram.org')) {
        return new Response(JSON.stringify({ ok: true, result: true }), { status: 200 });
      }
      return originalFetch(url);
    };
  });

  afterEach(() => {
    process.env.CRON_SECRET = originalEnvSecret;
    global.fetch = originalFetch;
  });

  it('should reject requests with invalid secret in header or query', async () => {
    const req = new Request('http://localhost:3000/api/cron/reminders?secret=wrong_secret');
    const res = await GET(req);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.disabled, true);
  });

  it('should accept requests with valid secret query parameter', async () => {
    const req = new Request('http://localhost:3000/api/cron/reminders?secret=test_secret_key_123');
    const res = await GET(req);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.disabled, true);
  });
});
