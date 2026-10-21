const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const path = require('path');

const backendDir = __dirname;
require(path.join(backendDir, 'node_modules/dotenv')).config({ path: path.join(backendDir, '.env') });

const NOVOS_CLIENTES = [
    { nome: "Aline Moreira Ramos", email: "aline.ramos@gmail.com", cpf: "112.233.445-56", tel: "(11) 98111-2233" },
    { nome: "Bernardo Silveira Toledo", email: "bernardo.toledo@outlook.com", cpf: "223.344.556-67", tel: "(11) 98222-3344" },
    { nome: "Clarice Fontes Medeiros", email: "clarice.medeiros@gmail.com", cpf: "334.455.667-78", tel: "(12) 98333-4455" },
    { nome: "Danilo Albuquerque Lima", email: "danilo.lima@hotmail.com", cpf: "445.566.778-89", tel: "(11) 98444-5566" },
    { nome: "Eduardo Prado Vasconcelos", email: "eduardo.vasconcelos@gmail.com", cpf: "556.677.889-90", tel: "(19) 98555-6677" },
    { nome: "Flávia Rezende Camargo", email: "flavia.camargo@gmail.com", cpf: "667.788.990-01", tel: "(11) 98666-7788" },
    { nome: "Guilherme Sampaio Bueno", email: "guilherme.bueno@outlook.com", cpf: "778.899.001-12", tel: "(12) 98777-8899" },
    { nome: "Helena Queiroz Dornelles", email: "helena.dornelles@gmail.com", cpf: "889.900.112-23", tel: "(11) 98888-9900" },
    { nome: "Igor Guimarães Antunes", email: "igor.antunes@hotmail.com", cpf: "990.011.223-34", tel: "(19) 98999-0011" },
    { nome: "Júlia Cavalcante Macedo", email: "julia.macedo@gmail.com", cpf: "001.122.334-45", tel: "(11) 99122-3344" },
    { nome: "Kleber Mendonça Teles", email: "kleber.teles@outlook.com", cpf: "123.234.345-56", tel: "(12) 99233-4455" },
    { nome: "Lorena Coutinho Peçanha", email: "lorena.pecanha@gmail.com", cpf: "234.345.456-67", tel: "(11) 99344-5566" },
    { nome: "Matheus Valente Brandão", email: "matheus.brandao@gmail.com", cpf: "345.456.567-78", tel: "(19) 99455-6677" },
    { nome: "Natália Pimentel Seixas", email: "natalia.seixas@hotmail.com", cpf: "456.567.678-89", tel: "(11) 99566-7788" },
    { nome: "Otávio Muniz Barreto", email: "otavio.barreto@gmail.com", cpf: "567.678.789-90", tel: "(12) 99677-8899" },
    { nome: "Priscila Nogueira Villela", email: "priscila.villela@outlook.com", cpf: "678.789.890-01", tel: "(11) 99788-9900" },
    { nome: "Quirino Esteves Chaves", email: "quirino.chaves@gmail.com", cpf: "789.890.901-12", tel: "(19) 99899-0011" },
    { nome: "Roberta Lacerda Bicalho", email: "roberta.bicalho@gmail.com", cpf: "890.901.012-23", tel: "(11) 98123-1122" },
    { nome: "Samuel Frota Fagundes", email: "samuel.fagundes@hotmail.com", cpf: "901.012.123-34", tel: "(12) 98234-2233" },
    { nome: "Tatiana Benevides Lins", email: "tatiana.lins@gmail.com", cpf: "012.123.234-45", tel: "(11) 98345-3344" },
    { nome: "Ubirajara Prado Vianna", email: "ubirajara.vianna@outlook.com", cpf: "135.357.579-91", tel: "(19) 98456-4455" },
    { nome: "Valeska Siqueira Dantas", email: "valeska.dantas@gmail.com", cpf: "246.468.680-02", tel: "(11) 98567-5566" },
    { nome: "Wagner Figueiredo Assis", email: "wagner.assis@hotmail.com", cpf: "357.579.791-13", tel: "(12) 98678-6677" },
    { nome: "Yasmin Bezerra Portugal", email: "yasmin.portugal@gmail.com", cpf: "468.680.802-24", tel: "(11) 98789-7788" },
    { nome: "Zeca Albuquerque Brandão", email: "zeca.brandao@gmail.com", cpf: "579.791.913-35", tel: "(19) 98890-8899" },
    { nome: "Adriano Portela Vilar", email: "adriano.vilar@outlook.com", cpf: "680.802.024-46", tel: "(11) 98901-9900" },
    { nome: "Bianca Drummond Salazar", email: "bianca.salazar@gmail.com", cpf: "791.913.135-57", tel: "(12) 99012-0011" },
    { nome: "Caio Meirelles Padilha", email: "caio.padilha@hotmail.com", cpf: "802.024.246-68", tel: "(11) 99123-1122" },
    { nome: "Débora Junqueira Frota", email: "debora.frota@gmail.com", cpf: "913.135.357-79", tel: "(19) 99234-2233" },
    { nome: "Enzo Gabriel Furtado", email: "enzo.furtado@gmail.com", cpf: "024.246.468-80", tel: "(11) 99345-3344" },
    { nome: "Fabiana Varela Gusmão", email: "fabiana.gusmao@outlook.com", cpf: "147.369.258-14", tel: "(12) 99456-4455" },
    { nome: "Geraldo Magela Pires", email: "geraldo.pires@gmail.com", cpf: "258.470.369-25", tel: "(11) 99567-5566" },
    { nome: "Heloísa Bittencourt Paz", email: "heloisa.paz@hotmail.com", cpf: "369.581.470-36", tel: "(19) 99678-6677" },
    { nome: "Ítalo Gusmão Linhares", email: "italo.linhares@gmail.com", cpf: "470.692.581-47", tel: "(11) 99789-7788" },
    { nome: "Joana Castelo Branco", email: "joana.branco@gmail.com", cpf: "581.703.692-58", tel: "(12) 99890-8899" },
    { nome: "Kaio Vinícius Meireles", email: "kaio.meireles@outlook.com", cpf: "692.814.703-69", tel: "(11) 98112-2233" },
    { nome: "Lívia Fontoura Salles", email: "livia.salles@gmail.com", cpf: "703.925.814-70", tel: "(19) 98223-3344" },
    { nome: "Murilo Saraiva Botelho", email: "murilo.botelho@hotmail.com", cpf: "814.036.925-81", tel: "(11) 98334-4455" },
    { nome: "Nicole Dorneles Guedes", email: "nicole.guedes@gmail.com", cpf: "925.147.036-92", tel: "(12) 98445-5566" },
    { nome: "Orlando Villaça Ramos", email: "orlando.ramos@gmail.com", cpf: "036.258.147-03", tel: "(11) 98556-6677" }
];

