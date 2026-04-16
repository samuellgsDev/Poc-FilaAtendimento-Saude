'use strict';

// ═══════════════════════════════════════════════════════════════
// app.js — Cliente Frontend
// Fila de Atendimento UPA Digital · UNDB Desafio 4.0
// ═══════════════════════════════════════════════════════════════

const API = 'http://localhost:3000/api';

// ── Estado local ────────────────────────────────────────────────
const state = {
  estrategiaAtiva: 'risco',
  filaCache: [],
};

// ── Referências DOM ──────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

const els = {
  form:             $('form-paciente'),
  inputNome:        $('input-nome'),
  inputCpf:         $('input-cpf'),
  inputMotivo:      $('input-motivo'),
  btnAdmitir:       $('btn-admitir'),
  formFeedback:     $('form-feedback'),
  btnChamar:        $('btn-chamar'),
  filaLista:        $('fila-lista'),
  filaVazia:        $('fila-vazia'),
  countFila:        $('count-fila'),
  logEventos:       $('log-eventos'),
  btnLimparLog:     $('btn-limpar-log'),
  sseDot:           $('sse-dot'),
  sseLabel:         $('sse-label'),
  painelIdle:       $('painel-idle'),
  painelAtivo:      $('painel-ativo'),
  painelNome:       $('painel-nome'),
  painelRisco:      $('painel-risco'),
  painelHora:       $('painel-hora'),
  painelEstrategia: $('painel-estrategia'),
  strategyAtiva:    $('strategy-ativa-label'),
};

// ═══════════════════════════════════════════════════════════════
// 1. SSE — Server-Sent Events (Observer Pattern no cliente)
//    Conecta ao stream e processa eventos em tempo real
// ═══════════════════════════════════════════════════════════════

function conectarSSE() {
  const source = new EventSource(`${API}/events`);

  source.onopen = () => {
    setSseStatus('connected', '● Tempo real');
    adicionarLog('CONECTADO', 'SSE conectado ao servidor', 'conectado');
  };

  source.onmessage = (e) => {
    let evento;
    try {
      evento = JSON.parse(e.data);
    } catch {
      return;
    }

    processarEvento(evento);
  };

  source.onerror = () => {
    setSseStatus('error', '✕ Desconectado');
    // Tenta reconectar após 3 segundos
    setTimeout(() => {
      setSseStatus('', 'Reconectando...');
    }, 3000);
  };
}

function processarEvento(evento) {
  switch (evento.tipo) {
    case 'CONECTADO':
      // Confirmação de conexão do servidor
      break;

    case 'PACIENTE_CHAMADO':
      adicionarLog(
        'PACIENTE_CHAMADO',
        `🔔 ${evento.paciente.nome} foi chamado · ${evento.estrategiaUsada}`,
        'chamado'
      );
      exibirPainelChamada(evento.paciente, evento.estrategiaUsada);
      carregarFila(); // Atualiza a fila (paciente saiu)
      break;

    case 'PACIENTE_ADICIONADO':
      adicionarLog(
        'PACIENTE_ADICIONADO',
        `➕ ${evento.paciente.nome} admitido · ${evento.paciente.nivel_risco}`,
        'adicionado'
      );
      carregarFila(); // Atualiza a fila com o novo paciente
      break;

    default:
      adicionarLog(evento.tipo, JSON.stringify(evento), 'conectado');
  }
}

// ═══════════════════════════════════════════════════════════════
// 2. Admissão de Paciente
// ═══════════════════════════════════════════════════════════════

