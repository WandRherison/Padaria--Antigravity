require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const sharp = require('sharp');

const ARTIFACT_DIR = 'C:\\Users\\Wand.Alves\\.gemini\\antigravity\\brain\\0137540c-693f-428b-96a9-5c0ffe38fdbf';

const IMAGENS_CATEGORIA = {
  doces_brigadeiro: path.join(ARTIFACT_DIR, 'doces_brigadeiro_white_bg_1795394628749.jpg'),
  doces_pudim: path.join(ARTIFACT_DIR, 'doces_pudim_white_bg_1795394628908.jpg'),
  doces_bolo: path.join(ARTIFACT_DIR, 'bolo_de_chocolate_1795394673351.jpg'),
  bebidas_suco: path.join(ARTIFACT_DIR, 'bebidas_suco_laranja_1795394612372.jpg'),
  bebidas_refri: path.join(ARTIFACT_DIR, 'bebidas_refrigerante_1795394611980.jpg'),
  laticinios_queijo: path.join(ARTIFACT_DIR, 'laticinios_queijo_minas_white_1795394632561.jpg'),
  laticinios_iogurte: path.join(ARTIFACT_DIR, 'laticinios_iogurte_white_1795394636247.jpg'),
  limpeza: path.join(ARTIFACT_DIR, 'limpeza_produtos_whitebg_1795394635011.jpg'),
  pets: path.join(ARTIFACT_DIR, 'pets_racao_petisco_1795394621869.jpg'),
  mercearia: path.join(ARTIFACT_DIR, 'olive_oil_and_honey_studio_1795394677768.jpg')
};

const cacheWebp = new Map();

async function carregarWebpWhiteBg(chave) {
  if (cacheWebp.has(chave)) return cacheWebp.get(chave);
  const caminho = IMAGENS_CATEGORIA[chave];
  if (!caminho || !fs.existsSync(caminho)) {
    throw new Error(`Imagem não encontrada para chave '${chave}': ${caminho}`);
  }
  const buffer = await sharp(caminho)
    .resize(500, 500, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    })
    .webp({ quality: 82 })
    .toBuffer();
  const dataUri = `data:image/webp;base64,${buffer.toString('base64')}`;
  cacheWebp.set(chave, dataUri);
  return dataUri;
}

