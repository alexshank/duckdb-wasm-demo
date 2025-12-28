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
        const response = await fetch('data/vehicle-log-sample.csv');
        const csvData = await response.arrayBuffer();
        await db.registerFileBuffer('vehicle-log-sample.csv', new Uint8Array(csvData));

        // load CSV data into table
        await conn.query(`
            CREATE OR REPLACE TABLE vehicles AS
            SELECT * FROM read_csv_auto('vehicle-log-sample.csv')
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

// initialize and run queries after DOM loads
document.addEventListener('DOMContentLoaded', async () => {
    await initDB();

    // query 1: fill up records for Vehicle_ID = 34
    runQuery(
        'output-01',
        `SELECT Log_ID, Vehicle_ID, Record_Type, Mileage, Is_Fill_Up, Log_Date, Provider, Cost
         FROM vehicles
         WHERE Vehicle_ID = 34
             AND Record_Type = '1'
             AND Mileage IS NOT NULL
             AND Mileage != '-1.00'
             AND Is_Fill_Up = 'TRUE'
         ORDER BY Log_Date ASC`
    );

    // query 2: fill-up differences using window functions
    runQuery(
        'output-02',
        `SELECT
            Log_Date,
            Mileage,
            LAG(Log_Date) OVER (ORDER BY Log_Date) AS prev_date,
            LAG(Mileage) OVER (ORDER BY Log_Date) AS prev_mileage,
            DATEDIFF('day', LAG(Log_Date) OVER (ORDER BY Log_Date), Log_Date) AS days_between,
            TRY_CAST(REPLACE(Mileage, ',', '') AS DOUBLE) - TRY_CAST(REPLACE(LAG(Mileage) OVER (ORDER BY Log_Date), ',', '') AS DOUBLE) AS mileage_difference
         FROM vehicles
         WHERE Vehicle_ID = 34
             AND Record_Type = '1'
             AND Mileage IS NOT NULL
             AND Mileage != '-1.00'
             AND Is_Fill_Up = 'TRUE'
         ORDER BY Log_Date ASC`
    );

    // query 3: average fill-up statistics
    runQuery(
        'output-03',
        `WITH fillup_data AS (
            SELECT
                Log_Date,
                Mileage,
                LAG(Log_Date) OVER (ORDER BY Log_Date) AS prev_date,
                LAG(Mileage) OVER (ORDER BY Log_Date) AS prev_mileage,
                DATEDIFF('day', LAG(Log_Date) OVER (ORDER BY Log_Date), Log_Date) AS days_between,
                TRY_CAST(REPLACE(Mileage, ',', '') AS DOUBLE) - TRY_CAST(REPLACE(LAG(Mileage) OVER (ORDER BY Log_Date), ',', '') AS DOUBLE) AS mileage_difference
            FROM vehicles
            WHERE Vehicle_ID = 34
                AND Record_Type = '1'
                AND Mileage IS NOT NULL
                AND Mileage != '-1.00'
                AND Is_Fill_Up = 'TRUE'
        )
        SELECT
            AVG(days_between) AS avg_days_between_fillups,
            AVG(mileage_difference) AS avg_mileage_between_fillups
        FROM fillup_data
        WHERE days_between IS NOT NULL AND mileage_difference IS NOT NULL`
    );

    // query 4: yearly fill-up statistics
    runQuery(
        'output-04',
        `WITH fillup_data AS (
            SELECT
                Log_Date,
                Mileage,
                LAG(Log_Date) OVER (ORDER BY Log_Date) AS prev_date,
                LAG(Mileage) OVER (ORDER BY Log_Date) AS prev_mileage,
                DATEDIFF('day', LAG(Log_Date) OVER (ORDER BY Log_Date), Log_Date) AS days_between,
                TRY_CAST(REPLACE(Mileage, ',', '') AS DOUBLE) - TRY_CAST(REPLACE(LAG(Mileage) OVER (ORDER BY Log_Date), ',', '') AS DOUBLE) AS mileage_difference
            FROM vehicles
            WHERE Vehicle_ID = 34
                AND Record_Type = '1'
                AND Mileage IS NOT NULL
                AND Mileage != '-1.00'
                AND Is_Fill_Up = 'TRUE'
        )
        SELECT
            YEAR(Log_Date) AS year,
            AVG(days_between) AS avg_days_between_fillups,
            AVG(mileage_difference) AS avg_mileage_between_fillups
        FROM fillup_data
        WHERE days_between IS NOT NULL AND mileage_difference IS NOT NULL
        GROUP BY YEAR(Log_Date)
        ORDER BY year`
    );
});
