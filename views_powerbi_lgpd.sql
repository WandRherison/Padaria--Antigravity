-- ==============================================================================
-- SCRIPT DE CRIAÇÃO DAS VIEWS ANALÍTICAS & USUÁRIO POWER BI (LGPD COMPLIANT)
-- Projeto: Padaria Diniz - UNISAL 2026
-- Banco de Dados: MySQL (AWS RDS / Local)
-- ==============================================================================

USE padaria;

-- 1. VIEW FATO VENDAS (vw_fato_vendas)
-- Mapeia p.situacao para status_pedido (Pendente, Em produção, Finalizado, Cancelado)
CREATE OR REPLACE VIEW `vw_fato_vendas` AS 
SELECT 
    i.codigo_item,
    i.codigo_pedido,
    p.codigo_retirada,
    p.codigo_cliente,
    i.codigo_produto,
    pr.codigo_setor,
    p.data_pedido,
    CAST(p.data_pedido AS DATE) AS data_pedido_data,
    CAST(p.data_pedido AS TIME) AS hora_pedido,
    p.data_hora_atualizacao,
    p.data_retirada,
    p.hora_retirada,
    p.situacao AS status_pedido,
    p.forma_pagto,
    p.justificativa,
    p.excluido AS is_excluido,
    i.quantidade,
    i.preco_unitario,
    i.subtotal AS subtotal_venda,
    COALESCE(pr.preco_custo, 0.00) AS preco_custo_unitario,
    ROUND((i.quantidade * COALESCE(pr.preco_custo, 0.00)), 2) AS custo_total,
    ROUND((i.subtotal - (i.quantidade * COALESCE(pr.preco_custo, 0.00))), 2) AS lucro_bruto,
    (CASE 
        WHEN p.situacao = 'Finalizado' 
         AND p.data_hora_atualizacao IS NOT NULL 
         AND p.data_hora_atualizacao >= p.data_pedido 
        THEN TIMESTAMPDIFF(MINUTE, p.data_pedido, p.data_hora_atualizacao) 
        ELSE NULL 
    END) AS lead_time_minutos
FROM itens_pedidos i
JOIN pedidos p ON i.codigo_pedido = p.codigo_pedido
JOIN produtos pr ON i.codigo_produto = pr.codigo_produto;

-- 2. VIEW DIMENSÃO PRODUTOS (vw_dim_produtos)
CREATE OR REPLACE VIEW `vw_dim_produtos` AS 
SELECT 
    p.codigo_produto,
    p.codigo_setor,
    p.nome AS nome_produto,
    p.descricao,
    p.valor AS preco_venda,
    p.preco_custo,
    p.preco_oferta,
    (CASE 
        WHEN p.preco_oferta IS NOT NULL AND p.preco_oferta > 0 THEN p.preco_oferta 
        ELSE p.valor 
    END) AS preco_efetivo,
    p.is_retiravel,
    p.disponibilidade,
    p.data_validade,
    p.marca,
    p.categoria,
    p.quantidade_estoque,
    p.unidade_medida
FROM produtos p;

-- 3. VIEW DIMENSÃO SETOR (vw_dim_setor)
CREATE OR REPLACE VIEW `vw_dim_setor` AS 
SELECT 
    codigo_setor,
    nome AS nome_setor
FROM setor;

-- 4. VIEW DIMENSÃO CLIENTES (vw_dim_clientes - LGPD Compliant)
CREATE OR REPLACE VIEW `vw_dim_clientes` AS 
SELECT 
    c.codigo_cliente,
    c.codigo_usuario,
    c.nome AS nome_cliente,
    SUBSTRING_INDEX(c.nome, ' ', 1) AS primeiro_nome,
    (CASE 
        WHEN c.cpf IS NOT NULL AND LENGTH(c.cpf) >= 11 
        THEN CONCAT('***.', SUBSTR(c.cpf, 5, 7), '-**') 
        ELSE '***.***.***-**' 
    END) AS cpf,
    (CASE 
        WHEN c.telefone IS NOT NULL AND LENGTH(c.telefone) >= 8 
        THEN CONCAT(SUBSTR(c.telefone, 1, 5), ' *****-', RIGHT(c.telefone, 4)) 
        ELSE 'Não informado' 
    END) AS telefone,
    CONCAT(LEFT(u.email, 2), '***@', SUBSTRING_INDEX(u.email, '@', -1)) AS email,
    u.tipo_usuario
FROM clientes c
JOIN usuarios u ON c.codigo_usuario = u.codigo_usuario;

-- ==============================================================================
-- 5. CRIAÇÃO DO USUÁRIO DE MENOR PRIVILÉGIO PARA O POWER BI (LEAST PRIVILEGE)
-- ==============================================================================
CREATE USER IF NOT EXISTS 'powerbi_user'@'%' IDENTIFIED BY 'PadariaBI@2026';
GRANT SELECT ON padaria.vw_fato_vendas TO 'powerbi_user'@'%';
GRANT SELECT ON padaria.vw_dim_produtos TO 'powerbi_user'@'%';
GRANT SELECT ON padaria.vw_dim_setor TO 'powerbi_user'@'%';
GRANT SELECT ON padaria.vw_dim_clientes TO 'powerbi_user'@'%';
FLUSH PRIVILEGES;
