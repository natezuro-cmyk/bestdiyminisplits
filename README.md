# Best DIY Mini Splits

Live at **[bestdiyminisplits.com](https://bestdiyminisplits.com)**.

Static HTML site served from Cloudflare Workers Static Assets, with a
tiny companion API Worker that handles newsletter signups and pageview
analytics on Cloudflare D1. Zero third-party dependencies for the
runtime.

## Architecture

| Piece | Where |
|---|---|
| Static site (homepage, guides, calculator, checklist) | Cloudflare Worker `bestdiyminisplits` (Workers Static Assets), config in `wrangler.jsonc` |
| Subscribe + pageview API (`/api/*`) | Cloudflare Worker `bdms-api`, source in `api/`, route `bestdiyminisplits.com/api/*` |
| Database | Cloudflare D1 `bdms-subscribers` — tables: `subscribers`, `pageviews` |
| Email forwarding (`hello@`, `press@`, `privacy@`) | Cloudflare Email Routing catch-all → natezuro@gmail.com |
| Domain | Cloudflare Registrar, proxied |

## Common operations

Install wrangler once: `npm install` (uses Cloudflare auth stored via `npx wrangler login`).

### See subscribers

```bash
npm run subs          # latest 100
npm run subs:count    # total count
npm run subs:csv      # export to ./subscribers.sql
```

### See pageview analytics

```bash
npm run views          # total pageviews ever
npm run views:today    # pageviews today
npm run views:top      # top 20 pages in the last 30 days
npm run views:referrers # top 20 referrers in the last 30 days
```

### Deploy changes

Every `git push` to `main` triggers an automatic Cloudflare build that
redeploys the static site. The API Worker (in `api/`) deploys manually
when its code changes:

```bash
npm run deploy:api     # deploy api/ worker
npm run deploy:site    # force-redeploy static site (rarely needed)
```

### Database schema changes

Apply a new SQL file to D1:

```bash
npx wrangler d1 execute bdms-subscribers --file=db/your-file.sql --remote
```

## Repo layout

```
/                         static site root (HTML, CSS, calculator.js, og image)
/api/                     subscribe + pageview Worker (fetch handler + D1)
/db/                      SQL schema files
/wrangler.jsonc           main site Worker config
/.assetsignore            excludes api/, db/, node_modules/, tooling from uploaded assets
```

## Pre-launch checklist (status)

- [x] Custom domain at apex
- [x] Static site live
- [x] Subscribe API + D1 working
- [x] Email routing (catch-all `*@bestdiyminisplits.com`)
- [x] Social/OG image + metadata on every page
- [x] Affiliate disclosure on buyer's guide and install guide
- [x] Privacy policy finalized (no placeholder provider text)
- [x] `/checklist` printable page (the promised subscriber PDF)
- [x] Self-hosted pageview analytics (no GA4, no cookies)
- [x] `/about` — editorial-voice, no personal byline (see editorial principles there)
- [ ] Google Search Console verification + sitemap submission
- [ ] Affiliate program signups (Amazon, Home Depot, Lowe's) + real affiliate URLs in buyer's guide
- [ ] Smoke test on an actual phone
