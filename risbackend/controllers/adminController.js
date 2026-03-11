const { pool } = require('../config/postgres');
const { logAction } = require('./auditController');

exports.cleanupData = async (req, res) => {
    const client = await pool.connect();
    try {
        const { type, filters } = req.body;
        // type: 'reports', 'orders', 'pacsCache', 'patients', 'everything'
        // filters: { patientId, accession, dateFrom, dateTo }

        const user = req.user.username;
        await client.query('BEGIN');

        // 0. Resolve Internal Patient ID if patientId (MRN) provided
        let internalPatientId = null;
        if (filters?.patientId) {
            const pRes = await client.query(
                "SELECT id FROM patients WHERE mrn = $1 OR id::text = $1 LIMIT 1",
                [filters.patientId]
            );
            if (pRes.rowCount > 0) internalPatientId = pRes.rows[0].id;
        }

        // Helper to build WHERE clause
        const buildWhere = (tableName, dateCol, useInternalId = false) => {
            const conditions = [];
            const values = [];
            let idx = 1;

            if (filters?.patientId) {
                const pid = useInternalId ? internalPatientId : filters.patientId;
                if (pid !== null) {
                    conditions.push(`patient_id = $${idx++}`);
                    values.push(pid);
                } else {
                    // Filter requested but patient not found; effectively match nothing
                    conditions.push("1=0");
                }
            }
            if (filters?.accession) {
                // Determine if column name is accession_number or accession
                conditions.push(`accession_number = $${idx++}`);
                values.push(filters.accession);
            }
            if (filters?.dateFrom && dateCol) {
                conditions.push(`${dateCol} >= $${idx++}`);
                values.push(filters.dateFrom);
            }
            if (filters?.dateTo && dateCol) {
                conditions.push(`${dateCol} <= $${idx++}`);
                values.push(filters.dateTo);
            }
            return { text: conditions.length ? 'WHERE ' + conditions.join(' AND ') : '', values };
        };

        const runDelete = async (table, preferredDateCol = 'created_at') => {
            try {
                // 1. Check columns
                const colsRes = await client.query(
                    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1",
                    [table]
                );
                const cols = colsRes.rows.map(r => r.column_name);
                const colTypes = Object.fromEntries(colsRes.rows.map(r => [r.column_name, r.data_type]));

                // 2. Identify filters we can actually apply
                const canFilterPatient = cols.includes('patient_id');
                const canFilterAccession = cols.includes('accession_number');

                let dateCol = null;
                if (cols.includes(preferredDateCol)) dateCol = preferredDateCol;
                else if (cols.includes('created_at')) dateCol = 'created_at';
                else if (cols.includes('study_date')) dateCol = 'study_date';
                else if (cols.includes('scheduled_time')) dateCol = 'scheduled_time';

                // 3. Logic check: if user provided a filter that this table doesn't have, should we skip or delete all?
                // Usually skip if specific filter requested but missing.
                if (filters?.patientId && !canFilterPatient) {
                    console.log(`Skipping ${table}: no patient_id column`);
                    return;
                }
                if (filters?.accession && !canFilterAccession) {
                    console.log(`Skipping ${table}: no accession_number column`);
                    return;
                }
                if ((filters?.dateFrom || filters?.dateTo) && !dateCol) {
                    console.log(`Skipping ${table}: no date column found`);
                    return;
                }

                // 4. Build clause
                const useInternalId = canFilterPatient && colTypes['patient_id'].includes('int');
                const { text, values } = buildWhere(table, dateCol, useInternalId);

                // 5. Execute
                if (text || !filters || Object.keys(filters).length === 0) {
                    await client.query(`DELETE FROM ${table} ${text}`, values);
                }
            } catch (err) {
                console.warn(`Could not clear table ${table}: ${err.message}`);
            }
        };

        // --- GROUP 1: PACSCache (Metadata/Temp only) ---
        if (type === 'pacsCache' || type === 'everything') {
            await runDelete('study_metadata', 'created_at');
            await runDelete('pacs_studies', 'created_at');
        }

        // --- GROUP 2: Reports ---
        if (type === 'reports' || type === 'everything') {
            await runDelete('pacs_reports', 'created_at');
            await runDelete('pacs_report_images', 'created_at');
            await runDelete('report_addenda', 'created_at');
            // Legacy/RIS reports table
            await runDelete('reports', 'created_at');
        }

        // --- GROUP 3: Orders, Workflow, Billing ---
        if (type === 'orders' || type === 'everything') {
            await runDelete('billing', 'created_at');
            await runDelete('worklist', 'created_at');
            await runDelete('mwl_entries', 'created_at');
            await runDelete('orders', 'created_at');
            await runDelete('appointments', 'scheduled_time');
            await runDelete('patient_consents', 'created_at');
        }

        // --- GROUP 4: Patients ---
        if (type === 'patients' || type === 'everything') {
            // Note: If filters exist, runDelete handles them. 
            // If deleting patient but orders exist (FK constraint), this might fail.
            // In 'everything' mode, patients are usually last.
            await runDelete('patients', 'created_at');
        }

        await client.query('COMMIT');
        await logAction(user, 'admin', `Danger Zone: Cleared ${type} with filters: ${JSON.stringify(filters || {})}`);
        res.json({ success: true, message: `Successfully cleared ${type}` });

    } catch (err) {
        if (client) await client.query('ROLLBACK');
        console.error("Cleanup failed", err);
        res.status(500).json({ error: 'Cleanup failed: ' + err.message });
    } finally {
        client.release();
    }
};
