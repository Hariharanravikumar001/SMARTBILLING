'use strict';

const path = require('node:path');
const fs = require('node:fs');

// Serverless writable directory detection
const isServerless = process.env.CATALYST_ENV || process.env.LAMBDA_TASK_ROOT || process.platform !== 'win32';
const DB_DIR = process.env.DB_DIR || (isServerless ? '/tmp' : path.join(__dirname, '..', 'data'));

try {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('[Database] Could not create DB_DIR:', e.message);
}

const DB_FILE = process.env.DB_FILE || path.join(DB_DIR, 'universal_billing.sqlite');
console.log(`[Database] Target SQLite path: ${DB_FILE}`);

let activeEngine = null; // 'node:sqlite' or 'sql.js'
let rawDb = null;
let sqlEngine = null;

// Try native node:sqlite (Node 22.5+)
try {
  const { DatabaseSync } = require('node:sqlite');
  rawDb = new DatabaseSync(DB_FILE);
  rawDb.exec('PRAGMA journal_mode = WAL;');
  rawDb.exec('PRAGMA foreign_keys = ON;');
  rawDb.exec('PRAGMA synchronous = NORMAL;');
  activeEngine = 'node:sqlite';
  console.log('[Database] Loaded native node:sqlite engine.');
} catch (err) {
  console.log('[Database] Native node:sqlite not available, falling back to universal WebAssembly sql.js...');
}

// Proxy/wrapper object that conforms to the database interface
const db = {
  exec: (sql) => {
    ensureDb();
    if (activeEngine === 'node:sqlite') {
      return rawDb.exec(sql);
    }
    rawDb.exec(sql);
    persistSqlJs();
  },
  prepare: (sql) => {
    ensureDb();
    if (activeEngine === 'node:sqlite') {
      return rawDb.prepare(sql);
    }
    return {
      run: (...params) => {
        rawDb.run(sql, params);
        persistSqlJs();
        return { changes: rawDb.getRowsModified() };
      },
      get: (...params) => {
        const stmt = rawDb.prepare(sql);
        stmt.bind(params);
        if (stmt.step()) {
          const row = stmt.getAsObject();
          stmt.free();
          return row;
        }
        stmt.free();
        return undefined;
      },
      all: (...params) => {
        const stmt = rawDb.prepare(sql);
        stmt.bind(params);
        const rows = [];
        while (stmt.step()) {
          rows.push(stmt.getAsObject());
        }
        stmt.free();
        return rows;
      }
    };
  }
};

function persistSqlJs() {
  if (activeEngine === 'sql.js' && rawDb) {
    try {
      const data = rawDb.export();
      fs.writeFileSync(DB_FILE, Buffer.from(data));
    } catch (e) {
      // Ignore write errors in ephemeral environments
    }
  }
}

async function initUniversalDb() {
  if (rawDb) return;
  const initSqlJs = require('sql.js');
  sqlEngine = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    try {
      const buffer = fs.readFileSync(DB_FILE);
      rawDb = new sqlEngine.Database(buffer);
    } catch (e) {
      rawDb = new sqlEngine.Database();
    }
  } else {
    rawDb = new sqlEngine.Database();
  }

  activeEngine = 'sql.js';
  console.log('[Database] Universal WebAssembly sql.js engine initialized successfully.');

  const { initSchema } = require('./schema');
  const { seedDatabase } = require('./seed');
  initSchema();
  seedDatabase();
}

function ensureDb() {
  if (!rawDb) {
    throw new Error('Database is initializing. Please retry shortly.');
  }
}

function withTransaction(callback) {
  ensureDb();
  if (activeEngine === 'node:sqlite') {
    rawDb.exec('BEGIN IMMEDIATE;');
    try {
      const result = callback(db);
      rawDb.exec('COMMIT;');
      return result;
    } catch (error) {
      rawDb.exec('ROLLBACK;');
      throw error;
    }
  } else {
    rawDb.exec('BEGIN IMMEDIATE;');
    try {
      const result = callback(db);
      rawDb.exec('COMMIT;');
      persistSqlJs();
      return result;
    } catch (error) {
      rawDb.exec('ROLLBACK;');
      throw error;
    }
  }
}

function get(sql, params = []) {
  const stmt = db.prepare(sql);
  return stmt.get(...params);
}

function all(sql, params = []) {
  const stmt = db.prepare(sql);
  return stmt.all(...params);
}

function run(sql, params = []) {
  const stmt = db.prepare(sql);
  return stmt.run(...params);
}

module.exports = {
  db,
  initUniversalDb,
  withTransaction,
  get,
  all,
  run
};
