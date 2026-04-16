'use strict';

/**
 * reset.js — Remove o banco de dados para começar do zero
 * Uso: node scripts/reset.js
 */

const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'fila.db');

if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log('✅ Banco de dados removido. Execute `npm run seed` para repopular.');
} else {
  console.log('ℹ️  Nenhum banco de dados encontrado.');
}

process.exit(0);
