# Modelagem Power BI & Fórmulas DAX - Padaria Diniz

Este documento contém a especificação analítica completa, scripts DAX da tabela de dimensões de tempo (`dCalendario`), catálogo de medidas DAX otimizadas de alta performance, arquitetura em **Star Schema** (Esquema Estrela), funil financeiro em cascata, controle de fila e lead time operacional, e regras de monitoramento de estoque para o Power BI.

---

## 1. Tabela Calendário (`dCalendario`)

No Power BI, acesse a aba **Modelagem > Nova Tabela** e insira o código DAX abaixo:

```dax
dCalendario = 
VAR DataMinima = MIN('padaria vw_fato_vendas'[data_pedido_data])
VAR DataMaxima = MAX('padaria vw_fato_vendas'[data_pedido_data])
-- Inicia no primeiro dia do mês em que ocorreram as primeiras vendas (Janeiro de 2024)
VAR DataInicio = IF(ISBLANK(DataMinima), DATE(2024, 1, 1), DATE(YEAR(DataMinima), MONTH(DataMinima), 1))
-- Finaliza no último dia com movimentação de vendas (ou TODAY())
VAR DataFim    = IF(ISBLANK(DataMaxima), TODAY(), DataMaxima)

RETURN
ADDCOLUMNS (
    CALENDAR(DataInicio, DataFim),
    "Data", [Date],
    "Ano", YEAR([Date]),
    "TrimestreNum", QUARTER([Date]),
    "Trimestre", "T" & FORMAT([Date], "Q"),
    "TrimestreAno", "T" & FORMAT([Date], "Q") & "/" & YEAR([Date]),
    "MesNum", MONTH([Date]),
    "MesNome", FORMAT([Date], "mmmm", "pt-BR"),
    "MesAbrev", UPPER(FORMAT([Date], "mmm", "pt-BR")),
    "MesAno", FORMAT([Date], "mmm/yyyy", "pt-BR"),
    "AnoMesNum", YEAR([Date]) * 100 + MONTH([Date]),
    "Dia", DAY([Date]),
    "DiaSemanaNum", WEEKDAY([Date], 2), -- 1 = Segunda-feira, 7 = Domingo
    "DiaSemanaNome", FORMAT([Date], "dddd", "pt-BR"),
    "DiaSemanaAbrev", FORMAT([Date], "ddd", "pt-BR"),
    "SemanaAno", WEEKNUM([Date], 2),
    "DiaDoAno", DATEDIFF(DATE(YEAR([Date]), 1, 1), [Date], DAY) + 1,
    "EhFimDeSemana", IF(WEEKDAY([Date], 2) >= 6, "Sim", "Não"),
    "EhDiaUtil", IF(WEEKDAY([Date], 2) < 6, 1, 0)
)
```

> **Configurações Essenciais no Power BI:**
> 1. Marque a tabela como **Tabela de Data Oficial** (`Ferramentas de Tabela > Marcar como Tabela de Data`, Coluna: `Data`).
> 2. Ordene a coluna `MesNome` pela coluna `MesNum`.
> 3. Ordene a coluna `MesAbrev` pela coluna `MesNum`.
> 4. Ordene a coluna `MesAno` pela coluna `AnoMesNum`.
> 5. Ordene a coluna `DiaSemanaNome` pela coluna `DiaSemanaNum`.
> 6. Crie o relacionamento **1:N** entre `dCalendario[Data]` (1) e `'padaria vw_fato_vendas'[data_pedido_data]` (N).

---

## 2. Catálogo de Medidas DAX (Tabela `_Medidas`)

> 💡 **Boas Práticas de Engenharia DAX Aplicadas:**
> * **Tabela Dedicada:** Centralize todas as medidas na tabela `_Medidas` (crie uma tabela vazia via Inserir Dados).
> * **Variáveis (`VAR / RETURN`):** Previnem recálculos redundantes na engine VertiPaq, melhorando o tempo de renderização de visuais.
> * **Divisões Seguras (`DIVIDE`):** Protegem contra erros de divisão por zero (`#DIV/0!`), retornando `BLANK()` ou `0` de forma controlada.
> * **Campos Lógicos (`is_excluido`):** Como o Power Query converte `TINYINT(1)` para booleano, todas as medidas usam estritamente `'padaria vw_fato_vendas'[is_excluido] = FALSE()`.
> * **Referenciamento Padrão:** Medidas são referenciadas sem nome de tabela (`[Receita Bruta]`), enquanto colunas contêm sempre o prefixo da tabela (`'padaria vw_fato_vendas'[quantidade]`).

---

### 2.1. Faturamento & Receita

#### Receita Bruta (Vendas Válidas)
Mede o faturamento bruto gerado por todos os pedidos válidos (desconsidera pedidos cancelados e registros excluídos logicamente).

```dax
Receita Bruta = 
CALCULATE(
    SUM('padaria vw_fato_vendas'[subtotal_venda]),
    'padaria vw_fato_vendas'[status_pedido] <> "Cancelado",
    'padaria vw_fato_vendas'[is_excluido] = FALSE()
)
```
* **Formatação:** Moeda (`R$ #,##0.00`)
* **Uso:** Cartões principais de KPI, gráficos de evolução temporal e matrizes de vendas.

#### Receita Faturada (Realizada no Caixa)
Total financeiro proveniente exclusivamente de pedidos cujo status operacional já foi concluído (`Finalizado`).

```dax
Receita Faturada = 
CALCULATE(
    SUM('padaria vw_fato_vendas'[subtotal_venda]),
    'padaria vw_fato_vendas'[status_pedido] = "Finalizado",
    'padaria vw_fato_vendas'[is_excluido] = FALSE()
)
```
* **Formatação:** Moeda (`R$ #,##0.00`)
* **Uso:** Acompanhamento de caixa efetivo e conciliação financeira.

#### Receita em Aberto (Esteira de Produção & Fila)
Valor monetário de pedidos que estão ativos e em processo de atendimento (`Pendente` ou `Em produção`).

