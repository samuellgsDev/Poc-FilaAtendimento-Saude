'use strict';

const PriorizacaoStrategy = require('./PriorizacaoStrategy');

/**
 * PriorizacaoPorTempo — Strategy FIFO (First In, First Out)
 *
 * Ordena a fila puramente pelo horário de chegada.
 * O primeiro a entrar é o primeiro a ser atendido.
 * Estratégia mais simples, sem levar risco clínico em conta.
 *
 * Pattern: Strategy (GoF) — ConcreteStrategy #2
 */
class PriorizacaoPorTempo extends PriorizacaoStrategy {
  priorizar(fila) {
    return [...fila].sort((a, b) => {
      return new Date(a.chegada_em) - new Date(b.chegada_em);
    });
  }

  getNome() {
    return 'Priorização por Tempo de Espera (FIFO)';
  }
}

module.exports = PriorizacaoPorTempo;
