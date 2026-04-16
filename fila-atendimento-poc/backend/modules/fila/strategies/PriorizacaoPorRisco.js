'use strict';

const PriorizacaoStrategy = require('./PriorizacaoStrategy');

// Mapeamento de prioridade numérica por nível de risco clínico
// Baseado no Protocolo de Manchester (triagem hospitalar)
const PESO_RISCO = {
  VERMELHO: 3,  // Emergência — risco de vida
  AMARELO: 2,   // Urgência — instabilidade
  VERDE: 1,     // Pouco urgente — estável
};

/**
 * PriorizacaoPorRisco — Strategy de Risco Clínico
 *
 * Ordena a fila pelo nível de risco clínico do paciente.
 * Pacientes com maior risco são atendidos primeiro,
 * independentemente do horário de chegada.
 *
 * Baseado no Protocolo de Manchester de triagem hospitalar.
 *
 * Pattern: Strategy (GoF) — ConcreteStrategy #1
 */
class PriorizacaoPorRisco extends PriorizacaoStrategy {
  priorizar(fila) {
    return [...fila].sort((a, b) => {
      const pesoA = PESO_RISCO[a.nivel_risco] ?? 0;
      const pesoB = PESO_RISCO[b.nivel_risco] ?? 0;

      // Critério principal: risco (maior primeiro)
      if (pesoB !== pesoA) return pesoB - pesoA;

      // Critério de desempate: quem chegou primeiro (FIFO dentro do mesmo risco)
      return new Date(a.chegada_em) - new Date(b.chegada_em);
    });
  }

  getNome() {
    return 'Priorização por Risco Clínico (Manchester)';
  }
}

module.exports = PriorizacaoPorRisco;
