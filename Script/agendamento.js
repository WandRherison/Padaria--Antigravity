/* =======================================================
   LÓGICA DA PÁGINA DE AGENDAMENTO (UX REFATORADA + API)
   - Carregamento rápido via GET /api/produtos/:id
   - Atalhos de data (Hoje / Amanhã / Outra data) + Chips por período
   - Reaproveitamento inteligente do horário do carrinho
======================================================= */

let produtoAtual = null;
let quantidade = 1;
let precoVigente = 0;
let modoData = 'amanha'; // 'hoje' | 'amanha' | 'outra'
let periodoAtual = 'manha'; // 'manha' | 'tarde' | 'noite'
let dataSelecionada = '';
let horaSelecionada = '';

const urlParams = new URLSearchParams(window.location.search);
const idProduto = urlParams.get('id');

const API_BASE = (window.location.protocol === 'file:' || ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port !== '3000' && window.location.port !== ''))
    ? 'http://localhost:3000'
    : '';

function formatarDataISO(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function obterRotuloData(iso) {
    if (!iso) return '';
    const hoje = formatarDataISO(new Date());
    const amanhaDate = new Date();
    amanhaDate.setDate(amanhaDate.getDate() + 1);
    const amanha = formatarDataISO(amanhaDate);
    if (iso === hoje) return 'Hoje';
    if (iso === amanha) return 'Amanhã';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
}

function gerarSlotsParaData(dataISO) {
    const hojeISO = formatarDataISO(new Date());
    const ehHoje = dataISO === hojeISO;
    const agora = new Date();
    const corteMin = (agora.getHours() + 2) * 60 + agora.getMinutes();

    const periodos = { manha: [], tarde: [], noite: [] };
    let h = 7, m = 30;
    while (h < 20 || (h === 20 && m === 0)) {
        const totalMin = h * 60 + m;
        const disponivel = !ehHoje || totalMin > corteMin;
        const label = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        if (h < 12) periodos.manha.push({ label, disponivel });
        else if (h < 18) periodos.tarde.push({ label, disponivel });
        else periodos.noite.push({ label, disponivel });

        m += 30;
        if (m >= 60) { m -= 60; h++; }
    }
    return periodos;
}

async function buscarProduto(id) {
    if (!id) return null;
    try {
        const r = await fetch(`${API_BASE}/api/produtos/${encodeURIComponent(id)}`);
        if (r.ok) return await r.json();
    } catch (_) {
        // fallback para lista completa caso servidor antigo
    }
    try {
        const resposta = await fetch(`${API_BASE}/api/produtos`);
        const produtos = await resposta.json();
        return Array.isArray(produtos) ? produtos.find(p => p.codigo_produto == id) : null;
    } catch (error) {
        console.error('Erro ao buscar produto:', error);
        return null;
    }
}

function atualizarResumoBotao() {
    const total = quantidade === 0 ? 0 : precoVigente * quantidade;
    const totalFmt = formatarMoeda(total);
    const precoFinalEl = document.getElementById('preço-final');
    const qtdEl = document.getElementById('Qtd');
    const mobTotal = document.getElementById('mobile-total-valor');
    const mobSlot = document.getElementById('mobile-resumo-slot');
    const btnDesk = document.getElementById('btn-adicionar-carrinho');
    const btnMob = document.getElementById('btn-adicionar-mobile');

    if (precoFinalEl) precoFinalEl.textContent = totalFmt;
    if (qtdEl) qtdEl.textContent = quantidade;
    if (mobTotal) mobTotal.textContent = totalFmt;

    const rotData = obterRotuloData(dataSelecionada);
    const resumoHorario = (rotData && horaSelecionada) ? `${rotData} às ${horaSelecionada}` : 'Selecione data e horário';

    if (mobSlot) mobSlot.textContent = `${resumoHorario} (${quantidade} un)`;

    if (produtoAtual && produtoAtual.quantidade_estoque > 0) {
        if (btnDesk) {
            btnDesk.textContent = (rotData && horaSelecionada)
                ? `🛒 Adicionar ao Carrinho • ${resumoHorario}`
                : '🛒 Adicionar ao Carrinho';
        }
        if (btnMob) btnMob.disabled = false;
    }

    const plusBtn = document.getElementById('plus-btn');
    const retBtn = document.getElementById('ret-btn');
    if (plusBtn && produtoAtual) plusBtn.disabled = quantidade >= produtoAtual.quantidade_estoque;
    if (retBtn) retBtn.disabled = quantidade <= 1;
}

function renderizarHorarios() {
    const grid = document.getElementById('slots-grid');
    const aviso = document.getElementById('aviso-sem-horario');
    if (!grid) return;

    const periodos = gerarSlotsParaData(dataSelecionada);
    const lista = periodos[periodoAtual] || [];
    const disponiveis = lista.filter(s => s.disponivel);

    grid.innerHTML = '';

    // Se a hora selecionada não está disponível neste período, seleciona a primeira disponível
    if (!disponiveis.some(s => s.label === horaSelecionada)) {
        horaSelecionada = disponiveis.length > 0 ? disponiveis[0].label : '';
    }

    if (disponiveis.length === 0) {
        aviso.style.display = 'block';
        aviso.textContent = 'Sem horários disponíveis neste período (mínimo de 2h de preparo). Escolha outro período ou Amanhã.';
    } else {
        aviso.style.display = 'none';
    }

    lista.forEach(slot => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ag-chip-slot' + (slot.disponivel && horaSelecionada === slot.label ? ' ativo' : '');
        btn.disabled = !slot.disponivel;
        btn.textContent = slot.label;
        btn.addEventListener('click', () => {
            horaSelecionada = slot.label;
            renderizarHorarios();
            atualizarResumoBotao();
        });
        grid.appendChild(btn);
    });

    atualizarResumoBotao();
}

