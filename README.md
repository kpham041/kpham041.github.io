# michaelpham.dev — personal site

Static, bilingual (English / Vietnamese), no framework, no npm dependencies.
Push to `main` and GitHub Actions rebuilds and deploys it.

```bash
node build.js            # build once into dist/
node build.js --serve    # build, serve on :4000, rebuild on every save
node scripts/check.js    # build gate — run it before pushing
```

Node 18+. There is nothing to install.

## Where things live

```
content/site.json        every word on the site, in both languages
src/templates/           the page generators (plain JS, no template language)
  routes.js              the URL map — the one place that decides page paths
  layout.js              document shell: head metadata, header, footer
  pages.js               one function per page
  desk.js                the illustrated desk scene
  svg/                   the desk illustration, as SVG fragments
src/css/                 site.css (design system) + desk.css
src/js/                  site.js (theme, drawer, reveals) + desk.js (the scene)
static/                  copied to the site root verbatim: fonts, images, icons
scripts/check.js         the build gate
scripts/shots.js         full-page screenshots of every page, for review
scripts/og.js            regenerates the 1200x630 social preview cards
assets-source/           the master portrait; not deployed
dist/                    build output — generated, git-ignored, never edited
```

## The two rules

**1. Never edit `dist/`.** It is deleted and regenerated on every build.

**2. Copy changes go in `content/site.json`, not in the templates.** Every
string on the site is in that file, keyed by language. See `CONTENT-GUIDE.md`.

## How a change reaches the live site

```
edit content/site.json  →  git commit  →  git push  →  Actions builds  →  live
```

The workflow in `.github/workflows/deploy.yml` runs `node build.js`, then
`node scripts/check.js`, and only deploys if the check passes. A build that
would ship a dead link, a missing page, an unfinished placeholder, or an image
without alt text fails instead of going live.

## What the build gate checks

- Every page has a title, meta description, canonical URL, `og:image`, a `lang`
  attribute, exactly one `<h1>`, and a skip link
- No dead internal links, no anchors pointing at ids that do not exist
- No unfinished placeholder copy (`[TODO`, `[EDIT`, `{{ …`)
- **No PhD, doctoral, thesis, or Queen's University claims** — these were
  removed deliberately and the check exists so they cannot come back by accident
- Every image has alt text and explicit dimensions
- Every `target="_blank"` link has `rel="noopener"`
- Every English page has a Vietnamese counterpart, and vice versa
- Every URL in `sitemap.xml` was actually built

## URLs

English is at the root, Vietnamese mirrors it under `/vi/`:

| Page         | English          | Vietnamese          |
| ------------ | ---------------- | ------------------- |
| Home         | `/`              | `/vi/`              |
| About        | `/about/`        | `/vi/about/`        |
| Work         | `/work/`         | `/vi/work/`         |
| Publications | `/publications/` | `/vi/publications/` |
| Contact      | `/contact/`      | `/vi/contact/`      |

Every page carries `hreflang` alternates, so Google serves the right language
and the EN/VI switch always lands on the same page rather than the home page.

To add a page: add it to `SEGMENTS` in `src/templates/routes.js`, add a function
to `src/templates/pages.js`, add its nav label to both `i18n.en.nav` and
`i18n.vi.nav`, and add it to `NAV_PAGES` in `layout.js`.

## Design system

All tokens are custom properties at the top of `src/css/site.css`. Change a
colour there and it changes everywhere, in light and dark. Text colours were
picked to meet WCAG AA on their own background — `--muted` is 5.0:1, `--accent`
8.6:1, `--gold` 4.9:1 — so do not lighten them without re-checking.

Dark mode follows the OS by default and the header toggle overrides it,
remembered in `localStorage`.

## Progressive enhancement

Every page is complete with JavaScript disabled. `site.js` adds the theme
toggle, the mobile drawer and scroll reveals; `desk.js` upgrades the desk
scene's links into a modal. With scripts blocked, the desk hotspots are ordinary
anchors to panels that are visible in the page.

## The desk scene

Ported from the original design canvas, with three changes.

Hotspots are SVG `<a href="#desk-…">` rather than `<g role="button">`, so they
are natively focusable and work with JavaScript off. The phin-coffee object was
defined in the original but never placed on the desk, leaving its "Writing"
panel unreachable; it now has a spot. And every colour in the illustration is an
inline `style="fill:var(--desk-…)"` rather than a hex literal — that is not
decoration: most objects are drawn with `<use>`, and CSS selectors cannot reach
into a `<use>` shadow tree, but custom properties inherit into it. It is the only
way the artwork can follow light and dark. **If you edit the SVG, keep using the
`--desk-*` variables**; a hard-coded hex will look correct in one theme and
disappear in the other.

## Screenshots

With the dev server running:

```bash
node scripts/shots.js /tmp/site-shots
```

Full-page captures of every page at desktop and mobile, light and dark, in both
languages. It drives headless Chrome over the DevTools protocol, so viewport and
`prefers-color-scheme` are really emulated, and it warns about any element that
spills outside the viewport — the thing eyeballing a screenshot always misses.

The social preview cards are rendered the same way but committed to the repo, so
the build never depends on Chrome. Regenerate them after changing your name, the
role line, or the portrait:

```bash
node scripts/og.js
```
