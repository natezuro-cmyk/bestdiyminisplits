# BestDIYMiniSplits.com — Starter Site

## What's in this folder

| File | Purpose |
|---|---|
| `index.html` | Homepage — hero, embedded calculator, value props, lead form, FAQ |
| `mini-split-sizing-calculator` | Dedicated BTU sizing calculator landing page (main SEO target) |
| `best-mini-splits` | 2026 pillar article — brand comparison |
| `diy-mini-split-installation` | DIY install walkthrough — supporting article |
| `styles.css` | Shared design system |
| `robots.txt` | Search engine crawl rules |
| `sitemap.xml` | URL list for search engines |
| `404.html` | Not-found page |

## How to deploy

This is plain static HTML/CSS — host anywhere that serves static files.

### Easiest (recommended for a new site)

**Cloudflare Pages** — free, fast, includes SSL:
1. Upload this folder to a new GitHub repo
2. Connect the repo at [pages.cloudflare.com](https://pages.cloudflare.com)
3. Point your domain (bestdiyminisplits.com) at Cloudflare Pages
4. Done

Alternatives with the same workflow: **Netlify**, **Vercel**, **GitHub Pages**.

### If you want Wordpress eventually

You can start static, and when you're ready for a blog CMS, port the calculator to a Wordpress shortcode. The calculator JS is self-contained inside `mini-split-sizing-calculator` — easy to drop into a custom HTML block.

## Hooking up the lead form

The lead form currently shows a success message but doesn't send anywhere. Plug it into one of these (no code changes required in most cases):

- **Formspree** — add `action="https://formspree.io/f/YOUR_ID"` to the `<form>` tag
- **Zapier webhook** — point to a Zap that emails/CRMs the lead
- **Netlify Forms** — add `data-netlify="true"` to the form
- **Custom backend** — POST the form to your own endpoint

## Next steps for SEO (what you should do after deploy)

1. **Submit to Google Search Console** — add `bestdiyminisplits.com`, verify ownership, submit the sitemap
2. **Submit to Bing Webmaster Tools** — same
3. **Set up Google Analytics 4** — add the tracking snippet before `</head>` in each HTML file
4. **Build backlinks** — share the calculator on:
   - Reddit: r/hvacadvice, r/homeimprovement, r/diy
   - HVAC forums: HVAC-Talk.com
   - Home forums: InternachI, BobVila, HomeDepot Community
   - The BTU calculator is inherently linkable — people cite tools.
5. **Add more articles** — each with its own URL:
   - "Mini split vs central air cost comparison"
   - "MrCool DIY review"
   - "Mitsubishi vs Daikin mini split"
   - "Mini split installation cost by state"
   - "Best mini split for [400, 500, 600, 800, 1000] sq ft"
6. **Schema markup** — already present on every page (FAQ, HowTo, Article, BreadcrumbList, WebApplication)

## Monetization hookup (for later)

Since you want to eventually sell HVAC-seller leads, the lead form on every page captures what you need. When you're ready:

- Sign up for a lead-gen platform like **Networx**, **Modernize**, or **HomeAdvisor** and resell leads
- Or build direct relationships with local HVAC pros in high-value zips and sell exclusivity per zip
- Average mini split lead value in 2026: $35–$120 per lead depending on zip code and project size

## Things to customize before launch

- Replace "Our methodology / Contact / Privacy" footer links with real pages
- Add your email/phone to the contact page
- Swap the SVG logo `M` for a real logo image when you have one
- Hook the lead form up to a real submission endpoint