// Setores: 1=padaria, 2=acougue(frios), 3=hortifruti, 4=mercearia
const NOVOS_PRODUTOS = [
  // DOCES (Setor 1 - Padaria, categoria 'doces') - 10 produtos
  { setor: 1, categoria: 'doces', nome: 'Brigadeiro Gourmet (Caixa 6 un)', valor: 18.00, custo: 8.50, oferta: 15.90, retiravel: 1, estoque: 35, unidade: 'Cx', img: 'doces_brigadeiro' },
  { setor: 1, categoria: 'doces', nome: 'Pudim de Leite Condensado (Fatia)', valor: 9.50, custo: 4.00, oferta: null, retiravel: 1, estoque: 25, unidade: 'Fatia', img: 'doces_pudim' },
  { setor: 1, categoria: 'doces', nome: 'Bolo de Chocolate com Brigadeiro', valor: 11.90, custo: 5.20, oferta: 9.90, retiravel: 1, estoque: 20, unidade: 'Fatia', img: 'doces_bolo' },
  { setor: 1, categoria: 'doces', nome: 'Beijinho de Coco (Caixa 6 un)', valor: 17.50, custo: 8.00, oferta: null, retiravel: 1, estoque: 30, unidade: 'Cx', img: 'doces_brigadeiro' },
  { setor: 1, categoria: 'doces', nome: 'Torta Holandesa (Fatia)', valor: 12.90, custo: 5.80, oferta: null, retiravel: 1, estoque: 18, unidade: 'Fatia', img: 'doces_pudim' },
  { setor: 1, categoria: 'doces', nome: 'Bolo de Cenoura com Calda', valor: 9.90, custo: 4.10, oferta: 8.50, retiravel: 1, estoque: 28, unidade: 'Fatia', img: 'doces_bolo' },
  { setor: 1, categoria: 'doces', nome: 'Quindim Tradicional', valor: 6.50, custo: 2.80, oferta: null, retiravel: 1, estoque: 40, unidade: 'Un', img: 'doces_pudim' },
  { setor: 1, categoria: 'doces', nome: 'Carolina Recheada de Doce de Leite', valor: 8.90, custo: 3.90, oferta: null, retiravel: 1, estoque: 32, unidade: '100g', img: 'doces_brigadeiro' },
  { setor: 1, categoria: 'doces', nome: 'Rocambole de Chocolate', valor: 26.90, custo: 12.00, oferta: null, retiravel: 1, estoque: 12, unidade: 'Un', img: 'doces_bolo' },

  // BEBIDAS (Setor 4 - Mercearia, categoria 'bebidas') - +8 produtos (total 9)
  { setor: 4, categoria: 'bebidas', nome: 'Suco de Laranja Natural (1L)', valor: 13.90, custo: 7.50, oferta: 11.90, retiravel: 1, estoque: 30, unidade: 'Un', img: 'bebidas_suco' },
  { setor: 4, categoria: 'bebidas', nome: 'Refrigerante Cola Tradicional (2L)', valor: 9.99, custo: 6.20, oferta: null, retiravel: 0, estoque: 60, unidade: 'Un', img: 'bebidas_refri' },
  { setor: 4, categoria: 'bebidas', nome: 'Refrigerante Guaraná (2L)', valor: 8.99, custo: 5.50, oferta: 7.99, retiravel: 0, estoque: 55, unidade: 'Un', img: 'bebidas_refri' },
  { setor: 4, categoria: 'bebidas', nome: 'Água Mineral Sem Gás (1,5L)', valor: 3.49, custo: 1.50, oferta: null, retiravel: 0, estoque: 80, unidade: 'Un', img: 'bebidas_refri' },
  { setor: 4, categoria: 'bebidas', nome: 'Água Mineral Com Gás (500ml)', valor: 2.99, custo: 1.20, oferta: null, retiravel: 0, estoque: 70, unidade: 'Un', img: 'bebidas_refri' },
  { setor: 4, categoria: 'bebidas', nome: 'Suco de Uva Integral (1L)', valor: 16.90, custo: 9.80, oferta: null, retiravel: 0, estoque: 25, unidade: 'Un', img: 'bebidas_suco' },
  { setor: 4, categoria: 'bebidas', nome: 'Chá Gelado Limão (1,5L)', valor: 7.90, custo: 4.50, oferta: null, retiravel: 0, estoque: 40, unidade: 'Un', img: 'bebidas_suco' },
  { setor: 4, categoria: 'bebidas', nome: 'Achocolatado Pronto (1L)', valor: 8.49, custo: 4.90, oferta: null, retiravel: 0, estoque: 45, unidade: 'Un', img: 'bebidas_suco' },

  // LATICÍNIOS (Setor 4 - Mercearia, categoria 'laticinios') - +8 produtos (total 9)
  { setor: 4, categoria: 'laticinios', nome: 'Queijo Minas Frescal (400g)', valor: 19.90, custo: 12.00, oferta: 17.50, retiravel: 1, estoque: 25, unidade: 'Un', img: 'laticinios_queijo' },
  { setor: 4, categoria: 'laticinios', nome: 'Iogurte Natural Integral (170g)', valor: 4.49, custo: 2.30, oferta: null, retiravel: 0, estoque: 50, unidade: 'Un', img: 'laticinios_iogurte' },
  { setor: 4, categoria: 'laticinios', nome: 'Manteiga Com Sal (200g)', valor: 12.90, custo: 7.80, oferta: null, retiravel: 0, estoque: 40, unidade: 'Un', img: 'laticinios_iogurte' },
  { setor: 4, categoria: 'laticinios', nome: 'Requeijão Cremoso Tradicional (200g)', valor: 8.99, custo: 5.10, oferta: 7.99, retiravel: 0, estoque: 45, unidade: 'Un', img: 'laticinios_iogurte' },
  { setor: 4, categoria: 'laticinios', nome: 'Creme de Leite UHT (200g)', valor: 4.29, custo: 2.40, oferta: null, retiravel: 0, estoque: 60, unidade: 'Un', img: 'laticinios_iogurte' },
  { setor: 4, categoria: 'laticinios', nome: 'Leite Desnatado (1L)', valor: 5.79, custo: 3.60, oferta: null, retiravel: 0, estoque: 50, unidade: 'Un', img: 'laticinios_iogurte' },
  { setor: 4, categoria: 'laticinios', nome: 'Ricota Fresca (300g)', valor: 11.90, custo: 6.90, oferta: null, retiravel: 0, estoque: 20, unidade: 'Un', img: 'laticinios_queijo' },
  { setor: 4, categoria: 'laticinios', nome: 'Bebida Láctea Morango (900g)', valor: 7.99, custo: 4.40, oferta: null, retiravel: 0, estoque: 35, unidade: 'Un', img: 'laticinios_iogurte' },

  // LIMPEZA (Setor 4 - Mercearia, categoria 'limpeza') - +7 produtos (total 9)
  { setor: 4, categoria: 'limpeza', nome: 'Sabão Líquido Lavar Roupas (1L)', valor: 16.90, custo: 9.50, oferta: 14.50, retiravel: 0, estoque: 40, unidade: 'Un', img: 'limpeza' },
  { setor: 4, categoria: 'limpeza', nome: 'Amaciante de Roupas Floral (2L)', valor: 14.90, custo: 8.20, oferta: null, retiravel: 0, estoque: 35, unidade: 'Un', img: 'limpeza' },
  { setor: 4, categoria: 'limpeza', nome: 'Desinfetante Lavanda (2L)', valor: 9.49, custo: 5.10, oferta: null, retiravel: 0, estoque: 45, unidade: 'Un', img: 'limpeza' },
  { setor: 4, categoria: 'limpeza', nome: 'Limpador Multiuso (500ml)', valor: 6.49, custo: 3.30, oferta: null, retiravel: 0, estoque: 50, unidade: 'Un', img: 'limpeza' },
  { setor: 4, categoria: 'limpeza', nome: 'Esponja Dupla Face (Pacote 4 un)', valor: 5.90, custo: 2.90, oferta: null, retiravel: 0, estoque: 60, unidade: 'Pct', img: 'limpeza' },
  { setor: 4, categoria: 'limpeza', nome: 'Papel Higiênico Folha Dupla (12 rolos)', valor: 22.90, custo: 13.50, oferta: 19.90, retiravel: 0, estoque: 40, unidade: 'Pct', img: 'limpeza' },
  { setor: 4, categoria: 'limpeza', nome: 'Álcool Líquido 70% (1L)', valor: 8.90, custo: 4.80, oferta: null, retiravel: 0, estoque: 50, unidade: 'Un', img: 'limpeza' },

  // PETS (Setor 4 - Mercearia, categoria 'pets') - +8 produtos (total 9)
  { setor: 4, categoria: 'pets', nome: 'Ração para Gatos Adultos (1Kg)', valor: 23.90, custo: 14.00, oferta: null, retiravel: 0, estoque: 30, unidade: 'Un', img: 'pets' },
  { setor: 4, categoria: 'pets', nome: 'Ração Filhotes Cães (1Kg)', valor: 25.90, custo: 15.20, oferta: 22.90, retiravel: 0, estoque: 25, unidade: 'Un', img: 'pets' },
  { setor: 4, categoria: 'pets', nome: 'Biscoito Canino Ossinho (250g)', valor: 9.90, custo: 5.00, oferta: null, retiravel: 0, estoque: 40, unidade: 'Pct', img: 'pets' },
  { setor: 4, categoria: 'pets', nome: 'Sachê Carne para Cães (100g)', valor: 3.49, custo: 1.80, oferta: null, retiravel: 0, estoque: 60, unidade: 'Un', img: 'pets' },
  { setor: 4, categoria: 'pets', nome: 'Sachê Salmão para Gatos (85g)', valor: 3.79, custo: 2.00, oferta: null, retiravel: 0, estoque: 60, unidade: 'Un', img: 'pets' },
  { setor: 4, categoria: 'pets', nome: 'Areia Higiênica para Gatos (4Kg)', valor: 16.90, custo: 9.50, oferta: null, retiravel: 0, estoque: 30, unidade: 'Pct', img: 'pets' },
  { setor: 4, categoria: 'pets', nome: 'Tapete Higiênico Canino (7 un)', valor: 19.90, custo: 11.20, oferta: null, retiravel: 0, estoque: 25, unidade: 'Pct', img: 'pets' },
  { setor: 4, categoria: 'pets', nome: 'Shampoo Neutro Pet (500ml)', valor: 18.50, custo: 10.00, oferta: null, retiravel: 0, estoque: 20, unidade: 'Un', img: 'pets' },

  // MERCEARIA (Setor 4 - Mercearia, categoria 'mercearia') - +5 produtos (total 9)
  { setor: 4, categoria: 'mercearia', nome: 'Óleo de Soja Refinado (900ml)', valor: 7.49, custo: 4.90, oferta: 6.79, retiravel: 0, estoque: 70, unidade: 'Un', img: 'mercearia' },
  { setor: 4, categoria: 'mercearia', nome: 'Sal Refinado Iodado (1Kg)', valor: 2.99, custo: 1.40, oferta: null, retiravel: 0, estoque: 80, unidade: 'Un', img: 'mercearia' },
  { setor: 4, categoria: 'mercearia', nome: 'Farinha de Trigo Tradicional (1Kg)', valor: 5.99, custo: 3.50, oferta: null, retiravel: 0, estoque: 65, unidade: 'Un', img: 'mercearia' },
  { setor: 4, categoria: 'mercearia', nome: 'Molho de Tomate Tradicional (300g)', valor: 3.49, custo: 1.80, oferta: null, retiravel: 0, estoque: 75, unidade: 'Un', img: 'mercearia' },
  { setor: 4, categoria: 'mercearia', nome: 'Biscoito Cream Cracker (400g)', valor: 6.49, custo: 3.70, oferta: null, retiravel: 0, estoque: 50, unidade: 'Pct', img: 'mercearia' }
];

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'padaria',
    port: Number(process.env.DB_PORT || 3306)
  });

  try {
    let inseridos = 0;
    let jaExistiam = 0;

    for (const p of NOVOS_PRODUTOS) {
      const [existe] = await conn.query(
        'SELECT codigo_produto FROM produtos WHERE nome = ? LIMIT 1',
        [p.nome]
      );
      if (existe.length > 0) {
        jaExistiam++;
        continue;
      }

      const [resProd] = await conn.query(
        `INSERT INTO produtos
         (codigo_setor, nome, descricao, valor, preco_custo, preco_oferta, is_retiravel, disponibilidade, data_validade, marca, categoria, quantidade_estoque, unidade_medida)
         VALUES (?, ?, NULL, ?, ?, ?, ?, 1, NULL, NULL, ?, ?, ?)`,
        [p.setor, p.nome, p.valor, p.custo, p.oferta, p.retiravel, p.categoria, p.estoque, p.unidade]
      );

      const webpUri = await carregarWebpWhiteBg(p.img);
      await conn.query(
        'INSERT INTO imagens_produtos (codigo_produto, imagem_url) VALUES (?, ?)',
        [resProd.insertId, webpUri]
      );
      inseridos++;
    }

    const [contagem] = await conn.query(
      `SELECT s.nome AS setor, p.categoria, COUNT(*) AS qtd
       FROM produtos p
       JOIN setor s ON p.codigo_setor = s.codigo_setor
       GROUP BY s.nome, p.categoria
       ORDER BY s.nome, p.categoria`
    );

    console.log(`Seed concluído! Inseridos: ${inseridos} | Já existentes: ${jaExistiam}`);
    console.table(contagem);
  } finally {
    await conn.end();
  }
})().catch(err => {
  console.error('Erro no seed:', err);
  process.exit(1);
});
