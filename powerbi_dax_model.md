# Modelagem Power BI & Fórmulas DAX - Padaria Diniz

Este documento contém a especificação analítica completa, scripts DAX da tabela de dimensões de tempo (`dCalendario`), medidas de inteligência de negócios (BI), regras de integridade com base nas atualizações recentes do banco de dados MySQL na AWS RDS e a arquitetura em **Star Schema** (Esquema Estrela) para o Power BI.

---

## 1. Tabela Calendário (`dCalendario`)

No Power BI, acesse a aba **Modelagem > Nova Tabela** e insira o código DAX abaixo:

```dax
dCalendario = 
VAR DataMinima = MIN(vw_fato_vendas[data_pedido_data])
VAR DataMaxima = MAX(vw_fato_vendas[data_pedido_data])
-- Inicia no primeiro dia do mês em que ocorreram as primeiras vendas (01/07/2026)
VAR DataInicio = IF(ISBLANK(DataMinima), DATE(2026, 7, 1), DATE(YEAR(DataMinima), MONTH(DataMinima), 1))
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

---

## 2. Medidas Analíticas DAX (Tabela `_Medidas`)

Recomendação: Crie uma tabela vazia chamada `_Medidas` para centralizar todas as fórmulas DAX do relatório.

> ⚠️ **Nota Importante sobre Tipagem (True/False vs Integer):**
> No MySQL, colunas booleanas utilizam `TINYINT(1)`. Ao conectar o Power BI, o Power Query detecta automaticamente e converte a coluna `is_excluido` para o tipo **Lógico (True/False / Verdadeiro/Falso)**.
> No DAX, não é permitido comparar diretamente um campo booleano com números (`= 0` ou `= 1`), gerando o erro:
> *"Operações de comparação DAX não oferecem suporte à comparação de valores do tipo True/False com valores do tipo Integer"*.
> Todas as medidas abaixo já utilizam a sintaxe correta do DAX para colunas lógicas: `vw_fato_vendas[is_excluido] = FALSE()`.

---

### 2.1. Faturamento & Receita

#### Receita Bruta (Vendas Válidas)
Considera todas as vendas válidas (excluindo pedidos cancelados e pedidos com exclusão lógica `is_excluido = TRUE()`).

```dax
Receita Bruta = 
CALCULATE(
    SUM(vw_fato_vendas[subtotal_venda]),
    vw_fato_vendas[status_pedido] <> "Cancelado",
    vw_fato_vendas[is_excluido] = FALSE()
)
```
* **Formatação:** Moeda (`R$ #,##0.00`)

#### Receita Faturada (Realizada)
Faturamento de pedidos cujo status operacional já foi concluído (`Finalizado`).

```dax
Receita Faturada = 
CALCULATE(
    SUM(vw_fato_vendas[subtotal_venda]),
    vw_fato_vendas[status_pedido] = "Finalizado",
    vw_fato_vendas[is_excluido] = FALSE()
)
```
* **Formatação:** Moeda (`R$ #,##0.00`)

#### Receita em Aberto (Esteira de Produção)
Valor de pedidos ativos que estão pendentes ou em produção na padaria.

```dax
Receita em Aberto = 
CALCULATE(
    SUM(vw_fato_vendas[subtotal_venda]),
    vw_fato_vendas[status_pedido] IN {"Pendente", "Em produção"},
    vw_fato_vendas[is_excluido] = FALSE()
)
```
* **Formatação:** Moeda (`R$ #,##0.00`)

#### Receita Cancelada (Perda)
Total faturável que foi perdido devido a cancelamento de pedidos.

```dax
Receita Cancelada = 
CALCULATE(
    SUM(vw_fato_vendas[subtotal_venda]),
    vw_fato_vendas[status_pedido] = "Cancelado"
)
```
* **Formatação:** Moeda (`R$ #,##0.00`)

---

### 2.2. Custos, Lucro & Rentabilidade

#### Custo Total (CMV - Custo da Mercadoria Vendida)
Soma do custo de aquisição/fabricação dos produtos vendidos em pedidos válidos.

