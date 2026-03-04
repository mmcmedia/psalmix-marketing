const fs = require('fs');
const path = require('path');

const AUTH_USERNAME = 'psalmix';
const AUTH_PASSWORD = process.env.DASHBOARD_PASSWORD;

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
};

function unauthorized(res) {
  res.statusCode = 401;
  res.setHeader('WWW-Authenticate', 'Basic realm="Psalmix Launch Dashboard"');
  res.setHeader('Content-Type', 'text/html');
  res.end(`<!DOCTYPE html><html><head><title>Authentication Required</title></head><body style="font-family:Arial;text-align:center;padding:40px;background:#f5f5f5;"><div style="background:#fff;padding:30px;border-radius:8px;max-width:420px;margin:0 auto;box-shadow:0 2px 10px rgba(0,0,0,0.1)"><div style="font-size:48px">🔐</div><h1>Authentication Required</h1><p>This dashboard is protected. Please log in.</p></div></body></html>`);
}

function checkAuth(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return false;
  const [scheme, credentials] = authHeader.split(' ');
  if (scheme !== 'Basic' || !credentials) return false;
  const [username, password] = Buffer.from(credentials, 'base64').toString().split(':');
  return username === AUTH_USERNAME && password === AUTH_PASSWORD;
}

module.exports = (req, res) => {
  if (!AUTH_PASSWORD) {
    res.statusCode = 500;
    res.end('DASHBOARD_PASSWORD is not set.');
    return;
  }

  if (!checkAuth(req)) {
    return unauthorized(res);
  }

  const requested = (req.query.path || '').replace(/\/+$/, '');
  let relPath = requested === '' ? 'index.html' : requested;

  // If no extension, serve index.html (SPA fallback)
  if (!path.extname(relPath)) {
    relPath = 'index.html';
  }

  const filePath = path.join(__dirname, '..', relPath);
  if (!filePath.startsWith(path.join(__dirname, '..'))) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.statusCode = 404;
      res.end('Not Found');
      return;
    }
    const ext = path.extname(filePath);
    res.setHeader('Content-Type', MIME_TYPES[ext] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.end(data);
  });
};
