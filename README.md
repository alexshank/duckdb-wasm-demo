# DuckDB WASM Demo

A simple webpage that shows capabilities of Duck DB in browser via WASM. Demo uses synthetic car mileage data.

## Project layout

**`dist/` is the source directory, despite the name.** There is no build step,
no bundler, and no `package.json` — the files in `dist/` are hand-authored and
served as-is:

```
dist/index.html            the page: markup, inline styles, the tracking snippet
dist/app.js                all the logic, plain ES modules, no transpiling
dist/public/duck.svg       favicon
dist/public/vehicle-log-sample.csv   the synthetic dataset
```

DuckDB-WASM and water.css both load from a CDN, so there is nothing to compile.
Edit these files directly.

The name is a deliberate compromise, not an oversight. This site is deployed
from the `hetzner-vps-dec-2025` repo, whose `deploy-static-site.sh` rsyncs
`<project>/dist` for every static app. Keeping that convention costs one
misleading directory name; breaking it for this one app would mean either a
special case in the deploy script or a pointless copy step.

The practical consequence: the usual "never hand-edit `dist/`" rule does **not**
apply here. In the sibling static sites (Astro, Vite, the Haskell recipe
generator) `dist/` is build output and edits there are destroyed on the next
build. In this repo there is nowhere else to make the edit.

## Run

```bash
npx serve dist -l 5000
```

Open `http://localhost:5000`

