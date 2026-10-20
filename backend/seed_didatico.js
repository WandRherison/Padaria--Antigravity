const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: 'c:/Users/Wand.Alves/OneDrive/Padaria - Antigravity/backend/.env' });

// ==============================================================================
// 1. LISTA DE 30 CLIENTES BRASILEIROS REALISTAS
// ==============================================================================
const CLIENTES_SEED = [
    { nome: "Maria Eduarda Silva", email: "maria.eduarda@gmail.com", cpf: "123.456.789-10", tel: "(11) 98765-4321" },
    { nome: "Carlos Alberto Santos", email: "carlos.santos@gmail.com", cpf: "234.567.890-21", tel: "(11) 97654-3210" },
    { nome: "Juliana Pereira de Oliveira", email: "juliana.oliveira@outlook.com", cpf: "345.678.901-32", tel: "(12) 99123-4567" },
    { nome: "Marcos Vinicius Costa", email: "marcos.costa@hotmail.com", cpf: "456.789.012-43", tel: "(11) 98234-5678" },
    { nome: "Ana Paula Souza", email: "ana.souza@gmail.com", cpf: "567.890.123-54", tel: "(19) 97345-6789" },
    { nome: "Gabriel Rodrigues de Lima", email: "gabriel.lima@gmail.com", cpf: "678.901.234-65", tel: "(11) 96456-7890" },
    { nome: "Fernanda Ferreira Alves", email: "fernanda.alves@gmail.com", cpf: "789.012.345-76", tel: "(12) 99567-8901" },
    { nome: "Lucas Gabriel Ribeiro", email: "lucas.ribeiro@outlook.com", cpf: "890.123.456-87", tel: "(11) 98678-9012" },
    { nome: "Camila Barbosa Martins", email: "camila.martins@hotmail.com", cpf: "901.234.567-98", tel: "(11) 97789-0123" },
    { nome: "Rodrigo Henrique Carvalho", email: "rodrigo.carvalho@gmail.com", cpf: "012.345.678-09", tel: "(19) 96890-1234" },
    { nome: "Beatriz Gomes de Almeida", email: "beatriz.almeida@gmail.com", cpf: "135.246.357-19", tel: "(11) 99112-2334" },
    { nome: "Thiago Silva Araujo", email: "thiago.araujo@gmail.com", cpf: "246.357.468-20", tel: "(12) 98223-3445" },
    { nome: "Letícia Cristina Rocha", email: "leticia.rocha@outlook.com", cpf: "357.468.579-31", tel: "(11) 97334-4556" },
    { nome: "Bruno Leonardo Dias", email: "bruno.dias@hotmail.com", cpf: "468.579.680-42", tel: "(11) 96445-5667" },
    { nome: "Larissa Mendes de Castro", email: "larissa.castro@gmail.com", cpf: "579.680.791-53", tel: "(19) 99556-6778" },
    { nome: "Rafael Santana Rodrigues", email: "rafael.santana@gmail.com", cpf: "680.791.802-64", tel: "(11) 98667-7889" },
    { nome: "Mariana Duarte Nogueira", email: "mariana.nogueira@gmail.com", cpf: "791.802.913-75", tel: "(12) 97778-8990" },
    { nome: "Felipe Augusto Moreira", email: "felipe.moreira@outlook.com", cpf: "802.913.024-86", tel: "(11) 96889-9001" },
    { nome: "Amanda Vieira Ramos", email: "amanda.ramos@gmail.com", cpf: "913.024.135-97", tel: "(11) 99990-0112" },
    { nome: "Diego Henrique Monteiro", email: "diego.monteiro@hotmail.com", cpf: "024.135.246-08", tel: "(19) 98111-1223" },
    { nome: "Carolina Farias Cardoso", email: "carolina.cardoso@gmail.com", cpf: "147.258.369-14", tel: "(11) 97222-2334" },
    { nome: "Leonardo Castro Freitas", email: "leonardo.freitas@gmail.com", cpf: "258.369.470-25", tel: "(12) 96333-3445" },
    { nome: "Patricia Guimarães Reis", email: "patricia.reis@outlook.com", cpf: "369.470.581-36", tel: "(11) 99444-4556" },
    { nome: "André Luiz Barros", email: "andre.barros@gmail.com", cpf: "470.581.692-47", tel: "(11) 98555-5667" },
    { nome: "Vanessa Pires Guimarães", email: "vanessa.pires@hotmail.com", cpf: "581.692.703-58", tel: "(19) 97666-6778" },
    { nome: "Marcelo Antunes Neves", email: "marcelo.neves@gmail.com", cpf: "692.703.814-69", tel: "(11) 96777-7889" },
    { nome: "Jessica Telles Moura", email: "jessica.moura@gmail.com", cpf: "703.814.925-70", tel: "(12) 99888-8990" },
    { nome: "Gustavo Henrique Peixoto", email: "gustavo.peixoto@outlook.com", cpf: "814.925.036-81", tel: "(11) 98999-9001" },
    { nome: "Renata Paiva Siqueira", email: "renata.siqueira@gmail.com", cpf: "925.036.147-92", tel: "(11) 97100-0112" },
    { nome: "Vinicius Morais Rezende", email: "vinicius.rezende@gmail.com", cpf: "036.147.258-03", tel: "(19) 96211-1223" }
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
const PESOS_PAGTO = [0.45, 0.30, 0.20, 0.05]; // 45% Pix, 30% Crédito, 20% Débito, 5% Dinheiro

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

async function runSeed() {
    console.log("==================================================================");
    console.log("🚀 INICIANDO POPULAÇÃO DIDÁTICA DO BANCO DE DADOS - PADARIA DINIZ");
    console.log("==================================================================");

    const db = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'padaria',
        port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
        timezone: '-03:00',
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    });

    await db.query("SET time_zone = '-03:00'");

    try {
        await db.beginTransaction();

        // 1. Limpeza Segura (mantém funcionários e produtos)
        console.log("\n🧹 1. Limpando pedidos e clientes de teste antigos...");
        await db.query("DELETE FROM itens_pedidos");
        await db.query("DELETE FROM pedidos");
        await db.query("DELETE FROM clientes");
        await db.query("DELETE FROM usuarios WHERE tipo_usuario = 'cliente'");

        await db.query("ALTER TABLE itens_pedidos AUTO_INCREMENT = 1");
        await db.query("ALTER TABLE pedidos AUTO_INCREMENT = 1");
        await db.query("ALTER TABLE clientes AUTO_INCREMENT = 1");
        console.log("✅ Tabelas limpas e contadores reiniciados com sucesso!");

        // 2. Criação dos 30 Clientes Fictícios com senha hash '123456'
        console.log("\n👥 2. Cadastrando 30 novos clientes com credenciais prontas...");
        const senhaHash = await bcrypt.hash('123456', 10);
        const clientesIds = [];

        for (const c of CLIENTES_SEED) {
            const [resUser] = await db.query(
                "INSERT INTO usuarios (email, senha, tipo_usuario) VALUES (?, ?, 'cliente')",
                [c.email, senhaHash]
            );
            const idUsuario = resUser.insertId;

            const [resCli] = await db.query(
                "INSERT INTO clientes (codigo_usuario, cpf, nome, telefone) VALUES (?, ?, ?, ?)",
                [idUsuario, c.cpf, c.nome, c.tel]
            );
            clientesIds.push(resCli.insertId);
        }
        console.log(`✅ ${clientesIds.length} clientes criados (Senha de teste padrão para todos: '123456')!`);

        // 3. Carregar Catálogo de Produtos
        const [produtos] = await db.query(
            "SELECT codigo_produto, nome, valor, preco_custo, preco_oferta, codigo_setor FROM produtos"
        );
        console.log(`\n📦 3. Catálogo carregado: ${produtos.length} produtos disponíveis.`);

        // 4. Geração de ~150 Pedidos distribuídos (Julho, Agosto, Setembro 2026)
        console.log("\n🛒 4. Gerando 155 pedidos com histórico temporal, curvas de pico e itens variados...");

        const TOTAL_PEDIDOS = 155;
        // Definir proporção de crescimento temporal (MoM demonstrável):
        // Julho: ~40 pedidos, Agosto: ~55 pedidos, Setembro (até dia 24): ~60 pedidos
        const meses = [
            { ano: 2026, mes: 6, maxDia: 31, qtd: 40 },  // Julho (mês index 6)
            { ano: 2026, mes: 7, maxDia: 31, qtd: 55 },  // Agosto (mês index 7)
            { ano: 2026, mes: 8, maxDia: 24, qtd: 60 }   // Setembro (mês index 8, até dia 24)
        ];

        let pedidosGeradosCount = 0;
        let itensTotaisCount = 0;

        for (const configMes of meses) {
            for (let i = 0; i < configMes.qtd; i++) {
                pedidosGeradosCount++;
                const dia = randInt(1, configMes.maxDia);

                // Determinar horário com base nos picos de movimento da padaria
                const sorteioFaixa = Math.random();
                let hora, minuto;
                if (sorteioFaixa < 0.40) {
                    // Pico Café da manhã: 07:00 às 09:45 (40% do volume)
                    hora = randInt(7, 9);
                    minuto = randInt(0, 59);
                } else if (sorteioFaixa < 0.65) {
                    // Pico Almoço / Salgados: 11:30 às 13:45 (25% do volume)
                    hora = randInt(11, 13);
                    minuto = randInt(0, 59);
                } else if (sorteioFaixa < 0.95) {
                    // Pico Café da tarde / Noite: 15:30 às 19:30 (30% do volume)
                    hora = randInt(15, 19);
                    minuto = randInt(0, 59);
                } else {
                    // Horários intermediários: 10:00 ou 14:00 (5% do volume)
                    hora = randInt(10, 14);
                    minuto = randInt(0, 59);
                }

                const segundo = randInt(0, 59);
                const dataPedido = new Date(configMes.ano, configMes.mes, dia, hora, minuto, segundo);

                // Se for dia 24/09 (hoje), garantir que não passe das 13:00 atuais
                const ehHoje = (configMes.ano === 2026 && configMes.mes === 8 && dia === 24);
                if (ehHoje) {
                    dataPedido.setHours(randInt(7, 12), randInt(0, 59), randInt(0, 59));
                }

                // Sorteia o cliente (alguns clientes mais frequentes para gerar fidelização)
                const idCliente = clientesIds[randInt(0, clientesIds.length - 1)];

                // Sorteia forma de pagamento
                const formaPagto = sortearPonderado(FORMAS_PAGTO, PESOS_PAGTO);

                // Status do Pedido
                let status;
                let justificativa = null;
                let dataAtualizacao = null;

                if (ehHoje && i >= configMes.qtd - 2) {
                    // Os últimos 2 pedidos de hoje ficam como "Em produção" e "Pendente" para alimentar o pipeline ativo!
                    status = (i === configMes.qtd - 1) ? 'Pendente' : 'Em produção';
                    dataAtualizacao = new Date(dataPedido.getTime() + randInt(5, 15) * 60000);
                } else {
                    // 88% Finalizado, 12% Cancelado
                    const ehCancelado = Math.random() < 0.12;
                    if (ehCancelado) {
                        status = 'Cancelado';
                        justificativa = JUSTIFICATIVAS_CANCELAMENTO[randInt(0, JUSTIFICATIVAS_CANCELAMENTO.length - 1)];
                        dataAtualizacao = new Date(dataPedido.getTime() + randInt(5, 25) * 60000);
                    } else {
                        status = 'Finalizado';
                        // Lead Time realista entre 14 e 42 minutos!
                        const leadTimeMin = randInt(14, 42);
                        dataAtualizacao = new Date(dataPedido.getTime() + leadTimeMin * 60000);
                    }
                }

                // Agendamento de Retirada (~30% dos pedidos têm retirada agendada)
                let dataRetirada = null;
                let horaRetirada = null;
                if (Math.random() < 0.30) {
                    const dataAgendada = new Date(dataPedido.getTime() + randInt(1, 3) * 86400000);
                    dataRetirada = formatarDate(dataAgendada);
                    horaRetirada = `${String(randInt(8, 18)).padStart(2, '0')}:00:00`;
                }

                // Código amigável de retirada
                const codigoRetirada = `PED-${String(randInt(100000, 999999))}-${randInt(10, 99)}`;

                // Sorteia entre 1 e 5 produtos para este pedido
                const qtdItensNoPedido = randInt(1, 5);
                const produtosEscolhidos = [];
                const indicesUsados = new Set();

                for (let k = 0; k < qtdItensNoPedido; k++) {
                    let idx = randInt(0, produtos.length - 1);
                    if (!indicesUsados.has(idx)) {
                        indicesUsados.add(idx);
                        produtosEscolhidos.push(produtos[idx]);
                    }
                }

                // Calcula valores e insere itens
                let totalPedido = 0;
                const itensParaInserir = [];

                for (const prod of produtosEscolhidos) {
                    // Quantidade típica de padaria (Pão francês pode ser 6 a 12, bolo 1 ou 2, etc.)
                    let qtde = 1;
                    if (prod.nome.toLowerCase().includes('pão francês')) {
                        qtde = randInt(4, 12);
                    } else if (prod.nome.toLowerCase().includes('pão de queijo')) {
                        qtde = randInt(2, 6);
                    } else if (prod.nome.toLowerCase().includes('carne') || prod.nome.toLowerCase().includes('bife') || prod.nome.toLowerCase().includes('contrafilé')) {
                        qtde = randInt(1, 2);
                    } else {
                        qtde = randInt(1, 3);
                    }

                    // Se tem preço de oferta, aplica a oferta em ~70% das vezes para mostrar desconto no BI
                    const precoTabela = Number(prod.valor);
                    const precoOferta = prod.preco_oferta ? Number(prod.preco_oferta) : null;
                    const precoCobrado = (precoOferta && Math.random() < 0.75) ? precoOferta : precoTabela;

                    const subtotal = Number((qtde * precoCobrado).toFixed(2));
                    totalPedido += subtotal;

                    itensParaInserir.push({
                        idProduto: prod.codigo_produto,
                        qtde: qtde,
                        precoUnit: precoCobrado,
                        subtotal: subtotal
                    });
                }

                totalPedido = Number(totalPedido.toFixed(2));

                // Insere Pedido
                const [resPed] = await db.query(`
                    INSERT INTO pedidos 
                    (codigo_cliente, situacao, total, data_pedido, data_hora_atualizacao, data_retirada, hora_retirada, codigo_retirada, forma_pagto, justificativa, excluido)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE)
                `, [
                    idCliente, 
                    status, 
                    totalPedido, 
                    formatarDateTime(dataPedido), 
                    dataAtualizacao ? formatarDateTime(dataAtualizacao) : null,
                    dataRetirada, 
                    horaRetirada, 
                    codigoRetirada, 
                    formaPagto, 
                    justificativa
                ]);

                const idPedidoGerado = resPed.insertId;

                // Insere Itens
                for (const item of itensParaInserir) {
                    await db.query(`
                        INSERT INTO itens_pedidos (codigo_pedido, codigo_produto, quantidade, preco_unitario, subtotal)
                        VALUES (?, ?, ?, ?, ?)
                    `, [idPedidoGerado, item.idProduto, item.qtde, item.precoUnit, item.subtotal]);
                    itensTotaisCount++;
                }
            }
        }

        await db.commit();
        console.log(`✅ Sucesso! Inseridos ${pedidosGeradosCount} pedidos e ${itensTotaisCount} itens de venda.`);

        // 5. Relatório Consolidado das Views Analíticas (Power BI)
        console.log("\n==================================================================");
        console.log("📊 RESULTADO CONSOLIDADO NA VIEW VW_FATO_VENDAS (POWER BI)");
        console.log("==================================================================");

        const [kpis] = await db.query(`
            SELECT 
                COUNT(DISTINCT codigo_pedido) AS qtd_pedidos_totais,
                COUNT(DISTINCT codigo_cliente) AS clientes_compradores,
                SUM(quantidade) AS volume_unidades_vendidas,
                ROUND(SUM(subtotal_venda), 2) AS receita_bruta_total,
                ROUND(SUM(custo_total), 2) AS cmv_custo_total,
                ROUND(SUM(lucro_bruto), 2) AS lucro_bruto_total,
                ROUND((SUM(lucro_bruto) / SUM(subtotal_venda)) * 100, 2) AS margem_bruta_pct,
                ROUND(AVG(lead_time_minutos), 1) AS lead_time_medio_minutos
            FROM vw_fato_vendas
            WHERE status_pedido <> 'Cancelado' AND is_excluido = FALSE
        `);
        console.table(kpis);

        const [porMes] = await db.query(`
            SELECT 
                DATE_FORMAT(data_pedido, '%Y-%m') AS mes_ano,
                COUNT(DISTINCT codigo_pedido) AS qtd_pedidos,
                SUM(quantidade) AS unidades,
                ROUND(SUM(subtotal_venda), 2) AS receita_bruta,
                ROUND(SUM(lucro_bruto), 2) AS lucro_real,
                ROUND((SUM(lucro_bruto) / SUM(subtotal_venda)) * 100, 1) AS margem_pct
            FROM vw_fato_vendas
            WHERE status_pedido <> 'Cancelado' AND is_excluido = FALSE
            GROUP BY DATE_FORMAT(data_pedido, '%Y-%m')
            ORDER BY mes_ano ASC
        `);
        console.log("Evolução Mensal (MoM):");
        console.table(porMes);

        const [porStatus] = await db.query(`
            SELECT 
                status_pedido,
                COUNT(DISTINCT codigo_pedido) AS total_pedidos,
                ROUND(SUM(subtotal_venda), 2) AS valor_total
            FROM vw_fato_vendas
            GROUP BY status_pedido
        `);
        console.log("Distribuição por Status:");
        console.table(porStatus);

        console.log("==================================================================");
        console.log("🎉 POPULAÇÃO FINALIZADA COM SUCESSO! BASTA ATUALIZAR O POWER BI!");
        console.log("==================================================================");

    } catch (err) {
        await db.rollback();
        console.error("❌ ERRO DURANTE A POPULAÇÃO:", err);
    } finally {
        await db.end();
    }
}

runSeed();
