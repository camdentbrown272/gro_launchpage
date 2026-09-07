/**
 * Gro — waitlist and feature-request Worker
 *
 * Two routes:
 *   POST /          { email, source }            → save contact + send confirmation
 *   POST /request   { request, subject, from? }  → email the request to REQUEST_TO
 *
 * This exists because the launch page is static: it has nowhere to hold a
 * Resend API key. The key lives here as an encrypted Worker secret and never
 * reaches the browser.
 *
 * Configure in Cloudflare → your Worker → Settings → Variables and Secrets:
 *   RESEND_API_KEY  (type: Secret)   re_xxxxxxxx
 *
 * Everything else lives in wrangler.jsonc, because `wrangler deploy`
 * overwrites dashboard variables:
 *   FROM         sender, e.g.  Gro <hello@gro-usa.com>
 *   REQUEST_TO   where feature requests land
 *   SEGMENT_ID   optional Resend segment to file contacts under
 */

const ALLOWED_ORIGINS = new Set([
  'https://gro-usa.com',
  'https://www.gro-usa.com',
  'http://localhost:4321', // local dev
]);

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_BODY = 8 * 1024; // a signup or a request is never this big

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.has(origin) ? origin : 'https://gro-usa.com',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

const reply = (body, status, cors) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const confirmationText = `You're on the list.

That's it — no drip sequence, no weekly newsletter. One more email from us,
when Gro opens.

Fifteen posts a day about entrepreneurship, business, and making money.
Then it stops.

— Gro
https://gro-usa.com
`;

// Inline styles and a table layout, because email clients strip <style> blocks
// and have no meaningful flexbox support.
const confirmationHtml = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f7f4ee;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f7f4ee;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;">
        <tr><td style="padding-bottom:28px;font-family:'Courier New',Courier,monospace;font-size:22px;color:#15160f;">
          Gro<span style="color:#2f5d3f;">.</span>
        </td></tr>
        <tr><td style="font-family:'Courier New',Courier,monospace;font-size:28px;line-height:1.25;color:#15160f;padding-bottom:20px;">
          You're on the list.
        </td></tr>
        <tr><td style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#4c4e44;padding-bottom:14px;">
          That's it &mdash; no drip sequence, no weekly newsletter. One more email
          from us, when Gro opens.
        </td></tr>
        <tr><td style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#4c4e44;padding-bottom:28px;">
          Fifteen posts a day about entrepreneurship, business, and making money.
          Then it stops.
        </td></tr>
        <tr><td style="border-top:1px solid rgba(21,22,15,0.13);padding-top:16px;font-family:Helvetica,Arial,sans-serif;font-size:13px;color:#8a8c80;">
          <a href="https://gro-usa.com" style="color:#8a8c80;text-decoration:none;">gro-usa.com</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

/** Reads the body with a size cap, so a huge POST cannot be used to burn CPU. */
async function readJson(request) {
  const length = Number(request.headers.get('Content-Length') ?? 0);
  if (length > MAX_BODY) return { tooLarge: true };
  const raw = await request.text();
  if (raw.length > MAX_BODY) return { tooLarge: true };
  try {
    return { data: JSON.parse(raw) };
  } catch {
    return { malformed: true };
  }
}

async function sendEmail(env, payload) {
  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: env.FROM || 'Gro <hello@gro-usa.com>', ...payload }),
  });
}

async function handleWaitlist(data, env, cors) {
  const email = String(data?.email ?? '').trim().toLowerCase();
  const source = String(data?.source ?? 'unknown').slice(0, 40);

  if (!EMAIL.test(email)) return reply({ error: 'Invalid email' }, 400, cors);

  // 1. Save the contact. A repeat signup returns 409, which is not a failure
  //    worth showing the visitor — so this never blocks the confirmation.
  const contact = { email, unsubscribed: false };
  if (env.SEGMENT_ID) contact.segments = [{ id: env.SEGMENT_ID }];

  try {
    const stored = await fetch('https://api.resend.com/contacts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(contact),
    });
    if (!stored.ok && stored.status !== 409) {
      console.error('Contact write failed', stored.status, await stored.text());
    }
  } catch (error) {
    console.error('Contact write threw', error);
  }

  // 2. Send the confirmation. This one does gate the response — if no email
  //    goes out, the visitor should not be told they are on the list.
  const sent = await sendEmail(env, {
    to: email,
    subject: "You're on the Gro waitlist",
    html: confirmationHtml,
    text: confirmationText,
  });

  if (!sent.ok) {
    console.error('Confirmation send failed', sent.status, await sent.text());
    return reply({ error: 'Could not send confirmation' }, 502, cors);
  }

  console.log('signup', { source });
  return reply({ ok: true }, 200, cors);
}

async function handleRequest(data, env, cors) {
  const body = String(data?.request ?? '').trim();
  const subject = String(data?.subject ?? 'Feature request').slice(0, 120);
  const from = String(data?.from ?? '').trim().toLowerCase();

  if (!body) return reply({ error: 'Empty request' }, 400, cors);

  const to = env.REQUEST_TO;
  if (!to) {
    console.error('REQUEST_TO is not set on this Worker.');
    return reply({ error: 'Server not configured' }, 500, cors);
  }

  const payload = {
    to,
    subject,
    text: `${body}\n\n—\nFrom: ${from || 'not given'}\nvia gro-usa.com`,
    html:
      `<p style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#15160f;white-space:pre-wrap;">${escapeHtml(body)}</p>` +
      `<p style="font-family:Helvetica,Arial,sans-serif;font-size:13px;color:#8a8c80;">From: ${escapeHtml(from || 'not given')}<br>via gro-usa.com</p>`,
  };

  // Only set reply_to when they actually gave a usable address.
  if (EMAIL.test(from)) payload.reply_to = from;

  const sent = await sendEmail(env, payload);

  if (!sent.ok) {
    console.error('Request send failed', sent.status, await sent.text());
    return reply({ error: 'Could not send request' }, 502, cors);
  }

  console.log('feature request received');
  return reply({ ok: true }, 200, cors);
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') ?? '';
    const cors = corsHeaders(origin);

    // Browser preflight, triggered by the page's Content-Type header.
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method !== 'POST') {
      return reply({ error: 'Method not allowed' }, 405, cors);
    }

    // Both routes spend a real API key, so throttle before doing any work.
    // The binding is guarded: if it is unavailable the Worker keeps serving
    // rather than throwing on every request.
    if (env.SUBMIT_LIMIT) {
      try {
        const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
        const { success } = await env.SUBMIT_LIMIT.limit({ key: ip });
        if (!success) return reply({ error: 'Too many requests' }, 429, cors);
      } catch (error) {
        console.error('Rate limiter threw, allowing the request', error);
      }
    }

    if (!env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not set on this Worker.');
      return reply({ error: 'Server not configured' }, 500, cors);
    }

    const { data, malformed, tooLarge } = await readJson(request);
    if (tooLarge) return reply({ error: 'Request too large' }, 413, cors);
    if (malformed) return reply({ error: 'Malformed request' }, 400, cors);

    const { pathname } = new URL(request.url);
    if (pathname === '/request') return handleRequest(data, env, cors);
    return handleWaitlist(data, env, cors);
  },
};
