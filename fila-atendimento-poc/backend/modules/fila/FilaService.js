'use strict';

const { getDb } = require('../../database/db');
const EventBus = require('./observers/EventBus');
const PacienteChamadoEvent = require('./observers/PacienteChamadoEvent');
const PriorizacaoPorRisco = require('./strategies/PriorizacaoPorRisco');
const PriorizacaoPorTempo = require('./strategies/PriorizacaoPorTempo');

// Mapa de estratégias disponíveis para troca em runtime
const ESTRATEGIAS_DISPONIVEIS = {
  risco: new PriorizacaoPorRisco(),
  tempo: new PriorizacaoPorTempo(),
};

/**
 * FilaService — Implementação do módulo de Fila de Atendimento
 *
 * Orquestra o uso do Strategy Pattern para priorização
 * e emite eventos via EventBus (Observer Pattern).
 *
 * Implementa a interface pública FilaAPI.
 *
 * Pattern: Strategy + Observer (GoF)
 * Princípio SOLID: Single Responsibility, Dependency Injection
 */
class FilaService {
  constructor() {
    // Strategy injetada — pode ser trocada em runtime via alterarEstrategia()
    this._estrategia = ESTRATEGIAS_DISPONIVEIS.risco; // padrão: prioridade clínica
    console.log(`[FilaService] Iniciado com estratégia: ${this._estrategia.getNome()}`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // FilaAPI — Interface Pública
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Adiciona um paciente à fila de espera
   * @param {{ nome: string, cpf?: string, nivel_risco: string, motivo?: string }} request
   * @returns {Object} Paciente inserido
   */
  adicionarPaciente(request) {
    const { nome, cpf, nivel_risco, motivo } = request;

    const niveisValidos = ['VERMELHO', 'AMARELO', 'VERDE'];
    if (!niveisValidos.includes(nivel_risco)) {
      throw new Error(`Nível de risco inválido: ${nivel_risco}. Use: VERMELHO, AMARELO ou VERDE`);
    }

    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO pacientes (nome, cpf, nivel_risco, motivo, chegada_em, status)
      VALUES (@nome, @cpf, @nivel_risco, @motivo, @chegada_em, 'AGUARDANDO')
    `);

    const result = stmt.run({
      nome,
      cpf: cpf || null,
      nivel_risco,
      motivo: motivo || null,
      chegada_em: new Date().toISOString(),
    });

    const paciente = this._buscarPorId(result.lastInsertRowid);

    // Registrar evento no histórico
    this._registrarEvento('PACIENTE_ADICIONADO', paciente.id, paciente);

    // Emitir evento para observers (SSE broadcast)
    EventBus.emitir({
      tipo: 'PACIENTE_ADICIONADO',
      paciente,
      timestamp: new Date().toISOString(),
    });

    return paciente;
  }

  /**
   * Chama o próximo paciente conforme a estratégia ativa
   * @returns {Object|null} Paciente chamado ou null se fila vazia
   */
  chamarProximo() {
    const fila = this._listarAguardando();

    if (fila.length === 0) {
      return null;
    }

    // Aplicar a estratégia de priorização (Strategy Pattern em ação)
    const filaPriorizada = this._estrategia.priorizar(fila);
    const proximo = filaPriorizada[0];

    // Atualizar status no banco
    const db = getDb();
    db.prepare(`
      UPDATE pacientes SET status = 'CHAMADO', chamado_em = @chamado_em WHERE id = @id
    `).run({ id: proximo.id, chamado_em: new Date().toISOString() });

    const pacienteAtualizado = this._buscarPorId(proximo.id);

    // Registrar evento
    this._registrarEvento('PACIENTE_CHAMADO', pacienteAtualizado.id, pacienteAtualizado);

    // Emitir evento para observers — Observer Pattern em ação
    const evento = new PacienteChamadoEvent(pacienteAtualizado, this._estrategia.getNome());
    EventBus.emitir(evento);

    return pacienteAtualizado;
  }

  /**
   * Lista a fila ordenada pela estratégia ativa
   * @returns {Array} Lista de pacientes aguardando, priorizada
   */
  listarFila() {
    const fila = this._listarAguardando();
    return this._estrategia.priorizar(fila);
  }

  /**
   * Troca a estratégia de priorização em runtime
   * Princípio Open/Closed: sem modificar FilaService
   * @param {string} nomeEstrategia - 'risco' ou 'tempo'
   */
  alterarEstrategia(nomeEstrategia) {
    const estrategia = ESTRATEGIAS_DISPONIVEIS[nomeEstrategia];
    if (!estrategia) {
      throw new Error(`Estratégia desconhecida: ${nomeEstrategia}. Disponíveis: ${Object.keys(ESTRATEGIAS_DISPONIVEIS).join(', ')}`);
    }

    const anterior = this._estrategia.getNome();
    this._estrategia = estrategia;
    console.log(`[FilaService] Estratégia alterada: "${anterior}" → "${this._estrategia.getNome()}"`);

    return {
      anterior,
      atual: this._estrategia.getNome(),
      chave: nomeEstrategia,
    };
  }

  /**
   * Retorna informações sobre o estado atual do serviço
   */
  getStatus() {
    const db = getDb();
    const totais = db.prepare(`
      SELECT status, COUNT(*) as total FROM pacientes GROUP BY status
    `).all();

    return {
      estrategiaAtiva: {
        chave: Object.keys(ESTRATEGIAS_DISPONIVEIS).find(k => ESTRATEGIAS_DISPONIVEIS[k] === this._estrategia),
        nome: this._estrategia.getNome(),
      },
      totalPorStatus: totais,
      estrategiasDisponiveis: Object.entries(ESTRATEGIAS_DISPONIVEIS).map(([chave, s]) => ({
        chave,
        nome: s.getNome(),
      })),
    };
  }

  /**
   * Retorna histórico de pacientes já atendidos
   */
  listarHistorico() {
    const db = getDb();
    return db.prepare(`
      SELECT * FROM pacientes WHERE status = 'CHAMADO' ORDER BY chamado_em DESC LIMIT 20
    `).all();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Métodos privados
  // ─────────────────────────────────────────────────────────────────────────────

  _listarAguardando() {
    const db = getDb();
    return db.prepare(`SELECT * FROM pacientes WHERE status = 'AGUARDANDO'`).all();
  }

  _buscarPorId(id) {
    const db = getDb();
    return db.prepare(`SELECT * FROM pacientes WHERE id = ?`).get(id);
  }

  _registrarEvento(tipo, pacienteId, payload) {
    const db = getDb();
    db.prepare(`
      INSERT INTO eventos_fila (tipo, paciente_id, payload, criado_em)
      VALUES (@tipo, @paciente_id, @payload, @criado_em)
    `).run({
      tipo,
      paciente_id: pacienteId,
      payload: JSON.stringify(payload),
      criado_em: new Date().toISOString(),
    });
  }
}

// Singleton do serviço — estado compartilhado incluindo estratégia ativa
module.exports = new FilaService();
