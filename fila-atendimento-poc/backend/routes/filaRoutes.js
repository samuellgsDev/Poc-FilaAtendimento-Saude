'use strict';

const express = require('express');
const router = express.Router();
const FilaService = require('../modules/fila/FilaService');
const NotificacaoObserver = require('../modules/fila/observers/NotificacaoObserver');

// ─────────────────────────────────────────────────────────────────────────────
// SSE — Server-Sent Events (stream de eventos em tempo real)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/events
 * Abre um stream SSE — o cliente fica conectado e recebe eventos push
 * sem precisar fazer polling.
 */
router.get('/events', (req, res) => {
  // Headers obrigatórios para SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Desativa buffer no Nginx
  res.flushHeaders();

  // Registra este cliente no observer
  const removerCliente = NotificacaoObserver.adicionarCliente(res);

  // Heartbeat a cada 30s para manter a conexão viva
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 30000);

  // Limpa ao desconectar
  req.on('close', () => {
    clearInterval(heartbeat);
    removerCliente();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// REST Endpoints — FilaAPI pública
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/fila
 * Lista fila de espera priorizada pela estratégia ativa
 */
router.get('/fila', (req, res) => {
  try {
    const fila = FilaService.listarFila();
    res.json({ ok: true, data: fila, total: fila.length });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

/**
 * POST /api/fila/pacientes
 * Adiciona paciente à fila
 * Body: { nome, cpf?, nivel_risco, motivo? }
 */
router.post('/fila/pacientes', (req, res) => {
  try {
    const { nome, cpf, nivel_risco, motivo } = req.body;

    if (!nome || !nivel_risco) {
      return res.status(400).json({
        ok: false,
        erro: 'Campos obrigatórios: nome, nivel_risco',
      });
    }

    const paciente = FilaService.adicionarPaciente({ nome, cpf, nivel_risco, motivo });
    res.status(201).json({ ok: true, data: paciente });
  } catch (err) {
    res.status(400).json({ ok: false, erro: err.message });
  }
});

/**
 * POST /api/fila/chamar
 * Chama o próximo paciente conforme estratégia ativa
 */
router.post('/fila/chamar', (req, res) => {
  try {
    const paciente = FilaService.chamarProximo();

    if (!paciente) {
      return res.status(200).json({ ok: true, data: null, mensagem: 'Fila vazia' });
    }

    res.json({ ok: true, data: paciente });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

/**
 * PUT /api/fila/estrategia
 * Altera a estratégia de priorização em runtime
 * Body: { estrategia: 'risco' | 'tempo' }
 */
router.put('/fila/estrategia', (req, res) => {
  try {
    const { estrategia } = req.body;

    if (!estrategia) {
      return res.status(400).json({ ok: false, erro: 'Campo obrigatório: estrategia' });
    }

    const resultado = FilaService.alterarEstrategia(estrategia);
    res.json({ ok: true, data: resultado });
  } catch (err) {
    res.status(400).json({ ok: false, erro: err.message });
  }
});

/**
 * GET /api/fila/status
 * Status do módulo: estratégia ativa, totais por status
 */
router.get('/fila/status', (req, res) => {
  try {
    const status = FilaService.getStatus();
    status.sseClientes = NotificacaoObserver.getTotalClientes();
    res.json({ ok: true, data: status });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

/**
 * GET /api/fila/historico
 * Lista os últimos 20 pacientes atendidos
 */
router.get('/fila/historico', (req, res) => {
  try {
    const historico = FilaService.listarHistorico();
    res.json({ ok: true, data: historico });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

module.exports = router;
