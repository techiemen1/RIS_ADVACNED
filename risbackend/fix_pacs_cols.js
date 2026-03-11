const { pool } = require('./config/postgres');
const PACSModel = require('./models/pacsModel');

(async () => {
    try {
        console.log('Fixing PACS columns...');
        await PACSModel.init();
        console.log('✅ Columns fixed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Fix failed:', err.message);
        process.exit(1);
    }
})();
