/**
 * Gro waitlist — Cloudflare Worker
 *
 * Receives { email, source } from the launch page, stores the address in a
 * Resend Audience, and sends the signup a confirmation email.
 *
 * This exists because the launch page is static: it has nowhere to keep a
 * Resend API key. The key lives here as an encrypted Worker secret and never
 * reaches the browser.
 *
 * Configure in Cloudflare → your Worker → Settings → Variables and Secrets:
 *   RESEND_API_KEY  (type: Secret)   re_xxxxxxxx
 *   AUDIENCE_ID     (type: Text)     optional — Resend Audience to add contacts to
 *   FROM            (type: Text)     e.g.  Gro <hello@gro-usa.com>
 */

const ALLOWED_ORIGINS = new Set([
  'https://gro-usa.com',
  'https://www.gro-usa.com',
  'http://localhost:4321', // local dev
]);

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.has(origin) ? origin : 'https://gro-usa.com',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

const confirmationText = `You're on the list.

That's it — no drip sequence, no weekly newsletter. One more email from us,
when Gro opens.

Fifteen posts a day about entrepreneurship, business, and making money.
Then it stops.

— Gro
https://gro-usa.com
`;

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') ?? '';
    const cors = corsHeaders(origin);
    const json = { ...cors, 'Content-Type': 'application/json' };

    // Browser preflight, triggered by the page's Content-Type header.
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: json });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Malformed request' }), { status: 400, headers: json });
    }

    const email = String(body?.email ?? '').trim().toLowerCase();
    const source = String(body?.source ?? 'unknown').slice(0, 40);

    if (!EMAIL.test(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email' }), { status: 400, headers: json });
    }

    if (!env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not set on this Worker.');
      return new Response(JSON.stringify({ error: 'Server not configured' }), { status: 500, headers: json });
    }

    const auth = {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    };

    // 1. Save the contact. A repeat signup returns a 409 from Resend, which is
    //    not a failure worth showing the visitor — so this never blocks step 2.
    if (env.AUDIENCE_ID) {
      try {
        const stored = await fetch(
          `https://api.resend.com/audiences/${env.AUDIENCE_ID}/contacts`,
          { method: 'POST', headers: auth, body: JSON.stringify({ email, unsubscribed: false }) },
        );
        if (!stored.ok && stored.status !== 409) {
          console.error('Audience write failed', stored.status, await stored.text());
        }
      } catch (error) {
        console.error('Audience write threw', error);
      }
    }

    // 2. Send the confirmation. This one does gate the response — if the
    //    visitor gets no email, they should not be told they are on the list.
    const sent = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        from: env.FROM || 'Gro <hello@gro-usa.com>',
        to: email,
        subject: "You're on the Gro waitlist",
        text: confirmationText,
      }),
    });

    if (!sent.ok) {
      console.error('Resend send failed', sent.status, await sent.text());
      return new Response(JSON.stringify({ error: 'Could not send confirmation' }), { status: 502, headers: json });
    }

    console.log('signup', { source });
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: json });
  },
};
