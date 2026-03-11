const { pool } = require('./risbackend/config/postgres');

async function seed() {
    try {
        console.log("🌱 Seeding Modalities with Body Parts...");
        
        const data = [
            { 
                name: 'CT', 
                body_parts: [
                    { name: 'Head', scans: ['Brain Plain', 'Brain Contrast', 'Brain Angio'] },
                    { name: 'Chest', scans: ['HRCT', 'CECT Chest', 'Plain Chest'] },
                    { name: 'Abdomen', scans: ['CECT Abdomen', 'Plain Abdomen', 'KUB'] }
                ]
            },
            { 
                name: 'MR', 
                body_parts: [
                    { name: 'Brain', scans: ['MRI Brain Plain', 'MRI Brain Contrast'] },
                    { name: 'Spine', scans: ['MRI Lumbar', 'MRI Cervical', 'MRI Dorsal'] }
                ]
            },
            { 
                name: 'US', 
                body_parts: [
                    { name: 'Abdomen', scans: ['Abdomen Pelvis', 'Upper Abdomen'] },
                    { name: 'OBG', scans: ['Level 2', 'NT Scan', 'Dating Scan'] }
                ]
            }
        ];

        for (const m of data) {
            await pool.query(
                `UPDATE modalities SET body_parts = $1 WHERE name = $2`,
                [JSON.stringify(m.body_parts), m.name]
            );
        }

        console.log("✅ Seeding complete.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Seeding failed:", err);
        process.exit(1);
    }
}

seed();
