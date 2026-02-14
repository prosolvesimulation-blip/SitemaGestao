const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'gestao_offcon.db');

const db = new Database(DB_PATH);

// Enable foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

console.log('✅ Banco de dados SQLite conectado:', DB_PATH);

module.exports = db;