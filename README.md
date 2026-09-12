# Briefly — launch page

A one-page waitlist site for Briefly, built with [Astro](https://astro.build) + TypeScript.
Static output, no backend, no build-time API keys.

## Run it

```bash
npm install
npm run dev      # http://localhost:4321
```

Astro 7 runs the dev server in the background, so `npm run dev` returns straight away:

```bash
npx astro dev status   # is it running?
npx astro dev logs     # what did it say?
npx astro dev stop     # kill it
```

Other scripts: `npm run build` (outputs to `dist/`), `npm run preview`, `npm run check` (types).

## The one thing to do before launch

The waitlist form doesn't save anything yet. Open `src/config.ts` and set `waitlistEndpoint`:

```ts
export const waitlistEndpoint = 'https://formspree.io/f/abcdwxyz';
```

Make a form at [formspree.io](https://formspree.io) (free tier is 50 submissions/month) or
[buttondown.com](https://buttondown.com) and paste the endpoint in. The form POSTs JSON:

```json
{ "email": "someone@example.com", "source": "hero" }
```

`source` is `hero` or `footer`, so you can see which CTA actually converts.

Until you set it, the form validates and shows an error rather than silently dropping emails,
and logs a loud warning to the browser console.

## Getting a confirmation email sent to signups

The page is static — it has no server, so it cannot send email itself, and an email API key
must never sit in client-side JS. The confirmation has to come from whatever service receives
the form. Pick one and paste its endpoint into `waitlistEndpoint`:

| Service | Free tier | How the confirmation happens |
|---|---|---|
| **Buttondown** | yes | Turn on double opt-in — subscribers get a confirmation mail automatically |
| **Kit** (ConvertKit) | yes | Form settings → enable the incentive/confirmation email |
| **MailerLite** | yes | Double opt-in is on by default |
| **Formspree** | paid | "Autoresponse" is a paid-plan feature |

Steps, whichever you choose:

1. Create the form/audience in the provider and **turn on double opt-in / the confirmation email**.
2. Copy the endpoint URL from its embed or API instructions into `waitlistEndpoint`.
3. Match `waitlistEncoding` to what that endpoint expects — `'json'` for Kit and Formspree,
   `'form'` for Buttondown and MailerLite. If sign-ups silently fail, flip this first.
4. Submit a test address and confirm the mail arrives.

If a provider's endpoint rejects browser requests (a CORS error in the console), the fix is a
one-file serverless function — Netlify Functions or a Cloudflare Worker — that receives the POST
and calls the provider (or Resend) with the key kept server-side. Point `waitlistEndpoint` at
that function instead.

## Adding the app screenshots

1. Export at 9:19.5 (1170×2532 is ideal) and drop the files in `public/screenshots/`.
2. Point at them in `src/config.ts`:

```ts
export const shots: readonly Shot[] = [
  { src: '/screenshots/feed.png', alt: '…', caption: 'Today, all of it', placeholder: 'the feed' },
  …
];
```

`heroShot` is the single phone beside the headline; `shots` is the three-up row further down.
Any slot left at `src: null` renders a labeled placeholder frame, so the page never looks broken
mid-swap.

## Price and feature requests

Both live in `src/config.ts`:

- `product.price` (`'$2.99'`) drives the "one-time purchase" stat under the hero CTA.
- `links.featureRequests` is the address the request form sends to. The form composes the
  message in-page and only hands off to the visitor's mail app on the final click, with the
  subject (`featureRequestSubject`) pre-filled. Change the address and nothing else needs touching.

The CTA joins a waitlist — it does not take payment. The price is shown up front as a stat so
nobody is surprised later. To sell directly you'd point the button at a Stripe Payment Link or
Gumroad instead.

## Everything else you'd want to change

All of it is in `src/config.ts` — the name, the meta description, the Instagram link, the contact
email. Set `links.instagram` or `links.email` to `null` to hide those links entirely.

Page copy lives in `src/pages/index.astro`. Colors and type are tokens at the top of
`src/styles/global.css`.

## Fonts

Self-hosted and subset to latin — three weights, ~12 KB each:

- **Cutive Mono 400** — headings, labels, the wordmark
- **Roboto 400 / 500** — body text and buttons

Files and their OFL licenses are in `public/fonts/`.

## Deploying

Deployed to GitHub Pages at **https://gro-usa.com** by
`.github/workflows/deploy.yml`, which runs on every push to `main`.

Pages must be set to **Settings → Pages → Source → GitHub Actions**. On the default
"Deploy from a branch" setting GitHub runs Jekyll instead, which cannot build this site —
it reads the `---` fences in `.astro` files as YAML front matter and errors out.

Two files pin the domain, and both matter:

- `astro.config.mjs` → `site` drives canonical URLs and social metadata.
- `public/CNAME` → copied into `dist/` on every build, which is what keeps the custom
  domain attached across deploys. Deleting it will drop the domain on the next deploy.

DNS at the registrar: four A records on the apex pointing at `185.199.108.153`,
`185.199.109.153`, `185.199.110.153`, `185.199.111.153`, and a `www` CNAME to
`camdentbrown272.github.io`.

The build is a plain static bundle, so Netlify or Cloudflare Pages would also work —
build command `npm run build`, publish directory `dist`.
