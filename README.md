# Loaloah — corporate website

Bilingual (Arabic default, English) website for **Loaloah Industries · اللؤلؤة للصناعة**.
Static site built with [Astro](https://astro.build), GSAP + Lenis for motion, and Three.js for the hero.

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # static output in dist/
npm run preview   # serve dist/ locally
```

## Routes

| Arabic (default) | English | Page |
| --- | --- | --- |
| `/` | `/en/` | Home |
| `/about/` | `/en/about/` | About |
| `/products/` | `/en/products/` | Products (filter by `?c=basin\|shower\|kitchen\|accessories`) |
| `/products/<slug>/` | `/en/products/<slug>/` | Product detail |
| `/quality/` | `/en/quality/` | Quality & certification |
| `/downloads/` | `/en/downloads/` | Catalogue, guides, datasheets |
| `/contact/` | `/en/contact/` | Contact form, WhatsApp, map |

Every page has `hreflang` alternates, per-language titles and descriptions, Open Graph tags,
and JSON-LD (Organization everywhere, Product + BreadcrumbList on product pages).
`sitemap-index.xml` and `robots.txt` are generated at build.

## Editing content — no code needed

All text lives in `content/`:

| File | What's in it |
| --- | --- |
| `content/ar.json` / `content/en.json` | Every string on the site, per language |
| `content/products.json` | The product range (one entry per product) |
| `content/site.json` | Phone, WhatsApp, email, address, map, social links, form settings |

### Adding a product

Add one entry to `items` in `content/products.json`:

```json
{
  "slug": "square-kitchen-mixer",
  "code": "LA-K201",
  "category": "kitchen",
  "collection": "square",
  "featured": false,
  "drawing": { "kind": "kitchen", "shape": "square" },
  "name": { "ar": "خلاط مطبخ مربع", "en": "Square kitchen mixer" },
  "description": { "ar": "…", "en": "…" },
  "specs": [{ "label": { "ar": "التركيب", "en": "Mounting" }, "value": { "ar": "…", "en": "…" } }],
  "finishes": ["chrome", "matte-black"],
  "images": [],
  "datasheet": { "ar": "", "en": "" }
}
```

- Mixers (basin / shower / kitchen) automatically get the shared specs in `defaults.mixerSpecs`.
- `featured: true` puts the product in the home page carousel.
- **Photos:** put files in `public/products/` (WebP, about 1000×1100) and list them in
  `images`, e.g. `"/products/square-basin-mixer-chrome.webp"`. The first photo replaces
  the technical drawing everywhere.
- **Datasheets:** put PDFs in `public/downloads/` and set e.g. `"ar": "/downloads/LA-B101-ar.pdf"`.
  Until a file is set, the site shows "coming soon" with a request link.
- `drawing.kind` is one of `basin`, `basin-tall`, `shower`, `bath`, `kitchen`, `hose`, `valve`,
  `cartridge`; `shape` is `square`, `round`, `oval` or `classic`.

Catalogue and installation-guide PDFs are listed under `downloads.groups` in the language files.

## Brand

Follows **Loaloah Brand Identity Guidelines V1.0 (Oct 2026)**.

- **Logo** — `src/components/Logo.astro` and `public/brand/*.svg` use the vector paths
  taken directly from the guideline PDF (not redrawn). Only the primary and white versions are used.
- **Colours** — CSS variables in `src/styles/global.css`: Atlantic Blue `#025497`,
  Azure Blue `#3aa1db`, Midnight Ink `#0b1747`, Solar Gold `#fde719` (accents only).
- **Graphic element** — the logomark petals, enlarged as hairlines (`PetalLines.astro`) and as a
  pattern (`PhotoSlot.astro`), as the guideline allows.
- **Typeface** — the guideline specifies **Expo Arabic**, which needs a web licence. The site
  currently uses IBM Plex Sans Arabic as the fallback. To switch, follow the steps in
  `src/styles/brand-fonts.css`.

## Motion

All motion is in `src/scripts/motion.ts` and switches off for visitors with
"reduce motion" enabled.

- **Hero** — real-time chrome mixer (`src/scripts/hero3d.ts`), with a pearl drop forming and
  falling, and live finish switching. A still frame (`public/hero-poster.webp`) shows first; the
  3D scene loads on the visitor's first scroll, pointer or key press, keeping page load fast.
- Smooth scrolling (Lenis), headings revealed line by line (whole words, so Arabic letters stay
  joined), technical drawings that draw themselves, a scroll-velocity marquee, a pinned factory
  process, horizontal product travel, counters, magnetic buttons, and native cross-page
  view transitions.

If you change the 3D model, re-export the poster so the hand-off stays seamless.

## Forms

Set in `content/site.json → form`:

- `"provider": "formspree"` with `"action": "https://formspree.io/f/<id>"` — posts to Formspree
  (works on any host, including Railway).
- `"provider": "formspree"` with an empty `action` — the form validates, then opens WhatsApp with
  the enquiry filled in. This is the current setting, so the form works before Formspree is set up.
- `"provider": "netlify"` — Netlify Forms (only when hosted on Netlify).
Links can pre-fill the form: `/contact/?type=distributor`, `/contact/?product=<slug>`.

## Deploy

**Railway** — `railway.json` is included. New Project → Deploy from GitHub repo → pick this repo,
then Networking → Generate Domain. Railway runs `npm run build`, then `npm start`, which serves
`dist/` on Railway's `$PORT`. Requires Node 22.12+ (set in `package.json → engines`).

**Other hosts** — works on any static host. For Netlify, `netlify.toml` is included (build `npm run build`,
publish `dist`). For Vercel or Cloudflare Pages, use the same build command and output folder
(Netlify Forms only works on Netlify; use Formspree elsewhere).

## Content to confirm before launch

These are placeholders or need sign-off. Each is in `content/` unless noted.

- [ ] Phone, WhatsApp number, email, factory address, map link (`site.json`)
- [ ] Social media handles (`site.json`); the strategy notes they still need reserving
- [ ] Product codes — `LA-B101` etc. are placeholders; replace with the real catalogue codes
- [ ] Product line-up — modelled on the strategy's "10 models" (6 basin, 3 shower, 1 wall mixer
      with swivel spout); match to the actual models and finishes
- [ ] Product photography and factory photography (the site shows labelled placeholders)
- [ ] Cartridge "250,000 cycles" — publish only with the lab report
- [ ] Warranty length (the site says "written warranty"; the social mock-up shows 10 years)
- [ ] Certification status (SASO, SABER, ISO 9001, Saudi Made, G-Mark) — update `status` to
      `certified` as each is issued
- [ ] "Manufacturing experience since 1996" and "founded 2023" (from the strategy)
- [ ] Arabic version of "Built on Trust" (the strategy proposes «مبنيّة على الثقة», pending approval)
- [ ] Working hours
- [ ] Expo Arabic web-font licence