function selecionarModoData(modo, dataCustom = null, horaCustom = null) {
    modoData = modo;
    document.querySelectorAll('.ag-chip-data').forEach(b => {
        b.classList.toggle('ativo', b.dataset.dateMode === modo);
    });

    const boxOutra = document.getElementById('box-outra-data');
    const inputData = document.getElementById('data-agendamento-produto');
    const hoje = new Date();
    const amanha = new Date();
    amanha.setDate(hoje.getDate() + 1);

    if (modo === 'hoje') {
        dataSelecionada = formatarDataISO(hoje);
        if (boxOutra) boxOutra.style.display = 'none';
    } else if (modo === 'amanha') {
        dataSelecionada = formatarDataISO(amanha);
        if (boxOutra) boxOutra.style.display = 'none';
    } else {
        if (boxOutra) boxOutra.style.display = 'block';
        if (dataCustom) {
            dataSelecionada = dataCustom;
            if (inputData) inputData.value = dataCustom;
        } else if (inputData && inputData.value) {
            dataSelecionada = inputData.value;
        } else {
            dataSelecionada = formatarDataISO(amanha);
            if (inputData) inputData.value = dataSelecionada;
        }
    }

    const periodos = gerarSlotsParaData(dataSelecionada);
    if (horaCustom) {
        const h = parseInt(horaCustom.split(':')[0], 10);
        periodoAtual = h < 12 ? 'manha' : (h < 18 ? 'tarde' : 'noite');
        horaSelecionada = horaCustom;
    } else {
        // Se o período atual não tiver horários livres, pula automaticamente para o próximo período livre
        const ordem = ['manha', 'tarde', 'noite'];
        if (!periodos[periodoAtual].some(s => s.disponivel)) {
            const livre = ordem.find(p => periodos[p].some(s => s.disponivel));
            if (livre) periodoAtual = livre;
        }
    }

    document.querySelectorAll('.ag-chip-periodo').forEach(b => {
        b.classList.toggle('ativo', b.dataset.period === periodoAtual);
    });

    renderizarHorarios();
}

