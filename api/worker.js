/**
 * Best DIY Mini Splits — subscribe API
 * POST /api/subscribe { email, source } → inserts into D1 `subscribers`
 */
const ALLOWED_ORIGINS = [
  'https://bestdiyminisplits.com',
  'https://www.bestdiyminisplits.com'
];

function corsHeadersFor(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}

function json(data, status, cors) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...cors
    }
  });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const cors = corsHeadersFor(origin);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    if (url.pathname === '/api/subscribe' && request.method === 'POST') {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ ok: false, error: 'bad_json' }, 400, cors);
      }

      const email = String(body.email || '').trim().toLowerCase();
      const source = String(body.source || '').slice(0, 200);
      const ua = (request.headers.get('User-Agent') || '').slice(0, 500);

      if (!EMAIL_RE.test(email) || email.length > 254) {
        return json({ ok: false, error: 'invalid_email' }, 400, cors);
      }

      try {
        await env.DB.prepare(
          'INSERT INTO subscribers (email, created_at, source, user_agent) VALUES (?, ?, ?, ?)'
        )
          .bind(email, Math.floor(Date.now() / 1000), source, ua)
          .run();
        return json({ ok: true }, 200, cors);
      } catch (err) {
        const msg = String(err);
        if (msg.includes('UNIQUE')) {
          // Already subscribed — treat as success so users don't get confused
          return json({ ok: true, already_subscribed: true }, 200, cors);
        }
        console.error('subscribe insert failed', err);
        return json({ ok: false, error: 'server_error' }, 500, cors);
      }
    }

    return json({ ok: false, error: 'not_found' }, 404, cors);
  }
};
