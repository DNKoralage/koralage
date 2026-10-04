/**
 * server.js
 * Production-ready CMS & Portfolio Server
 * Built with native Node.js standard libraries for 100% Hostinger & cross-platform stability
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

// ─── Load .env file (no external dependencies) ────────────────────────────────
(function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      if (key && !(key in process.env)) {
        process.env[key] = val;
      }
    }
  }
})();

const db = require('./lib/db');
const {
  verifyPassword,
  hashPassword,
  createSession,
  validateSession,
  destroySession
} = require('./lib/auth');

const PORT = process.env.PORT || 3000;
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

const IMG_DIR = path.join(__dirname, 'assets', 'images');

if (!fs.existsSync(IMG_DIR)) {
  fs.mkdirSync(IMG_DIR, { recursive: true });
}

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf'
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function setCORS(res) {
  res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function jsonOk(res, data) {
  setCORS(res);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function jsonErr(res, code, msg) {
  setCORS(res);
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: msg }));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = [];
    req.on('data', chunk => body.push(chunk));
    req.on('end', () => resolve(Buffer.concat(body)));
    req.on('error', reject);
  });
}

function extractToken(req) {
  const authHeader = req.headers['authorization'] || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  const cookieHeader = req.headers['cookie'] || '';
  const match = cookieHeader.match(/admin_token=([^;]+)/);
  if (match) {
    return decodeURIComponent(match[1].trim());
  }
  return null;
}

function checkAuth(req) {
  const token = extractToken(req);
  if (!token) return null;
  return validateSession(token);
}

// ─── Multipart File Parser ─────────────────────────────────────────────────────
function parseMultipart(buffer, boundary) {
  const boundaryBuf = Buffer.from('--' + boundary);
  const parts = [];
  let start = 0;

  while (start < buffer.length) {
    const boundaryIdx = buffer.indexOf(boundaryBuf, start);
    if (boundaryIdx === -1) break;
    const headerStart = boundaryIdx + boundaryBuf.length + 2;
    const headerEnd = buffer.indexOf(Buffer.from('\r\n\r\n'), headerStart);
    if (headerEnd === -1) break;
    const headerStr = buffer.slice(headerStart, headerEnd).toString();
    const bodyStart = headerEnd + 4;
    const nextBoundary = buffer.indexOf(boundaryBuf, bodyStart);
    const bodyEnd = nextBoundary === -1 ? buffer.length : nextBoundary - 2;
    const body = buffer.slice(bodyStart, bodyEnd);

    const nameMatch = headerStr.match(/name="([^"]+)"/);
    const fileMatch = headerStr.match(/filename="([^"]+)"/);
    if (nameMatch) {
      parts.push({
        name: nameMatch[1],
        filename: fileMatch ? fileMatch[1] : null,
        data: body
      });
    }
    start = nextBoundary === -1 ? buffer.length : nextBoundary;
  }
  return parts;
}

// ─── Server Instance ──────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = urlObj.pathname;

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    setCORS(res);
    res.writeHead(204);
    return res.end();
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // AUTHENTICATION ROUTES
  // ══════════════════════════════════════════════════════════════════════════════

  // POST /api/auth/login or /api/auth (backward compatible)
  if ((pathname === '/api/auth/login' || pathname === '/api/auth') && req.method === 'POST') {
    try {
      const body = await readBody(req);
      const { username, password } = JSON.parse(body.toString());

      const userCol = db.collection('users');
      // Look up by username or email
      const user = userCol.findOne(u => u.username === username || u.email === username)
        || userCol.findOne({ role: 'admin' }); // fallback to first admin if username wasn't supplied in legacy login

      if (!user || !verifyPassword(password, user.passwordHash)) {
        db.collection('audit_logs').insertOne({
          action: 'LOGIN_FAILED',
          attemptedUser: username || 'unknown',
          ip: req.socket.remoteAddress || '',
          timestamp: new Date().toISOString()
        });
        return jsonErr(res, 401, 'Invalid username or password');
      }

      const session = createSession(user.id, {
        userAgent: req.headers['user-agent'],
        ip: req.socket.remoteAddress
      });

      // Set cookie for browser session persistence across reloads/tabs
      res.setHeader('Set-Cookie', `admin_token=${session.token}; Path=/; SameSite=Lax; Max-Age=86400`);

      const { passwordHash, ...safeUser } = user;
      return jsonOk(res, {
        ok: true,
        token: session.token,
        user: safeUser
      });
    } catch (err) {
      return jsonErr(res, 400, 'Malformed request: ' + err.message);
    }
  }

  // GET /api/auth/me — verify session & return current user profile
  if (pathname === '/api/auth/me' && req.method === 'GET') {
    const auth = checkAuth(req);
    if (!auth) return jsonErr(res, 401, 'Unauthorized or session expired');
    return jsonOk(res, { ok: true, user: auth.user });
  }

  // POST /api/auth/logout — destroy session
  if (pathname === '/api/auth/logout' && req.method === 'POST') {
    const token = extractToken(req);
    if (token) destroySession(token);
    res.setHeader('Set-Cookie', 'admin_token=; Path=/; SameSite=Lax; Max-Age=0');
    return jsonOk(res, { ok: true, message: 'Logged out successfully' });
  }

  // POST /api/auth/change-password — update admin password
  if (pathname === '/api/auth/change-password' && req.method === 'POST') {
    const auth = checkAuth(req);
    if (!auth) return jsonErr(res, 401, 'Unauthorized');
    try {
      const body = await readBody(req);
      const { currentPassword, newPassword } = JSON.parse(body.toString());

      if (!newPassword || newPassword.length < 8) {
        return jsonErr(res, 400, 'New password must be at least 8 characters long');
      }

      const user = db.collection('users').findOne({ id: auth.user.id });
      if (!user || !verifyPassword(currentPassword, user.passwordHash)) {
        return jsonErr(res, 400, 'Current password is incorrect');
      }

      const newHash = hashPassword(newPassword);
      db.collection('users').updateOne({ id: user.id }, { passwordHash: newHash });

      db.collection('audit_logs').insertOne({
        action: 'PASSWORD_CHANGED',
        userId: user.id,
        timestamp: new Date().toISOString()
      });

      return jsonOk(res, { ok: true, message: 'Password updated successfully' });
    } catch (err) {
      return jsonErr(res, 400, err.message);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // PUBLIC API ROUTES
  // ══════════════════════════════════════════════════════════════════════════════

  // GET /api/home — returns aggregated Home Page CMS content
  if (pathname === '/api/home' && req.method === 'GET') {
    const site = db.collection('site').findOne({ id: 'main' }) || db.collection('site').find()[0] || {};
    const processSection = db.collection('sections').findOne({ id: 'process' }) || {};
    const projects = db.collection('projects').find();
    return jsonOk(res, {
      ...site,
      processSteps: processSection.steps || [],
      projects
    });
  }

  // PUT /api/home — saves complete Home Page CMS content
  if (pathname === '/api/home' && req.method === 'PUT') {
    if (!checkAuth(req)) return jsonErr(res, 401, 'Unauthorized');
    try {
      const body = await readBody(req);
      const data = JSON.parse(body.toString());

      const { processSteps, projects, ...siteUpdates } = data;

      // Update site collection
      const existing = db.collection('site').findOne({ id: 'main' });
      if (existing) {
        db.collection('site').updateOne({ id: 'main' }, siteUpdates);
      } else {
        db.collection('site').insertOne({ id: 'main', ...siteUpdates });
      }

      // Update process steps if provided
      if (Array.isArray(processSteps)) {
        const existingProc = db.collection('sections').findOne({ id: 'process' });
        if (existingProc) {
          db.collection('sections').updateOne({ id: 'process' }, { steps: processSteps });
        } else {
          db.collection('sections').insertOne({ id: 'process', steps: processSteps });
        }
      }

      // Update featured projects if provided
      if (Array.isArray(projects)) {
        for (const p of projects) {
          if (p.id) {
            db.collection('projects').updateOne({ id: p.id }, { featured: p.featured !== false });
          }
        }
      }

      db.collection('audit_logs').insertOne({
        action: 'HOME_CMS_SAVED',
        timestamp: new Date().toISOString()
      });

      return jsonOk(res, { ok: true, message: 'Home page CMS content saved successfully!' });
    } catch (err) {
      return jsonErr(res, 400, 'Error saving Home CMS: ' + err.message);
    }
  }

  // GET /api/projects or /api/public/projects — public view (published only)
  if ((pathname === '/api/projects' || pathname === '/api/public/projects') && req.method === 'GET') {
    const allProjects = db.collection('projects').find();
    // Sort by displayOrder if present
    const sorted = allProjects.sort((a, b) => (a.displayOrder || 999) - (b.displayOrder || 999));
    // Public endpoint: only return published projects
    const isAdmin = !!checkAuth(req);
    const result = isAdmin ? sorted : sorted.filter(p => p.published !== false);
    return jsonOk(res, result);
  }

  // GET /api/site or /api/public/site
  if ((pathname === '/api/site' || pathname === '/api/public/site') && req.method === 'GET') {
    const site = db.collection('site').findOne({ id: 'main' }) || db.collection('site').find()[0] || {};
    return jsonOk(res, site);
  }

  // GET /api/sections or /api/sections/:id
  if (pathname.startsWith('/api/sections') && req.method === 'GET') {
    const match = pathname.match(/^\/api\/sections\/(.+)$/);
    if (match) {
      const section = db.collection('sections').findOne({ id: decodeURIComponent(match[1]) });
      if (!section) return jsonErr(res, 404, 'Section not found');
      return jsonOk(res, section);
    }
    return jsonOk(res, db.collection('sections').find());
  }

  // POST /api/contact — receive public contact inquiries
  if (pathname === '/api/contact' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      const data = JSON.parse(body.toString());

      if (!data.name || !data.email || !data.message) {
        return jsonErr(res, 400, 'Name, email, and message are required');
      }

      const inquiry = db.collection('contacts').insertOne({
        name: String(data.name).trim().substring(0, 100),
        email: String(data.email).trim().substring(0, 150),
        subject: String(data.subject || 'General Inquiry').trim().substring(0, 200),
        message: String(data.message).trim().substring(0, 3000),
        status: 'unread',
        ip: req.socket.remoteAddress || ''
      });

      return jsonOk(res, { ok: true, id: inquiry.id, message: 'Message received successfully' });
    } catch (err) {
      return jsonErr(res, 400, 'Error processing contact form: ' + err.message);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // PROTECTED CMS / ADMIN API ROUTES
  // ══════════════════════════════════════════════════════════════════════════════

  // GET /api/admin/dashboard-stats
  if (pathname === '/api/admin/dashboard-stats' && req.method === 'GET') {
    if (!checkAuth(req)) return jsonErr(res, 401, 'Unauthorized');

    const imageCount = fs.readdirSync(IMG_DIR).filter(f => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f)).length;
    const projectCount = db.collection('projects').count();
    const contactCount = db.collection('contacts').count();
    const unreadContacts = db.collection('contacts').count({ status: 'unread' });
    const auditLogs = db.collection('audit_logs').find().slice(-10).reverse();

    return jsonOk(res, {
      projects: projectCount,
      images: imageCount,
      contacts: contactCount,
      unreadContacts,
      recentActivity: auditLogs,
      nodeVersion: process.version,
      uptime: Math.round(process.uptime())
    });
  }

  // GET /api/admin/contacts & DELETE /api/admin/contacts/:id
  if (pathname === '/api/admin/contacts' && req.method === 'GET') {
    if (!checkAuth(req)) return jsonErr(res, 401, 'Unauthorized');
    return jsonOk(res, db.collection('contacts').find().reverse());
  }

  const contactMatch = pathname.match(/^\/api\/admin\/contacts\/(.+)$/);
  if (contactMatch && req.method === 'DELETE') {
    if (!checkAuth(req)) return jsonErr(res, 401, 'Unauthorized');
    const id = decodeURIComponent(contactMatch[1]);
    db.collection('contacts').deleteOne({ id });
    return jsonOk(res, { ok: true });
  }

  // GET /api/admin/audit-logs
  if (pathname === '/api/admin/audit-logs' && req.method === 'GET') {
    if (!checkAuth(req)) return jsonErr(res, 401, 'Unauthorized');
    return jsonOk(res, db.collection('audit_logs').find().slice(-50).reverse());
  }

  // GET /api/admin/users
  if (pathname === '/api/admin/users' && req.method === 'GET') {
    if (!checkAuth(req)) return jsonErr(res, 401, 'Unauthorized');
    const users = db.collection('users').find().map(u => {
      const { passwordHash, ...safe } = u;
      return safe;
    });
    return jsonOk(res, users);
  }

  // POST /api/projects (Create)
  if (pathname === '/api/projects' && req.method === 'POST') {
    if (!checkAuth(req)) return jsonErr(res, 401, 'Unauthorized');
    const body = await readBody(req);
    const newProject = JSON.parse(body.toString());
    if (!newProject.title || !newProject.title.trim()) {
      return jsonErr(res, 400, 'Project title is required');
    }
    // Assign displayOrder if not provided
    if (newProject.displayOrder === undefined || newProject.displayOrder === null) {
      const existing = db.collection('projects').find();
      newProject.displayOrder = existing.length + 1;
    }
    const saved = db.collection('projects').insertOne(newProject);
    db.collection('audit_logs').insertOne({ action: 'PROJECT_CREATED', title: saved.title, timestamp: new Date().toISOString() });
    return jsonOk(res, saved);
  }

  // PUT /api/projects/reorder — bulk reorder
  if (pathname === '/api/projects/reorder' && req.method === 'PUT') {
    if (!checkAuth(req)) return jsonErr(res, 401, 'Unauthorized');
    const body = await readBody(req);
    const { order } = JSON.parse(body.toString()); // array of { id, displayOrder }
    if (!Array.isArray(order)) return jsonErr(res, 400, 'Expected { order: [{id, displayOrder}] }');
    for (const item of order) {
      if (item.id) db.collection('projects').updateOne({ id: item.id }, { displayOrder: item.displayOrder });
    }
    db.collection('audit_logs').insertOne({ action: 'PROJECTS_REORDERED', timestamp: new Date().toISOString() });
    return jsonOk(res, { ok: true });
  }

  // PUT /api/projects/:id (Update)
  const projMatch = pathname.match(/^\/api\/projects\/(.+)$/);
  if (projMatch && req.method === 'PUT') {
    if (!checkAuth(req)) return jsonErr(res, 401, 'Unauthorized');
    const id = decodeURIComponent(projMatch[1]);
    const body = await readBody(req);
    const updated = JSON.parse(body.toString());
    if (!updated.title || !updated.title.trim()) {
      return jsonErr(res, 400, 'Project title is required');
    }
    const result = db.collection('projects').updateOne({ id }, updated);
    if (!result) return jsonErr(res, 404, 'Project not found');
    db.collection('audit_logs').insertOne({ action: 'PROJECT_UPDATED', id, title: updated.title, timestamp: new Date().toISOString() });
    return jsonOk(res, result);
  }

  // DELETE /api/projects/:id (Delete)
  if (projMatch && req.method === 'DELETE') {
    if (!checkAuth(req)) return jsonErr(res, 401, 'Unauthorized');
    const id = decodeURIComponent(projMatch[1]);
    const proj = db.collection('projects').findOne({ id });
    db.collection('projects').deleteOne({ id });
    db.collection('audit_logs').insertOne({ action: 'PROJECT_DELETED', id, title: proj ? proj.title : id, timestamp: new Date().toISOString() });
    return jsonOk(res, { ok: true });
  }

  // PUT /api/site (Update site config)
  if (pathname === '/api/site' && req.method === 'PUT') {
    if (!checkAuth(req)) return jsonErr(res, 401, 'Unauthorized');
    const body = await readBody(req);
    const updated = JSON.parse(body.toString());
    const existing = db.collection('site').findOne({ id: 'main' });
    if (existing) {
      db.collection('site').updateOne({ id: 'main' }, updated);
    } else {
      db.collection('site').insertOne({ id: 'main', ...updated });
    }
    return jsonOk(res, updated);
  }

  // PUT /api/sections/:id (Update section)
  const sectionMatch = pathname.match(/^\/api\/sections\/(.+)$/);
  if (sectionMatch && req.method === 'PUT') {
    if (!checkAuth(req)) return jsonErr(res, 401, 'Unauthorized');
    const id = decodeURIComponent(sectionMatch[1]);
    const body = await readBody(req);
    const updated = JSON.parse(body.toString());
    const existing = db.collection('sections').findOne({ id });
    if (existing) {
      db.collection('sections').updateOne({ id }, updated);
    } else {
      db.collection('sections').insertOne({ id, ...updated });
    }
    return jsonOk(res, updated);
  }

  // GET /api/images
  if (pathname === '/api/images' && req.method === 'GET') {
    const files = fs.readdirSync(IMG_DIR).filter(f =>
      /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f)
    );
    return jsonOk(res, files.map(f => ({ name: f, url: `assets/images/${f}` })));
  }

  // POST /api/images (Image upload)
  if (pathname === '/api/images' && req.method === 'POST') {
    if (!checkAuth(req)) return jsonErr(res, 401, 'Unauthorized');
    const contentType = req.headers['content-type'] || '';
    const boundaryMatch = contentType.match(/boundary=(.+)/);
    if (!boundaryMatch) return jsonErr(res, 400, 'Missing boundary in multipart request');
    const buffer = await readBody(req);
    const parts = parseMultipart(buffer, boundaryMatch[1]);
    const filePart = parts.find(p => p.filename);
    if (!filePart) return jsonErr(res, 400, 'No file found in request');

    const safeName = filePart.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const destPath = path.join(IMG_DIR, safeName);
    fs.writeFileSync(destPath, filePart.data);

    db.collection('audit_logs').insertOne({
      action: 'MEDIA_UPLOADED',
      filename: safeName,
      timestamp: new Date().toISOString()
    });

    return jsonOk(res, { name: safeName, url: `assets/images/${safeName}` });
  }

  // DELETE /api/images/:name
  const imgMatch = pathname.match(/^\/api\/images\/(.+)$/);
  if (imgMatch && req.method === 'DELETE') {
    if (!checkAuth(req)) return jsonErr(res, 401, 'Unauthorized');
    const filename = decodeURIComponent(imgMatch[1]);
    const filePath = path.join(IMG_DIR, filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    db.collection('audit_logs').insertOne({
      action: 'MEDIA_DELETED',
      filename,
      timestamp: new Date().toISOString()
    });

    return jsonOk(res, { ok: true });
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // STATIC FILE SERVING
  // ══════════════════════════════════════════════════════════════════════════════

  // 1. Redirect /admin to /admin/ so relative assets resolve correctly
  if (pathname === '/admin') {
    res.writeHead(302, { 'Location': '/admin/' });
    return res.end();
  }

  // 2. Safe alias for /admin.js and /admin.css if requested directly
  if (pathname === '/admin.js') {
    return serveFile(path.join(__dirname, 'admin', 'admin.js'));
  }
  if (pathname === '/admin.css') {
    return serveFile(path.join(__dirname, 'admin', 'admin.css'));
  }

  let reqPath = decodeURI(pathname);
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  if (reqPath.endsWith('/')) reqPath += 'index.html';

  let filePath = path.join(__dirname, reqPath);

  function serveFile(fp) {
    const ext = path.extname(fp).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(fp, (err, content) => {
      if (err) {
        if (err.code === 'EISDIR') {
          return serveFile(path.join(fp, 'index.html'));
        }
        if (err.code === 'ENOENT') {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('404 Not Found');
        } else {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('500 Server Error: ' + err.code);
        }
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      }
    });
  }

  serveFile(filePath);
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 CMS Server running at ${APP_URL}/`);
  console.log(`🛠️  Admin dashboard at ${APP_URL}/admin/`);
  console.log(`💾 Persistent DB Storage: data/db/`);
  console.log(`======================================================\n`);
});

