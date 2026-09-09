# Source material, not deployed

Nothing in this directory is copied into `dist/`.

- **`original-canvas-export.html`** is the previous version of the site: a single
  2.3 MB self-contained bundle exported from a design canvas. The whole page was
  a client-side app with no real URLs; all its copy lived inside a JavaScript
  class. It is kept for provenance. The desk-scene artwork in
  `src/templates/svg/` was extracted from it.

- **`portrait-master.png`** is the 1024×1024 original of the portrait. Everything
  in `static/img/portrait-*` is derived from it. To regenerate after replacing
  it:

  ```bash
  for w in 380 560 760 1024; do
    sips -Z $w --setProperty format jpeg --setProperty formatOptions 82 \
      assets-source/portrait-master.png --out static/img/portrait-$w.jpg
    cwebp -q 80 -resize $w 0 assets-source/portrait-master.png \
      -o static/img/portrait-$w.webp
  done
  node scripts/og.js
  ```
