require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mysql = require('mysql2/promise');
const sharp = require('sharp');

const STORES = [
  'https://www.savegnago.com.br/api/catalog_system/pub/products/search/',
  'https://www.mambo.com.br/api/catalog_system/pub/products/search/',
  'https://www.bistek.com.br/api/catalog_system/pub/products/search/',
  'https://www.angeloni.com.br/super/api/catalog_system/pub/products/search/'
];

// Lista dos produtos (codigo_produto >= 384) com busca precisa no catálogo de supermercados
const PRODUTOS_BUSCA = [
  { id: 386, query: 'bolo chocolate brigadeiro', must: ['bolo', 'chocolate'] },
  { id: 389, query: 'bolo cenoura chocolate', must: ['bolo', 'cenoura'] },
  { id: 391, query: 'carolina doce de leite', must: ['carolina'] },
  { id: 392, query: 'rocambole chocolate', must: ['rocambole'] },
  { id: 393, query: 'suco laranja integral 900ml', must: ['suco', 'laranja'] },
  { id: 394, query: 'coca cola 2l', must: ['coca', '2l'] },
  { id: 395, query: 'guarana antarctica 2l', must: ['guarana', '2l'] },
  { id: 396, query: 'agua mineral sem gas 1,5l', must: ['agua'] },
  { id: 397, query: 'agua mineral com gas 500ml', must: ['agua', 'gas'] },
  { id: 399, query: 'cha gelado leao limao 1,5l', must: ['cha', 'limao'] },
  { id: 400, query: 'achocolatado toddy 1l', must: ['achocolatado'] },
  { id: 404, query: 'requeijao cremoso tradicional 200g', must: ['requeijao'] },
  { id: 405, query: 'creme de leite nestle 200g', must: ['creme', 'leite'] },
  { id: 407, query: 'ricota fresca', must: ['ricota'] },
  { id: 408, query: 'bebida lactea morango 900g', must: ['morango'] },
  { id: 409, query: 'sabao liquido omo 1l', must: ['sabao', 'liquido'] },
  { id: 412, query: 'limpador veja multiuso 500ml', must: ['multiuso'] },
  { id: 413, query: 'esponja dupla face 4 unidades', must: ['esponja'] },
  { id: 414, query: 'papel higienico folha dupla 12 rolos', must: ['papel', 'higienico'] },
  { id: 415, query: 'alcool liquido 70 1l', must: ['alcool'] },
  { id: 416, query: 'racao gato adulto whiskas 1kg', must: ['racao', 'gat'] },
  { id: 417, query: 'racao caes filhotes pedigree', must: ['racao', 'filhote'] },
  { id: 418, query: 'biscoito caes biscrok', must: ['biscoito'] },
  { id: 419, query: 'racao umida sache caes carne', must: ['carne'] },
  { id: 420, query: 'racao umida sache gatos salmao', must: ['salmao'] },
  { id: 421, query: 'areia higienica gatos pipicat 4kg', must: ['areia'] },
  { id: 422, query: 'tapete higienico caes', must: ['tapete', 'higienico'] },
  { id: 423, query: 'shampoo caes neutro', must: ['shampoo'] },
  { id: 424, query: 'oleo de soja liza 900ml', must: ['oleo', 'soja'] },
  { id: 425, query: 'sal refinado cisne 1kg', must: ['sal', 'refinado'] },
  { id: 427, query: 'molho de tomate heinz tradicional', must: ['molho', 'tomate'] }
];

function normalizar(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

async function buscarNoSupermercado(item) {
  for (const base of STORES) {
    try {
      const url = base + encodeURIComponent(item.query) + '?_from=0&_to=5';
      const r = await fetch(url, {
        signal: AbortSignal.timeout(7000),
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      if (!r.ok && r.status !== 206) continue;
      const lista = await r.json();
      if (!Array.isArray(lista) || lista.length === 0) continue;

      // Prioriza produto cujo nome contenha todas as palavras obrigatórias
      const match =
        lista.find(p => {
          const n = normalizar(p.productName);
          return item.must.every(k => n.includes(k)) && p.items?.[0]?.images?.[0]?.imageUrl;
        }) ||
        lista.find(p => {
          const n = normalizar(p.productName);
          return n.includes(item.must[0]) && p.items?.[0]?.images?.[0]?.imageUrl;
        });

      if (!match) continue;
      const imgUrl = match.items[0].images[0].imageUrl;
      const imgRes = await fetch(imgUrl, {
        signal: AbortSignal.timeout(7000),
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      if (!imgRes.ok) continue;
      const buf = Buffer.from(await imgRes.arrayBuffer());
      if (buf.length < 3000) continue;

      return { buf, nomeEncontrado: match.productName, loja: new URL(base).hostname };
    } catch {
      // tenta próxima loja
    }
  }
  return null;
}

async function converterParaWebp(buf) {
  const webpBuffer = await sharp(buf)
    .resize(500, 500, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    })
    .webp({ quality: 84 })
    .toBuffer();
  return `data:image/webp;base64,${webpBuffer.toString('base64')}`;
}

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'padaria',
    port: Number(process.env.DB_PORT || 3306)
  });

  try {
    let ok = 0;
    const faltantes = [];

    for (let i = 0; i < PRODUTOS_BUSCA.length; i += 5) {
      const lote = PRODUTOS_BUSCA.slice(i, i + 5);
      await Promise.all(
        lote.map(async item => {
          const res = await buscarNoSupermercado(item);
          if (!res) {
            faltantes.push(item);
            console.log(`⚠️ [${item.id}] Não encontrado no catálogo VTEX: ${item.query}`);
            return;
          }
          const dataUri = await converterParaWebp(res.buf);
          await conn.query(
            'UPDATE imagens_produtos SET imagem_base64 = ? WHERE codigo_produto = ?',
            [dataUri, item.id]
          );
          ok++;
          console.log(`✅ [${item.id}] (${res.loja}) -> ${res.nomeEncontrado}`);
        })
      );
    }

    console.log(`\nConcluído: Atualizados=${ok} | Faltantes=${faltantes.length}`);
  } finally {
    await conn.end();
  }
})().catch(err => {
  console.error(err);
  process.exit(1);
});
