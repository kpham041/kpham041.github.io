# michaelpham.dev, personal site

Static, bilingual (English / Vietnamese), no framework, no npm dependencies.
Push to `main` and GitHub Actions rebuilds and deploys it.

```bash
node build.js            # build once into dist/
node build.js --serve    # build, serve on :4000, rebuild on every save
node scripts/check.js    # build gate: run it before pushing
```

Node 18+. There is nothing to install.

## Where things live

```
content/site.json        every word on the site, in both languages
src/templates/           the page generators (plain JS, no template language)
  routes.js              the URL map: the one place that decides page paths
  layout.js              document shell: head metadata, header, footer
  pages.js               one function per page
  desk.js                the illustrated desk scene
  ui.js                  the poster-board furniture: tone() headings, scene()
                         landscapes, the postage stamp, the sticker-edge filter
  esc.js                 escaping, plus the tiny bold/italic/link/flag pass
  flags.js               the three language flags, as inline SVG
  svg/                   every illustration, as inline SVG fragments: the desk,
                         and the landscapes and dividers (horizon, river, hills,
                         skyline, plane, forest, sky, post, wayback, deadend,
                         ivy, band)
src/css/                 site.css (design system) + desk.css
src/js/                  site.js (theme, drawer) + desk.js (the scene)
static/                  copied to the site root verbatim: fonts, images, icons
scripts/check.js         the build gate
scripts/shots.js         full-page screenshots of every page, for review
scripts/og.js            regenerates the 1200x630 social preview cards
assets-source/           the master portrait; not deployed
dist/                    build output: generated, git-ignored, never edited
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
- **No PhD, doctoral, thesis, or Queen's University claims.** These were
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

The site is drawn as one long conference poster board, and between the
sections runs the journey from Hanoi to Ottawa: cream card, a bold two-colour
title, a photograph pinned with tape, highlighter on what matters, rubber-stamp
labels, the presenter's pen notes in the margins. Everything a reader reads
(prose, rows, citations, DOIs) is typeset like a journal page; everything
around it is paint on paper.

All tokens are custom properties at the top of `src/css/site.css`. Change one
and it changes everywhere, in light and dark. Three laws, written down so they
survive the next edit:

1. **No drawn faces.** The only face on the site is the photograph.
   Landscapes, buildings, vehicles and objects only. (The owl on the desk is
   the one animal with eyes.)
2. **Colour is paint on a desaturated ground.** Saturated blocks sit on warm
   grey-cream paper. Every block colour is dark enough that white 15px text
   clears 5:1, and every text pairing was computed, not estimated: do not
   lighten a colour without re-checking. Yellow is a surface (highlighter,
   tape, band), never a text colour.
3. **Density.** One landscape per page plus at most two dividers, no card
   around prose, at most two tilted things per screen.

**One page, one colour.** `body[data-page]` sets `--page`: blue for Home,
Publications and the 404, green for About, orange for Work, red for Contact.
Links, stamp labels, section heads and stickers take the page's colour, and the
nav pill is the legend: its four blocks are those four colours.

**Paint tokens** (`--p-*`) are for the illustrations only and never sit under
text. **Block tokens** (`--c-*`) carry white text by day and dark text at night.
Dark mode ("the board under a reading lamp") is opt-in through the header
toggle and re-points every token: blocks go pastel, the yellow band stays the
brightest thing on the page, the horizon's sky becomes night with stars and the
Peace Tower's clock lights up. There is deliberately no `prefers-color-scheme`
rule: the site opens light for everyone.

**Type.** Fraunces variable at its heavy end (weight 800 to 900, optical size
144) is the display voice, in sentence case, never uppercase (Vietnamese
capitals stack two marks). The `@font-face` blocks must declare `100 900` or the
heavy cut never loads. Patrick Hand, which has a real Vietnamese subset, is the
pen: a handful of margin notes, never load-bearing, with Plex Mono as its
fallback.

**Two-tone headings.** `tone()` in `ui.js` sets the last *n* words of a title in
the page colour with a highlighter stroke drawn below the baseline, so Vietnamese
marks are never crossed by yellow. *n* lives in `site.json` as `toneWords` beside
each title, so each language says where its own break goes; `0` means the title
stays whole and only gets the stroke (as with "Giới thiệu").

**Illustrations.** Each is an inline SVG fragment in `src/templates/svg/`,
placed with `scene(name, ctx)`. House rules, which a drawing must keep:

- Colours only as `style="fill:var(--p-…)"` / `style="stroke:var(--ink)"`,
  never a hex (the one exception is a `#000` shading overlay at 12% opacity), so
  every piece follows light and dark.
- Objects carry a 2.5 round outline in `--ink`; terrain (water, hills, roads,
  sky) has none. Flat fills; no gradients, filters, shadows or textures inside
  a drawing; the paper provides all the texture.
- Every landmark and label sits inside x 400 to 1200 of the 1600-wide canvas:
  on a phone the drawing is cropped to its centre and nothing important may
  fall outside it.
- No text except the named pen placeholders (`__NOTE_x__`, filled from
  `i18n.*.notes`), no flags, no crosses, no logos. The 404 signpost's two arms
  are the one place text is a real link.
- A vehicle is `<g class="ride" style="offset-path: …">` riding its route; it
  moves as the reader scrolls (`animation-timeline: view()`), and is parked at
  58% without support or under reduced motion.
- Under 12KB per divider, 28KB for the horizon.

**Paper.** Two procedural SVG tiles on `body`, a fine grain and sparse
recycled-paper flecks, so there is no file and no request. Surfaces "stuck on"
to the board (the brand block, the photo print, postcards, the dialog) have no
texture; the contrast is what makes them look stuck on.

## Progressive enhancement

Every page is complete with JavaScript disabled. `site.js` adds the theme
toggle and the mobile drawer; `desk.js` upgrades the desk
scene's links into a modal. With scripts blocked, the desk hotspots are ordinary
anchors to panels that are visible in the page.

## The desk scene

Ported from the original design canvas, with three changes.

Hotspots are SVG `<a href="#desk-…">` rather than `<g role="button">`, so they
are natively focusable and work with JavaScript off. The phin-coffee object was
defined in the original but never placed on the desk, leaving its "Writing"
panel unreachable; it now has a spot. And every colour in the illustration is an
inline `style="fill:var(--desk-…)"` rather than a hex literal. That is not
decoration: most objects are drawn with `<use>`, and CSS selectors cannot reach
into a `<use>` shadow tree, but custom properties inherit into it. It is the only
way the artwork can follow light and dark. Every `--desk-*` is an alias of a site
token (see the top of `desk.css`), so the desk is painted with the same box of
paints as the landscapes. **If you edit the SVG, keep using the `--desk-*`
variables**; a hard-coded hex will look correct in one theme and disappear in
the other. The window shows Hanoi's Tháp Rùa on the left and Ottawa's Peace
Tower on the right, which is what the annotation "where I'm from & where I am"
points at; the drawn figure wears the portrait's burgundy sweater and stays
faceless.

## Screenshots

With the dev server running:

```bash
node scripts/shots.js /tmp/site-shots
```

Full-page captures of every page at desktop and mobile, light and dark, in both
languages. It drives headless Chrome over the DevTools protocol, so the viewport
is really emulated, the dark shots opt in through `data-theme` exactly as the
toggle does, and it warns about any element that spills outside the viewport,
which is the thing eyeballing a screenshot always misses.

The social preview cards are rendered the same way but committed to the repo, so
the build never depends on Chrome. Regenerate them after changing your name, the
role line, or the portrait:

```bash
node scripts/og.js
```