```dax
Receita em Aberto = 
CALCULATE(
    SUM('padaria vw_fato_vendas'[subtotal_venda]),
    'padaria vw_fato_vendas'[status_pedido] IN { "Pendente", "Em produção" },
    'padaria vw_fato_vendas'[is_excluido] = FALSE()
)
```
* **Formatação:** Moeda (`R$ #,##0.00`)
* **Uso:** Monitoramento de pedidos em esteira, controle de capacidade produtiva e previsão de faturamento imediato.

#### Receita Cancelada (Perda de Faturamento)
Total financeiro que deixou de entrar no caixa por cancelamento de pedidos.

```dax
Receita Cancelada = 
CALCULATE(
    SUM('padaria vw_fato_vendas'[subtotal_venda]),
    'padaria vw_fato_vendas'[status_pedido] = "Cancelado"
)
```
* **Formatação:** Moeda (`R$ #,##0.00`)
* **Uso:** Diagnóstico de atrito no atendimento, indisponibilidade ou desistência.

#### Receita Média Diária
Faturamento médio gerado por dia útil com vendas no período selecionado.

```dax
Receita Média Diária = 
VAR DiasComVenda = 
    CALCULATE(
        DISTINCTCOUNT('padaria vw_fato_vendas'[data_pedido_data]),
        'padaria vw_fato_vendas'[status_pedido] <> "Cancelado",
        'padaria vw_fato_vendas'[is_excluido] = FALSE()
    )
RETURN
DIVIDE([Receita Bruta], DiasComVenda, 0)
```
* **Formatação:** Moeda (`R$ #,##0.00`)

---

### 2.2. Lucro Real, Custos & Rentabilidade

#### Custo Total (CMV - Custo da Mercadoria Vendida)
Soma do custo de aquisição ou matéria-prima de todos os produtos comercializados em pedidos válidos.

```dax
Custo Total = 
CALCULATE(
    SUM('padaria vw_fato_vendas'[custo_total]),
    'padaria vw_fato_vendas'[status_pedido] <> "Cancelado",
    'padaria vw_fato_vendas'[is_excluido] = FALSE()
)
```
* **Formatação:** Moeda (`R$ #,##0.00`)
* **Uso:** Controle de custos diretos e margem de contribuição.

#### Lucro Real (Lucro Bruto Efetivo)
Resultado econômico real gerado pela operação da padaria: faturamento líquido de devoluções menos o custo dos produtos vendidos.

```dax
Lucro Real = 
VAR Receita = [Receita Bruta]
VAR Custo = [Custo Total]
RETURN
Receita - Custo
```
* **Formatação:** Moeda (`R$ #,##0.00`)
* **Uso:** KPI card principal de lucratividade e gráficos de rentabilidade por produto/setor.

#### Margem de Lucro Real (%)
Percentual da receita que é convertida em lucro bruto após dedução dos custos diretos.

```dax
Margem de Lucro Real = 
VAR Receita = [Receita Bruta]
VAR Lucro = [Lucro Real]
RETURN
DIVIDE(Lucro, Receita, 0)
```
* **Formatação:** Percentual (`0.0%` ou `0.00%`)
* **Uso:** Avaliação de eficiência de precificação e mix de produtos.

#### Markup Médio (%)
Percentual médio de margem praticada sobre o custo dos produtos.

```dax
Markup Médio = 
VAR Custo = [Custo Total]
VAR Lucro = [Lucro Real]
RETURN
DIVIDE(Lucro, Custo, 0)
```
* **Formatação:** Percentual (`0.0%`)

#### Lucro Médio por Pedido
Margem de contribuição líquida média deixada por cada pedido atendido.

```dax
Lucro Médio por Pedido = 
DIVIDE([Lucro Real], [Qtd Pedidos], 0)
```
* **Formatação:** Moeda (`R$ #,##0.00`)

#### Farol KPI Margem de Lucro (Formatação Condicional)
Retorna código hexadecimal para colorir indicadores visuais (KPIs) conforme a saúde da margem (Verde ≥ 35%, Âmbar 20% a 35%, Vermelho < 20%).

```dax
Cor KPI Margem = 
VAR Margem = [Margem de Lucro Real]
RETURN
SWITCH(
    TRUE(),
    ISBLANK(Margem), "#7A6A5A", -- Cinza
    Margem >= 0.35,  "#2E7D32", -- Verde Escuro (Excelente)
    Margem >= 0.20,  "#F57C00", -- Âmbar / Laranja (Moderado)
    "#C62828"                   -- Vermelho (Crítico / Baixa Margem)
)
```
* **Formatação:** Texto (Código HEX)

---

### 2.3. Gestão de Ofertas, Promoções & Descontos

#### Desconto Total Concedido
Mede o montante em reais economizado pelos clientes em decorrência de preços promocionais (`preco_oferta` vs `preco_venda` de tabela).

```dax
Desconto Total Concedido = 
CALCULATE(
    SUMX(
        'padaria vw_fato_vendas',
        VAR PrecoTabela = RELATED('padaria vw_dim_produtos'[preco_venda])
        VAR Diferenca = (PrecoTabela - 'padaria vw_fato_vendas'[preco_unitario]) * 'padaria vw_fato_vendas'[quantidade]
        RETURN IF(Diferenca > 0, Diferenca, 0)
    ),
    'padaria vw_fato_vendas'[status_pedido] <> "Cancelado",
    'padaria vw_fato_vendas'[is_excluido] = FALSE()
)
```
* **Formatação:** Moeda (`R$ #,##0.00`)

#### % Desconto Médio Concedido
Representatividade do desconto concedido sobre o faturamento cheio de catálogo.

```dax
% Desconto Médio = 
VAR ReceitaCheia = [Receita Bruta] + [Desconto Total Concedido]
RETURN
DIVIDE([Desconto Total Concedido], ReceitaCheia, 0)
```
* **Formatação:** Percentual (`0.0%`)

---

### 2.4. Pedidos, Ticket Médio & Volume