```dax
Custo Total = 
CALCULATE(
    SUM(vw_fato_vendas[custo_total]),
    vw_fato_vendas[status_pedido] <> "Cancelado",
    vw_fato_vendas[is_excluido] = FALSE()
)
```
* **Formatação:** Moeda (`R$ #,##0.00`)

#### Lucro Real (Lucro Bruto)
Resultado financeiro efetivo: Receita Bruta menos o Custo das Mercadorias Vendidas.

```dax
Lucro Real = 
[Receita Bruta] - [Custo Total]
```
* **Formatação:** Moeda (`R$ #,##0.00`)

#### Margem de Lucro Real (%)
Percentual de rentabilidade líquida sobre a receita faturada.

```dax
Margem de Lucro Real = 
DIVIDE([Lucro Real], [Receita Bruta], 0)
```
* **Formatação:** Percentual (`0.0%` ou `0.00%`)

#### Markup Médio (%)
Percentual de acréscimo aplicado sobre o custo de produção/mercadoria.

```dax
Markup Médio = 
DIVIDE([Lucro Real], [Custo Total], 0)
```
* **Formatação:** Percentual (`0.0%`)

---

### 2.3. Gestão de Ofertas & Descontos

Com as atualizações no banco de dados, `vw_fato_vendas` armazena o preço efetivamente cobrado em `preco_unitario`, enquanto `vw_dim_produtos` mantém o `preco_venda` original de tabela. As medidas abaixo mensuram o impacto financeiro das promoções.

#### Desconto Total Concedido
Mede o montante em reais economizado pelos clientes em itens que estavam em oferta.

```dax
Desconto Total Concedido = 
CALCULATE(
    SUMX(
        vw_fato_vendas,
        VAR PrecoTabela = RELATED(vw_dim_produtos[preco_venda])
        VAR Diferenca = (PrecoTabela - vw_fato_vendas[preco_unitario]) * vw_fato_vendas[quantidade]
        RETURN IF(Diferenca > 0, Diferenca, 0)
    ),
    vw_fato_vendas[status_pedido] <> "Cancelado",
    vw_fato_vendas[is_excluido] = FALSE()
)
```
* **Formatação:** Moeda (`R$ #,##0.00`)

#### % Médio de Desconto
Representatividade do desconto em relação à receita potencial cheia de tabela.

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
Contagem distinta de pedidos não cancelados e não excluídos.

```dax
Qtd Pedidos = 
CALCULATE(
    DISTINCTCOUNT(vw_fato_vendas[codigo_pedido]),
    vw_fato_vendas[status_pedido] <> "Cancelado",
    vw_fato_vendas[is_excluido] = FALSE()
)
```
* **Formatação:** Número Inteiro (`#,##0`)

#### Quantidade de Pedidos Finalizados
Total de pedidos retirados e concluídos com sucesso.

```dax
Qtd Pedidos Finalizados = 
CALCULATE(
    DISTINCTCOUNT(vw_fato_vendas[codigo_pedido]),
    vw_fato_vendas[status_pedido] = "Finalizado",
    vw_fato_vendas[is_excluido] = FALSE()
)
```
* **Formatação:** Número Inteiro (`#,##0`)

#### Quantidade de Pedidos Cancelados
Contagem de pedidos que foram cancelados.

```dax
Qtd Pedidos Cancelados = 
CALCULATE(
    DISTINCTCOUNT(vw_fato_vendas[codigo_pedido]),
    vw_fato_vendas[status_pedido] = "Cancelado"
)
```
* **Formatação:** Número Inteiro (`#,##0`)

#### Total Geral de Pedidos Gerados
Volume total de pedidos criados na plataforma (inclui todos os status).

```dax
Total Geral Pedidos = 
DISTINCTCOUNT(vw_fato_vendas[codigo_pedido])
```
* **Formatação:** Número Inteiro (`#,##0`)

#### Taxa de Cancelamento (%)
Proporção de pedidos cancelados em relação ao total gerado.

```dax
Taxa de Cancelamento = 
DIVIDE([Qtd Pedidos Cancelados], [Total Geral Pedidos], 0)
```
* **Formatação:** Percentual (`0.0%`)

