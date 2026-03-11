require("dotenv").config();
const { startMwlServer } = require('../services/mwlServer');

console.log("Starting Standalone MWL Server...");
startMwlServer();

// Keep alive
setInterval(() => { }, 10000);
