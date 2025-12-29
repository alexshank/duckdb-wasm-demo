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
        return '<pre style="width: 100%; padding: 1rem; margin: 0;"><code>No results.</code></pre>';
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
        const result = await conn.query(query);

        codeElements[0].textContent = query;

        // replace parent to remove <code> wrapper around table
        const resultsContainer = codeElements[1].parentElement;
        resultsContainer.innerHTML = resultToTable(result);
    } catch (error) {
        const resultsContainer = codeElements[1].parentElement;
        resultsContainer.innerHTML = `<pre style="width: 100%; padding: 1rem; margin: 0;"><code>error: ${error.message}</code></pre>`;
    }
}

async function runCreateTable(outputId, query) {
    const outputContainer = document.getElementById(outputId);
    const codeElements = outputContainer.querySelectorAll('code');

    try {
        await conn.query(query);

        codeElements[0].textContent = query;

        // show success message for CREATE TABLE statements
        const resultsContainer = codeElements[1].parentElement;
        resultsContainer.innerHTML = '<pre style="width: 100%; padding: 1rem; margin: 0;"><code>Table created successfully.</code></pre>';
    } catch (error) {
        const resultsContainer = codeElements[1].parentElement;
        resultsContainer.innerHTML = `<pre style="width: 100%; padding: 1rem; margin: 0;"><code>error: ${error.message}</code></pre>`;
    }
}

// initialize and run queries after DOM loads
document.addEventListener('DOMContentLoaded', async () => {
    await initDB();

    // load CSV file and register in DuckDB's virtual filesystem
    const response = await fetch('data/vehicle-log-sample.csv');
    const csvData = await response.arrayBuffer();
    await db.registerFileBuffer('vehicle-log-sample.csv', new Uint8Array(csvData));

    // create base vehicles table from CSV
    await runCreateTable(
        'output-create-01',
        `CREATE TABLE vehicles AS
SELECT * FROM read_csv_auto('vehicle-log-sample.csv')`
    );

    // preview loaded data
    await runQuery(
        'output-preview-01',
        `SELECT *
FROM vehicles
LIMIT 5`
    );

    // create intermediate filtered_log table for Vehicle_ID = 34 fill-ups
    await runCreateTable(
        'output-create-02',
        `CREATE TABLE filtered_log AS
SELECT
    Log_ID,
    Vehicle_ID,
    Record_Type,
    Mileage,
    Is_Fill_Up,
    Log_Date,
    Provider,
    Cost
FROM vehicles
WHERE Vehicle_ID = 34
    AND Record_Type = '1'
    AND Mileage IS NOT NULL
    AND Mileage != '-1.00'
    AND Is_Fill_Up = 'TRUE'
ORDER BY Log_Date ASC`
    );
"fill-up"
    // preview filtered data
    await runQuery(
        'output-preview-02',
        `SELECT *
FROM filtered_log
LIMIT 5`
    );

    // create intermediate fillup_differences table with window functions
    await runCreateTable(
        'output-create-03',
        `CREATE TABLE fillup_differences AS
SELECT
    Log_Date,
    Mileage,
    LAG(Log_Date) OVER (ORDER BY Log_Date) AS prev_date,
    LAG(Mileage) OVER (ORDER BY Log_Date) AS prev_mileage,
    DATEDIFF('day', LAG(Log_Date) OVER (ORDER BY Log_Date), Log_Date) AS days_between,
    TRY_CAST(REPLACE(Mileage, ',', '') AS DOUBLE) -
        TRY_CAST(REPLACE(LAG(Mileage) OVER (ORDER BY Log_Date), ',', '') AS DOUBLE) AS mileage_difference
FROM filtered_log
ORDER BY Log_Date ASC`
    );

    // preview fill-up differences
    await runQuery(
        'output-preview-03',
        `SELECT *
FROM fillup_differences
LIMIT 5`
    );

    // query 4: average fill-up statistics (from intermediate table)
    runQuery(
        'output-04',
        `SELECT
    AVG(days_between) AS avg_days_between_fillups,
    AVG(mileage_difference) AS avg_mileage_between_fillups
FROM fillup_differences
WHERE days_between IS NOT NULL
    AND mileage_difference IS NOT NULL`
    );

    // query 5: yearly fill-up statistics (from intermediate table)
    runQuery(
        'output-05',
        `SELECT
    YEAR(Log_Date) AS year,
    AVG(days_between) AS avg_days_between_fillups,
    AVG(mileage_difference) AS avg_mileage_between_fillups
FROM fillup_differences
WHERE days_between IS NOT NULL
    AND mileage_difference IS NOT NULL
GROUP BY YEAR(Log_Date)
ORDER BY year
LIMIT 5`
    );
});
