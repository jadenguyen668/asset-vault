// Simple HTTP server to serve Spine test files for browser fetch
const http = require('http');
const fs = require('fs');
const path = require('path');

const SPINE_DIR = 'D:\\Dev\\Spine-source\\exp';
const PORT = 9999;

const server = http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    
    const filePath = path.join(SPINE_DIR, decodeURIComponent(req.url.slice(1)));
    
    if (!fs.existsSync(filePath)) {
        res.writeHead(404);
        res.end('Not found: ' + filePath);
        return;
    }
    
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
        '.json': 'application/json',
        '.atlas': 'text/plain',
        '.png': 'image/png',
    };
    
    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
    fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, () => {
    console.log(`Spine test file server running on http://localhost:${PORT}`);
    console.log(`Serving files from: ${SPINE_DIR}`);
});
