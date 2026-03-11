const { pool } = require('./config/postgres');

async function debug() {
  try {
    console.log("--- DATABASE DEBUG INFO ---");
    
    // Check patients table
    const patientsCols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'patients'");
    console.log("PATIENTS COLUMNS:", patientsCols.rows.map(r => `${r.column_name} (${r.data_type})`).join(", "));

    // Check pacs_servers table
    const pacsCols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'pacs_servers'");
    console.log("PACS_SERVERS COLUMNS:", pacsCols.rows.map(r => `${r.column_name} (${r.data_type})`).join(", "));

    // Check sequences
    const seqs = await pool.query("SELECT sequence_name FROM information_schema.sequences");
    console.log("SEQUENCES:", seqs.rows.map(r => r.sequence_name).join(", "));
    
    process.exit(0);
  } catch (err) {
    console.error("DEBUG SCRIPT FAILED:", err);
    process.exit(1);
  }
}

debug();
