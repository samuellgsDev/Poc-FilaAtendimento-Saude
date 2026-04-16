'use strict';

/**
 * seed.js — Popula a fila com pacientes de exemplo
 * 
 * Simula um cenário realista de pico matutino (07h-09h) na UPA.
 * Demonstra a priorização por risco vs. por tempo de chegada.
 *
 * Uso: node scripts/seed.js
 */

const { getDb } = require('../backend/database/db');

const pacientes = [
  { nome: 'Maria da Conceição Silva',   nivel_risco: 'VERDE',    motivo: 'Dor de garganta, tosse seca',     minutos_atras: 45 },
  { nome: 'João Paulo Rodrigues',       nivel_risco: 'AMARELO',  motivo: 'Dor no peito moderada, sudorese', minutos_atras: 38 },
  { nome: 'Ana Beatriz Ferreira',       nivel_risco: 'VERDE',    motivo: 'Febre 38.5°C, mal-estar geral',   minutos_atras: 32 },
  { nome: 'Carlos Alberto Mendes',      nivel_risco: 'VERMELHO', motivo: 'Dificuldade grave de respiração',  minutos_atras: 28 },
  { nome: 'Luiza Helena Costa',         nivel_risco: 'AMARELO',  motivo: 'Dor abdominal intensa, náuseas',  minutos_atras: 21 },
  { nome: 'Francisco das Chagas Neto',  nivel_risco: 'VERDE',    motivo: 'Corte na mão, sangramento leve',  minutos_atras: 17 },
  { nome: 'Rita de Cássia Almeida',     nivel_risco: 'AMARELO',  motivo: 'Pressão arterial 160/100 mmHg',   minutos_atras: 12 },
  { nome: 'Pedro Henrique Oliveira',    nivel_risco: 'VERDE',    motivo: 'Dor de cabeça persistente',       minutos_atras: 8  },
  { nome: 'Francisca Lima Santos',      nivel_risco: 'VERMELHO', motivo: 'Convulsão há 5 minutos',          minutos_atras: 5  },
];

function seed() {
  const db = getDb();

  // Limpa dados anteriores
  db.exec('DELETE FROM pacientes; DELETE FROM eventos_fila;');
  console.log('🗑️  Dados anteriores removidos.\n');

  const stmt = db.prepare(`
    INSERT INTO pacientes (nome, cpf, nivel_risco, motivo, chegada_em, status)
    VALUES (@nome, NULL, @nivel_risco, @motivo, @chegada_em, 'AGUARDANDO')
  `);

  pacientes.forEach(p => {
    const chegada = new Date(Date.now() - p.minutos_atras * 60 * 1000);
    stmt.run({
      nome: p.nome,
      nivel_risco: p.nivel_risco,
      motivo: p.motivo,
      chegada_em: chegada.toISOString(),
    });

    const emoji = p.nivel_risco === 'VERMELHO' ? '🔴' : p.nivel_risco === 'AMARELO' ? '🟡' : '🟢';
    console.log(`  ${emoji} [${p.nivel_risco.padEnd(8)}] ${p.nome} — chegou há ${p.minutos_atras}min`);
  });

  console.log(`\n✅ ${pacientes.length} pacientes inseridos na fila.`);
  console.log('');
  console.log('Fila ordenada por RISCO CLÍNICO:');
  console.log('  1º 🔴 Carlos Alberto Mendes (VERMELHO · 28min)');
  console.log('  2º 🔴 Francisca Lima Santos (VERMELHO · 5min)');
  console.log('  3º 🟡 João Paulo Rodrigues  (AMARELO  · 38min)');
  console.log('  ... e assim por diante.');
  console.log('');
  console.log('Fila ordenada por TEMPO (FIFO):');
  console.log('  1º 🟢 Maria da Conceição Silva (VERDE · 45min)');
  console.log('  2º 🟡 João Paulo Rodrigues      (AMARELO · 38min)');
  console.log('  ... e assim por diante.');
  console.log('');
  console.log('👉 Abra http://localhost:3000 e compare os dois modos!');

  process.exit(0);
}

seed();
