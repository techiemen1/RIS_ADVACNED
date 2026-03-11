const http = require('http');
const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end('ok');
});

server.on('error', (e) => {
    console.error('Server error:', e);
});

console.log('Attempting to listen on port 3000...');
server.listen(3000, '0.0.0.0', () => {
    console.log('Successfully listening on port 3000');
});
