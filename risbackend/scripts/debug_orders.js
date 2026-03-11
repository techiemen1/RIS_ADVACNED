const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { pool } = require('../config/postgres');
const orderModel = require('../models/orderModel');

async function test() {
    try {
        console.log("Testing getOrders...");
        const orders = await orderModel.getOrders({});
        console.log("Success! Found " + orders.length + " orders.");
        if (orders.length > 0) {
            console.log("Sample:", orders[0]);
        }
    } catch (err) {
        console.error("FAILED:", err);
    } finally {
        await pool.end();
    }
}

test();
