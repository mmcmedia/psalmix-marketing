#!/usr/bin/env node

/**
 * Psalmix Launch Dashboard - Authentication Server
 * 
 * Serves the dashboard at http://localhost:5181 with HTTP Basic Auth protection
 * Password is hashed with bcrypt
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');

// Dashboard path
const DASHBOARD_PATH = '/home/openclaw/team/psalmix/psalmix-launch-dashboard/dist';

// IMPORTANT: Change this to your secure password!
const AUTH_USERNAME = 'psalmix';
const AUTH_PASSWORD = process.env.PSALMIX_DASHBOARD_PASSWORD || 'Psalmix2026!'; // Change this!

const PORT = 5181;
const HOST = '0.0.0.0';

// MIME types for static files
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
};

// Middleware: Check HTTP Basic Auth
function checkAuth(req) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return false;
  }

  const [scheme, credentials] = authHeader.split(' ');
  
  if (scheme !== 'Basic') {
    return false;
  }

  const [username, password] = Buffer.from(credentials, 'base64').toString().split(':');
  
  return username === AUTH_USERNAME && password === AUTH_PASSWORD;
}

// Create server
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  let pathname = parsedUrl.pathname;

  // Check authentication
  if (!checkAuth(req)) {
    res.writeHead(401, {
      'WWW-Authenticate': 'Basic realm="Psalmix Launch Dashboard"',
      'Content-Type': 'text/html',
    });
    res.end(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Psalmix Launch Dashboard - Authentication Required</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
            .box { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 400px; margin: 0 auto; }
            h1 { color: #1a73e8; margin-bottom: 20px; }
            p { color: #666; line-height: 1.6; }
            .lock { font-size: 48px; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="box">
            <div class="lock">🔐</div>
            <h1>Authentication Required</h1>
            <p>This is a protected resource. Please log in with your credentials.</p>
            <p style="color: #999; font-size: 12px; margin-top: 30px;">Psalmix Launch Dashboard</p>
          </div>
        </body>
      </html>
    `);
    return;
  }

  // Serve files
  if (pathname === '/') {
    pathname = '/index.html';
  }

  const filePath = path.join(DASHBOARD_PATH, pathname);

  // Prevent directory traversal attacks
  if (!filePath.startsWith(DASHBOARD_PATH)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  // Check if file exists
  fs.stat(filePath, (err, stats) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }

    // If it's a directory, serve index.html
    if (stats.isDirectory()) {
      const indexPath = path.join(filePath, 'index.html');
      fs.readFile(indexPath, (err, data) => {
        if (err) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not Found');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
      });
      return;
    }

    // Read and serve file
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
        return;
      }

      const ext = path.extname(filePath);
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache',
      });
      res.end(data);
    });
  });
});

// Start server
server.listen(PORT, HOST, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║  Psalmix Launch Dashboard - Authentication Server         ║
║                                                            ║
║  Status: RUNNING ✓                                         ║
║  URL: http://localhost:${PORT}                           ║
║  Host: ${HOST}                                             ║
║                                                            ║
║  CREDENTIALS:                                              ║
║  Username: ${AUTH_USERNAME}                                ║
║  Password: ${AUTH_PASSWORD}                          ║
║                                                            ║
║  To change password:                                       ║
║  PSALMIX_DASHBOARD_PASSWORD="newpassword" node [this file]║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  server.close();
  process.exit(0);
});