#### Ticket Médio por Pedido
Valor médio faturado por pedido válido.

```dax
Ticket Médio = 
DIVIDE([Receita Bruta], [Qtd Pedidos], 0)
```
* **Formatação:** Moeda (`R$ #,##0.00`)

#### Volume de Vendas (Unidades Físicas)
Quantidade total de unidades comercializadas.

```dax
Volume de Vendas = 
CALCULATE(
    SUM(vw_fato_vendas[quantidade]),
    vw_fato_vendas[status_pedido] <> "Cancelado",
    vw_fato_vendas[is_excluido] = FALSE()
)
```
* **Formatação:** Número Inteiro (`#,##0`)
* **Formatação:** Número Inteiro (`#,##0`)

#### Média de Itens por Pedido
Número médio de itens contidos em cada pedido de cliente.

```dax
Média Itens por Pedido = 
DIVIDE([Volume de Vendas], [Qtd Pedidos], 0)
```
* **Formatação:** Decimal (`0.0`)

#### Preço Médio por Item
Valor médio cobrado por unidade física comercializada.

```dax
Preço Médio por Item = 
DIVIDE([Receita Bruta], [Volume de Vendas], 0)
```
* **Formatação:** Moeda (`R$ #,##0.00`)

#### % Volume por Setor
Participação percentual de cada setor (Padaria, Confeitaria, Frios, etc.) no volume total vendido.

```dax
% Volume por Setor = 
DIVIDE(
    [Volume de Vendas],
    CALCULATE([Volume de Vendas], ALLSELECTED(vw_dim_setor)),
    0
)
```
* **Formatação:** Percentual (`0.0%`)

---

### 2.5. Eficiência Operacional & Lead Time de Preparo

> **Otimização:** A view `vw_fato_vendas` no MySQL já traz a coluna `lead_time_minutos` pré-calculada via `TIMESTAMPDIFF(MINUTE, p.data_pedido, p.data_hora_atualizacao)` para pedidos finalizados. Isso elimina a necessidade de `DATEDIFF` linha a linha no Power BI, tornando o dashboard instantâneo.

#### Lead Time Médio de Preparo (Minutos)
Tempo médio que a padaria leva desde o recebimento do pedido até a sua finalização. O `SUMMARIZE` no nível de `codigo_pedido` impede que pedidos com vários itens dupliquem o tempo.

```dax
Lead Time Médio de Preparo (Minutos) = 
CALCULATE(
    AVERAGEX(
        SUMMARIZE(
            FILTER(
                vw_fato_vendas,
                vw_fato_vendas[status_pedido] = "Finalizado" &&
                NOT(ISBLANK(vw_fato_vendas[lead_time_minutos]))
            ),
            vw_fato_vendas[codigo_pedido],
            "MinutosPedido", MAX(vw_fato_vendas[lead_time_minutos])
        ),
        [MinutosPedido]
    )
)
```
* **Formatação:** Decimal (`0.0`)

#### Lead Time Médio de Preparo (Horas)
Tempo médio convertido em horas.

```dax
Lead Time Médio de Preparo (Horas) = 
DIVIDE([Lead Time Médio de Preparo (Minutos)], 60, 0)
```
* **Formatação:** Decimal (`0.0`)

#### Lead Time Formatado
Exibição amigável em cartões e KPIs (Exemplo: `1h 15min` ou `45min`).

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
#### Meta Lead Time (Minutos)
Meta padrão operacional da padaria para tempo de preparo e entrega (SLA: 30 minutos).

```dax
Meta Lead Time = 30
```
* **Formatação:** Número Inteiro (`0`)

#### % Pedidos no Prazo (Atingimento de SLA)
Percentual de pedidos finalizados que foram entregues dentro da meta de 30 minutos.

```dax
% Pedidos no Prazo = 
VAR MetaMinutos = [Meta Lead Time]
RETURN
DIVIDE(
    CALCULATE(
        DISTINCTCOUNT(vw_fato_vendas[codigo_pedido]),
        vw_fato_vendas[status_pedido] = "Finalizado",
        vw_fato_vendas[is_excluido] = FALSE(),
        FILTER(
            vw_fato_vendas,
            vw_fato_vendas[lead_time_minutos] <= MetaMinutos
        )
    ),
    [Qtd Pedidos Finalizados],
    0
)
```
* **Formatação:** Percentual (`0.0%`)