function verificarBannerCarrinho() {
    const carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];
    const ultimoComAgendamento = [...carrinho].reverse().find(i => i.dataRetirada && i.horaRetirada);
    const banner = document.getElementById('banner-sync-carrinho');
    const texto = document.getElementById('texto-sync-carrinho');
    const btnSync = document.getElementById('btn-usar-horario-carrinho');

    if (!ultimoComAgendamento || !banner || !texto || !btnSync) return;

    const rotulo = obterRotuloData(ultimoComAgendamento.dataRetirada);
    texto.innerHTML = `Retirada já agendada para <strong>${rotulo} às ${ultimoComAgendamento.horaRetirada}</strong>.`;
    banner.style.display = 'flex';

    btnSync.onclick = () => {
        const hojeISO = formatarDataISO(new Date());
        const amanhaD = new Date();
        amanhaD.setDate(amanhaD.getDate() + 1);
        const amanhaISO = formatarDataISO(amanhaD);

        const m = ultimoComAgendamento.dataRetirada === hojeISO
            ? 'hoje'
            : (ultimoComAgendamento.dataRetirada === amanhaISO ? 'amanha' : 'outra');

        selecionarModoData(m, ultimoComAgendamento.dataRetirada, ultimoComAgendamento.horaRetirada);
        if (typeof mostrarToast === 'function') {
            mostrarToast(`📅 Horário sincronizado: ${rotulo} às ${ultimoComAgendamento.horaRetirada}`);
        }
    };
}