const JUSTIFICATIVAS_CANCELAMENTO = [
    "Cliente desistiu da compra",
    "Item solicitado fora de estoque momentaneamente",
    "Cancelado pelo cliente por imprevisto",
    "Cliente não compareceu para retirada no prazo",
    "Pedido duplicado pelo cliente no aplicativo",
    "Troca na forma de pagamento solicitada pelo cliente"
];

const FORMAS_PAGTO = ["Pix", "Cartão de Crédito", "Cartão de Débito", "Dinheiro"];
const PESOS_PAGTO = [0.46, 0.30, 0.19, 0.05];

function sortearPonderado(opcoes, pesos) {
    const r = Math.random();
    let acumulado = 0;
    for (let i = 0; i < opcoes.length; i++) {
        acumulado += pesos[i];
        if (r <= acumulado) return opcoes[i];
    }
    return opcoes[opcoes.length - 1];
}

function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatarDateTime(date) {
    const pad = n => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function formatarDate(date) {
    const pad = n => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatarTime(date) {
    const pad = n => String(n).padStart(2, '0');
    return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

async function main() {
    console.log("=========================================================================");
    console.log("🚀 POVOAMENTO HISTÓRICO 2024 -> 2026 COM PIPELINE ATIVO (PADARIA DINIZ)");
    console.log("=========================================================================");

    const db = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
        timezone: '-03:00'
    });

    await db.query("SET time_zone = '-03:00'");

    try {
        await db.beginTransaction();

        // 1. Cadastrar novos clientes caso ainda não existam
        console.log("\n👥 1. Verificando e cadastrando novos clientes no sistema...");
        const senhaHash = await bcrypt.hash('123456', 10);

        for (const nc of NOVOS_CLIENTES) {
            const [existe] = await db.query("SELECT codigo_usuario FROM usuarios WHERE email = ?", [nc.email]);
            if (existe.length === 0) {
                const [resUser] = await db.query(
                    "INSERT INTO usuarios (email, senha, tipo_usuario) VALUES (?, ?, 'cliente')",
                    [nc.email, senhaHash]
                );
                await db.query(
                    "INSERT INTO clientes (codigo_usuario, cpf, nome, telefone) VALUES (?, ?, ?, ?)",
                    [resUser.insertId, nc.cpf, nc.nome, nc.tel]
                );
            }
        }

        // Buscar todos os clientes existentes para vincular pedidos
        const [todosClientes] = await db.query("SELECT codigo_cliente FROM clientes");
        const clientesIds = todosClientes.map(c => c.codigo_cliente);
        console.log(`✅ Base de clientes pronta: ${clientesIds.length} clientes cadastrados.`);

        // 2. Carregar produtos disponíveis
        const [produtos] = await db.query(
            "SELECT codigo_produto, nome, valor, preco_custo, preco_oferta, codigo_setor FROM produtos"
        );
        console.log(`📦 2. Catálogo de produtos: ${produtos.length} SKUs carregados.`);

        // 3. Limpar apenas os pedidos e itens antigos para gerar linha do tempo perfeita de 2024 a 2026
        console.log("\n🧹 3. Limpando pedidos e itens antigos para recriação da série histórica...");
        await db.query("DELETE FROM itens_pedidos");
        await db.query("DELETE FROM pedidos");
        await db.query("ALTER TABLE itens_pedidos AUTO_INCREMENT = 1");
        await db.query("ALTER TABLE pedidos AUTO_INCREMENT = 1");

        // 4. Montar cronograma de pedidos de Janeiro de 2024 até 21 de Outubro de 2026
        console.log("\n📅 4. Gerando histórico de vendas de 2024 a 2026...");
        const cronograma = [];

        // 2024 (12 meses): ~350 pedidos
        const qtds2024 = [26, 25, 28, 27, 32, 29, 34, 31, 33, 36, 40, 48];
        for (let m = 0; m < 12; m++) {
            const diasNoMes = new Date(2024, m + 1, 0).getDate();
            cronograma.push({ ano: 2024, mes: m, maxDia: diasNoMes, qtd: qtds2024[m] });
        }

        // 2025 (12 meses de crescimento): ~550 pedidos
        const qtds2025 = [36, 35, 40, 42, 47, 44, 50, 48, 52, 55, 60, 72];
        for (let m = 0; m < 12; m++) {
            const diasNoMes = new Date(2025, m + 1, 0).getDate();
            cronograma.push({ ano: 2025, mes: m, maxDia: diasNoMes, qtd: qtds2025[m] });
        }

        // 2026 (Janeiro a Setembro): ~500 pedidos
        const qtds2026 = [50, 48, 54, 57, 62, 60, 66, 64, 68];
        for (let m = 0; m < 9; m++) {
            const diasNoMes = new Date(2026, m + 1, 0).getDate();
            cronograma.push({ ano: 2026, mes: m, maxDia: diasNoMes, qtd: qtds2026[m] });
        }

        // Outubro 2026 (Dias 01 a 20): 55 pedidos
        cronograma.push({ ano: 2026, mes: 9, maxDia: 20, qtd: 55 });

        let totalPedidosInseridos = 0;
        let totalItensInseridos = 0;

        // Inserir pedidos históricos (2024 até 20 de outubro de 2026)
        for (const config of cronograma) {
            for (let i = 0; i < config.qtd; i++) {
                totalPedidosInseridos++;
                const dia = randInt(1, config.maxDia);

                // Horário de acordo com os picos da padaria
                const sorteioFaixa = Math.random();
                let hora, minuto;
                if (sorteioFaixa < 0.40) {
                    hora = randInt(7, 9); minuto = randInt(0, 59); // Manhã
                } else if (sorteioFaixa < 0.65) {
                    hora = randInt(11, 13); minuto = randInt(0, 59); // Almoço
                } else if (sorteioFaixa < 0.95) {
                    hora = randInt(15, 19); minuto = randInt(0, 59); // Tarde/Noite
                } else {
                    hora = randInt(10, 14); minuto = randInt(0, 59); // Intermediário
                }
                const dataPedido = new Date(config.ano, config.mes, dia, hora, minuto, randInt(0, 59));

                // 88% Finalizado, 12% Cancelado
                const ehCancelado = Math.random() < 0.12;
                let situacao, justificativa, dataAtualizacao;
                if (ehCancelado) {
                    situacao = 'Cancelado';
                    justificativa = JUSTIFICATIVAS_CANCELAMENTO[randInt(0, JUSTIFICATIVAS_CANCELAMENTO.length - 1)];
                    dataAtualizacao = new Date(dataPedido.getTime() + randInt(5, 25) * 60000);
                } else {
                    situacao = 'Finalizado';
                    justificativa = null;
                    const leadTimeMin = randInt(14, 42);
                    dataAtualizacao = new Date(dataPedido.getTime() + leadTimeMin * 60000);
                }

                // Agendamento (~25% dos pedidos)
                let dataRetirada = null;
                let horaRetirada = null;
                if (Math.random() < 0.25) {
                    const dataAgendada = new Date(dataPedido.getTime() + randInt(1, 2) * 86400000);
                    dataRetirada = formatarDate(dataAgendada);
                    horaRetirada = `${String(randInt(8, 18)).padStart(2, '0')}:00:00`;
                }

                const codigoRetirada = `PED-${String(randInt(100000, 999999))}-${randInt(10, 99)}`;
                const idCliente = clientesIds[randInt(0, clientesIds.length - 1)];
                const formaPagto = sortearPonderado(FORMAS_PAGTO, PESOS_PAGTO);

                // Selecionar de 1 a 5 produtos
                const qtdItens = randInt(1, 5);
                const produtosEscolhidos = [];
                const indicesUsados = new Set();
                while (produtosEscolhidos.length < qtdItens) {
                    const idx = randInt(0, produtos.length - 1);
                    if (!indicesUsados.has(idx)) {
                        indicesUsados.add(idx);
                        produtosEscolhidos.push(produtos[idx]);
                    }
                }

                let totalPedido = 0;
                const itensCalculados = [];
                for (const prod of produtosEscolhidos) {
                    const precoUnit = (prod.preco_oferta && parseFloat(prod.preco_oferta) > 0)
                        ? parseFloat(prod.preco_oferta)
                        : parseFloat(prod.valor);

                    let qtd = 1;
                    if (prod.nome.toLowerCase().includes('pão francês')) qtd = randInt(4, 12);
                    else if (prod.nome.toLowerCase().includes('pão de queijo')) qtd = randInt(2, 6);
                    else if (prod.nome.toLowerCase().includes('esfirra') || prod.nome.toLowerCase().includes('coxinha')) qtd = randInt(1, 4);
                    else qtd = randInt(1, 2);

                    const subtotal = Math.round(qtd * precoUnit * 100) / 100;
                    totalPedido += subtotal;
                    itensCalculados.push({
                        codigo_produto: prod.codigo_produto,
                        quantidade: qtd,
                        preco_unitario: precoUnit,
                        subtotal: subtotal
                    });
                }
                totalPedido = Math.round(totalPedido * 100) / 100;

                // Inserir pedido
                const [resPed] = await db.query(
                    `INSERT INTO pedidos 
                    (codigo_cliente, situacao, total, data_pedido, data_hora_atualizacao, data_retirada, hora_retirada, codigo_retirada, forma_pagto, justificativa, excluido)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
                    [
                        idCliente, situacao, totalPedido, formatarDateTime(dataPedido),
                        formatarDateTime(dataAtualizacao), dataRetirada, horaRetirada,
                        codigoRetirada, formaPagto, justificativa
                    ]
                );
                const idPedido = resPed.insertId;

                // Inserir itens
                for (const it of itensCalculados) {
                    totalItensInseridos++;
                    await db.query(
                        `INSERT INTO itens_pedidos (codigo_pedido, codigo_produto, quantidade, preco_unitario, subtotal)
                        VALUES (?, ?, ?, ?, ?)`,
                        [idPedido, it.codigo_produto, it.quantidade, it.preco_unitario, it.subtotal]
                    );
                }
            }
        }

        console.log(`✅ ${totalPedidosInseridos} pedidos históricos (2024 - 20/10/2026) gerados com sucesso.`);

        // 5. Inserir pedidos recentes de HOJE (21 de Outubro de 2026) com variação de "Em produção", "Pendente" e "Finalizado"
        console.log("\n⚡ 5. Gerando pedidos recentes de HOJE (21/10/2026) com distribuição de esteira operacional...");

        const hojeData = new Date(2026, 9, 21); // 21 de Outubro de 2026

        // Definição específica dos pedidos de hoje para atender ao requisito:
        // "Os pedidos mais rescentes variam de 'Em produção', 'Pendente' e 'Finalizado'."
        const pedidosHojeSpecs = [
            // --- FINALIZADOS DE HOJE (Manhã e início da tarde) ---
            { situacao: 'Finalizado', hora: 7, min: 15, leadMin: 22 },
            { situacao: 'Finalizado', hora: 7, min: 40, leadMin: 18 },
            { situacao: 'Finalizado', hora: 8, min: 05, leadMin: 25 },
            { situacao: 'Finalizado', hora: 8, min: 30, leadMin: 32 },
            { situacao: 'Finalizado', hora: 9, min: 10, leadMin: 20 },
            { situacao: 'Finalizado', hora: 9, min: 45, leadMin: 28 },
            { situacao: 'Finalizado', hora: 10, min: 15, leadMin: 19 },
            { situacao: 'Finalizado', hora: 11, min: 00, leadMin: 35 },
            { situacao: 'Finalizado', hora: 11, min: 30, leadMin: 24 },
            { situacao: 'Finalizado', hora: 12, min: 10, leadMin: 27 },
            { situacao: 'Finalizado', hora: 12, min: 40, leadMin: 30 },
            { situacao: 'Finalizado', hora: 13, min: 15, leadMin: 21 },
            { situacao: 'Finalizado', hora: 13, min: 50, leadMin: 26 },
            { situacao: 'Finalizado', hora: 14, min: 20, leadMin: 29 },
            { situacao: 'Finalizado', hora: 14, min: 55, leadMin: 23 },

            // --- EM PRODUÇÃO DE HOJE (No forno, balcão de preparo, fatiamento) ---
            { situacao: 'Em produção', hora: 15, min: 10, leadMin: 10, agendadoHoje: true, horaRetirada: '16:00:00' },
            { situacao: 'Em produção', hora: 15, min: 15, leadMin: 12, agendadoHoje: false },
            { situacao: 'Em produção', hora: 15, min: 22, leadMin: 8,  agendadoHoje: true, horaRetirada: '16:30:00' },
            { situacao: 'Em produção', hora: 15, min: 28, leadMin: 15, agendadoHoje: false },
            { situacao: 'Em produção', hora: 15, min: 33, leadMin: 11, agendadoHoje: true, horaRetirada: '17:00:00' },
            { situacao: 'Em produção', hora: 15, min: 39, leadMin: 9,  agendadoHoje: false },
            { situacao: 'Em produção', hora: 15, min: 44, leadMin: 14, agendadoHoje: true, horaRetirada: '17:30:00' },
            { situacao: 'Em produção', hora: 15, min: 50, leadMin: 7,  agendadoHoje: false },
            { situacao: 'Em produção', hora: 15, min: 55, leadMin: 10, agendadoHoje: false },
            { situacao: 'Em produção', hora: 16, min: 00, leadMin: 6,  agendadoHoje: true, horaRetirada: '18:00:00' },
            { situacao: 'Em produção', hora: 16, min: 04, leadMin: 8,  agendadoHoje: false },
            { situacao: 'Em produção', hora: 16, min: 08, leadMin: 5,  agendadoHoje: false },

            // --- PENDENTES DE HOJE (Recém-chegados no app / balcão, aguardando início) ---
            { situacao: 'Pendente', hora: 16, min: 10, agendadoHoje: true, horaRetirada: '18:30:00' },
            { situacao: 'Pendente', hora: 16, min: 12, agendadoHoje: false },
            { situacao: 'Pendente', hora: 16, min: 15, agendadoHoje: false },
            { situacao: 'Pendente', hora: 16, min: 18, agendadoHoje: true, horaRetirada: '19:00:00' },
            { situacao: 'Pendente', hora: 16, min: 20, agendadoHoje: false },
            { situacao: 'Pendente', hora: 16, min: 22, agendadoHoje: false },
            { situacao: 'Pendente', hora: 16, min: 25, agendadoHoje: true, horaRetirada: '19:30:00' },
            { situacao: 'Pendente', hora: 16, min: 28, agendadoHoje: false },

            // --- CANCELADOS DE HOJE ---
            { situacao: 'Cancelado', hora: 8,  min: 45, justificativa: "Cliente desistiu da compra" },
            { situacao: 'Cancelado', hora: 12, min: 25, justificativa: "Troca na forma de pagamento solicitada pelo cliente" }
        ];

        let pedidosHojeCount = 0;
        for (const spec of pedidosHojeSpecs) {
            pedidosHojeCount++;
            totalPedidosInseridos++;

            const dataPedido = new Date(2026, 9, 21, spec.hora, spec.min, randInt(0, 59));
            let dataAtualizacao = null;
            if (spec.situacao === 'Finalizado') {
                dataAtualizacao = new Date(dataPedido.getTime() + (spec.leadMin || 25) * 60000);
            } else if (spec.situacao === 'Em produção') {
                dataAtualizacao = new Date(dataPedido.getTime() + (spec.leadMin || 10) * 60000);
            } else if (spec.situacao === 'Cancelado') {
                dataAtualizacao = new Date(dataPedido.getTime() + 15 * 60000);
            } else {
                dataAtualizacao = dataPedido; // Pendente
            }

            const dataRetirada = spec.agendadoHoje ? '2026-10-21' : null;
            const horaRetirada = spec.horaRetirada || null;
            const codigoRetirada = `PED-${String(randInt(100000, 999999))}-${randInt(10, 99)}`;
            const idCliente = clientesIds[randInt(0, clientesIds.length - 1)];
            const formaPagto = sortearPonderado(FORMAS_PAGTO, PESOS_PAGTO);

            // Itens do pedido de hoje
            const qtdItens = randInt(1, 4);
            const produtosEscolhidos = [];
            const indicesUsados = new Set();
            while (produtosEscolhidos.length < qtdItens) {
                const idx = randInt(0, produtos.length - 1);
                if (!indicesUsados.has(idx)) {
                    indicesUsados.add(idx);
                    produtosEscolhidos.push(produtos[idx]);
                }
            }

            let totalPedido = 0;
            const itensCalculados = [];
            for (const prod of produtosEscolhidos) {
                const precoUnit = (prod.preco_oferta && parseFloat(prod.preco_oferta) > 0)
                    ? parseFloat(prod.preco_oferta)
                    : parseFloat(prod.valor);

                let qtd = 1;
                if (prod.nome.toLowerCase().includes('pão francês')) qtd = randInt(6, 15);
                else if (prod.nome.toLowerCase().includes('pão de queijo')) qtd = randInt(3, 8);
                else qtd = randInt(1, 3);

                const subtotal = Math.round(qtd * precoUnit * 100) / 100;
                totalPedido += subtotal;
                itensCalculados.push({
                    codigo_produto: prod.codigo_produto,
                    quantidade: qtd,
                    preco_unitario: precoUnit,
                    subtotal: subtotal
                });
            }
            totalPedido = Math.round(totalPedido * 100) / 100;

            const [resPed] = await db.query(
                `INSERT INTO pedidos 
                (codigo_cliente, situacao, total, data_pedido, data_hora_atualizacao, data_retirada, hora_retirada, codigo_retirada, forma_pagto, justificativa, excluido)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
                [
                    idCliente, spec.situacao, totalPedido, formatarDateTime(dataPedido),
                    formatarDateTime(dataAtualizacao), dataRetirada, horaRetirada,
                    codigoRetirada, formaPagto, spec.justificativa || null
                ]
            );
            const idPedido = resPed.insertId;

            for (const it of itensCalculados) {
                totalItensInseridos++;
                await db.query(
                    `INSERT INTO itens_pedidos (codigo_pedido, codigo_produto, quantidade, preco_unitario, subtotal)
                    VALUES (?, ?, ?, ?, ?)`,
                    [idPedido, it.codigo_produto, it.quantidade, it.preco_unitario, it.subtotal]
                );
            }
        }

        console.log(`✅ ${pedidosHojeCount} pedidos de HOJE inseridos (Em produção: 12, Pendente: 8, Finalizado: 15, Cancelado: 2).`);

        await db.commit();

        console.log("\n=========================================================================");
        console.log(`🎉 POVOAMENTO CONCLUÍDO COM SUCESSO!`);
        console.log(`📦 Total de Pedidos no Banco: ${totalPedidosInseridos}`);
        console.log(`🛍️ Total de Itens Vendidos: ${totalItensInseridos}`);
        console.log(`👥 Total de Clientes Cadastrados: ${clientesIds.length}`);
        console.log("=========================================================================");

        // Estatísticas para conferência
        const [resStatus] = await db.query(`
            SELECT situacao, COUNT(*) as qtd, SUM(total) as receita_total 
            FROM pedidos 
            GROUP BY situacao
        `);
        console.table(resStatus);

        const [resHoje] = await db.query(`
            SELECT situacao, COUNT(*) as qtd_hoje, SUM(total) as receita_hoje
            FROM pedidos
            WHERE DATE(data_pedido) = '2026-10-21'
            GROUP BY situacao
        `);
        console.log("\n📊 Pedidos de HOJE (21/10/2026):");
        console.table(resHoje);

        const [resAnos] = await db.query(`
            SELECT YEAR(data_pedido) as ano, COUNT(*) as pedidos_ano, SUM(total) as faturamento_ano
            FROM pedidos
            GROUP BY YEAR(data_pedido)
            ORDER BY ano ASC
        `);
        console.log("\n📈 Evolução Anual (2024 a 2026):");
        console.table(resAnos);

        await db.end();
    } catch (err) {
        try { await db.rollback(); } catch (_) {}
        console.error("❌ Erro ao povoar dados:", err);
        process.exit(1);
    }
}

main();