#### Status KPI Lead Time
Texto e indicador visual do estado do preparo para rótulos em cartões.

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
Retorna o código HEX para colorir dinamicamente cartões, medidores ou fundos de visuais.

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
    "#C62828" -- Vermelho (Atrasado)
)
```
* **Formatação:** Texto (Código HEX)

---

### 2.6. Inteligência Temporal (Time Intelligence)

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

#### Receita Acumulada no Ano (YTD)
Faturamento acumulado desde o início do ano civil (*Year-to-Date*).

```dax
Receita YTD = 
TOTALYTD([Receita Bruta], dCalendario[Data])
```
* **Formatação:** Moeda (`R$ #,##0.00`)

---

### 2.7. Métricas de Clientes & Retirada

#### Clientes Ativos (Compradores)
Quantidade de clientes únicos que realizaram compras válidas no período.

```dax
Clientes Compradores = 
CALCULATE(
    DISTINCTCOUNT(vw_fato_vendas[codigo_cliente]),
    vw_fato_vendas[status_pedido] <> "Cancelado",
    vw_fato_vendas[is_excluido] = FALSE()
)
```
* **Formatação:** Número Inteiro (`#,##0`)

#### Ticket Médio por Cliente
Gasto médio por cliente cadastrado comprador.

```dax
Ticket Médio por Cliente = 
DIVIDE([Receita Bruta], [Clientes Compradores], 0)
```
* **Formatação:** Moeda (`R$ #,##0.00`)

#### Pedidos com Agendamento de Retirada (Histórico Total)
Quantidade total de pedidos no período que tiveram agendamento explícito com data e hora de retirada (inclui finalizados e pendentes, excluindo apenas cancelados).

```dax
Qtd Pedidos Agendados = 
CALCULATE(
    DISTINCTCOUNT(vw_fato_vendas[codigo_pedido]),
    NOT(ISBLANK(vw_fato_vendas[data_retirada])),
    vw_fato_vendas[status_pedido] <> "Cancelado",
    vw_fato_vendas[is_excluido] = FALSE()
)
```
* **Formatação:** Número Inteiro (`#,##0`)

#### Pedidos Agendados Pendentes (Fila Ativa a Entregar)
Pedidos com agendamento de retirada que ainda estão em aberto na cozinha/balcão aguardando entrega (`Pendente` ou `Em produção`).

```dax
Qtd Agendados Pendentes = 
CALCULATE(
    DISTINCTCOUNT(vw_fato_vendas[codigo_pedido]),
    NOT(ISBLANK(vw_fato_vendas[data_retirada])),
    vw_fato_vendas[status_pedido] IN { "Pendente", "Em produção" },
    vw_fato_vendas[is_excluido] = FALSE()
)
```
* **Formatação:** Número Inteiro (`#,##0`)

#### Pedidos Agendados para Hoje (Operação do Dia)
Pedidos agendados com previsão de entrega para o dia corrente (`TODAY()`) que ainda não foram finalizados.

```dax
Qtd Agendados para Hoje = 
CALCULATE(
    DISTINCTCOUNT(vw_fato_vendas[codigo_pedido]),
    vw_fato_vendas[data_retirada] = TODAY(),
    vw_fato_vendas[status_pedido] IN { "Pendente", "Em produção" },
    vw_fato_vendas[is_excluido] = FALSE()
)
```
* **Formatação:** Número Inteiro (`#,##0`)

---

### 2.8. Gestão de Estoque & Reposição de Produtos

Medidas e regras analíticas para monitoramento em tempo real do nível de inventário na tabela `vw_dim_produtos`.

#### Estoque Total de Produtos
Soma do volume físico de mercadorias atualmente disponíveis nas prateleiras e estoque.

```dax
Estoque Total = 
SUM(vw_dim_produtos[quantidade_estoque])
```
* **Formatação:** Número Inteiro (`#,##0`)

