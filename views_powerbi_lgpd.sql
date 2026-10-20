-- ==============================================================================
-- SCRIPT DE CRIAÇÃO DAS VIEWS ANALÍTICAS & USUÁRIO POWER BI (LGPD COMPLIANT)
-- Projeto: Padaria Diniz - UNISAL 2026
-- ==============================================================================

USE padaria;

-- 1. VIEW FATO VENDAS
CREATE OR REPLACE VIEW `vw_fato_vendas` AS 
SELECT 
    iv.codigo_item,
    iv.codigo_pedido,
    p.codigo_cliente,
    iv.codigo_produto,
    prod.codigo_setor,
    iv.quantidade,
    iv.preco_unitario,
    (iv.quantidade * iv.preco_unitario) AS subtotal_venda,
    (iv.quantidade * prod.preco_custo) AS custo_total,
    ((iv.quantidade * iv.preco_unitario) - (iv.quantidade * prod.preco_custo)) AS lucro_bruto,
    p.data_pedido,
    CAST(p.data_pedido AS DATE) AS data_pedido_data,
    p.data_hora_atualizacao,
    p.status_pedido,
    p.tipo_pedido,
    p.tipo_pagamento,
    p.origem
FROM itens_venda iv
JOIN pedidos p ON iv.codigo_pedido = p.codigo_pedido
JOIN produtos prod ON iv.codigo_produto = prod.codigo_produto;

-- 2. VIEW DIMENSÃO PRODUTOS
CREATE OR REPLACE VIEW `vw_dim_produtos` AS 
SELECT 
    p.codigo_produto,
    p.nome AS nome_produto,
    p.preco_venda,
    p.preco_custo,
    (p.preco_venda - p.preco_custo) AS margem_unitaria,
    p.codigo_setor,
    s.nome AS nome_setor,
    p.tipo_venda,
    p.estoque_atual,
    p.estoque_minimo,
    CASE 
        WHEN p.estoque_atual <= p.estoque_minimo THEN 'Alerta Reposição'
        ELSE 'Normal'
    END AS status_estoque,
    p.ativo
FROM produtos p
JOIN setor s ON p.codigo_setor = s.codigo_setor;

-- 3. VIEW DIMENSÃO SETORES
CREATE OR REPLACE VIEW `vw_dim_setor` AS 
SELECT 
    codigo_setor,
    nome AS nome_setor
FROM setor;

-- 4. VIEW DIMENSÃO CLIENTES (COM MASCARAMENTO LGPD DE DADOS SENSÍVEIS)
CREATE OR REPLACE VIEW `vw_dim_clientes` AS 
SELECT 
    c.codigo_cliente,
    c.codigo_usuario,
    c.nome AS nome_cliente,
    SUBSTRING_INDEX(c.nome, ' ', 1) AS primeiro_nome,
    CASE 
        WHEN c.cpf IS NOT NULL AND LENGTH(c.cpf) >= 11 
        THEN CONCAT('***.', SUBSTRING(c.cpf, 5, 7), '-**')
        ELSE '***.***.***-**'
    END AS cpf,
    CASE 
        WHEN c.telefone IS NOT NULL AND LENGTH(c.telefone) >= 8
        THEN CONCAT(SUBSTRING(c.telefone, 1, 5), ' *****-', RIGHT(c.telefone, 4))
        ELSE 'Não informado'
    END AS telefone,
    CONCAT(LEFT(u.email, 2), '***@', SUBSTRING_INDEX(u.email, '@', -1)) AS email,
    u.tipo_usuario
FROM clientes c
JOIN usuarios u ON c.codigo_usuario = u.codigo_usuario;

-- ==============================================================================
-- 5. CRIAÇÃO DO USUÁRIO DE MENOR PRIVILÉGIO PARA O POWER BI (LEAST PRIVILEGE)
-- ==============================================================================
-- Este usuário só tem permissão de leitura (SELECT) estritamente nas 4 Views.
-- Não possui acesso a tabelas de usuários, senhas, ou dados brutos não mascarados.

CREATE USER IF NOT EXISTS 'powerbi_user'@'%' IDENTIFIED BY 'PadariaBI@2026';
GRANT SELECT ON padaria.vw_fato_vendas TO 'powerbi_user'@'%';
GRANT SELECT ON padaria.vw_dim_produtos TO 'powerbi_user'@'%';
GRANT SELECT ON padaria.vw_dim_setor TO 'powerbi_user'@'%';
GRANT SELECT ON padaria.vw_dim_clientes TO 'powerbi_user'@'%';
FLUSH PRIVILEGES;
