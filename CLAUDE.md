## Project Description

A single-page demo showing DuckDB compiled to WASM running SQL in the browser,
over a synthetic car mileage dataset. Deployed as a static site to
`duckdb-wasm-demo.alexandershank.com`.

## The one thing to know: `dist/` is the source

**There is no build step.** No bundler, no `package.json`, no `src/`. Every file
in `dist/` is hand-authored and served as-is — `index.html` and `app.js` are the
source of truth. DuckDB-WASM and water.css load from a CDN, so nothing compiles.

**Edit `dist/` directly.** The usual "never hand-edit `dist/`" rule is correct
for the sibling static sites in this fleet — Astro, Vite, and the Haskell recipe
generator all regenerate `dist/` and would destroy such edits — but there is no
other place to make a change here. Do not go looking for the "real" source; it
does not exist.

The directory keeps the `dist/` name because `deploy-static-site.sh` in the
`hetzner-vps-dec-2025` repo rsyncs `<project>/dist` for every static app.
Renaming it would require a special case in that script or a copy step, which is
worse than one misleading name. Do not restructure this to add a build.

## Analytics

The page carries the shared Umami snippet in `dist/index.html`, directly after
`<title>`. The full strategy — one website ID for the whole domain, with
`data-tag` and `hostname` doing the separating — is documented in the
`hetzner-vps-dec-2025` repo's `CLAUDE.md` and `docs/monitoring.md`. Do not create
a second Umami website, and do not change the website ID.

This site's values: `data-domains="duckdb-wasm-demo.alexandershank.com"`,
`data-tag="duckdb-wasm-demo"`.

## Deploying

Deployment is driven from the `hetzner-vps-dec-2025` repo, not this one:
`./deploy.sh duckdb-wasm-demo`. Since there is no build, a change to `dist/` is
ready to deploy as soon as it is saved.