els.form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const nome       = els.inputNome.value.trim();
  const cpf        = els.inputCpf.value.trim();
  const motivo     = els.inputMotivo.value.trim();
  const nivel_risco = document.querySelector('input[name="nivel_risco"]:checked')?.value;

  if (!nome) {
    mostrarFeedback('Por favor, informe o nome do paciente.', 'error');
    els.inputNome.focus();
    return;
  }

  els.btnAdmitir.disabled = true;
  els.btnAdmitir.textContent = 'Admitindo...';

  try {
    const res = await fetch(`${API}/fila/pacientes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, cpf: cpf || undefined, nivel_risco, motivo: motivo || undefined }),
    });

    const data = await res.json();

    if (!res.ok || !data.ok) {
      throw new Error(data.erro || 'Erro ao admitir paciente');
    }

    mostrarFeedback(`✓ ${nome} admitido com sucesso!`, 'success');
    els.form.reset();
    // Mantém o risco verde selecionado por padrão
    document.getElementById('risco-verde').checked = true;

    // A fila é atualizada via SSE (PACIENTE_ADICIONADO)
  } catch (err) {
    mostrarFeedback(`Erro: ${err.message}`, 'error');
  } finally {
    els.btnAdmitir.disabled = false;
    els.btnAdmitir.innerHTML = '<span class="btn-icon">➕</span> Admitir na Fila';
  }
});

// ═══════════════════════════════════════════════════════════════
// 3. Chamar Próximo Paciente
// ═══════════════════════════════════════════════════════════════

els.btnChamar.addEventListener('click', async () => {
  els.btnChamar.disabled = true;

  try {
    const res = await fetch(`${API}/fila/chamar`, { method: 'POST' });
    const data = await res.json();

    if (!res.ok) throw new Error(data.erro || 'Erro ao chamar paciente');

    if (!data.data) {
      mostrarFeedback('Fila vazia — nenhum paciente aguardando.', 'error');
    }
    // O painel e a fila são atualizados via SSE
  } catch (err) {
    mostrarFeedback(`Erro: ${err.message}`, 'error');
  } finally {
    setTimeout(() => {
      els.btnChamar.disabled = false;
    }, 800);
  }
});

// ═══════════════════════════════════════════════════════════════
// 4. Trocar Estratégia (Strategy Pattern)
// ═══════════════════════════════════════════════════════════════

document.querySelectorAll('.btn-strategy').forEach(btn => {
  btn.addEventListener('click', async () => {
    const estrategia = btn.dataset.estrategia;
    if (estrategia === state.estrategiaAtiva) return;

    try {
      const res = await fetch(`${API}/fila/estrategia`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estrategia }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.erro);

      state.estrategiaAtiva = estrategia;

      // Atualiza UI dos botões
      document.querySelectorAll('.btn-strategy').forEach(b => {
        const isActive = b.dataset.estrategia === estrategia;
        b.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        b.classList.toggle('btn-strategy-active', isActive);
      });

      els.strategyAtiva.textContent = `Ativa: ${data.data.atual}`;

      adicionarLog(
        'ESTRATEGIA_ALTERADA',
        `⚡ Estratégia → ${data.data.atual}`,
        'adicionado'
      );

      // Recarrega a fila com a nova ordenação
      carregarFila();
    } catch (err) {
      mostrarFeedback(`Erro ao trocar estratégia: ${err.message}`, 'error');
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// 5. Carregar e Renderizar Fila
// ═══════════════════════════════════════════════════════════════

async function carregarFila() {
  try {
    const res = await fetch(`${API}/fila`);
    const data = await res.json();

    if (!data.ok) throw new Error(data.erro);

    state.filaCache = data.data;
    renderizarFila(data.data);
  } catch (err) {
    console.error('[App] Erro ao carregar fila:', err.message);
  }
}

function renderizarFila(pacientes) {
  els.countFila.textContent = pacientes.length;
  els.btnChamar.disabled = pacientes.length === 0;

  if (pacientes.length === 0) {
    els.filaLista.innerHTML = '';
    els.filaLista.appendChild(els.filaVazia);
    els.filaVazia.hidden = false;
    return;
  }

  els.filaVazia.hidden = true;
  els.filaLista.innerHTML = '';

  pacientes.forEach((p, idx) => {
    const item = document.createElement('div');
    item.className = `fila-item${idx === 0 && p.nivel_risco === 'VERMELHO' ? ' prioridade-1' : idx === 0 && p.nivel_risco === 'AMARELO' ? ' prioridade-2' : ''}`;
    item.setAttribute('role', 'listitem');
    item.setAttribute('aria-label', `${idx + 1}º - ${p.nome}, risco ${p.nivel_risco}`);

    const chegada = new Date(p.chegada_em);
    const espera = formatarEspera(chegada);

    item.innerHTML = `
      <span class="fila-item-pos">${idx + 1}º</span>
      <span class="fila-item-risco risco-dot-${p.nivel_risco}" title="Risco ${p.nivel_risco}"></span>
      <div class="fila-item-info">
        <div class="fila-item-nome">${escapeHtml(p.nome)}</div>
        <div class="fila-item-meta">Chegada: ${chegada.toLocaleTimeString('pt-BR')} · Espera: ${espera}${p.motivo ? ` · ${escapeHtml(p.motivo)}` : ''}</div>
      </div>
      <span class="risco-tag risco-tag-${p.nivel_risco}">${p.nivel_risco}</span>
    `;

    els.filaLista.appendChild(item);
  });
}

// ═══════════════════════════════════════════════════════════════
// 6. Painel de Chamada
// ═══════════════════════════════════════════════════════════════

function exibirPainelChamada(paciente, estrategia) {
  els.painelIdle.hidden = true;
  els.painelAtivo.hidden = false;

  els.painelNome.textContent = paciente.nome;
  els.painelHora.textContent = `Chamado às ${new Date().toLocaleTimeString('pt-BR')}`;
  els.painelEstrategia.textContent = `via: ${estrategia}`;

  els.painelRisco.textContent = `🔴 ${paciente.nivel_risco}`;
  els.painelRisco.className = `painel-risco-badge risco-badge-${paciente.nivel_risco}`;

  const iconMap = { VERMELHO: '🔴', AMARELO: '🟡', VERDE: '🟢' };
  els.painelRisco.textContent = `${iconMap[paciente.nivel_risco] || '⚪'} ${paciente.nivel_risco}`;

  // Efeito visual de chamada + classe de risco para borda lateral
  const painel = document.querySelector('.painel-chamada');
  painel.classList.remove('risco-ativo-VERMELHO', 'risco-ativo-AMARELO', 'risco-ativo-VERDE');
  painel.classList.add(`risco-ativo-${paciente.nivel_risco}`);
  painel.classList.add('painel-chamada-flash');
  setTimeout(() => {
    painel.classList.remove('painel-chamada-flash');
  }, 700);
}

// ═══════════════════════════════════════════════════════════════
// 7. Log de Eventos
// ═══════════════════════════════════════════════════════════════

function adicionarLog(tipo, texto, classe) {
  // Remove placeholder inicial se existir
  const vazio = els.logEventos.querySelector('.log-vazio');
  if (vazio) vazio.remove();

  const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const item = document.createElement('div');
  item.className = `log-item log-${classe}`;

  item.innerHTML = `
    <span class="log-tipo tipo-${classe}">${tipo.replace('_', ' ')}</span>
    <span class="log-texto">${texto}</span>
    <span class="log-hora">${hora}</span>
  `;

  // Adiciona no topo do log (mais recente primeiro)
  els.logEventos.insertBefore(item, els.logEventos.firstChild);

  // Limita a 50 entradas
  while (els.logEventos.children.length > 50) {
    els.logEventos.removeChild(els.logEventos.lastChild);
  }
}

els.btnLimparLog.addEventListener('click', () => {
  els.logEventos.innerHTML = `
    <div class="log-vazio">
      <p>Log limpo.</p>
      <p class="log-vazio-hint">Aguardando novos eventos...</p>
    </div>
  `;
});

// ═══════════════════════════════════════════════════════════════
// 8. Helpers
// ═══════════════════════════════════════════════════════════════

function setSseStatus(estado, texto) {
  els.sseDot.className = `sse-dot${estado ? ' ' + estado : ''}`;
  els.sseLabel.textContent = texto;
}

function mostrarFeedback(msg, tipo) {
  els.formFeedback.textContent = msg;
  els.formFeedback.className = `form-feedback ${tipo}`;
  els.formFeedback.hidden = false;

  setTimeout(() => {
    els.formFeedback.hidden = true;
  }, 3500);
}

function formatarEspera(desde) {
  const diff = Math.floor((Date.now() - desde.getTime()) / 1000);
  if (diff < 60)  return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  return `${Math.floor(diff / 3600)}h`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Formata CPF enquanto digita
els.inputCpf.addEventListener('input', (e) => {
  let v = e.target.value.replace(/\D/g, '');
  if (v.length > 11) v = v.slice(0, 11);
  v = v.replace(/(\d{3})(\d)/, '$1.$2');
  v = v.replace(/(\d{3})(\d)/, '$1.$2');
  v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  e.target.value = v;
});

// Atualiza tempos de espera a cada 30s
setInterval(() => {
  if (state.filaCache.length > 0) renderizarFila(state.filaCache);
}, 30000);

// ═══════════════════════════════════════════════════════════════
// 9. Inicialização
// ═══════════════════════════════════════════════════════════════

async function init() {
  // Carrega fila inicial
  await carregarFila();

  // Carrega estratégia ativa do servidor
  try {
    const res = await fetch(`${API}/fila/status`);
    const data = await res.json();
    if (data.ok) {
      const chave = data.data.estrategiaAtiva.chave;
      state.estrategiaAtiva = chave;
      els.strategyAtiva.textContent = `Ativa: ${data.data.estrategiaAtiva.nome}`;

      document.querySelectorAll('.btn-strategy').forEach(btn => {
        const isActive = btn.dataset.estrategia === chave;
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        btn.classList.toggle('btn-strategy-active', isActive);
      });
    }
  } catch {}

  // Conecta SSE por último
  conectarSSE();
}

init();
