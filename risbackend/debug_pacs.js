
require('dotenv').config();
const { pool } = require('./config/postgres');
const pacsService = require('./services/pacsService');

async function run() {
    try {
        console.log("🔍 Querying DB for PACS ID 13...");
        const r = await pool.query("SELECT * FROM pacs_servers WHERE id = 13");
        if (r.rows.length === 0) {
            console.error("❌ PACS ID 13 not found in DB");
            process.exit(1);
        }
        const pacs = r.rows[0];
        console.log("✅ Found PACS:", pacs.name, pacs.host, pacs.port);

        console.log("📡 Attempting qidoStudies...");
        const studies = await pacsService.qidoStudies(pacs, { limit: 5 });
        console.log("🎉 Success! Found", studies.length, "studies.");
        console.log("First study:", JSON.stringify(studies[0], null, 2));

    } catch (err) {
        console.error("❌ FAILED:");
        console.error(err);
        if (err.response) {
            console.error("HTTP Status:", err.response.status);
            console.error("HTTP Data:", err.response.data);
        }
    } finally {
        pool.end();
    }
}

run();