#### Quantidade de Pedidos Válidos
Contagem de pedidos concluídos ou ativos na esteira (exclui cancelados e exclusões lógicas).

```dax
Qtd Pedidos = 
CALCULATE(
    DISTINCTCOUNT('padaria vw_fato_vendas'[codigo_pedido]),
    'padaria vw_fato_vendas'[status_pedido] <> "Cancelado",
    'padaria vw_fato_vendas'[is_excluido] = FALSE()
)
```
* **Formatação:** Número Inteiro (`#,##0`)

#### Quantidade de Pedidos Finalizados
Total de pedidos entregues ao cliente com sucesso.

```dax
Qtd Pedidos Finalizados = 
CALCULATE(
    DISTINCTCOUNT('padaria vw_fato_vendas'[codigo_pedido]),
    'padaria vw_fato_vendas'[status_pedido] = "Finalizado",
    'padaria vw_fato_vendas'[is_excluido] = FALSE()
)
```
* **Formatação:** Número Inteiro (`#,##0`)

#### Quantidade de Pedidos Cancelados
Volume de pedidos que foram cancelados antes da conclusão.

```dax
Qtd Pedidos Cancelados = 
CALCULATE(
    DISTINCTCOUNT('padaria vw_fato_vendas'[codigo_pedido]),
    'padaria vw_fato_vendas'[status_pedido] = "Cancelado"
)
```
* **Formatação:** Número Inteiro (`#,##0`)

#### Total Geral de Pedidos Gerados (Volume Total da Plataforma)
Volume absoluto de pedidos inseridos na plataforma, servindo de base para cálculo de conversão.

```dax
Total Geral Pedidos = 
DISTINCTCOUNT('padaria vw_fato_vendas'[codigo_pedido])
```
* **Formatação:** Número Inteiro (`#,##0`)

#### Taxa de Conversão de Pedidos (%)
Percentual de pedidos criados que foram finalizados com êxito.

```dax
Taxa de Conversão Pedidos = 
DIVIDE([Qtd Pedidos Finalizados], [Total Geral Pedidos], 0)
```
* **Formatação:** Percentual (`0.0%`)

#### Taxa de Cancelamento (%)
Proporção de pedidos cancelados sobre o total de pedidos registrados.

```dax
Taxa de Cancelamento = 
DIVIDE([Qtd Pedidos Cancelados], [Total Geral Pedidos], 0)
```
* **Formatação:** Percentual (`0.0%`)

#### Ticket Médio Geral por Pedido
Valor médio faturado por pedido válido na padaria.

```dax
Ticket Médio = 
DIVIDE([Receita Bruta], [Qtd Pedidos], 0)
```
* **Formatação:** Moeda (`R$ #,##0.00`)

#### Ticket Médio Realizado (Finalizados)
Valor médio faturado por pedido efetivamente concluído e pago.

```dax
Ticket Médio Finalizado = 
DIVIDE([Receita Faturada], [Qtd Pedidos Finalizados], 0)
```
* **Formatação:** Moeda (`R$ #,##0.00`)

#### Volume de Vendas (Unidades Físicas)
Quantidade total de itens e produtos vendidos.

```dax
Volume de Vendas = 
CALCULATE(
    SUM('padaria vw_fato_vendas'[quantidade]),
    'padaria vw_fato_vendas'[status_pedido] <> "Cancelado",
    'padaria vw_fato_vendas'[is_excluido] = FALSE()
)
```
* **Formatação:** Número Inteiro (`#,##0`)

#### Média de Itens por Pedido
Tamanho médio da cesta de compras por pedido.

```dax
Média Itens por Pedido = 
DIVIDE([Volume de Vendas], [Qtd Pedidos], 0)
```
* **Formatação:** Decimal (`0.0`)

#### Preço Médio por Item Vendido
Preço médio praticado por unidade física comercializada.

```dax
Preço Médio por Item = 
DIVIDE([Receita Bruta], [Volume de Vendas], 0)
```
* **Formatação:** Moeda (`R$ #,##0.00`)

---

### 2.5. Volume e Vendas por Setor

#### Participação do Volume por Setor (% Mix Físico)
Percentual de unidades comercializadas por cada setor em relação ao volume global.

```dax
% Volume por Setor = 
VAR VolumeSetor = [Volume de Vendas]
VAR VolumeTotal = CALCULATE([Volume de Vendas], ALLSELECTED('padaria vw_dim_setor'))
RETURN
DIVIDE(VolumeSetor, VolumeTotal, 0)
```
* **Formatação:** Percentual (`0.0%`)
* **Uso:** Gráficos de rosca/pizza ou barras 100% empilhadas.

#### Participação da Receita por Setor (% Share Financeiro)
Participação de cada setor no faturamento total da padaria.

```dax
% Receita por Setor = 
VAR ReceitaSetor = [Receita Bruta]
VAR ReceitaTotal = CALCULATE([Receita Bruta], ALLSELECTED('padaria vw_dim_setor'))
RETURN
DIVIDE(ReceitaSetor, ReceitaTotal, 0)
```
* **Formatação:** Percentual (`0.0%`)

#### Ranking de Setores por Faturamento
Classificação dinâmica dos setores do maior para o menor faturamento.

```dax
Rank Setor por Receita = 
IF(
    ISBLANK([Receita Bruta]),
    BLANK(),
    RANKX(ALLSELECTED('padaria vw_dim_setor'[nome_setor]), [Receita Bruta], , DESC, Dense)
)
```
* **Formatação:** Número Inteiro (`0`)

#### Ranking de Setores por Volume Físico
Classificação dos setores que mais movimentam volume de mercadorias.

```dax
Rank Setor por Volume = 
IF(
    ISBLANK([Volume de Vendas]),
    BLANK(),
    RANKX(ALLSELECTED('padaria vw_dim_setor'[nome_setor]), [Volume de Vendas], , DESC, Dense)
)
```
* **Formatação:** Número Inteiro (`0`)

---

