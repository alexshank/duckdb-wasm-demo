# DuckDB WASM Demo

A simple webpage that shows capabilities of Duck DB in browser via WASM. Demo uses synthetic car mileage data.

## Running Locally

```bash
cd car-maintenance-wasm
npx serve -l 3000
```

Open `http://localhost:3000`

## Running from Container

Build and run with Podman:

```bash
podman build -t duckdb-wasm-demo .
podman run -p 5000:5000 duckdb-wasm-demo

# or, one-liner
podman build -t duckdb-wasm-demo . && podman run -p 5000:5000 duckdb-wasm-demo
```
