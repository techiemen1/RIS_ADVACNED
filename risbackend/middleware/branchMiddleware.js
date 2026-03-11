/**
 * middleware/branchMiddleware.js
 * 
 * Enforces Multi-Branch Data Isolation
 * 
 * 1. Checks if multi-branch mode is enabled in hospital_settings.
 * 2. If enabled, isolates standard users to their assigned `branch_id`.
 * 3. Allows administrators to seamlessly switch branches using the `X-Branch-ID` HTTP header.
 * 4. Injects `req.branchId` and `req.isMultiBranchMode` for downstream controllers to append to queries.
 */

'use strict';

const { pool } = require('../config/postgres');

// Cache the global branch setting to avoid querying the DB on every single request
let cachedIsMultiBranch = null;
let lastCacheUpdate = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

async function checkIsMultiBranch() {
    const now = Date.now();
    if (cachedIsMultiBranch !== null && (now - lastCacheUpdate) < CACHE_TTL_MS) {
        return cachedIsMultiBranch;
    }

    try {
        const res = await pool.query('SELECT is_multi_branch FROM hospital_settings ORDER BY id LIMIT 1');
        cachedIsMultiBranch = res.rows.length > 0 ? (res.rows[0].is_multi_branch === true) : false;
        lastCacheUpdate = now;
        return cachedIsMultiBranch;
    } catch (err) {
        // If the table doesn't exist yet or query fails, default to false (safe)
        return false;
    }
}

/**
 * Middleware to enforce branch context on the request.
 * Must be used AFTER `authMiddleware.verifyToken`.
 */
const requireBranchContext = async (req, res, next) => {
    try {
        const isMultiBranchMode = await checkIsMultiBranch();
        req.isMultiBranchMode = isMultiBranchMode;

        // If multi-branch is disabled, we don't strictly enforce isolation, 
        // but we still default to Headquarters (1) to keep the DB foreign keys happy.
        if (!isMultiBranchMode) {
            req.branchId = 1;
            return next();
        }

        // Multi-Branch is ACTIVE. Determine the context.
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized to resolve branch context' });
        }

        const requestedBranchHeader = req.headers['x-branch-id'];
        const userBranchId = req.user.branch_id; // Added to JWT payload
        const isAdmin = req.user.role === 'admin';

        if (isAdmin && requestedBranchHeader) {
            // Admin is "teleporting" into a specific branch view.
            if (requestedBranchHeader === 'ALL') {
                req.branchId = 'ALL'; // Special keyword for aggregated masterlist view
            } else {
                req.branchId = parseInt(requestedBranchHeader, 10);
            }
        } else {
            // Standard user or admin explicitly viewing their home branch
            req.branchId = userBranchId || 1; // Fallback to 1 if user record is orphaned
        }

        // Add a helper function to easily append branch scoping to queries
        req.applyBranchScope = (alias = '') => {
            if (!req.isMultiBranchMode || req.branchId === 'ALL') return '';
            
            const prefix = alias ? `${alias}.` : '';
            return ` AND ${prefix}branch_id = ${parseInt(req.branchId, 10)} `;
        };

        next();

    } catch (err) {
        console.error('[branchMiddleware] Error:', err.message);
        return res.status(500).json({ error: 'Failed to resolve organizational branch context.' });
    }
};

module.exports = {
    requireBranchContext,
    // Expose cache invalidator for settingsController when toggled via UI
    invalidateBranchCache: () => { cachedIsMultiBranch = null; } 
};
