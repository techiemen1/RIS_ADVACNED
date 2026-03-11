const { pool } = require('../config/postgres');

const getDashboardStats = async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        // Parallel queries for performance
        const [
            patientsMetadata,
            pendingReportsMetadata,
            studiesMetadata,
            ordersMetadata,
            criticalFindingsMetadata,
            aiAnalyzedMetadata
        ] = await Promise.all([
            // Patients Today
            pool.query("SELECT COUNT(*) FROM patients WHERE created_at::date = $1", [today]),
            // Pending Reports
            pool.query("SELECT COUNT(*) FROM reports WHERE workflow_status IN ('draft', 'preliminary')"),
            // Studies Today
            pool.query("SELECT COUNT(*) FROM pacs_studies WHERE study_date = $1", [today.replace(/-/g, '')]),
            // Orders Today
            pool.query("SELECT COUNT(*) FROM orders WHERE created_at::date = $1", [today]),
            // Critical Findings Today
            pool.query("SELECT COUNT(*) FROM worklist WHERE created_at::date = $1 AND is_critical = true", [today]),
            // AI Analyzed Today
            pool.query("SELECT COUNT(*) FROM worklist WHERE created_at::date = $1 AND ai_status = 'analyzed'", [today]),
        ]);

        // Revenue Today
        let revenue = 0;
        try {
            const revRes = await pool.query("SELECT SUM(total_amount) FROM billing WHERE created_at::date = $1", [today]);
            revenue = revRes.rows[0].sum || 0;
        } catch (e) {
            console.warn("Billing query failed", e.message);
        }

        // --- PREMIUM ANALYTICS: TAT & TRENDS ---
        let avg_tat_hours = 0;
        let revenue_trend = [];
        let reporting_trend = [];
        try {
            // Calculate TAT for finalized reports
            const tatRes = await pool.query(`
                SELECT AVG(EXTRACT(EPOCH FROM (finalized_at - created_at))/3600) as avg_tat 
                FROM reports 
                WHERE workflow_status = 'final' AND finalized_at IS NOT NULL
            `);
            avg_tat_hours = parseFloat(tatRes.rows[0].avg_tat || 0).toFixed(1);

            // Fetch 7-day revenue trend
            const trendRes = await pool.query(`
                SELECT TO_CHAR(created_at, 'DD Mon') as label, SUM(total_amount) as value
                FROM billing 
                WHERE created_at > NOW() - INTERVAL '7 days'
                GROUP BY label, created_at::date
                ORDER BY created_at::date ASC
            `);
            revenue_trend = trendRes.rows;

            // Fetch 7-day reporting trend
            const reportTrendRes = await pool.query(`
                SELECT TO_CHAR(created_at, 'DD Mon') as label, COUNT(*) as value
                FROM reports 
                WHERE created_at > NOW() - INTERVAL '7 days'
                GROUP BY label, created_at::date
                ORDER BY created_at::date ASC
            `);
            reporting_trend = reportTrendRes.rows;

        } catch (e) {
            console.warn("Premium analytics failed", e.message);
        }

        // PACS Status Check
        let pacsServers = [];
        try {
            const PACSModel = require('../models/pacsModel');
            const pacsService = require('../services/pacsService');
            const allPacs = await PACSModel.getAll();
            pacsServers = await Promise.all(allPacs.filter(p => p.is_active).map(async (p) => {
                try {
                    const check = await pacsService.testConnection({ ...p, timeout: 2000 });
                    return {
                        name: p.name,
                        status: check.ok ? 'online' : 'offline',
                        last_connected: p.last_connected
                    };
                } catch (err) {
                    return { name: p.name, status: 'offline', last_connected: p.last_connected };
                }
            }));
        } catch (e) {
            console.warn("PACS Status check failed", e.message);
        }

        const stats = {
            patients_today: parseInt(patientsMetadata.rows[0].count),
            pending_reports: parseInt(pendingReportsMetadata.rows[0].count),
            studies_today: parseInt(studiesMetadata.rows[0].count),
            orders_today: parseInt(ordersMetadata.rows[0].count),
            critical_today: parseInt(criticalFindingsMetadata.rows[0]?.count || 0),
            ai_analyzed_today: parseInt(aiAnalyzedMetadata.rows[0]?.count || 0),
            revenue_today: parseFloat(revenue),
            avg_tat_hours: parseFloat(avg_tat_hours),
            revenue_trend: revenue_trend,
            reporting_trend: reporting_trend,
            pacs_servers: pacsServers
        };

        res.json(stats);

    } catch (error) {
        console.error("Dashboard Stats Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

module.exports = {
    getDashboardStats
};