### 2.6. Funil Financeiro (Waterflow / Cascata de Receita)

O funil financeiro decompõe o fluxo monetário desde o catálogo cheio até o lucro de caixa, ideal para alimentar visuais de **Gráfico de Cascata (Waterfall Chart)** e **Funil (Funnel Visual)**.

```
[Receita Potencial Cheia]
    └── (-) Descontos Promocionais Concedidos
           └── (-) Perdas por Cancelamento
                  └── (=) Receita Bruta Válida
                         ├── Receita em Aberto (Esteira de Produção)
                         └── Receita Faturada (Entregue no Caixa)
                                └── (-) CMV (Custo dos Produtos)
                                       └── (=) Lucro Real Efetivo
```

#### 1. Receita Potencial Bruta (Topo do Funil - Preço Cheio de Catálogo)
Total que teria sido arrecadado se todos os itens tivessem sido vendidos pelo preço de tabela original, sem descontos e sem cancelamentos.

```dax
Funil 1 - Receita Potencial = 
[Receita Bruta] + [Desconto Total Concedido] + [Receita Cancelada]
```
* **Formatação:** Moeda (`R$ #,##0.00`)

#### 2. Descontos Promocionais Concedidos (Impacto de Ofertas)
Valor total de descontos concedidos em relação à tabela cheia (apresentado como valor negativo para gráficos cascata).

```dax
Funil 2 - Descontos Concedidos = 
-[Desconto Total Concedido]
```
* **Formatação:** Moeda (`R$ #,##0.00`)

#### 3. Perda Financeira por Cancelamentos
Impacto monetário de pedidos cancelados antes da conclusão.

```dax
Funil 3 - Perda Cancelamentos = 
-[Receita Cancelada]
```
* **Formatação:** Moeda (`R$ #,##0.00`)

#### 4. Receita Bruta Operacional (Pedidos Válidos)
Faturamento contratado de pedidos ativos e finalizados.

```dax
Funil 4 - Receita Operacional = 
[Receita Bruta]
```
* **Formatação:** Moeda (`R$ #,##0.00`)

#### 5. Receita Efetivamente Realizada (Concluída no Caixa)
Receita de pedidos 100% finalizados e retirados pelo cliente.

```dax
Funil 5 - Receita Realizada = 
[Receita Faturada]
```
* **Formatação:** Moeda (`R$ #,##0.00`)

#### 6. Custo da Mercadoria Vendida (Dedução de CMV)
Custo direto das mercadorias dos pedidos válidos (negativo para cascata).

```dax
Funil 6 - CMV = 
-[Custo Total]
```
* **Formatação:** Moeda (`R$ #,##0.00`)

#### 7. Lucro Real Final (Fundo do Funil)
Resultado final gerado pela padaria.

```dax
Funil 7 - Lucro Real = 
[Lucro Real]
```
* **Formatação:** Moeda (`R$ #,##0.00`)

#### Taxa de Retenção de Receita do Funil (%)
Percentual da receita potencial original que foi efetivamente convertida em lucro líquido de produto.

```dax
Taxa de Retenção de Lucro % = 
DIVIDE([Lucro Real], [Funil 1 - Receita Potencial], 0)
```
* **Formatação:** Percentual (`0.0%`)

---

### 2.7. Receita Acumulada & Inteligência Temporal (Time Intelligence)

#### Receita Acumulada Contínua (Running Total)
Soma cumulativa dia a dia da receita ao longo do período selecionado, com trava inteligente para não projetar linhas vazias no futuro.

```dax
Receita Acumulada = 
VAR UltimaDataVendas = CALCULATE(MAX('padaria vw_fato_vendas'[data_pedido_data]), ALL('padaria vw_fato_vendas'))
VAR DataContexto = MAX(dCalendario[Data])
RETURN
IF(
    DataContexto <= UltimaDataVendas,
    CALCULATE(
        [Receita Bruta],
        FILTER(
            ALLSELECTED(dCalendario[Data]),
            dCalendario[Data] <= DataContexto
        )
    ),
    BLANK()
)
```
* **Formatação:** Moeda (`R$ #,##0.00`)
* **Uso:** Gráficos de linha de crescimento acumulado de receita.

#### Receita Acumulada no Mês (MTD - Month to Date)
Faturamento acumulado desde o primeiro dia do mês corrente.

```dax
Receita MTD = 
TOTALMTD([Receita Bruta], dCalendario[Data])
```
* **Formatação:** Moeda (`R$ #,##0.00`)

#### Receita Acumulada no Trimestre (QTD - Quarter to Date)
Faturamento acumulado desde o início do trimestre corrente.

```dax
Receita QTD = 
TOTALQTD([Receita Bruta], dCalendario[Data])
```
* **Formatação:** Moeda (`R$ #,##0.00`)

#### Receita Acumulada no Ano (YTD - Year to Date)
Faturamento acumulado desde o primeiro dia do ano corrente.

```dax
Receita YTD = 
TOTALYTD([Receita Bruta], dCalendario[Data])
```
* **Formatação:** Moeda (`R$ #,##0.00`)

#### Receita do Mês Anterior (MoM)
Faturamento registrado no mês imediatamente anterior.

```dax
Receita Mês Anterior = 
CALCULATE(
    [Receita Bruta],
    DATEADD(dCalendario[Data], -1, MONTH)
)
```
* **Formatação:** Moeda (`R$ #,##0.00`)

#### Variação MoM (Crescimento Mensal em R$)
Diferença monetária em reais comparada ao mês anterior.

```dax
Variação MoM R$ = 
VAR RecAtual = [Receita Bruta]
VAR RecAnterior = [Receita Mês Anterior]
RETURN
IF(ISBLANK(RecAnterior), BLANK(), RecAtual - RecAnterior)
```
* **Formatação:** Moeda (`+R$ #,##0.00;-R$ #,##0.00;R$ 0.00`)

#### Crescimento MoM (%)
Variação percentual do faturamento em relação ao mês anterior (*Month-over-Month*).

