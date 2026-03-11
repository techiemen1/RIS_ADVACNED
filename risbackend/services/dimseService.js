/**
 * services/dimseService.js
 * 
 * Handles DICOM DIMSE operations (C-STORE) to PACS servers.
 * Uses dcmjs-dimse for communication.
 */

const { Client } = require('dcmjs-dimse');
const { pool } = require('../config/postgres');
const path = require('path');
const fs = require('fs');

/**
 * Send a DICOM file to a specific PACS server via C-STORE.
 * 
 * @param {string} filePath - Absolute path to the .dcm file
 * @param {number} pacsServerId - ID from pacs_servers table
 * @returns {Promise<boolean>}
 */
async function sendCStore(filePath, pacsServerId) {
    try {
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        // 1. Fetch PACS server config
        const res = await pool.query('SELECT * FROM pacs_servers WHERE id = $1', [pacsServerId]);
        if (res.rowCount === 0) {
            throw new Error(`PACS server with ID ${pacsServerId} not found`);
        }
        const pacs = res.rows[0];

        // 2. Configure DIMSE client
        // Local AE Title defaults to RIS_SR or from ENV
        const localAet = process.env.RIS_AE_TITLE || 'RIS_BACKEND';
        
        console.log(`📡 [DIMSE] Sending ${path.basename(filePath)} to ${pacs.name} (${pacs.aetitle}@${pacs.host}:${pacs.port})...`);

        const client = new Client();
        
        return new Promise((resolve, reject) => {
            client.sendStoreSCU(
                localAet,
                pacs.aetitle,
                pacs.host,
                pacs.port,
                [filePath], // Can be an array of files
                (err, response) => {
                    if (err) {
                        console.error('❌ [DIMSE] C-STORE Error:', err);
                        return reject(err);
                    }
                    console.log('✅ [DIMSE] C-STORE Success');
                    resolve(true);
                }
            );
        });
    } catch (err) {
        console.error('💥 [dimseService] sendCStore failed:', err.message);
        throw err;
    }
}

module.exports = {
    sendCStore
};
