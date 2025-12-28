import * as duckdb from 'https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@latest/+esm';

let db;
let conn;

async function initDB() {
    const output = document.getElementById('output');
    output.textContent = 'Initializing DuckDB...';

    // Initialize DuckDB
    const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
    const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);
    const worker_url = URL.createObjectURL(
        new Blob([`importScripts("${bundle.mainWorker}");`], { type: 'text/javascript' })
    );
    const worker = new Worker(worker_url);
    const logger = new duckdb.ConsoleLogger();
    db = new duckdb.AsyncDuckDB(logger, worker);
    await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
    URL.revokeObjectURL(worker_url);

    conn = await db.connect();

    output.textContent = 'DuckDB initialized! Click "Run Query" to test.';
}

async function runQuery() {
    const output = document.getElementById('output');

    try {
        // Create sample table
        await conn.query(`
            CREATE OR REPLACE TABLE users AS
            SELECT * FROM (VALUES
                (1, 'Alice', 30),
                (2, 'Bob', 25),
                (3, 'Charlie', 35),
                (4, 'Diana', 28)
            ) AS t(id, name, age)
        `);

        // Run query
        const result = await conn.query(`
            SELECT * FROM users WHERE age > 27 ORDER BY age DESC
        `);

        // Format output
        const rows = result.toArray();
        let text = 'Query: SELECT * FROM users WHERE age > 27\n\n';
        text += 'Results:\n';
        text += JSON.stringify(rows, null, 2);

        output.textContent = text;
    } catch (error) {
        output.textContent = `Error: ${error.message}`;
    }
}

// Initialize on page load
initDB();

// Export for use in HTML onclick
window.runQuery = runQuery;