```dax
Crescimento MoM % = 
VAR RecAtual = [Receita Bruta]
VAR RecAnterior = [Receita Mês Anterior]
RETURN
IF(
    ISBLANK(RecAnterior) || RecAnterior == 0,
    BLANK(),
    DIVIDE(RecAtual - RecAnterior, RecAnterior, 0)
)
```
* **Formatação:** Percentual (`+0.0%;-0.0%;0.0%`)

#### Receita do Ano Anterior (YoY - Same Period Last Year)
Faturamento no mesmo período do ano anterior.

```dax
Receita Ano Anterior = 
CALCULATE(
    [Receita Bruta],
    SAMEPERIODLASTYEAR(dCalendario[Data])
)
```
* **Formatação:** Moeda (`R$ #,##0.00`)

#### Crescimento YoY (%)
Variação percentual do faturamento em relação ao ano anterior (*Year-over-Year*).

```dax
Crescimento YoY % = 
VAR RecAtual = [Receita Bruta]
VAR RecAnterior = [Receita Ano Anterior]
RETURN
IF(
    ISBLANK(RecAnterior) || RecAnterior == 0,
    BLANK(),
    DIVIDE(RecAtual - RecAnterior, RecAnterior, 0)
)
```
* **Formatação:** Percentual (`+0.0%;-0.0%;0.0%`)

---

### 2.8. Lead Time Médio de Preparo, Fila & Retirada

A view analítica `'padaria vw_fato_vendas'` já pré-calcula o tempo em minutos através de `TIMESTAMPDIFF(MINUTE, p.data_pedido, p.data_hora_atualizacao)` para pedidos finalizados. As fórmulas abaixo agrupam no grânulo de `codigo_pedido` para garantir que pedidos com múltiplos itens não distorçam a média.

#### Lead Time Médio de Preparo (Minutos)
Tempo médio que a padaria leva desde a criação do pedido pelo cliente até a finalização do preparo na cozinha.

```dax
Lead Time Médio de Preparo (Minutos) = 
CALCULATE(
    AVERAGEX(
        SUMMARIZE(
            'padaria vw_fato_vendas',
            'padaria vw_fato_vendas'[codigo_pedido],
            "MinutosPedido", MAX('padaria vw_fato_vendas'[lead_time_minutos])
        ),
        [MinutosPedido]
    ),
    'padaria vw_fato_vendas'[status_pedido] = "Finalizado",
    'padaria vw_fato_vendas'[is_excluido] = FALSE(),
    NOT(ISBLANK('padaria vw_fato_vendas'[lead_time_minutos]))
)
```
* **Formatação:** Decimal (`0.0`)

#### Lead Time Médio de Preparo (Horas)
Tempo médio convertido em horas decimais.

```dax
Lead Time Médio de Preparo (Horas) = 
DIVIDE([Lead Time Médio de Preparo (Minutos)], 60, 0)
```
* **Formatação:** Decimal (`0.0`)

#### Lead Time Formatado (Exibição Executiva)
Formatação elegante para cartões de KPI (Exemplo: `1h 15min` ou `28min`).

```dax
Lead Time Formatado = 
VAR MinutosTotais = [Lead Time Médio de Preparo (Minutos)]
VAR Horas = INT(DIVIDE(MinutosTotais, 60))
VAR Minutos = MOD(ROUND(MinutosTotais, 0), 60)
RETURN
IF(
    ISBLANK(MinutosTotais),
    "-",
    IF(Horas > 0, FORMAT(Horas, "0") & "h ", "") & FORMAT(Minutos, "0") & "min"
)
```
* **Formatação:** Texto

#### Meta de Lead Time (SLA Operacional em Minutos)
Meta padrão da padaria para tempo de preparo e atendimento no balcão (SLA: 30 minutos).

```dax
Meta Lead Time = 30
```
* **Formatação:** Número Inteiro (`0`)

#### % Pedidos no Prazo (Atingimento de SLA de Preparo)
Percentual de pedidos finalizados entregues rigorosamente dentro da meta de 30 minutos.

```dax
% Pedidos no Prazo = 
VAR MetaMinutos = [Meta Lead Time]
VAR PedidosNoPrazo = 
    CALCULATE(
        DISTINCTCOUNT('padaria vw_fato_vendas'[codigo_pedido]),
        'padaria vw_fato_vendas'[status_pedido] = "Finalizado",
        'padaria vw_fato_vendas'[is_excluido] = FALSE(),
        'padaria vw_fato_vendas'[lead_time_minutos] <= MetaMinutos
    )
RETURN
DIVIDE(PedidosNoPrazo, [Qtd Pedidos Finalizados], 0)
```
* **Formatação:** Percentual (`0.0%`)

#### Fila de Pedidos Ativa (Backlog em Tempo Real)
Quantidade de pedidos que estão atualmente na fila de espera ou em preparação na cozinha.

```dax
Fila de Pedidos Ativa = 
CALCULATE(
    DISTINCTCOUNT('padaria vw_fato_vendas'[codigo_pedido]),
    'padaria vw_fato_vendas'[status_pedido] IN { "Pendente", "Em produção" },
    'padaria vw_fato_vendas'[is_excluido] = FALSE()
)
```
* **Formatação:** Número Inteiro (`#,##0`)

#### Tempo Estimado de Espera da Fila (Minutos)
Projeção de tempo para esvaziar a fila ativa atual, baseado no Lead Time médio recente.

```dax
Tempo Estimado Espera Fila = 
VAR Fila = [Fila de Pedidos Ativa]
VAR LeadTimeMedio = [Lead Time Médio de Preparo (Minutos)]
RETURN
IF(Fila > 0 && NOT(ISBLANK(LeadTimeMedio)), Fila * LeadTimeMedio, 0)
```
* **Formatação:** Decimal (`0.0`)

#### Pedidos com Agendamento de Retirada (Total)
Volume de pedidos que utilizaram a funcionalidade de agendamento de retirada no balcão (*Click & Collect*).

