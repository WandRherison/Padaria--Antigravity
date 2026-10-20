const mysql = require('mysql2/promise');
require('dotenv').config();

async function removeValidade() {
    // Conexão Local (sempre tenta)
    try {
        const localConn = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'padaria'
        });
        
        console.log("Removendo data_validade do DB local...");
        
        // Remove a view temporariamente
        await localConn.query('DROP VIEW IF EXISTS vw_dim_produtos');
        
        // Altera a tabela
        try {
            await localConn.query('ALTER TABLE produtos DROP COLUMN data_validade');
            console.log("Coluna removida.");
        } catch (e) {
            console.log("Coluna já não existia ou erro:", e.message);
        }
        
        // Recria a view
        await localConn.query(`
            CREATE ALGORITHM=UNDEFINED DEFINER=\`root\`@\`localhost\` SQL SECURITY DEFINER VIEW \`vw_dim_produtos\` AS 
            select 
                \`p\`.\`codigo_produto\` AS \`codigo_produto\`,
                \`p\`.\`codigo_setor\` AS \`codigo_setor\`,
                \`p\`.\`nome\` AS \`nome_produto\`,
                \`p\`.\`descricao\` AS \`descricao\`,
                \`p\`.\`valor\` AS \`preco_venda\`,
                \`p\`.\`preco_custo\` AS \`preco_custo\`,
                \`p\`.\`preco_oferta\` AS \`preco_oferta\`,
                (case when ((\`p\`.\`preco_oferta\` is not null) and (\`p\`.\`preco_oferta\` > 0)) then \`p\`.\`preco_oferta\` else \`p\`.\`valor\` end) AS \`preco_efetivo\`,
                \`p\`.\`is_retiravel\` AS \`is_retiravel\`,
                \`p\`.\`disponibilidade\` AS \`disponibilidade\`,
                \`p\`.\`marca\` AS \`marca\`,
                \`p\`.\`categoria\` AS \`categoria\`,
                \`p\`.\`quantidade_estoque\` AS \`quantidade_estoque\`,
                \`p\`.\`unidade_medida\` AS \`unidade_medida\` 
            from \`produtos\` \`p\`
        `);
        console.log("View recriada localmente.");
        await localConn.end();
    } catch (e) {
        console.log("Erro local:", e.message);
    }

    // AWS
    try {
        if (process.env.AWS_DB_HOST) {
            const awsConn = await mysql.createConnection({
                host: process.env.AWS_DB_HOST,
                user: process.env.AWS_DB_USER,
                password: process.env.AWS_DB_PASSWORD,
                database: process.env.AWS_DB_NAME
            });
            console.log("Removendo data_validade da AWS...");
            await awsConn.query('DROP VIEW IF EXISTS vw_dim_produtos');
            try {
                await awsConn.query('ALTER TABLE produtos DROP COLUMN data_validade');
            } catch (e) {}
            await awsConn.query(`
                CREATE ALGORITHM=UNDEFINED DEFINER=\`admin\`@\`%\` SQL SECURITY DEFINER VIEW \`vw_dim_produtos\` AS 
                select 
                    \`p\`.\`codigo_produto\` AS \`codigo_produto\`,
                    \`p\`.\`codigo_setor\` AS \`codigo_setor\`,
                    \`p\`.\`nome\` AS \`nome_produto\`,
                    \`p\`.\`descricao\` AS \`descricao\`,
                    \`p\`.\`valor\` AS \`preco_venda\`,
                    \`p\`.\`preco_custo\` AS \`preco_custo\`,
                    \`p\`.\`preco_oferta\` AS \`preco_oferta\`,
                    (case when ((\`p\`.\`preco_oferta\` is not null) and (\`p\`.\`preco_oferta\` > 0)) then \`p\`.\`preco_oferta\` else \`p\`.\`valor\` end) AS \`preco_efetivo\`,
                    \`p\`.\`is_retiravel\` AS \`is_retiravel\`,
                    \`p\`.\`disponibilidade\` AS \`disponibilidade\`,
                    \`p\`.\`marca\` AS \`marca\`,
                    \`p\`.\`categoria\` AS \`categoria\`,
                    \`p\`.\`quantidade_estoque\` AS \`quantidade_estoque\`,
                    \`p\`.\`unidade_medida\` AS \`unidade_medida\` 
                from \`produtos\` \`p\`
            `);
            console.log("Concluído na AWS!");
            await awsConn.end();
        }
    } catch (e) {
        console.log("Erro AWS:", e.message);
    }
}

removeValidade();
