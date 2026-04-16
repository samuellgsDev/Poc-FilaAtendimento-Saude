'use strict';

const express = require('express');
const cors = require('cors');
const path = require('path');

const filaRoutes = require('./routes/filaRoutes');
const NotificacaoObserver = require('./modules/fila/observers/NotificacaoObserver');

const app = express();
const PORT = process.env.PORT || 3000;

// ─────────────────────────────────────────────────────────────────────────────
// Middlewares
// ─────────────────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Servir o frontend estático
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ─────────────────────────────────────────────────────────────────────────────
// Inicializar Observer antes das rotas
// ─────────────────────────────────────────────────────────────────────────────
NotificacaoObserver.inicializar();

// ─────────────────────────────────────────────────────────────────────────────
// Rotas da API
// ─────────────────────────────────────────────────────────────────────────────
app.use('/api', filaRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    modulo: 'Fila de Atendimento',
    versao: '1.0.0-poc',
    timestamp: new Date().toISOString(),
  });
});

// SPA fallback — qualquer rota não-API serve o index.html
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// ─────────────────────────────────────────────────────────────────────────────
// Start
// ─────────────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║     POC — Módulo de Fila de Atendimento (UPA Digital)    ║');
  console.log('║     Desafio 4.0 | Arquitetura de Software | UNDB 2026.1  ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║  → Servidor:   http://localhost:${PORT}                    ║`);
  console.log(`║  → API:        http://localhost:${PORT}/api/fila           ║`);
  console.log(`║  → Health:     http://localhost:${PORT}/health             ║`);
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log('║  Patterns ativos:                                        ║');
  console.log('║  ✓ Strategy  — Priorização por Risco (padrão)           ║');
  console.log('║  ✓ Observer  — Notificação SSE em tempo real             ║');
  console.log('║  ✓ FilaAPI   — Contrato público do módulo                ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
});
