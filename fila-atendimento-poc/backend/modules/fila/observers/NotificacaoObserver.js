'use strict';

const EventBus = require('./EventBus');

// Conjunto de clientes SSE ativos (cada aba/janela aberta)
const clientes = new Set();

/**
 * NotificacaoObserver — Listener de eventos para broadcast SSE
 *
 * Observa o EventBus e faz push dos eventos para todos os
 * clientes conectados via Server-Sent Events (SSE).
 *
 * Pattern: Observer (GoF) — papel de "ConcreteObserver"
 */
const NotificacaoObserver = {
  /**
   * Inicializa o observer, registrando-se no EventBus
   * Deve ser chamado uma vez na inicialização do servidor
   */
  inicializar() {
    EventBus.registrar('PACIENTE_CHAMADO', (evento) => {
      this._broadcast({
        tipo: evento.tipo,
        paciente: evento.paciente,
        estrategiaUsada: evento.estrategiaUsada,
        timestamp: evento.timestamp,
      });
    });

    EventBus.registrar('PACIENTE_ADICIONADO', (evento) => {
      this._broadcast({
        tipo: evento.tipo,
        paciente: evento.paciente,
        timestamp: evento.timestamp,
      });
    });

    console.log('[NotificacaoObserver] Registrado no EventBus. Aguardando eventos...');
  },

  /**
   * Registra um novo cliente SSE
   * @param {Object} res - Response object do Express
   * @returns {Function} - Função de cleanup para remover o cliente ao desconectar
   */
  adicionarCliente(res) {
    clientes.add(res);
    console.log(`[NotificacaoObserver] Cliente SSE conectado. Total: ${clientes.size}`);

    // Envia evento de confirmação de conexão
    res.write(`data: ${JSON.stringify({ tipo: 'CONECTADO', totalClientes: clientes.size })}\n\n`);

    return () => {
      clientes.delete(res);
      console.log(`[NotificacaoObserver] Cliente SSE desconectado. Total: ${clientes.size}`);
    };
  },

  /**
   * Envia evento para todos os clientes SSE conectados
   * @param {Object} payload - Dados do evento a enviar
   */
  _broadcast(payload) {
    const data = `data: ${JSON.stringify(payload)}\n\n`;
    console.log(`[NotificacaoObserver] Broadcasting para ${clientes.size} cliente(s): ${payload.tipo}`);

    clientes.forEach(cliente => {
      try {
        cliente.write(data);
      } catch (err) {
        console.error('[NotificacaoObserver] Erro ao enviar SSE:', err.message);
        clientes.delete(cliente);
      }
    });
  },

  getTotalClientes() {
    return clientes.size;
  },
};

module.exports = NotificacaoObserver;
