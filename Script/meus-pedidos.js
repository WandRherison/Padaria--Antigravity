/* =======================================================
   LÓGICA DA PÁGINA: MEUS PEDIDOS (PILLS, PROGRESSO E COPIAR)
======================================================= */

let idDoPedidoParaCancelar = null;
let statusFiltroAtual = 'todos';
let pedidosCarregados = [];

const API_BASE = (window.location.protocol === 'file:' || ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port !== '3000' && window.location.port !== ''))
    ? 'http://localhost:3000'
    : '';

document.addEventListener('DOMContentLoaded', () => {
    renderizarHistorico();
});

async function copiarCodigoRetirada(codigo, btnEl) {
    try {
        await navigator.clipboard.writeText(codigo);
    } catch (_) {
        const temp = document.createElement('input');
        temp.value = codigo;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);
    }
    if (btnEl) {
        const original = btnEl.textContent;
        btnEl.textContent = '✅ Copiado!';
        setTimeout(() => (btnEl.textContent = original), 2000);
    }
    if (typeof mostrarToast === 'function') {
        mostrarToast(`Código ${codigo} copiado!`);
    }
}

async function confirmarCancelamentoCliente() {
    if (!idDoPedidoParaCancelar) return;

    try {
        const resposta = await fetch(`${API_BASE}/api/pedidos/${idDoPedidoParaCancelar}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Cancelado', justificativa: 'Cancelado pelo cliente' })
        });

        if (resposta.ok) {
            fecharModalCancelamento();
            if (typeof mostrarToast === 'function') mostrarToast('Pedido cancelado com sucesso!');
            renderizarHistorico();
        } else {
            alert('Erro ao cancelar o pedido no servidor.');
        }
    } catch (erro) {
        alert('Erro de conexão ao tentar cancelar.');
    }
}

function podeCancelar(dataRetiradaStr, horaRetiradaStr) {
    if (!dataRetiradaStr || !horaRetiradaStr) return true;
    const [dia, mes, ano] = dataRetiradaStr.split('/');
    const [hora, minuto] = horaRetiradaStr.split(':');
    const dataRetirada = new Date(ano, mes - 1, dia, hora, minuto, 0);
    const agora = new Date();
    return (dataRetirada - agora) / (1000 * 60 * 60) >= 2;
}

function gerarProgressoHTML(statusAtual) {
    const s = statusAtual.toLowerCase();
    if (s === 'cancelado') return '';

    const step1 = s === 'pendente' ? 'atual' : 'concluido';
    const step2 = s === 'em produção' ? 'atual' : (s === 'finalizado' ? 'concluido' : '');
    const step3 = s === 'finalizado' ? 'concluido' : '';

    return `
        <div class="pedido-progresso" aria-label="Progresso do pedido">
            <span class="prog-step ${step1}">1. Recebido</span>
            <span class="prog-linha"></span>
            <span class="prog-step ${step2}">2. Em produção</span>
            <span class="prog-linha"></span>
            <span class="prog-step ${step3}">3. Pronto</span>
        </div>
    `;
}

function atualizarContadoresPills() {
    const contar = (st) => pedidosCarregados.filter(p => (p.status || 'Pendente').toLowerCase() === st).length;
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('count-todos', pedidosCarregados.length);
    set('count-pendente', contar('pendente'));
    set('count-producao', contar('em produção'));
    set('count-finalizado', contar('finalizado'));
    set('count-cancelado', contar('cancelado'));
}

function selecionarStatusFiltro(status) {
    statusFiltroAtual = status.toLowerCase();
    document.querySelectorAll('.pill-status').forEach(btn => {
        btn.classList.toggle('ativo', btn.dataset.status === statusFiltroAtual);
    });
    desenharCardsPedidos();
}

function desenharCardsPedidos() {
    const container = document.getElementById('container-historico');
    if (!container) return;

    const filtrados = statusFiltroAtual === 'todos'
        ? pedidosCarregados
        : pedidosCarregados.filter(p => (p.status || 'Pendente').toLowerCase() === statusFiltroAtual);

    if (filtrados.length === 0) {
        container.innerHTML = `
            <div class="pedidos-estado-vazio">
                <span style="font-size: 2rem;">📦</span>
                <strong>Nenhum pedido encontrado neste filtro.</strong>
                <a href="pagina-catalogo.html?filtro=retiravel" class="btn-novo-pedido">Explorar Catálogo</a>
            </div>`;
        return;
    }

    container.innerHTML = '';

    const coresStatus = {
        'Pendente': '#D9534F',
        'Em produção': '#E09B2D',
        'Finalizado': '#198754',
        'Cancelado': '#777777'
    };

    filtrados.forEach(pedido => {
        const statusAtual = pedido.status || 'Pendente';
        const corTag = coresStatus[statusAtual] || '#8C7B70';
        const isCancelado = statusAtual === 'Cancelado';
        const dentroDoPrazo = podeCancelar(pedido.dataRetirada, pedido.horaRetirada);
        const cancelamentoPermitido = dentroDoPrazo && statusAtual === 'Pendente';

        const avisoFinalizado = statusAtual === 'Finalizado'
            ? `<div class="aviso-pronto-retirada">✅ Pedido pronto para retirada! Apresente o código no balcão.</div>`
            : '';

        const motivoHTML = (isCancelado && pedido.justificativa)
            ? `<div class="motivo-cancelamento-box"><strong>Motivo:</strong> ${pedido.justificativa}</div>`
            : '';

        const itensHTML = (pedido.itens || []).map(item => `<li>${item.quantidade}x ${item.nome}</li>`).join('');

        let textoBloqueio = 'Prazo de cancelamento encerrado';
        if (statusAtual === 'Em produção') textoBloqueio = 'Pedido já em andamento';
        if (statusAtual === 'Finalizado') textoBloqueio = 'Pedido concluído';
        if (statusAtual === 'Cancelado') textoBloqueio = 'Pedido cancelado';

        const div = document.createElement('article');
        div.className = 'card-pedido-finalizado' + (isCancelado ? ' cancelado' : '');

        div.innerHTML = `
            <div class="pedido-info">
                <div class="pedido-cabecalho-linha">
                    <h2>Pedido #${pedido.id}</h2>
                    <span class="data-compra">Realizado em ${pedido.dataPedido}</span>
                </div>

                <div class="info-retirada">
                    ${(pedido.dataRetirada && pedido.horaRetirada)
                        ? `📅 Retirada agendada: <strong>${pedido.dataRetirada} às ${pedido.horaRetirada.slice(0, 5)}</strong>`
                        : `⚡ Retirada: <strong>Imediata no balcão</strong>`}
                </div>

                ${gerarProgressoHTML(statusAtual)}
                ${avisoFinalizado}
                ${motivoHTML}

                <ul class="lista-itens-resumo">${itensHTML}</ul>
                <p class="pedido-total-linha">Total: <strong>R$ ${Number(pedido.valorTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></p>
            </div>

            <div class="acoes-historico">
                <span class="status-pill-card" style="background-color: ${corTag};">${statusAtual}</span>

                <div class="codigo-box-wrapper">
                    <span class="codigo-label">Código de Retirada</span>
                    <div class="codigo-tag">${pedido.id}</div>
                    <button type="button" class="btn-copiar-codigo" onclick="copiarCodigoRetirada('${pedido.id}', this)">📋 Copiar código</button>
                </div>

                ${cancelamentoPermitido
                    ? `<button type="button" class="btn-cancelar-pedido" onclick="cancelarPedido('${pedido.id}')">Cancelar Pedido</button>`
                    : `<span class="prazo-expirado">${textoBloqueio}</span>`}
            </div>
        `;
        container.appendChild(div);
    });
}

async function renderizarHistorico() {
    const container = document.getElementById('container-historico');
    const emailUsuario = localStorage.getItem('emailUsuario');
    if (!container) return;

    if (!emailUsuario) {
        container.innerHTML = `
            <div class="pedidos-estado-vazio">
                <span style="font-size: 2rem;">🔒</span>
                <strong>Faça login para acompanhar seus pedidos.</strong>
                <a href="padaria-login.html" class="btn-novo-pedido">Entrar na Conta</a>
            </div>`;
        return;
    }

    container.innerHTML = `<div class="pedidos-estado-vazio"><span>⏳ Carregando seus pedidos...</span></div>`;

    try {
        const resposta = await fetch(`${API_BASE}/api/pedidos/cliente/${emailUsuario}`);
        if (!resposta.ok) throw new Error('Erro na resposta do servidor');
        pedidosCarregados = await resposta.json();
        atualizarContadoresPills();
        desenharCardsPedidos();
    } catch (erro) {
        console.error('Erro na leitura BD:', erro);
        container.innerHTML = `<div class="pedidos-estado-vazio"><strong>Erro ao conectar com o servidor.</strong></div>`;
    }
}

function cancelarPedido(idDoPedido) {
    idDoPedidoParaCancelar = idDoPedido;
    const modal = document.getElementById('modal-cancelamento');
    if (modal) modal.style.display = 'flex';
}

function fecharModalCancelamento() {
    const modal = document.getElementById('modal-cancelamento');
    if (modal) modal.style.display = 'none';
    idDoPedidoParaCancelar = null;
}

async function limparTodosFinalizados() {
    const emailUsuario = localStorage.getItem('emailUsuario');
    if (!emailUsuario) return;
    if (!confirm('Deseja remover todos os pedidos Finalizados e Cancelados da sua lista?')) return;

    try {
        const resposta = await fetch(`${API_BASE}/api/pedidos/cliente/${emailUsuario}/concluidos`, { method: 'DELETE' });
        if (resposta.ok) {
            if (typeof mostrarToast === 'function') mostrarToast('Pedidos concluídos removidos!');
            renderizarHistorico();
        } else {
            alert('Erro ao remover pedidos.');
        }
    } catch (erro) {
        alert('Erro de conexão ao tentar limpar.');
    }
}

async function limparTodoHistorico() {
    const emailUsuario = localStorage.getItem('emailUsuario');
    if (!emailUsuario) return;
    if (!confirm('ATENÇÃO: Deseja limpar TODOS os pedidos da sua lista?')) return;

    try {
        const resposta = await fetch(`${API_BASE}/api/pedidos/cliente/${emailUsuario}/todos`, { method: 'DELETE' });
        if (resposta.ok) {
            if (typeof mostrarToast === 'function') mostrarToast('Todo o histórico foi limpo!');
            renderizarHistorico();
        } else {
            alert('Erro ao limpar todo o histórico.');
        }
    } catch (erro) {
        alert('Erro de conexão ao tentar limpar tudo.');
    }
}
