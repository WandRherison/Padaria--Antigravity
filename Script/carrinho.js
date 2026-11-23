document.addEventListener('DOMContentLoaded', () => {
    renderizarPaginaCarrinho();
});

const formatarDinheiroCheckout = (valor) => {
    return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

let metodoPagamentoSelecionado = 'Pix';

function atualizarStepper(etapa) {
    [1, 2, 3].forEach(n => {
        const el = document.getElementById(`step-${n}`);
        if (el) el.classList.toggle('ativo', n <= etapa);
    });
}

function formatarDataRetiradaLabel(dataStr) {
    if (!dataStr) return 'Data não definida';
    if (dataStr.includes('-')) {
        return dataStr.split('-').reverse().join('/');
    }
    return dataStr;
}

function alterarQuantidadeCheckout(index, delta) {
    const itensCarrinho = JSON.parse(localStorage.getItem('carrinho')) || [];
    const item = itensCarrinho[index];
    if (!item) return;

    const novaQtd = (item.quantidade || 1) + delta;
    const maxEstoque = item.quantidade_estoque_real || 99;

    if (novaQtd < 1) return;
    if (novaQtd > maxEstoque) {
        if (typeof mostrarToast === 'function') {
            mostrarToast(`Temos apenas ${maxEstoque} unidades disponíveis de ${item.nome}.`);
        }
        return;
    }

    item.quantidade = novaQtd;
    localStorage.setItem('carrinho', JSON.stringify(itensCarrinho));
    renderizarPaginaCarrinho();
    if (typeof atualizarContadorCarrinho === 'function') atualizarContadorCarrinho();
}

function selecionarMetodoPagamento(metodo) {
    metodoPagamentoSelecionado = metodo;
    document.querySelectorAll('.pay-card-checkout').forEach(card => {
        const ativo = card.dataset.metodo === metodo;
        card.classList.toggle('ativo', ativo);
        const radio = card.querySelector('input[type="radio"]');
        if (radio) radio.checked = ativo;
    });
    atualizarBotaoPagamento();
}

function atualizarBotaoPagamento() {
    const itensCarrinho = JSON.parse(localStorage.getItem('carrinho')) || [];
    const valorTotal = itensCarrinho.reduce((acc, i) => acc + (i.preco * (i.quantidade || 1)), 0);
    const btnDesk = document.querySelector('.btn-comprar-tudo');
    const mobLabel = document.getElementById('mob-checkout-metodo');
    const mobTotal = document.getElementById('mob-checkout-total');

    if (btnDesk) {
        btnDesk.textContent = `Pagar ${formatarDinheiroCheckout(valorTotal)} com ${metodoPagamentoSelecionado}`;
    }
    if (mobLabel) mobLabel.textContent = `Total via ${metodoPagamentoSelecionado}`;
    if (mobTotal) mobTotal.textContent = formatarDinheiroCheckout(valorTotal);
}

/* =======================================================
   RENDER PRINCIPAL DA PÁGINA DE CHECKOUT
======================================================= */
function renderizarPaginaCarrinho() {
    const containerLista = document.getElementById('lista-pagina-carrinho');
    const containerResumo = document.getElementById('resumo-pagina-carrinho');
    const stickyMobile = document.getElementById('mobile-sticky-checkout');

    const itensCarrinho = JSON.parse(localStorage.getItem('carrinho')) || [];
    atualizarStepper(1);

    if (itensCarrinho.length === 0) {
        if (stickyMobile) stickyMobile.style.display = 'none';
        document.getElementById('container-checkout').innerHTML = `
            <div class="carrinho-vazio">
                <img src="./Imagens Secundarias/Pão.svg" alt="Carrinho Vazio">
                <h2>Seu carrinho está vazio!</h2>
                <p>Que tal dar uma olhada nas nossas delícias fresquinhas?</p>
                <a href="pagina-catalogo.html?filtro=retiravel" class="btn-voltar-loja">Ver Catálogo de Produtos</a>
            </div>
        `;
        return;
    }

    // Agrupa os itens por data e hora de retirada (preservando o índice original no carrinho)
    const grupos = {};
    let valorTotal = 0;
    let totalItens = 0;

    itensCarrinho.forEach((item, index) => {
        const qtd = item.quantidade || 1;
        const subtotal = item.preco * qtd;
        valorTotal += subtotal;
        totalItens += qtd;

        const dataFmt = formatarDataRetiradaLabel(item.dataRetirada);
        const horaFmt = item.horaRetirada || '--:--';
        const chave = `${dataFmt} às ${horaFmt}`;
        if (!grupos[chave]) grupos[chave] = [];
        grupos[chave].push({ item, index, qtd, subtotal });
    });

    const totalGrupos = Object.keys(grupos).length;

    /* ---- Coluna esquerda: grupos de retirada + cards com foto e stepper ---- */
    containerLista.innerHTML = `
        <div class="checkout-lista-topo">
            <h2>Itens do Pedido</h2>
            <span class="badge-codigos-retirada">
                ${totalGrupos === 1 ? '1 horário • 1 código de retirada' : `${totalGrupos} horários • ${totalGrupos} códigos de retirada`}
            </span>
        </div>
    `;

    Object.entries(grupos).forEach(([chaveRetirada, listaGrupo]) => {
        const grupoEl = document.createElement('div');
        grupoEl.className = 'grupo-retirada-box';

        const itensHTML = listaGrupo.map(({ item, index, qtd, subtotal }) => {
            const imgSrc = item.imagem || './Imagens/Logo.png';
            const maxEstoque = item.quantidade_estoque_real || 99;
            return `
                <div class="card-produto-checkout">
                    <img class="thumb-produto-checkout" src="${imgSrc}" alt="${item.nome}">
                    <div class="info-produto">
                        <h3>${item.nome}</h3>
                        <span class="detalhes-valores">
                            ${formatarDinheiroCheckout(item.preco)} / un
                        </span>
                        <div class="checkout-item-controles">
                            <div class="checkout-qtd-stepper">
                                <button type="button" onclick="alterarQuantidadeCheckout(${index}, -1)" ${qtd <= 1 ? 'disabled' : ''} aria-label="Diminuir quantidade">−</button>
                                <span>${qtd}</span>
                                <button type="button" onclick="alterarQuantidadeCheckout(${index}, 1)" ${qtd >= maxEstoque ? 'disabled' : ''} aria-label="Aumentar quantidade">+</button>
                            </div>
                            <div class="checkout-item-direita">
                                <span class="subtotal-item">${formatarDinheiroCheckout(subtotal)}</span>
                                <button type="button" class="btn-remover-checkout" onclick="removerItemCheckout(${index})">Remover</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        grupoEl.innerHTML = `
            <div class="grupo-retirada-header">
                <span>📅 Retirada: <strong>${chaveRetirada}</strong></span>
                <span class="tag-retire-gratis">Peça e Retire</span>
            </div>
            <div class="grupo-retirada-itens">${itensHTML}</div>
        `;
        containerLista.appendChild(grupoEl);
    });

    /* ---- Coluna direita: resumo + cards clicáveis de pagamento ---- */
    containerResumo.innerHTML = `
        <h2>Resumo & Pagamento</h2>

        <div class="linha-resumo">
            <span>Total de itens</span>
            <strong>${totalItens} un</strong>
        </div>
        <div class="linha-resumo">
            <span>Retirada no balcão</span>
            <strong class="texto-gratis">Grátis</strong>
        </div>

        <div class="opcoes-pagamento-checkout">
            <h3 class="titulo-pagamento-checkout">Escolha como pagar:</h3>

            <label class="pay-card-checkout ${metodoPagamentoSelecionado === 'Pix' ? 'ativo' : ''}" data-metodo="Pix" onclick="selecionarMetodoPagamento('Pix')">
                <input type="radio" name="pagamento-checkout" value="Pix" ${metodoPagamentoSelecionado === 'Pix' ? 'checked' : ''}>
                <div class="pay-card-body">
                    <div class="pay-card-top">
                        <strong>⚡ Pix</strong>
                        <span class="pay-tag-instantaneo">Instantâneo</span>
                    </div>
                    <small>QR Code ou Copia e Cola</small>
                </div>
            </label>

            <label class="pay-card-checkout ${metodoPagamentoSelecionado === 'Cartão de Crédito' ? 'ativo' : ''}" data-metodo="Cartão de Crédito" onclick="selecionarMetodoPagamento('Cartão de Crédito')">
                <input type="radio" name="pagamento-checkout" value="Cartão de Crédito" ${metodoPagamentoSelecionado === 'Cartão de Crédito' ? 'checked' : ''}>
                <div class="pay-card-body">
                    <strong>💳 Cartão de Crédito</strong>
                    <small>Em até 3x sem juros</small>
                </div>
            </label>

            <label class="pay-card-checkout ${metodoPagamentoSelecionado === 'Cartão de Débito' ? 'ativo' : ''}" data-metodo="Cartão de Débito" onclick="selecionarMetodoPagamento('Cartão de Débito')">
                <input type="radio" name="pagamento-checkout" value="Cartão de Débito" ${metodoPagamentoSelecionado === 'Cartão de Débito' ? 'checked' : ''}>
                <div class="pay-card-body">
                    <strong>💳 Cartão de Débito</strong>
                    <small>Pagamento à vista</small>
                </div>
            </label>
        </div>

        <div class="total-resumo">
            <span>Total</span>
            <span>${formatarDinheiroCheckout(valorTotal)}</span>
        </div>

        <button type="button" class="btn-comprar-tudo" onclick="finalizarCompra(${valorTotal}, ${totalItens})">
            Pagar ${formatarDinheiroCheckout(valorTotal)} com ${metodoPagamentoSelecionado}
        </button>

        <div class="checkout-links-secundarios">
            <a href="pagina-catalogo.html?filtro=retiravel" class="link-voltar-checkout">← Continuar comprando</a>
            <button type="button" class="btn-esvaziar-checkout" onclick="limparCarrinhoCompleto()">Esvaziar carrinho</button>
        </div>

        <p class="checkout-selo-seguro">🔒 Pagamento simulado seguro • Seus códigos ficam salvos em Meus Pedidos</p>
    `;

    // Atualiza barra fixa mobile
    if (stickyMobile) {
        stickyMobile.style.display = '';
        const btnMob = document.getElementById('btn-finalizar-mobile');
        if (btnMob) {
            btnMob.onclick = () => finalizarCompra(valorTotal, totalItens);
        }
    }
    atualizarBotaoPagamento();
}

/* =======================================================
   REMOÇÃO COM MODAL PERSONALIZADO
======================================================= */
let indiceRemocaoAtual = null;
let limparTudo = false;

function removerItemCheckout(index) {
    indiceRemocaoAtual = index;
    limparTudo = false;
    document.getElementById('titulo-modal-remocao').innerText = '⚠️ Remover Item?';
    document.getElementById('texto-modal-remocao').innerText = 'Tem certeza que deseja retirar este item do seu pedido?';
    document.getElementById('modal-remover-item').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function limparCarrinhoCompleto() {
    limparTudo = true;
    document.getElementById('titulo-modal-remocao').innerText = '⚠️ Esvaziar Carrinho?';
    document.getElementById('texto-modal-remocao').innerText = 'Tem certeza que deseja apagar TODOS os itens do seu pedido?';
    document.getElementById('modal-remover-item').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function fecharModalRemocao() {
    document.getElementById('modal-remover-item').style.display = 'none';
    document.body.style.overflow = 'auto';
    indiceRemocaoAtual = null;
    limparTudo = false;
}

function confirmarRemocao() {
    const itensCarrinho = JSON.parse(localStorage.getItem('carrinho')) || [];

    if (limparTudo) {
        localStorage.removeItem('carrinho');
        if (typeof mostrarToast === 'function') mostrarToast('Carrinho esvaziado com sucesso!');
    } else if (indiceRemocaoAtual !== null) {
        itensCarrinho.splice(indiceRemocaoAtual, 1);
        localStorage.setItem('carrinho', JSON.stringify(itensCarrinho));
        if (typeof mostrarToast === 'function') mostrarToast('Item removido!');
    }

    fecharModalRemocao();
    renderizarPaginaCarrinho();
    if (typeof atualizarInterfaceCarrinho === 'function') atualizarInterfaceCarrinho();
}

/* =======================================================
   FINALIZAR COMPRA (GATEWAY SIMULADO -> POST /api/pedidos)
======================================================= */
function finalizarCompra(valorTotal, totalItens) {
    const estaLogado = localStorage.getItem('usuarioLogado');

    if (!estaLogado || estaLogado !== 'true') {
        alert("Por favor, faça login antes de finalizar a compra.");
        window.location.href = 'padaria-login.html';
        return;
    }

    const formaPagamento = document.querySelector('input[name="pagamento-checkout"]:checked');
    const pagamentoEscolhido = formaPagamento ? formaPagamento.value : metodoPagamentoSelecionado;

    if (!pagamentoEscolhido) {
        alert("Por favor, selecione a forma de pagamento.");
        return;
    }

    atualizarStepper(2);

    const enviarPedidoAposPagamento = () => {
        const dataHoje = new Date().toLocaleDateString('pt-BR');
        const carrinhoAtual = JSON.parse(localStorage.getItem('carrinho')) || [];
        const emailDoCliente = localStorage.getItem('emailUsuario') || 'Cliente Desconhecido';

        const novoPedidoAdmin = {
            cliente: emailDoCliente,
            dataPedido: dataHoje,
            itens: carrinhoAtual,
            valorTotal: valorTotal,
            pagamento: pagamentoEscolhido
        };

        const btnFinalizar = document.querySelector('.btn-comprar-tudo');
        const textoOriginalBtn = btnFinalizar ? btnFinalizar.innerText : 'Finalizar Compra';
        if (btnFinalizar) {
            btnFinalizar.disabled = true;
            btnFinalizar.innerText = '⏳ Processando Pedido...';
            btnFinalizar.style.cursor = 'not-allowed';
        }

        const API_BASE = (window.location.protocol === 'file:' || ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port !== '3000' && window.location.port !== ''))
            ? 'http://localhost:3000'
            : '';

        fetch(`${API_BASE}/api/pedidos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(novoPedidoAdmin)
        })
        .then(async resposta => {
            if (!resposta.ok) {
                const erroAPI = await resposta.json();
                throw new Error(erroAPI.erro || 'Não foi possível salvar o pedido no banco.');
            }
            return resposta.json();
        })
        .then(dados => {
            atualizarStepper(3);
            const codigo = dados.pedidosGerados ? dados.pedidosGerados.join(', ') : 'N/A';
            document.getElementById('display-codigo').innerText = codigo;
            document.getElementById('modal-qtd').innerText = totalItens + ' un';
            document.getElementById('modal-total').innerText = formatarDinheiroCheckout(valorTotal);
            document.getElementById('modal-pagamento').innerText = pagamentoEscolhido;

            document.getElementById('modal-confirmacao').style.display = 'flex';
            document.body.style.overflow = 'hidden';

            const historico = JSON.parse(localStorage.getItem('historicoPedidos')) || [];
            historico.push(novoPedidoAdmin);
            localStorage.setItem('historicoPedidos', JSON.stringify(historico));
            localStorage.removeItem('carrinho');
        })
        .catch(erro => {
            console.error("Erro detalhado no checkout:", erro);
            alert("Erro ao processar compra: " + erro.message);
            if (btnFinalizar) {
                btnFinalizar.disabled = false;
                btnFinalizar.innerText = textoOriginalBtn;
                btnFinalizar.style.cursor = 'pointer';
            }
        });
    };

    if (typeof window.abrirGatewayPagamento === 'function') {
        window.abrirGatewayPagamento({
            metodo: pagamentoEscolhido,
            valorTotal: valorTotal,
            totalItens: totalItens,
            onAprovado: enviarPedidoAposPagamento
        });
    } else {
        enviarPedidoAposPagamento();
    }
}

function fecharModalCompra() {
    document.getElementById('modal-confirmacao').style.display = 'none';
    document.body.style.overflow = 'auto';
    localStorage.removeItem('carrinho');
    window.location.href = 'meus-pedidos.html';
}
