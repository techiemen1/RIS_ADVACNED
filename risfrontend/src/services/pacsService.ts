// FILE: src/services/pacsService.ts
import axiosInstance from './axiosInstance';


export const fetchPacsOverview = async () => {
const r = await axiosInstance.get('/pacs/overview');
return r.data?.data;
};


export const fetchDashboardAnalytics = async () => {
const r = await axiosInstance.get('/analytics/dashboard');
return r.data?.data;
};




// FILE: src/services/socketStubServer.js (Node.js quick test server)
// Run with: node src/services/socketStubServer.js
const http = require('http');
const io = require('socket.io');
const server = http.createServer();
const socket = new io.Server(server, { cors: { origin: '*' } });


socket.on('connection', (s) => {
console.log('client connected', s.id);
const iv = setInterval(() => {
const value = Math.round(Math.random() * 10 + 2);
s.emit('pacs.ingest', { value, ts: Date.now() });
}, 4000);
s.on('disconnect', () => { clearInterval(iv); console.log('client disconnected'); });
});


server.listen(4000, () => console.log('socket stub listening on :4000'));


