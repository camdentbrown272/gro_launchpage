/**
 * Everything you'll want to change lives in this file.
 * Nothing else on the page hardcodes a name, link, or piece of copy.
 */

export const site = {
  name: 'Gro',
  /** Shows up in the browser tab and in link previews. */
  title: 'Gro — a feed that ends',
  description:
    'Fifteen posts a day about entrepreneurship, business, and making money. Then it stops — no infinite scroll, no algorithm learning what keeps you here.',
} as const;

/**
 * WAITLIST — this is the one thing you must set before launch.
 *
 * The form posts JSON here. Two options that need no backend:
 *
 *   Formspree  → formspree.io, make a form, paste the endpoint below.
 *                Looks like: https://formspree.io/f/abcdwxyz
 *   Buttondown → buttondown.com, Settings → Embedding.
 *
 * Leave it empty and the form still works visually, but it will tell you
 * in the console that no endpoint is set instead of silently dropping emails.
 */
export const waitlistEndpoint = 'https://gro-waitlist.grolaunch.workers.dev';

/**
 * How the waitlist form encodes its POST.
 *
 *   'json' — Formspree and most modern form APIs.
 *   'form' — url-encoded, which older endpoints and some newsletter
 *            providers (Buttondown, MailerLite) expect instead.
 *
 * If sign-ups silently fail, this is the first thing to flip.
 */
export const waitlistEncoding: 'json' | 'form' = 'json';

/** Shown up front on every call to action. Change it here and it updates everywhere. */
export const product = {
  price: '$2.99',
} as const;

export const links = {
  /** Set either to null to hide that link. Note the handles differ by a letter. */
  instagram: 'https://instagram.com/thefoundersbrief' as string | null,
  x: 'https://x.com/thefoundrsbrief' as string | null,
  /** Where "questions?" mail goes. Set to null to hide it. */
  email: null as string | null,
  /**
   * Where feature requests land. Swap this one address and the request form
   * follows — nothing else references it.
   */
  featureRequests: 'gro.foundation26@gmail.com',
} as const;

/** Pre-filled subject line on a feature request. */
export const featureRequestSubject = 'Feature request';

/**
 * Where feature requests are POSTed.
 *
 * Set this (a second Formspree form works) and requests are sent straight from
 * the page — the visitor never leaves and no mail app opens. Point that form's
 * notifications at `links.featureRequests` so they still land in your inbox.
 *
 * Leave it empty and the form falls back to opening the visitor's mail client
 * with the address and subject pre-filled.
 */
export const featureRequestEndpoint = 'https://gro-waitlist.grolaunch.workers.dev/request';

/**
 * SCREENSHOTS — placeholders until you send me the real ones.
 *
 * Drop files in `public/screenshots/` and set `src` to `/screenshots/name.png`.
 * Any slot with `src: null` renders a labeled placeholder frame instead,
 * so the page never looks broken while you're mid-swap.
 *
 * Aim for a 9:19.5 export (1170×2532 works) so the phone frame fits snugly.
 */
export type Shot = {
  readonly src: string | null;
  readonly alt: string;
  /** Omit to render the frame with no caption (used in the hero). */
  readonly caption?: string;
  readonly placeholder: string;
};

/**
 * The single phone beside the headline. It reuses the feed screenshot rather
 * than needing one of its own — three images cover the whole page.
 */
export const heroShot: Shot = {
  src: '/screenshots/feed.png',
  alt: 'A post in the Gro feed, from a founder, with a like and topic tags.',
  placeholder: 'the feed',
};

export const shots: readonly Shot[] = [
  {
    src: '/screenshots/feed.png',
    alt: 'A post in the Gro feed, from a founder, with a like and topic tags.',
    caption: 'One idea per card',
    placeholder: 'the feed',
  },
  {
    src: '/screenshots/profile.png',
    alt: 'A Gro profile showing what that person is chasing and what they are building.',
    caption: 'Everyone here is building',
    placeholder: 'a profile',
  },
  {
    src: '/screenshots/end.png',
    alt: 'The end-of-feed screen: you have seen enough, go make something worth posting.',
    caption: 'And then you leave',
    placeholder: 'the end',
  },
];
