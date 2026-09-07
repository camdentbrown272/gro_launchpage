# Waitlist Worker

`waitlist.js` is a Cloudflare Worker that backs the waitlist form. It exists
because GitHub Pages is static — there is nowhere on the site to hold a Resend
API key without shipping it to every visitor.

**Never put the API key in this repo.** It goes in Cloudflare as an encrypted
secret. This directory contains no credentials and is safe to be public.

## You do not need to move your domain

The Worker runs on its own `*.workers.dev` URL. Do **not** change the
nameservers at GoDaddy — the site stays on GitHub Pages and DNS stays as it is.

## Setup

### 1. Resend

1. Create an account at [resend.com](https://resend.com).
2. **Domains → Add Domain →** `gro-usa.com`. Resend shows DKIM and SPF records;
   add them at GoDaddy's DNS manager, then hit Verify. This is what lets mail
   come from `hello@gro-usa.com` instead of a shared sender, and it is what
   keeps the confirmation out of spam.
3. **API Keys → Create**, permission *Sending access*. Copy it now; Resend
   shows it once.

There is no audience or list to create first. Resend's audience-scoped
endpoints are deprecated in favour of segments, and the Worker posts to the
account-level `/contacts` endpoint, so signups are saved from the first
request. Set `SEGMENT_ID` in `wrangler.jsonc` only if you later want them
filed under a named segment.

### 2. Cloudflare

1. Create a free account at [dash.cloudflare.com](https://dash.cloudflare.com).
   No domain needed, no payment details.
2. **Workers & Pages → Create → Workers → Start with Hello World.** Name it
   `gro-waitlist`, then Deploy.
3. **Edit code**, delete the sample, paste all of `waitlist.js`, Deploy.
4. **Settings → Variables and Secrets**, add:
   - `RESEND_API_KEY` — type **Secret** — the key from step 1.3

   `FROM` and `SEGMENT_ID` live in `wrangler.jsonc`, not the dashboard —
   `wrangler deploy` overwrites dashboard variables.
5. Copy the Worker URL, which looks like
   `https://gro-waitlist.<your-subdomain>.workers.dev`.

### 3. Point the site at it

Set `waitlistEndpoint` in `src/config.ts` to that URL and push. The deploy
workflow does the rest.

## Checking it works

```bash
curl -X POST https://gro-waitlist.<subdomain>.workers.dev \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","source":"test"}'
```

`{"ok":true}` means the confirmation is on its way. Anything else is explained
in the Worker's logs: Cloudflare dashboard → your Worker → **Logs**.

## Notes

- Origins are allowlisted at the top of `waitlist.js`. Adding a domain later
  means adding it there too, or the browser blocks the request.
- A repeat signup is treated as success. Resend answers 409 for a contact that
  already exists, and telling someone their second attempt failed is worse than
  quietly re-sending.
- A failed *send* does return an error, so nobody is told they are on the list
  when no email actually went out.
