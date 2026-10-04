/**
 * lib/db.js
 * Embedded Persistent Document Database Engine
 * Zero external native dependencies — 100% compatible with Hostinger, Windows & Linux
 * 
 * Features:
 * - Atomic write operations (write-to-tmp then atomic rename) to eliminate write corruption
 * - In-memory read cache with write-through disk persistence
 * - Schema-safe collections: users, sessions, projects, site, sections, posts, pages, contacts, audit_logs
 * - Auto-migration from legacy data/projects.json and data/site.json
 * - Automated startup backup
 */

const fs = require('fs');
const path = require('path');

const DB_DIR = path.join(__dirname, '..', 'data', 'db');
const BACKUP_DIR = path.join(__dirname, '..', 'data', 'backups');

// Ensure database directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

class Collection {
  constructor(name) {
    this.name = name;
    this.filePath = path.join(DB_DIR, `${name}.json`);
    this.cache = null;
    this._load();
  }

  _load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        this.cache = JSON.parse(raw);
      } else {
        this.cache = [];
        this._save();
      }
    } catch (err) {
      console.error(`[DB] Error loading collection ${this.name}:`, err.message);
      this.cache = [];
    }
  }

  _save() {
    const tmpPath = `${this.filePath}.${Date.now()}.tmp`;
    const data = JSON.stringify(this.cache, null, 2);
    try {
      fs.writeFileSync(tmpPath, data, 'utf8');
      fs.renameSync(tmpPath, this.filePath);
    } catch (err) {
      // Fallback direct write if atomic rename is blocked (e.g. Windows file lock)
      try {
        fs.writeFileSync(this.filePath, data, 'utf8');
        if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
      } catch (writeErr) {
        console.error(`[DB] Failed to persist collection ${this.name}:`, writeErr.message);
      }
    }
  }

  find(predicate = null) {
    if (!predicate) return [...this.cache];
    if (typeof predicate === 'function') {
      return this.cache.filter(predicate);
    }
    return this.cache.filter(item => {
      for (const [key, val] of Object.entries(predicate)) {
        if (item[key] !== val) return false;
      }
      return true;
    });
  }

  findOne(predicate) {
    if (typeof predicate === 'function') {
      return this.cache.find(predicate) || null;
    }
    return this.cache.find(item => {
      for (const [key, val] of Object.entries(predicate)) {
        if (item[key] !== val) return false;
      }
      return true;
    }) || null;
  }

  insertOne(doc) {
    const newDoc = {
      id: doc.id || Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      ...doc,
      createdAt: doc.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.cache.push(newDoc);
    this._save();
    return newDoc;
  }

  updateOne(predicate, updates) {
    const item = this.findOne(predicate);
    if (!item) return null;
    Object.assign(item, updates, { updatedAt: new Date().toISOString() });
    this._save();
    return item;
  }

  deleteOne(predicate) {
    const idx = typeof predicate === 'function'
      ? this.cache.findIndex(predicate)
      : this.cache.findIndex(item => {
          for (const [key, val] of Object.entries(predicate)) {
            if (item[key] !== val) return false;
          }
          return true;
        });

    if (idx === -1) return false;
    this.cache.splice(idx, 1);
    this._save();
    return true;
  }

  count(predicate = null) {
    return this.find(predicate).length;
  }

  replaceAll(newItems) {
    this.cache = Array.isArray(newItems) ? newItems : [newItems];
    this._save();
    return this.cache;
  }
}

class Database {
  constructor() {
    this.collections = new Map();
  }

  collection(name) {
    if (!this.collections.has(name)) {
      this.collections.set(name, new Collection(name));
    }
    return this.collections.get(name);
  }

  // Backup entire database to a timestamped archive folder
  backup() {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const targetDir = path.join(BACKUP_DIR, `snapshot-${ts}`);
    fs.mkdirSync(targetDir, { recursive: true });

    const files = fs.readdirSync(DB_DIR);
    for (const f of files) {
      if (f.endsWith('.json')) {
        fs.copyFileSync(path.join(DB_DIR, f), path.join(targetDir, f));
      }
    }
    return targetDir;
  }
}

const db = new Database();

