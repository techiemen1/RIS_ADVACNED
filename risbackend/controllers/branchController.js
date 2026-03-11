const branchModel = require('../models/branchModel');

exports.listBranches = async (req, res) => {
    try {
        const branches = await branchModel.getAllBranches();
        res.json({ success: true, data: branches });
    } catch (err) {
        console.error('List Branches Error:', err);
        res.status(500).json({ error: 'Failed to fetch branches' });
    }
};

exports.createBranch = async (req, res) => {
    try {
        const branch = await branchModel.createBranch(req.body);
        res.status(201).json({ success: true, data: branch });
    } catch (err) {
        console.error('Create Branch Error:', err);
        res.status(500).json({ error: 'Failed to create branch' });
    }
};