```dax
Qtd Pedidos Agendados = 
CALCULATE(
    DISTINCTCOUNT('padaria vw_fato_vendas'[codigo_pedido]),
    NOT(ISBLANK('padaria vw_fato_vendas'[data_retirada])),
    'padaria vw_fato_vendas'[status_pedido] <> "Cancelado",
    'padaria vw_fato_vendas'[is_excluido] = FALSE()
)
```
* **Formatação:** Número Inteiro (`#,##0`)

#### Pedidos Agendados Pendentes (Aguardando Retirada)
Pedidos agendados prontos ou em preparo que aguardam a chegada do cliente.

```dax
Qtd Agendados Pendentes = 
CALCULATE(
    DISTINCTCOUNT('padaria vw_fato_vendas'[codigo_pedido]),
    NOT(ISBLANK('padaria vw_fato_vendas'[data_retirada])),
    'padaria vw_fato_vendas'[status_pedido] IN { "Pendente", "Em produção" },
    'padaria vw_fato_vendas'[is_excluido] = FALSE()
)
```
* **Formatação:** Número Inteiro (`#,##0`)

#### Pedidos Agendados para Hoje (Operação do Dia Corrente)
Pedidos agendados com data de retirada prevista para a data de hoje (`TODAY()`) e que ainda estão pendentes.

```dax
Qtd Agendados para Hoje = 
CALCULATE(
    DISTINCTCOUNT('padaria vw_fato_vendas'[codigo_pedido]),
    'padaria vw_fato_vendas'[data_retirada] = TODAY(),
    'padaria vw_fato_vendas'[status_pedido] IN { "Pendente", "Em produção" },
    'padaria vw_fato_vendas'[is_excluido] = FALSE()
)
```
* **Formatação:** Número Inteiro (`#,##0`)

#### Status KPI Lead Time
Classificação por semáforo textual para cartões operacionais.

```dax
Status KPI Lead Time = 
VAR Tempo = [Lead Time Médio de Preparo (Minutos)]
VAR Meta  = [Meta Lead Time]
RETURN
SWITCH(
    TRUE(),
    ISBLANK(Tempo), "-",
    Tempo <= Meta, "🟢 Dentro da Meta (≤ " & Meta & "min)",
    Tempo <= Meta * 1.5, "🟡 Atenção (31 a 45min)",
    "🔴 Gargalo (> 45min)"
)
```
* **Formatação:** Texto

#### Cor KPI Lead Time (Formatação Condicional)
Retorna o código HEX para colorir dinamicamente visuais de tempo de atendimento.

```dax
Cor KPI Lead Time = 
VAR Tempo = [Lead Time Médio de Preparo (Minutos)]
VAR Meta  = [Meta Lead Time]
RETURN
SWITCH(
    TRUE(),
    ISBLANK(Tempo), "#7A6A5A", -- Cinza
    Tempo <= Meta, "#2E7D32", -- Verde Escuro (No prazo)
    Tempo <= Meta * 1.5, "#F57C00", -- Âmbar / Laranja (Alerta)
    "#C62828" -- Vermelho (Gargalo / Atraso)
)
```
* **Formatação:** Texto (Código HEX)

---

### 2.9. Gestão & Alertas de Estoque

Medidas analíticas para monitoramento em tempo real do nível de inventário, valor imobilizado e prevenção de ruptura na tabela `'padaria vw_dim_produtos'`.

#### Estoque Total de Produtos (Unidades Físicas em Prateleira)
Soma de todas as unidades disponíveis em inventário.

```dax
Estoque Total = 
SUM('padaria vw_dim_produtos'[quantidade_estoque])
```
* **Formatação:** Número Inteiro (`#,##0`)

#### Valor do Estoque a Preço de Custo (Capital Imobilizado)
Mede o montante financeiro investido na compra/produção das mercadorias estocadas.

```dax
Valor do Estoque (Custo) = 
SUMX(
    'padaria vw_dim_produtos',
    'padaria vw_dim_produtos'[quantidade_estoque] * 'padaria vw_dim_produtos'[preco_custo]
)
```
* **Formatação:** Moeda (`R$ #,##0.00`)

#### Valor do Estoque a Preço de Venda (Potencial de Faturamento em Prateleira)
Valor potencial de receita caso todas as mercadorias estocadas sejam vendidas pelo preço de tabela/oferta.

```dax
Valor do Estoque (Venda) = 
SUMX(
    'padaria vw_dim_produtos',
    'padaria vw_dim_produtos'[quantidade_estoque] * 'padaria vw_dim_produtos'[preco_efetivo]
)
```
* **Formatação:** Moeda (`R$ #,##0.00`)

#### Lucro Projetado em Estoque
Margem de contribuição potencial aguardando venda no estoque.

```dax
Lucro Projetado em Estoque = 
[Valor do Estoque (Venda)] - [Valor do Estoque (Custo)]
```
* **Formatação:** Moeda (`R$ #,##0.00`)

#### Quantidade de Produtos no Catálogo
Total de SKUs cadastrados no mix da padaria.

```dax
Qtd Produtos Catálogo = 
DISTINCTCOUNT('padaria vw_dim_produtos'[codigo_produto])
```
* **Formatação:** Número Inteiro (`#,##0`)

#### Quantidade de Produtos Esgotados (Ruptura Total de Estoque)
Contagem de itens cadastrados com estoque zerado (`0 unidades`), gerando perda de oportunidade de venda.

```dax
Qtd Produtos Esgotados = 
CALCULATE(
    COUNTROWS('padaria vw_dim_produtos'),
    'padaria vw_dim_produtos'[quantidade_estoque] = 0
)
```
* **Formatação:** Número Inteiro (`#,##0`)

#### Taxa de Ruptura de Estoque (%)
Percentual de produtos do catálogo que estão sem estoque.

```dax
Taxa de Ruptura Estoque = 
DIVIDE([Qtd Produtos Esgotados], [Qtd Produtos Catálogo], 0)
```
* **Formatação:** Percentual (`0.0%`)