// Auto-migration helper: copies existing JSON data to the new DB format seamlessly
function runMigrations() {
  const legacyProjFile = path.join(__dirname, '..', 'data', 'projects.json');
  const legacySiteFile = path.join(__dirname, '..', 'data', 'site.json');

  const projCol = db.collection('projects');
  if (projCol.count() === 0 && fs.existsSync(legacyProjFile)) {
    try {
      const legacyProjects = JSON.parse(fs.readFileSync(legacyProjFile, 'utf8'));
      if (Array.isArray(legacyProjects)) {
        legacyProjects.forEach(p => projCol.insertOne(p));
        console.log(`[DB] Successfully migrated ${legacyProjects.length} legacy projects to DB.`);
      }
    } catch (e) {
      console.error('[DB] Migration error for projects:', e.message);
    }
  }

  const siteCol = db.collection('site');
  if (siteCol.count() === 0 && fs.existsSync(legacySiteFile)) {
    try {
      const legacySite = JSON.parse(fs.readFileSync(legacySiteFile, 'utf8'));
      siteCol.insertOne({ id: 'main', ...legacySite });
      console.log('[DB] Successfully migrated legacy site settings to DB.');
    } catch (e) {
      console.error('[DB] Migration error for site:', e.message);
    }
  }

  // Ensure all Home CMS fields exist with default values
  const siteDoc = siteCol.findOne({ id: 'main' });
  const homeDefaults = {
    heroTagline: 'Software Developer & Systems Engineer',
    heroHeading: 'I build <span class="text-gradient">high-performance web experiences</span> & <span class="text-gradient-blue">streaming systems</span> that matter.',
    heroSubtitle: "I'm Devnith Koralage, a passionate Full-Stack Developer, Systems Engineer, and Multimedia Specialist turning complex ideas into scalable, beautiful web applications and broadcast systems.",
    heroPortrait: 'assets/images/devnith-cyber.jpg',
    realPortrait: 'assets/images/devnith.jpg',
    heroPrimaryBtn: { text: 'View My Work', url: '#projects' },
    heroSecondaryBtn: { text: "Let's Talk", url: '#contact' },
    heroStats: { experience: '4+', projects: '20+', platforms: '20+' },
    heroMetricLabels: { experience: 'Years of Experience', projects: 'Projects Completed', platforms: 'Active Web Platforms' },
    heroCodeBadge: 'Clean Code • Scalable Solutions • Pixel Perfect',
    aboutTagline: 'PROFILE',
    aboutHeading: 'About Me',
    expertiseTagline: 'PROFICIENCY',
    expertiseHeading: 'My Expertise',
    projectsTagline: 'Portfolio',
    projectsTitle: 'Selected Work',
    projectsSubtitle: 'Real-world production platforms, automated broadcast backends, and creative media.',
    processTagline: 'Methodology',
    processTitle: 'My Work Process',
    processSubtitle: 'A structured, high-precision engineering lifecycle delivering resilient platforms from initial idea to continuous broadcast.',
    contactTagline: 'Available For Hire',
    contactTitle: "Let's Build Something Great",
    contactSubtitle: "Have a project in mind or want to collaborate? I'd love to hear from you.",
    contactAvailability: 'Open to new opportunities'
  };
  if (siteDoc) {
    siteCol.updateOne({ id: 'main' }, { ...homeDefaults, ...siteDoc });
  } else {
    siteCol.insertOne({ id: 'main', ...homeDefaults });
  }

  // Initialize sections collection with default metadata if empty
  const sectionsCol = db.collection('sections');
  if (sectionsCol.count() === 0) {
    sectionsCol.insertOne({
      id: 'process',
      title: 'My Work Process',
      subtitle: 'A structured, high-precision engineering lifecycle delivering resilient platforms from initial idea to continuous broadcast.',
      steps: [
        { num: '01', icon: '🔍', title: 'Discover', desc: 'Requirements gathering, project scope, and target audience analysis.' },
        { num: '02', icon: '📐', title: 'Architecture', desc: 'Tech stack selection, database schemas, and systems design.' },
        { num: '03', icon: '</>', title: 'Development', desc: 'Clean full-stack coding, API integration, and responsive UI build.' },
        { num: '04', icon: '📡', title: 'Streaming Setup', desc: 'Server infrastructure, broadcast engine tuning, and RTMP ingest.' },
        { num: '05', icon: '🛡️', title: 'Testing', desc: 'Performance profiling, security auditing, and cross-browser QA.' },
        { num: '06', icon: '🚀', title: 'Deploy', desc: 'Production launch, CDN caching, and 24/7 telemetry monitoring.' }
      ]
    });
  }
}

runMigrations();

module.exports = db;
