'use strict';

/**
 * PacienteChamadoEvent — Evento de domínio tipado
 *
 * Encapsula o payload do evento quando um paciente é chamado.
 * O Observer Pattern reage a objetos desse tipo.
 *
 * Pattern: Observer (GoF) — papel de "ConcreteEvent"
 */
class PacienteChamadoEvent {
  /**
   * @param {Object} paciente - Dados do paciente chamado
   * @param {string} estrategiaUsada - Nome da estratégia que gerou a prioridade
   */
  constructor(paciente, estrategiaUsada) {
    this.tipo = 'PACIENTE_CHAMADO';
    this.paciente = paciente;
    this.estrategiaUsada = estrategiaUsada;
    this.timestamp = new Date().toISOString();
  }
}

module.exports = PacienteChamadoEvent;
