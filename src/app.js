import * as duckdb from 'https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@latest/+esm';

let db;
let conn;

async function initDB() {
    const output = document.getElementById('output-init');
    output.textContent = 'Initializing DuckDB...';

    // use WASM bundles from CDN to avoid bundling binary files
    const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
    const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);

    // worker requires blob URL since we're loading from CDN
    const worker_url = URL.createObjectURL(
        new Blob([`importScripts("${bundle.mainWorker}");`], { type: 'text/javascript' })
    );
    const worker = new Worker(worker_url);
    const logger = new duckdb.ConsoleLogger();
    db = new duckdb.AsyncDuckDB(logger, worker);
    await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
    URL.revokeObjectURL(worker_url);

    conn = await db.connect();

    output.textContent = 'DuckDB initialized!';
    document.getElementById('output-container').style.display = 'block';
}

// convert DuckDB result to HTML table
function resultToTable(result) {
    const rows = result.toArray();

    if (rows.length === 0) {
        return '<p>No results.</p>';
    }

    const columns = Object.keys(rows[0]);

    let html = '<table><thead><tr>';
    columns.forEach(col => {
        html += `<th>${col}</th>`;
    });
    html += '</tr></thead><tbody>';

    rows.forEach(row => {
        html += '<tr>';
        columns.forEach(col => {
            html += `<td>${row[col]}</td>`;
        });
        html += '</tr>';
    });

    html += '</tbody></table>';
    return html;
}

async function runQuery(outputId, query) {
    const outputContainer = document.getElementById(outputId);
    const codeElements = outputContainer.querySelectorAll('code');

    try {
        // fetch CSV file and register in DuckDB's virtual filesystem
        const response = await fetch('data/users.csv');
        const csvData = await response.arrayBuffer();
        await db.registerFileBuffer('users.csv', new Uint8Array(csvData));

        // load CSV data into table
        await conn.query(`
            CREATE OR REPLACE TABLE users AS
            SELECT * FROM read_csv_auto('users.csv')
        `);

        const result = await conn.query(query);

        codeElements[0].textContent = query;

        // replace parent to remove <code> wrapper around table
        const resultsContainer = codeElements[1].parentElement;
        resultsContainer.innerHTML = resultToTable(result);
    } catch (error) {
        const resultsContainer = codeElements[1].parentElement;
        resultsContainer.innerHTML = `<p>error: ${error.message}</p>`;
    }
}

// initialize and run query after DOM loads
document.addEventListener('DOMContentLoaded', async () => {
    await initDB();
    runQuery(
        'output-01',
        'SELECT * FROM users WHERE age > 27 ORDER BY age DESC'
    );
});