#### Quantidade de Produtos em Alerta de Reposição (Estoque Baixo)
Contagem de itens com estoque baixo (entre 1 e 10 unidades), demandando nova fornada ou pedido de compras ao fornecedor.

```dax
Qtd Produtos em Alerta = 
CALCULATE(
    COUNTROWS('padaria vw_dim_produtos'),
    'padaria vw_dim_produtos'[quantidade_estoque] > 0,
    'padaria vw_dim_produtos'[quantidade_estoque] <= 10
)
```
* **Formatação:** Número Inteiro (`#,##0`)

#### Quantidade de Produtos com Estoque Normal (> 10 un)
Total de itens operando em níveis seguros de estoque.

```dax
Qtd Produtos Estoque Normal = 
CALCULATE(
    COUNTROWS('padaria vw_dim_produtos'),
    'padaria vw_dim_produtos'[quantidade_estoque] > 10
)
```
* **Formatação:** Número Inteiro (`#,##0`)

#### Status do Estoque (Medida para Visuais e Tabelas)
Use esta versão se estiver criando através do botão **Nova Medida**. O `SELECTEDVALUE` obtém a quantidade da linha do produto selecionado no visual.

```dax
Status Estoque = 
VAR Qtd = SELECTEDVALUE('padaria vw_dim_produtos'[quantidade_estoque])
RETURN
IF(
    ISBLANK(Qtd),
    BLANK(),
    SWITCH(
        TRUE(),
        Qtd = 0,   "🔴 Esgotado",
        Qtd <= 10, "🟡 Estoque Baixo",
        "🟢 Normal"
    )
)
```
* **Tipo:** Medida (`_Medidas`)
* **Uso:** Tabelas, matrizes de produtos, tooltips e cartões.

#### Status do Estoque (Coluna Calculada para Filtros / Segmentação de Dados)
> ⚠️ **Atenção:** Para usar esta fórmula, selecione a tabela `'padaria vw_dim_produtos'` na lista de campos à direita e clique em **Ferramentas de Tabela / Ferramentas de Coluna > Nova Coluna** (e **NÃO** "Nova Medida"). Colunas calculadas permitem criar filtros/segmentações na tela para filtrar produtos por "Esgotado", "Estoque Baixo" ou "Normal".

```dax
Status Estoque Coluna = 
VAR Qtd = 'padaria vw_dim_produtos'[quantidade_estoque]
RETURN
SWITCH(
    TRUE(),
    Qtd = 0,   "🔴 Esgotado",
    Qtd <= 10, "🟡 Estoque Baixo",
    "🟢 Normal"
)
```
* **Tipo:** Coluna Calculada de Texto na tabela `'padaria vw_dim_produtos'`
* **Uso:** Segmentação de dados (Slicers/Filtros visuais na página).

#### Cor Status Estoque (Formatação Condicional HEX - Medida)
Retorna o código HEX para aplicar automaticamente em cores de fontes, planos de fundo de tabelas e barras de gráficos.

```dax
Cor Status Estoque = 
VAR Qtd = SELECTEDVALUE('padaria vw_dim_produtos'[quantidade_estoque], SUM('padaria vw_dim_produtos'[quantidade_estoque]))
RETURN
SWITCH(
    TRUE(),
    ISBLANK(Qtd), "#7A6A5A", -- Cinza
    Qtd = 0,      "#C62828", -- Vermelho forte (Esgotado)
    Qtd <= 10,    "#F57C00", -- Âmbar / Laranja (Alerta Reposição)
    "#2E7D32"                 -- Verde escuro (Normal)
)
```
* **Formatação:** Texto (Código HEX)

---

### 2.10. Clientes & Recorrência

#### Clientes Compradores Únicos
Quantidade de clientes cadastrados que realizaram compras válidas no período.

```dax
Clientes Compradores = 
CALCULATE(
    DISTINCTCOUNT('padaria vw_fato_vendas'[codigo_cliente]),
    'padaria vw_fato_vendas'[status_pedido] <> "Cancelado",
    'padaria vw_fato_vendas'[is_excluido] = FALSE()
)
```
* **Formatação:** Número Inteiro (`#,##0`)

#### Ticket Médio por Cliente
Gasto médio acumulado por cliente comprador.

```dax
Ticket Médio por Cliente = 
DIVIDE([Receita Bruta], [Clientes Compradores], 0)
```
* **Formatação:** Moeda (`R$ #,##0.00`)

#### Frequência Média de Compra
Número médio de pedidos realizados por cada cliente comprador.

```dax
Frequência Média de Compra = 
DIVIDE([Qtd Pedidos], [Clientes Compradores], 0)
```
* **Formatação:** Decimal (`0.0`)

---

## 3. Diagrama de Relacionamentos (Esquema Estrela / Star Schema)

```
       +--------------------+
       |    dCalendario     |
       |  [Data] (1)        |
       +---------+----------+
                 |
                 | (1:N)
                 v
+--------------------------------+      (N:1)      +----------------------------+
|    'padaria vw_fato_vendas'    | --------------> |  'padaria vw_dim_produtos' |
| [data_pedido_data]             |                 | [codigo_produto]           |
| [codigo_produto]               |                 +-------------+--------------+
| [codigo_cliente]               |                               | (N:1)
| [codigo_setor]                 |                               v
+----------------+---------------+      (N:1)      +----------------------------+
                 | ------------------------------> |   'padaria vw_dim_setor'   |
                 |                                 | [codigo_setor]             |
                 | (N:1)                           +----------------------------+
                 v
       +----------------------------+
       |  'padaria vw_dim_clientes' |
       | [codigo_cliente]           |
       +----------------------------+
```

