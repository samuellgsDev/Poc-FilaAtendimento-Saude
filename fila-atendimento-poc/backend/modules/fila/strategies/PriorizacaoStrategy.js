'use strict';

/**
 * PriorizacaoStrategy — Contrato (Interface) do Strategy Pattern
 *
 * Define o contrato que todas as estratégias de priorização
 * devem implementar. Nenhuma lógica de negócio aqui.
 *
 * Pattern: Strategy (GoF)
 * Princípio SOLID: Open/Closed — aberto para extensão, fechado para modificação
 */
class PriorizacaoStrategy {
  /**
   * @param {Array} fila - Lista de pacientes aguardando
   * @returns {Array} - Lista reordenada conforme a estratégia
   */
  priorizar(fila) {
    throw new Error(`[PriorizacaoStrategy] O método priorizar() deve ser implementado pela subclasse.`);
  }

  /**
   * @returns {string} - Nome legível da estratégia ativa
   */
  getNome() {
    throw new Error(`[PriorizacaoStrategy] O método getNome() deve ser implementado pela subclasse.`);
  }
}

module.exports = PriorizacaoStrategy;
