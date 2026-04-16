'use strict';

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', '..', 'fila.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    inicializarTabelas(db);
  }
  return db;
}

function inicializarTabelas(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS pacientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      cpf TEXT,
      nivel_risco TEXT NOT NULL DEFAULT 'VERDE',
      motivo TEXT,
      chegada_em TEXT NOT NULL,
      chamado_em TEXT,
      status TEXT NOT NULL DEFAULT 'AGUARDANDO'
    );

    CREATE TABLE IF NOT EXISTS eventos_fila (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo TEXT NOT NULL,
      paciente_id INTEGER,
      payload TEXT,
      criado_em TEXT NOT NULL
    );
  `);
}

module.exports = { getDb };