function adicionarAoCarrinho() {
    const estaLogado = localStorage.getItem('usuarioLogado');
    if (!estaLogado || estaLogado !== 'true') {
        if (typeof mostrarToast === 'function') {
            mostrarToast('Por favor, faça login para adicionar itens ao carrinho!');
        } else {
            alert('Por favor, faça login para adicionar itens ao carrinho!');
        }
        return;
    }

    if (!produtoAtual) {
        if (typeof mostrarToast === 'function') mostrarToast('Erro: produto não carregado.');
        return;
    }

    if (quantidade <= 0 || quantidade > produtoAtual.quantidade_estoque) {
        if (typeof mostrarToast === 'function') mostrarToast('Quantidade indisponível em estoque.');
        return;
    }

    if (!dataSelecionada || !horaSelecionada) {
        if (typeof mostrarToast === 'function') mostrarToast('Selecione uma data e um horário disponíveis.');
        return;
    }

    const carrinhoAtual = JSON.parse(localStorage.getItem('carrinho')) || [];
    const indexExistente = carrinhoAtual.findIndex(item =>
        item.id === produtoAtual.codigo_produto &&
        item.dataRetirada === dataSelecionada &&
        item.horaRetirada === horaSelecionada
    );

    if (indexExistente !== -1) {
        const novaQuantidade = carrinhoAtual[indexExistente].quantidade + quantidade;
        if (novaQuantidade > produtoAtual.quantidade_estoque) {
            if (typeof mostrarToast === 'function') {
                mostrarToast(`Você já tem ${carrinhoAtual[indexExistente].quantidade} un no carrinho. Estoque disponível: ${produtoAtual.quantidade_estoque}.`);
            }
            return;
        }
        carrinhoAtual[indexExistente].quantidade = novaQuantidade;
    } else {
        carrinhoAtual.push({
            id: produtoAtual.codigo_produto,
            nome: produtoAtual.nome,
            preco: precoVigente,
            quantidade: quantidade,
            imagem: produtoAtual.imagem_url,
            quantidade_estoque_real: produtoAtual.quantidade_estoque,
            dataRetirada: dataSelecionada,
            horaRetirada: horaSelecionada
        });
    }

    localStorage.setItem('carrinho', JSON.stringify(carrinhoAtual));
    if (typeof atualizarContadorCarrinho === 'function') atualizarContadorCarrinho();

    const rotData = obterRotuloData(dataSelecionada);
    if (typeof mostrarToast === 'function') {
        mostrarToast(`✅ ${quantidade}x ${produtoAtual.nome} agendado para ${rotData} às ${horaSelecionada}!`);
    }

    const bannerPos = document.getElementById('banner-pos-adicao');
    const textoPos = document.getElementById('texto-pos-adicao');
    if (bannerPos && textoPos) {
        textoPos.textContent = `✅ ${quantidade}x ${produtoAtual.nome} agendado para ${rotData} às ${horaSelecionada} (${formatarMoeda(precoVigente * quantidade)})!`;
        bannerPos.style.display = 'flex';
        bannerPos.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

async function carregarTela() {
    // Aviso antecipado se usuário não estiver logado
    const estaLogado = localStorage.getItem('usuarioLogado');
    const avisoLogin = document.getElementById('aviso-login-agendamento');
    if (avisoLogin && (!estaLogado || estaLogado !== 'true')) {
        avisoLogin.style.display = 'flex';
    }

    produtoAtual = await buscarProduto(idProduto);
    if (!produtoAtual) {
        document.getElementById('tituloproduto').textContent = 'Produto não encontrado.';
        document.getElementById('descricao').textContent = 'Volte ao catálogo para escolher outro item disponível.';
        return;
    }

    const setorSlug = (produtoAtual.categoria || produtoAtual.nome_setor || 'padaria').toLowerCase();
    const setorNome = setorSlug.charAt(0).toUpperCase() + setorSlug.slice(1);

    // Breadcrumb e links de retorno
    document.getElementById('breadcrumb-produto').textContent = produtoAtual.nome;
    const linkSetor = document.getElementById('link-breadcrumb-setor');
    const btnVoltar = document.getElementById('btn-voltar-setor');
    const btnContinuar = document.getElementById('btn-continuar-comprando');
    const urlVoltar = `pagina-catalogo.html?setor=${encodeURIComponent(setorSlug)}`;
    if (linkSetor) { linkSetor.textContent = setorNome; linkSetor.href = urlVoltar; }
    if (btnVoltar) btnVoltar.href = urlVoltar;
    if (btnContinuar) btnContinuar.href = urlVoltar;

    // Título, marca e descrição
    document.getElementById('tituloproduto').textContent = produtoAtual.nome;
    document.getElementById('marca-produto').textContent = (produtoAtual.marca && produtoAtual.marca.trim()) ? produtoAtual.marca : 'Fabricação Própria';
    document.getElementById('descricao').textContent = (produtoAtual.descricao && produtoAtual.descricao.trim())
        ? produtoAtual.descricao
        : `Excelente escolha do setor ${setorNome}. Produto fresco separado especialmente para a sua retirada!`;

    // Preço unitário + selo de desconto
    const precoNormal = parseFloat(produtoAtual.valor);
    const precoOferta = (produtoAtual.preco_oferta && parseFloat(produtoAtual.preco_oferta) > 0)
        ? parseFloat(produtoAtual.preco_oferta)
        : null;
    precoVigente = precoOferta !== null ? precoOferta : precoNormal;

    document.getElementById('preco-unitario-atual').textContent = formatarMoeda(precoVigente);
    document.getElementById('unidade-produto').textContent = produtoAtual.unidade_medida ? `/ ${produtoAtual.unidade_medida}` : '';

    if (precoOferta !== null && precoOferta < precoNormal) {
        const antigoEl = document.getElementById('preco-unitario-antigo');
        antigoEl.textContent = formatarMoeda(precoNormal);
        antigoEl.style.display = 'inline';

        const pct = Math.round(((precoNormal - precoOferta) / precoNormal) * 100);
        const badgeDesc = document.getElementById('badge-desconto');
        if (pct > 0 && badgeDesc) {
            badgeDesc.textContent = `-${pct}% OFF`;
            badgeDesc.style.display = 'inline-block';
        }
    }

    // Imagem principal
    const imgPrincipal = document.getElementById('produtoimagem');
    if (imgPrincipal) {
        imgPrincipal.src = produtoAtual.imagem_url || './Imagens/Logo.png';
        imgPrincipal.alt = `Foto de ${produtoAtual.nome}`;
    }

    // Estoque
    const estoque = Number(produtoAtual.quantidade_estoque || 0);
    const badgeEst = document.getElementById('badge-estoque');
    if (estoque <= 0) {
        quantidade = 0;
        badgeEst.textContent = '● Esgotado no momento';
        badgeEst.classList.add('baixo');
        ['btn-adicionar-carrinho', 'btn-adicionar-mobile'].forEach(id => {
            const b = document.getElementById(id);
            if (b) { b.disabled = true; b.textContent = 'Esgotado'; }
        });
    } else if (estoque <= 5) {
        badgeEst.textContent = `● Últimas ${estoque} unidades!`;
        badgeEst.classList.add('baixo');
    } else {
        badgeEst.textContent = `● Em estoque (${estoque} un)`;
    }

    // Configura min/max do date picker
    const inputData = document.getElementById('data-agendamento-produto');
    const hoje = new Date();
    const maxData = new Date();
    maxData.setDate(hoje.getDate() + 30);
    if (inputData) {
        inputData.min = formatarDataISO(hoje);
        inputData.max = formatarDataISO(maxData);
        inputData.addEventListener('change', () => {
            if (inputData.value) selecionarModoData('outra', inputData.value);
        });
    }

    // Verifica se "Hoje" ainda tem horários disponíveis
    const slotsHoje = gerarSlotsParaData(formatarDataISO(hoje));
    const hojeTemSlot = [...slotsHoje.manha, ...slotsHoje.tarde, ...slotsHoje.noite].some(s => s.disponivel);
    const btnHoje = document.querySelector('[data-date-mode="hoje"]');
    const subHoje = document.getElementById('sub-hoje');
    if (!hojeTemSlot && btnHoje) {
        btnHoje.disabled = true;
        if (subHoje) subHoje.textContent = 'Encerrado hoje';
    }

    // Listeners dos chips de data e período
    document.querySelectorAll('.ag-chip-data').forEach(btn => {
        btn.addEventListener('click', () => selecionarModoData(btn.dataset.dateMode));
    });

    document.querySelectorAll('.ag-chip-periodo').forEach(btn => {
        btn.addEventListener('click', () => {
            periodoAtual = btn.dataset.period;
            document.querySelectorAll('.ag-chip-periodo').forEach(b => b.classList.toggle('ativo', b === btn));
            renderizarHorarios();
        });
    });

    // Quantidade
    document.getElementById('plus-btn').addEventListener('click', () => {
        if (quantidade < produtoAtual.quantidade_estoque) {
            quantidade++;
            atualizarResumoBotao();
        } else if (typeof mostrarToast === 'function') {
            mostrarToast(`Temos apenas ${produtoAtual.quantidade_estoque} unidades disponíveis.`);
        }
    });

    document.getElementById('ret-btn').addEventListener('click', () => {
        if (quantidade > 1) {
            quantidade--;
            atualizarResumoBotao();
        }
    });

    document.getElementById('btn-adicionar-carrinho').addEventListener('click', adicionarAoCarrinho);
    document.getElementById('btn-adicionar-mobile').addEventListener('click', adicionarAoCarrinho);

    // Inicializa com Hoje (se tiver slot) ou Amanhã automaticamente
    selecionarModoData(hojeTemSlot ? 'hoje' : 'amanha');
    verificarBannerCarrinho();
}

document.addEventListener('DOMContentLoaded', carregarTela);
