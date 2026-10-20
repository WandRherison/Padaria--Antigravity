require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
    let localConn, awsConn;
    try {
        console.log("Conectando ao localhost...");
        localConn = await mysql.createConnection({ 
            host: 'localhost', 
            user: 'root', 
            password: process.env.DB_PASSWORD || '', 
            database: 'padaria' 
        });

        console.log("Conectando ao AWS RDS...");
        awsConn = await mysql.createConnection({ 
            host: process.env.DB_HOST || 'localhost', 
            user: process.env.DB_USER || 'root', 
            password: process.env.DB_PASSWORD || '', 
            database: process.env.DB_NAME || 'padaria' 
        });

        // 1. Obter dados locais
        console.log("Buscando imagens locais...");
        const [rows] = await localConn.query('SELECT codigo_imagem, codigo_produto, imagem_url FROM imagens_produtos');
        console.log(`Encontradas ${rows.length} imagens locais.`);

        // 2. Limpar e alterar tabela AWS
        console.log("Alterando schema no AWS RDS...");
        // Zera os base64 para evitar lock longo / size issues
        await awsConn.query("UPDATE imagens_produtos SET imagem_base64 = ''");
        try {
            await awsConn.query('ALTER TABLE imagens_produtos CHANGE imagem_base64 imagem_url VARCHAR(255)');
            console.log("Coluna alterada com sucesso.");
        } catch (err) {
            if (err.code === 'ER_BAD_FIELD_ERROR') {
                console.log("A coluna já se chama imagem_url ou ocorreu um erro:", err.message);
            } else {
                console.log("Tentando dropar e adicionar a coluna se o change falhou...");
                try {
                    await awsConn.query('ALTER TABLE imagens_produtos DROP COLUMN imagem_base64');
                    await awsConn.query('ALTER TABLE imagens_produtos ADD COLUMN imagem_url VARCHAR(255)');
                } catch(e2) {
                    console.log("A coluna provavelmente já existe.", e2.message);
                }
            }
        }

        console.log("Limpando tabela AWS para sincronizar...");
        await awsConn.query('TRUNCATE TABLE imagens_produtos');

        // 3. Inserir dados locais no AWS
        console.log("Inserindo imagens no AWS RDS...");
        for (const row of rows) {
            await awsConn.query(
                'INSERT INTO imagens_produtos (codigo_imagem, codigo_produto, imagem_url) VALUES (?, ?, ?)',
                [row.codigo_imagem, row.codigo_produto, row.imagem_url]
            );
        }

        console.log("Sincronização concluída com sucesso!");
    } catch (e) {
        console.error("Erro:", e);
    } finally {
        if (localConn) await localConn.end();
        if (awsConn) await awsConn.end();
    }
})();