#### Quantidade de Produtos Esgotados
Contagem de itens do catálogo com estoque zerado (`0 unidades`).

```dax
Qtd Produtos Esgotados = 
CALCULATE(
    COUNTROWS(vw_dim_produtos),
    vw_dim_produtos[quantidade_estoque] = 0
)
```
* **Formatação:** Número Inteiro (`#,##0`)

#### Quantidade de Produtos em Alerta de Reposição
Contagem de itens com estoque baixo (entre 1 e 10 unidades), exigindo nova produção ou pedido ao fornecedor.

```dax
Qtd Produtos em Alerta = 
CALCULATE(
    COUNTROWS(vw_dim_produtos),
    vw_dim_produtos[quantidade_estoque] > 0,
    vw_dim_produtos[quantidade_estoque] <= 10
)
```
* **Formatação:** Número Inteiro (`#,##0`)

#### Status do Estoque (Coluna Calculada em `vw_dim_produtos`)
Classificação visual por semáforo de criticidade para cada item.

```dax
Status Estoque = 
VAR Qtd = vw_dim_produtos[quantidade_estoque]
RETURN
SWITCH(
    TRUE(),
    Qtd = 0,   "🔴 Esgotado",
    Qtd <= 10, "🟡 Estoque Baixo",
    "🟢 Normal"
)
```
* **Tipo:** Coluna Calculada de Texto

#### Cor Status Estoque (Formatação Condicional)
Retorna o código HEX para aplicar automaticamente em cores de fontes, planos de fundo de tabelas e barras de gráficos.

```dax
Cor Status Estoque = 
VAR Qtd = SELECTEDVALUE(vw_dim_produtos[quantidade_estoque], SUM(vw_dim_produtos[quantidade_estoque]))
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

## 3. Diagrama de Relacionamentos (Esquema Estrela / Star Schema)

```
       +--------------------+
       |    dCalendario     |
       |  [Data] (1)        |
       +---------+----------+
                 |
                 | (1:N)
                 v
+----------------+----------------+      (N:1)      +--------------------+
|         vw_fato_vendas          | --------------> |  vw_dim_produtos   |
| [data_pedido_data]              |                 | [codigo_produto]   |
| [codigo_produto]                |                 +---------+----------+
| [codigo_cliente]                |                           | (N:1)
| [codigo_setor]                  |                           v
+----------------+----------------+      (N:1)      +--------------------+
                 | --------------> |  vw_dim_setor      |
                 |                 | [codigo_setor]     |
                 | (N:1)           +--------------------+
                 v
       +--------------------+
       |  vw_dim_clientes   |
       | [codigo_cliente]   |
       +--------------------+
```

### Detalhes das Chaves e Cardinalidades:
| Tabela Origem (Fato) | Coluna Origem | Tabela Destino (Dimensão) | Coluna Destino | Cardinalidade | Direção do Filtro |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `vw_fato_vendas` | `data_pedido_data` | `dCalendario` | `Data` | Muitos para Um (N:1) | Única (`dCalendario` filtra `vw_fato_vendas`) |
| `vw_fato_vendas` | `codigo_produto` | `vw_dim_produtos` | `codigo_produto` | Muitos para Um (N:1) | Única (`vw_dim_produtos` filtra `vw_fato_vendas`) |
| `vw_fato_vendas` | `codigo_cliente` | `vw_dim_clientes` | `codigo_cliente` | Muitos para Um (N:1) | Única (`vw_dim_clientes` filtra `vw_fato_vendas`) |
| `vw_fato_vendas` | `codigo_setor` | `vw_dim_setor` | `codigo_setor` | Muitos para Um (N:1) | Única (`vw_dim_setor` filtra `vw_fato_vendas`) |
| `vw_dim_produtos` | `codigo_setor` | `vw_dim_setor` | `codigo_setor` | Muitos para Um (N:1) | Única (opcional / floco de neve se utilizado) |

---

## 4. Dicionário de Colunas das Views (MySQL AWS RDS)

### `vw_fato_vendas`
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
