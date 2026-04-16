'use strict';

/**
 * EventBus — Despachante de eventos (Pub/Sub)
 *
 * Implementa o mecanismo central do Observer Pattern.
 * Os publishers emitem eventos sem conhecer os subscribers.
 * Os subscribers registram interesse em tipos de eventos.
 *
 * Pattern: Observer (GoF) — papel de "Subject/EventBus"
 * Princípio SOLID: Dependency Inversion — módulos dependem da abstração (EventBus), não uns dos outros
 */
class EventBus {
  constructor() {
    // Map<tipoEvento, Set<observer>>
    this._observers = new Map();
    // Histórico dos últimos eventos para debug/log
    this._historico = [];
  }

  /**
   * Registra um observer para um tipo de evento específico
   * @param {string} tipoEvento
   * @param {Function} observer - Callback que recebe o evento
   */
  registrar(tipoEvento, observer) {
    if (!this._observers.has(tipoEvento)) {
      this._observers.set(tipoEvento, new Set());
    }
    this._observers.get(tipoEvento).add(observer);
    console.log(`[EventBus] Observer registrado para: ${tipoEvento}`);
  }

  /**
   * Remove um observer registrado
   * @param {string} tipoEvento
   * @param {Function} observer
   */
  remover(tipoEvento, observer) {
    this._observers.get(tipoEvento)?.delete(observer);
  }

  /**
   * Emite um evento para todos os observers registrados
   * @param {Object} evento - Objeto de evento tipado (ex: PacienteChamadoEvent)
   */
  emitir(evento) {
    console.log(`[EventBus] Emitindo evento: ${evento.tipo}`, evento);

    this._historico.push({ ...evento, registrado_em: new Date().toISOString() });
    if (this._historico.length > 100) this._historico.shift(); // mantém últimos 100

    const observers = this._observers.get(evento.tipo);
    if (!observers || observers.size === 0) {
      console.warn(`[EventBus] Nenhum observer registrado para: ${evento.tipo}`);
      return;
    }

    observers.forEach(observer => {
      try {
        observer(evento);
      } catch (err) {
        console.error(`[EventBus] Erro em observer de ${evento.tipo}:`, err.message);
      }
    });
  }

  getHistorico() {
    return this._historico;
  }
}

// Singleton — única instância compartilhada pelo processo
module.exports = new EventBus();
