// Tiny local preview server — runs the Cloudflare Worker module with Node.
// Usage: node dev-server.mjs   (binds 0.0.0.0:8787)
import http from 'node:http';
import worker from './worker.js';

const PORT = process.env.PORT || 8787;

const server = http.createServer(async (req, res) => {
  try {
    const request = new Request('http://localhost:' + PORT + req.url, {
      method: req.method,
      headers: req.headers
    });
    const r = await worker.fetch(request);
    const buf = Buffer.from(await r.arrayBuffer());
    res.writeHead(r.status, Object.fromEntries(r.headers.entries()));
    res.end(buf);
  } catch (e) {
    res.writeHead(500, { 'content-type': 'text/plain' });
    res.end('error: ' + e.message);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('NEON CAD dev server on http://0.0.0.0:' + PORT);
});
