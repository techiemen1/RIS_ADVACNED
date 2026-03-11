const { pool } = require('./config/postgres');

async function check() {
    try {
        const resPatients = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'patients'");
        console.log("PATIENTS COLUMNS:", resPatients.rows.map(r => r.column_name).join(", "));

        const resPacs = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'pacs_servers'");
        console.log("PACS COLUMNS:", resPacs.rows.map(r => r.column_name).join(", "));
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
