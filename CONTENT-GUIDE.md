# Editing the site

Every word on the site lives in **`content/site.json`**. Edit that file, commit,
push — the site rebuilds and redeploys itself. You do not need to touch any HTML.

To see a change before pushing:

```bash
node build.js --serve
```

Then open <http://localhost:4000>. It rebuilds every time you save.

Before pushing, run the check. It is the same one that guards the deploy:

```bash
node build.js && node scripts/check.js
```

---

## The shape of the file

```
site           your name, the site URL, the "last updated" date in the sitemap
profile        email, external links, CV
publications   the papers
projects       the Work page entries
skills         the "What I actually do" rows on About
i18n.en / .vi  all the page headings, intros and labels, per language
desk           the illustrated desk scene's nine panels, per language
```

Anything under `i18n.en` has a mirror under `i18n.vi`. **Change one, change the
other** — the build gate fails if a page exists in one language and not the
other, but it cannot tell you that a Vietnamese sentence is now out of date.

---

## The things you are most likely to want to change

### Your email

`profile.email`. It appears on the Contact page, in the structured data, and in
the `mailto:` link. One edit changes all three.

### Add a LinkedIn, GitHub, or ORCID link

They are already listed in `profile.links` with an empty `url`. Fill one in and
it appears on the Contact page:

```json
"orcid": { "label": "ORCID", "url": "https://orcid.org/0000-0000-0000-0000", … }
```

**An empty `url` means the link is skipped entirely** — no dead link, no empty
box. That is the general rule: an unfinished thing simply does not appear.

### Add your CV

Drop the PDF at `static/cv-michael-pham.pdf`, then set:

```json
"cv": { "url": "/cv-michael-pham.pdf", "updated": "2026-09" }
```

A download button appears on Contact. Leave `url` empty and it does not.

### Add a publication

Add an object to the top of the `publications` array (they display in file
order, newest first):

```json
{
  "id": "short-slug-2026",
  "title": "Sentence case, no trailing period",
  "authors": "Surname, A. B., **Pham, N. K.**, & Other, C. D.",
  "year": "2026",
  "venue": "Journal Name, 12(3), 45–67",
  "doi": "10.1234/example"
}
```

Wrap your own name in `**double asterisks**` — that is what bolds it in the
author list. Use the name **as the journal printed it**; the three variants
across your four papers are deliberate, and the page explains them.

Get the exact citation from <https://api.crossref.org/works/YOUR-DOI> rather
than from memory — that is where the current entries came from, and it caught
three wrong years in the previous version of this site.

Leave `doi` as `""` if there is not one yet; the DOI line is then skipped.

### Add a project to the Work page

Add an object to `projects`. Each needs both `en` and `vi`:

```json
{
  "id": "slug",
  "en": { "meta": "Short label", "title": "…", "body": ["para", "para"], "tags": ["R"] },
  "vi": { "meta": "…",           "title": "…", "body": ["…"],            "tags": ["R"] }
}
```

`meta` is the small mono label in the left column. `tags` are optional.

### The essays panel on the desk

`desk.en.panels.writing.items` is currently an empty list, so that panel shows
its introduction and nothing else. When you have essay titles, add them:

```json
"items": [
  { "label": "Essay", "text": "[Title](https://link-to-it)" }
]
```

Do the same under `desk.vi.panels.writing.items`.

### "Currently" — reading, watching, learning

`desk.en.panels.currently.items` and its Vietnamese twin. This is the one part
of the site that goes stale visibly, so either keep it current or delete the
panel from `desk.order`.

---

## Formatting inside copy

Body text supports three things and nothing else:

| You write                | You get             |
| ------------------------ | ------------------- |
| `**bold**`               | **bold**            |
| `*italic*`               | _italic_            |
| `[text](https://url)`    | a link              |

External links get `target="_blank"` and `rel="noopener"` automatically.
Everything else is escaped, so an apostrophe or an ampersand in your copy can
never break the page.

---

## Things the build will refuse to ship

The check in `scripts/check.js` fails the deploy — not just warns — on:

- A **PhD, doctoral, thesis, or Queen's University claim** anywhere in the
  output, in either language. These were removed on purpose. If you ever do
  enrol, delete the matching rule from the `FORBIDDEN` list in `scripts/check.js`
  in the same commit that adds the claim, so it is a deliberate act.
- Unfinished placeholder copy: `[TODO`, `[EDIT`, `[PLACEHOLDER`, `{{`.
- A dead internal link, or a `#anchor` with no matching element.
- A page missing its title, description, canonical URL, or `<h1>`.
- An image with no alt text.
- An English page with no Vietnamese counterpart.

---

## What only you can supply

These are left deliberately empty. None of them break the site; each one makes
it better.

1. **Confirm the email address.** The site says `khoiphamnguyen05@gmail.com`,
   carried over from the old version. Your account here is registered as
   `khoiphamnguyen04@gmail.com`. One of them is wrong on your own contact page.
2. **A CV PDF.** The single most-wanted thing on a researcher's site and
   currently absent.
3. **ORCID.** Free, five minutes, and it permanently disambiguates the three
   spellings of your name across the literature.
4. **LinkedIn and GitHub URLs**, if you want them listed.
5. **Your undergraduate degree**, if you want it on the About page. The old site
   said "biomedical science" in one place and nothing in another, so only the
   MSc — which was stated consistently — is listed now.
6. **Essay titles and links** for the writing panel.
7. **A workshop or talk you can name.** "Hospital-leadership training in
   Vietnam" is currently the only concrete thing in the speaking section; one
   named event would make it real.
