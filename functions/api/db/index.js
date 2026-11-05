'use strict';

const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

// Support configurable storage path (defaults to a persistent SQLite DB file)
const DB_DIR = process.env.DB_DIR || path.join(__dirname, '..', 'data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_FILE = process.env.DB_FILE || path.join(DB_DIR, 'universal_billing.sqlite');
console.log(`[Database] Initializing SQLite database at: ${DB_FILE}`);

const db = new DatabaseSync(DB_FILE);

// Enable WAL mode and foreign key constraints for ACID transactions and speed
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA synchronous = NORMAL;');

/**
 * Execute a callback inside an atomic transaction.
 * If callback throws, the transaction is automatically rolled back.
 * Returns the result of the callback.
 */
function withTransaction(callback) {
  db.exec('BEGIN IMMEDIATE;');
  try {
    const result = callback(db);
    db.exec('COMMIT;');
    return result;
  } catch (error) {
    db.exec('ROLLBACK;');
    throw error;
  }
}

/**
 * Helper to query one row
 */
function get(sql, params = []) {
  const stmt = db.prepare(sql);
  return stmt.get(...params);
}

/**
 * Helper to query all rows
 */
function all(sql, params = []) {
  const stmt = db.prepare(sql);
  return stmt.all(...params);
}

/**
 * Helper to execute an insert/update/delete statement and get lastInsertRowid & changes
 */
function run(sql, params = []) {
  const stmt = db.prepare(sql);
  return stmt.run(...params);
}

module.exports = {
  db,
  withTransaction,
  get,
  all,
  run
};