### Detalhes das Chaves e Cardinalidades:
| Tabela Origem (Fato) | Coluna Origem | Tabela Destino (Dimensão) | Coluna Destino | Cardinalidade | Direção do Filtro |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `'padaria vw_fato_vendas'` | `data_pedido_data` | `dCalendario` | `Data` | Muitos para Um (N:1) | Única (`dCalendario` filtra `'padaria vw_fato_vendas'`) |
| `'padaria vw_fato_vendas'` | `codigo_produto` | `'padaria vw_dim_produtos'` | `codigo_produto` | Muitos para Um (N:1) | Única (`'padaria vw_dim_produtos'` filtra `'padaria vw_fato_vendas'`) |
| `'padaria vw_fato_vendas'` | `codigo_cliente` | `'padaria vw_dim_clientes'` | `codigo_cliente` | Muitos para Um (N:1) | Única (`'padaria vw_dim_clientes'` filtra `'padaria vw_fato_vendas'`) |
| `'padaria vw_fato_vendas'` | `codigo_setor` | `'padaria vw_dim_setor'` | `codigo_setor` | Muitos para Um (N:1) | Única (`'padaria vw_dim_setor'` filtra `'padaria vw_fato_vendas'`) |
| `'padaria vw_dim_produtos'` | `codigo_setor` | `'padaria vw_dim_setor'` | `codigo_setor` | Muitos para Um (N:1) | Única (opcional / integridade) |

---

## 4. Dicionário de Colunas das Views (MySQL AWS RDS)

### `'padaria vw_fato_vendas'`
* `codigo_item`: Chave primária do item do pedido.
* `codigo_pedido`: Identificador do pedido gerado.
* `codigo_retirada`: Código amigável exibido ao cliente para retirada no balcão.
* `codigo_cliente`: Chave estrangeira do cliente que realizou a compra.
* `codigo_produto`: Chave estrangeira do produto comprado.
* `codigo_setor`: Chave estrangeira do setor de produção.
* `data_pedido`: Data e hora de criação do pedido.
* `data_pedido_data`: Data pura (formato `YYYY-MM-DD`), otimizada para join com `dCalendario`.
* `hora_pedido`: Horário em que o pedido foi emitido.
* `data_hora_atualizacao`: Timestamp da última movimentação do status.
* `data_retirada`: Data agendada pelo cliente para retirada dos itens.
* `hora_retirada`: Horário agendado para retirada.
* `status_pedido`: Situação operacional (`Pendente`, `Em produção`, `Finalizado`, `Cancelado`).
* `forma_pagto`: Meio de pagamento selecionado pelo cliente.
* `justificativa`: Motivo do cancelamento (se houver).
* `is_excluido`: Flag booleana de exclusão lógica (`FALSE`/Falso para ativo, `TRUE`/Verdadeiro para histórico limpo). No Power BI é importada como tipo Lógico (True/False).
* `quantidade`: Quantidade de unidades compradas.
* `preco_unitario`: Preço unitário real faturado (já considera oferta/desconto).
* `subtotal_venda`: Valor total do item (`quantidade * preco_unitario`).
* `preco_custo_unitario`: Custo unitário de aquisição/produção do item.
* `custo_total`: Custo total das mercadorias vendidas (`quantidade * preco_custo_unitario`).
* `lucro_bruto`: Lucro em reais gerado pelo item (`subtotal_venda - custo_total`).
* `lead_time_minutos`: Minutos transcorridos entre o pedido e a entrega (apenas `Finalizados`).

### `'padaria vw_dim_produtos'`
* `codigo_produto`: Chave primária do produto.
* `codigo_setor`: Chave estrangeira do setor.
* `nome_produto`: Nome comercial do item.
* `descricao`: Descrição detalhada e ingredientes.
* `preco_venda`: Preço normal de tabela.
* `preco_custo`: Custo unitário de produção/aquisição.
* `preco_oferta`: Preço promocional cadastrado (se houver).
* `preco_efetivo`: Preço promocional quando ativo, ou preço normal.
* `is_retiravel`: Indicador de disponibilidade para agendamento de retirada online (1 = Sim, 0 = Apenas loja).
* `disponibilidade`: Flag de produto ativo no catálogo.
* `marca`: Marca do produto ou "Fabricação Própria".
* `categoria`: Categoria interna (ex: doces, bebidas, laticínios, pães).
* `quantidade_estoque`: Quantidade de unidades físicas disponíveis em estoque.
* `unidade_medida`: Unidade de mensuração (Un, Kg, Litro).

---

## 5. Matriz de Mapeamento de Visuais Recomendados no Power BI

| Visual Recomendado | Medidas Principais | Dimensões no Eixo / Linha | Objetivo Estratégico |
| :--- | :--- | :--- | :--- |
| **Cartões de KPI (Topo)** | `[Receita Bruta]`, `[Lucro Real]`, `[Margem de Lucro Real]`, `[Ticket Médio]`, `[Lead Time Formatado]` | N/A | Visão executiva imediata de saúde do negócio |
| **Gráfico de Linha (Temporal)** | `[Receita Bruta]`, `[Receita Acumulada]` | `dCalendario[Data]` | Acompanhamento diário e ritmo de crescimento acumulado |
| **Gráfico de Cascata (Waterfall)** | `[Funil 1 - Receita Potencial]`, `[Funil 2 - Descontos Concedidos]`, `[Funil 3 - Perda Cancelamentos]`, `[Funil 6 - CMV]`, `[Funil 7 - Lucro Real]` | Categorias do Funil | Decomposição financeira de perdas e formação do lucro real |
| **Gráfico de Barras por Setor** | `[Volume de Vendas]`, `[Receita Bruta]`, `[% Volume por Setor]` | `'padaria vw_dim_setor'[nome_setor]` | Análise de representatividade de volume e receita por setor |
| **Medidor (Gauge) de SLA** | `[Lead Time Médio de Preparo (Minutos)]` (Valor), `[Meta Lead Time]` (Destino: 30) | N/A | Controle de cumprimento de prazo e SLA operacional |
| **Tabela / Matriz de Estoque** | `[Estoque Total]`, `[Valor do Estoque (Custo)]`, `[Status Estoque]`, `[Cor Status Estoque]` | `'padaria vw_dim_produtos'[nome_produto]` | Gestão operacional de compras e alerta imediato de reposição |
