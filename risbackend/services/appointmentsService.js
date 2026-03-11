// services/appointmentsService.js
const { pool } = require('../config/postgres');

module.exports = {
  generateAccession: async () => {
    // Simple generator: find max numerical suffix and increment
    const r = await pool.query("SELECT accession_number FROM appointments WHERE accession_number IS NOT NULL ORDER BY created_at DESC LIMIT 500");
    const rows = r.rows || [];
    let maxNum = 0;
    for (const row of rows) {
      const acc = String(row.accession_number || '');
      const m = acc.match(/(\d+)$/);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > maxNum) maxNum = n;
      }
    }
    const next = maxNum + 1;
    return `IPX-${String(next).padStart(6,'0')}`;
  }
};
