// Temporary test server - serves Spine files for browser-based testing
const http = require('http');
const fs = require('fs');
const path = require('path');

const SPINE_DIR = 'D:\\Dev\\Spine-source\\exp';
const PORT = 9999;

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    // List available files
    if (req.url === '/list') {
        const files = fs.readdirSync(SPINE_DIR).filter(f => !fs.statSync(path.join(SPINE_DIR, f)).isDirectory());
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(files));
        return;
    }

    const filePath = path.join(SPINE_DIR, decodeURIComponent(req.url.slice(1)));
    if (!fs.existsSync(filePath)) {
        res.writeHead(404);
        res.end('Not found');
        return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = { '.json': 'application/json', '.atlas': 'text/plain', '.png': 'image/png' };
    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
    fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, () => {
    console.log(`Test file server on http://localhost:${PORT}`);
    console.log(`Files from: ${SPINE_DIR}`);
});
