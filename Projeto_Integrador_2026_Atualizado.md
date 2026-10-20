# UNISAL - CENTRO UNIVERSITÁRIO SALESIANO DE SÃO PAULO
## Campus São José - Campinas / 2026

**PROJETO INTEGRADOR**  
**IMPLEMENTAÇÃO DE SOLUÇÃO WEB RESPONSIVA PARA DIGITALIZAÇÃO DE PROCESSOS DE VENDA E AGENDAMENTO EM MICROEMPRESAS**  
*ELABORAÇÃO DE UM SITE PARA DIVULGAÇÃO, IMPLEMENTAÇÃO DO E-COMMERCE E INTELIGÊNCIA DE DADOS (BI) EM UM PEQUENO COMÉRCIO*

**Integrantes:**
- Lucas Welington de Almeida Silva | RA - 250027996
- Thiago da Silva Gama | RA - 250028658
- Wand Rherison Derley Pereira Alves Silva | RA - 230024244
- Pedro Henrique Porto | RA - 250027960
- Rafael Santana Rodrigues | RA - 250028383

---

## 1. INTRODUÇÃO

### 1.1 - CONTEXTO E MOTIVAÇÃO
Este projeto integrador foi desenvolvido em parceria com a **Padaria Diniz**, estabelecimento comercial localizado na Rua Cordilheira dos Andes, 906, Jardim Nova Europa, Hortolândia – SP, fundada em 7 de setembro de 2015. A empresa, de natureza jurídica Sociedade Empresária Limitada (CNPJ 22.806.048/0001-24), atua no comércio varejista de alimentos, abrangendo padaria, açougue, hortifruti e mercado.

Apesar de possuir uma sólida base de clientes locais, a padaria operava inteiramente no modelo de divulgação tradicional: cartazes físicos e o marketing boca a boca. Essa limitação impedia o crescimento sustentável do negócio, a conquista de novos consumidores e a retenção daqueles que buscam a conveniência de consultar produtos, verificar disponibilidade e realizar pedidos programados antes de sair de casa. Além disso, a ausência de um repositório centralizado de dados impossibilitava análises precisas sobre faturamento real, margens de lucro e tempos operacionais de atendimento.

### 1.2 - DIAGNÓSTICO DOS PROBLEMAS IDENTIFICADOS
Por meio de entrevistas e formulários aplicados diretamente ao proprietário, Elton Dias Moreira, foram mapeados os seguintes gargalos centrais:
- **Limitação de tempo para divulgação online:** A rotina operacional, voltada quase que exclusivamente à produção e ao atendimento presencial no balcão, não permitia dedicação à criação de conteúdo digital ou atendimento manual por redes sociais.
- **Dificuldade na comunicação de promoções:** As ofertas eram comunicadas de forma restrita por cartazes no próprio comércio, limitando o alcance e gerando perdas em produtos perecíveis.
- **Dependência exclusiva do marketing boca a boca:** Embora funcional em escala de bairro, essa estratégia restringe o potencial de escala comercial.
- **Ausência de métricas de gestão e inteligência de negócios:** O comerciante não possuía visibilidade sobre indicadores-chave (KPIs), como Ticket Médio, Lead Time de preparo dos pedidos, produtos com maior margem de contribuição e curva de vendas por setor.

### 1.3 - OBJETIVOS DO PROJETO
Diante do diagnóstico, o projeto foi estruturado com os seguintes objetivos:
- Promover a imersão digital da Padaria Diniz com uma plataforma online profissional, responsiva e de alta disponibilidade.
- Criar um catálogo online setorizado com mais de 160 itens categorizados (Padaria, Açougue, Hortifruti, Frios e Mercado), facilitando a jornada de compra.
- Implementar a funcionalidade **"Peça e Retire"**, com cálculo em tempo real e agendamento de data/horário de retirada com geração de código identificador único.
- Garantir acessibilidade digital plena, em conformidade com as diretrizes internacionais **WCAG** (*Web Content Accessibility Guidelines*).
- Disponibilizar um módulo administrativo completo com persistência em **Banco de Dados Relacional (MySQL)** com proteção de dados históricos via *Soft Delete*.
- Estruturar um ecossistema analítico de **Business Intelligence (Power BI)** com modelagem dimensional em Esquema Estrela (*Star Schema*) e fórmulas DAX para apoiar decisões estratégicas de precificação, estoque e logística.

### 1.4 - SOLUÇÃO DESENVOLVIDA
A solução engloba uma aplicação web completa associada a uma camada analítica de dados:

* **Catálogo de Produtos Inteligente:** Organização dinâmica em seções, unificação de categorias afins, mapeamento de tags promocionais ("oferta" e "retirável") e renderização otimizada com imagens integradas ao banco.
* **Eficiência e Cálculo Automático ("Peça e Retire"):** Agendamento com controle de transação segura (`ACID`) no backend, validação de produtos existentes e persistência de timestamps exatos para cálculo de tempos de preparo.
* **Módulo do Cliente:** Cadastro, login com hashing/validação segura e tela interativa de consulta de pedidos ("Meus Pedidos") com suporte a cancelamento justificado e filtros.
* **Módulo Administrativo:** Painel restrito para o comerciante cadastrar/editar produtos, gerenciar status dos pedidos (Pendente, Em Preparo, Pronto para Retirada, Finalizado e Cancelado) e acionar rotinas de limpeza lógica (*Soft Delete*).
* **Camada Analítica de Business Intelligence (Power BI):** Conjunto de Views SQL de alta performance integradas ao Power BI Desktop via motor em memória VertiPaq, permitindo monitoramento de receitas, lucratividade e tempos de atendimento.

### 1.5 - ARQUITETURA E FLUXO DE NAVEGAÇÃO
O sistema opera sob o modelo Client-Server integrado a um Banco de Dados Relacional e conectado à suíte analítica:
1. **Área Pública / Cliente:** Home $\rightarrow$ Login/Cadastro $\rightarrow$ Catálogo por Setor $\rightarrow$ Agendamento/Carrinho $\rightarrow$ Checkout ("Peça e Retire") com Código Único $\rightarrow$ Acompanhamento em "Meus Pedidos".
2. **Área Administrativa (ADM):** Login ADM $\rightarrow$ Verificação de Acesso $\rightarrow$ Gestão por Setor $\rightarrow$ Edição de Catálogo/Estoque $\rightarrow$ Atualização de Status dos Pedidos com justificativas.
3. **Camada de BI e Gestão:** Banco MySQL $\rightarrow$ Views Analíticas (`vw_fato_vendas`, `vw_dim_*`) $\rightarrow$ Power BI $\rightarrow$ Dashboard com Indicadores Estratégicos (DAX).

### 1.6 - PLANEJAMENTO E METODOLOGIA
Utilizou-se a abordagem ágil com priorização de requisitos pelo método **MoSCoW** (*Must, Should, Could, Won't*) dividida em sprints:
- **Sprint 1:** Wireframes no Figma, arquitetura da informação, catálogo responsivo, autenticação e sistema base de agendamento.
- **Sprint 2:** Backend transacional em Node.js/Express, migração e normalização do banco relacional MySQL, painel administrativo.
- **Sprint 3 (Consolidada):** Implementação de *Soft Delete*, Views Analíticas em SQL, modelagem em Esquema Estrela e criação do Dashboard em Power BI com DAX.
- **Sprint 4 (Em Andamento/Roadmap):** Migração do banco para a nuvem (*Cloud Database*), parametrização `.env` para trabalho em equipe, atualização automática no Power BI Service e gateway de pagamentos Pix.

---

## 2. DESCRIÇÃO DAS TECNOLOGIAS ENVOLVIDAS

### 2.1 - VISÃO GERAL DAS TECNOLOGIAS

| Tecnologia | Finalidade no Projeto |
| :--- | :--- |
| **HTML5 Semântico** | Estruturação de conteúdo acessível e otimizado para SEO com foco em Mobile First. |
| **CSS3 Responsivo** | Estilização moderna, Flexbox/Grid, variáveis de tema e Media Queries adaptadas a múltiplos dispositivos. |
| **JavaScript Puro (ES6+)** | Lógica interativa no cliente, manipulação do DOM, cálculo de totais e comunicação assíncrona com a API (Fetch). |
| **Node.js & Express** | Servidor de aplicação backend, rotas RESTful, pool assíncrono de conexões MySQL e servidor de arquivos estáticos. |
| **MySQL 8.0 (Relacional)** | Repositório central de dados com integridade referencial, transações ACID e views analíticas dedicadas. |
| **Power BI Desktop & DAX** | Plataforma de Business Intelligence, modelagem dimensional em Star Schema e métricas analíticas avançadas. |
| **Cloud Database & Dotenv** *(Próxima Fase)* | Hospedagem em nuvem do banco relacional com isolamento de credenciais em variáveis de ambiente. |

### 2.2 - HTML5 SEMÂNTICO E ACESSIBILIDADE DIGITAL (WCAG 2.1 - NÍVEL AA)
A plataforma foi concebida segundo os quatro princípios fundamentais da **WCAG 2.1** (*Perceptível, Operável, Compreensível e Robusto*):
- **Navegação Plena por Teclado (*Focus Visible* - Critério 2.4.7):** Implementação de indicadores visuais de foco (`:focus-visible`) com contraste elevado (`#D4AF37`) para links, botões e campos de formulário, permitindo que pessoas com deficiência motora naveguem integralmente apenas com a tecla `Tab`.
- **Atalhos de Navegação (*Skip Link* - Critério 2.4.1):** Inclusão de links ocultos acessíveis que permitem ao usuário saltar menus repetitivos e ir direto ao conteúdo principal.
- **Classe Utilitária `.sr-only` (*Screen Reader Only* - Critério 1.3.1):** Ocultação visual sem supressão auditiva (substituindo técnicas incorretas como `display:none`), garantindo que leitores de tela (como NVDA e TalkBack) verbalizem rótulos de campos e instruções contextuais.
- **Rótulos Dinâmicos Contextualizados (`aria-label` - Critério 2.4.4):** Inclusão de rótulos específicos nos botões dinâmicos gerados pelo catálogo (ex.: *"Agendar Pão Francês para retirada"* em vez de apenas *"Adicionar"*), evitando ambiguidades para o leitor de tela.
- **Hierarquia Semântica Unificada (Critério 1.3.1 e 2.4.6):** Padronização rigorosa da árvore de cabeçalhos (`<h1>` único por documento indicando o propósito da página, seguido de `<h2>` e `<h3>`), permitindo navegação estruturada por atalhos de voz.
- **Controle de Alertas em Tempo Real (`aria-live="polite"` - Critério 4.1.3):** Configuração de regiões ativas (*Live Regions*) para que atualizações de carrinho e mensagens de confirmação sejam comunicadas em áudio sem interromper a fala do assistente.

### 2.3 - CSS3 E RESPONSIVIDADE MOBILE FIRST
O design priorizou a experiência em dispositivos móveis (*Mobile First*), ajustando dinamicamente menus, botões de ação e vitrines de produtos para larguras inferiores a 768px por meio de Media Queries, além de disponibilizar alternância intuitiva entre modo claro e modo escuro (*Dark Mode*).

### 2.4 - BACKEND EM NODE.JS E ARQUITETURA DE ROTAS
O backend foi concebido com Node.js e Express, utilizando o driver `mysql2/promise`. As principais características técnicas incluem:
- **Pool de Conexões:** Otimização de concorrência com reutilização de conexões e suporte completo a chamadas assíncronas (`async/await`).
- **Transações ACID:** O checkout de pedidos utiliza `beginTransaction`, `commit` e `rollback`, garantindo que cabeçalho do pedido e itens sejam salvos atomicamente, prevenindo incoerências no banco.
- **CORS e Middleware Estático:** Habilitação de Cross-Origin Resource Sharing e entrega automatizada de arquivos estáticos da landing page diretamente na porta 3000.

### 2.5 - ARMAZENAMENTO DE DADOS E ENGENHARIA ANALÍTICA (MYSQL & POWER BI)
O ecossistema de dados opera em dois níveis complementares:
1. **Nível Transacional (OLTP - MySQL):** 
   - Armazenamento das tabelas de clientes, usuários, produtos, fotos em base64, setores e pedidos.
   - Implementação de **Soft Delete** (`excluido = TRUE`): quando o cliente ou o gestor limpa o histórico da tela, o dado **não é destruído fisicamente**, permitindo que os números de vendas históricas permaneçam preservados para o BI.
   - Registro de timestamps de controle (`data_pedido` e `data_hora_atualizacao`), registrando o ciclo de vida completo do atendimento.
2. **Nível Analítico (OLAP / BI - Power BI & Star Schema):**
   - Criação de Views especializadas no MySQL:
     - `vw_fato_vendas`: Tabela de fatos com métricas de vendas brutas, quantidades, custos unitários, custos totais, margem de contribuição e tempo de preparo (*Lead Time* em minutos).
     - `vw_dim_produtos`, `vw_dim_setor` e `vw_dim_clientes`: Dimensões com atributos descritivos e segmentações.
   - **Modelagem em Esquema Estrela (*Star Schema*):** Relacionamento de 1 para N entre as dimensões e a tabela fato, evitando redundâncias.
   - **Tabela Calendário Dinâmica (`dCalendario`):** Criada via DAX (`CALENDAR`, `ADDCOLUMNS`), garantindo análises temporais por ano, trimestre, mês e dia útil.
   - **Medidas DAX Estratégicas:** Fórmulas de **Receita Bruta**, **Margem de Lucro Real**, **Ticket Médio**, **Volume de Vendas por Setor** e **Lead Time Médio de Preparo**.

### 2.6 - PRÓXIMOS PASSOS TECNOLÓGICOS (ROADMAP EM IMPLEMENTAÇÃO)
Para garantir a escalabilidade da solução e permitir o trabalho colaborativo da equipe de desenvolvimento:
- **Migração para Banco de Dados na Nuvem (*Cloud Database*):** Migração do banco local para uma instância gerenciada em nuvem (como Railway, Aiven ou AWS RDS). Isso permitirá que toda a equipe de desenvolvedores, a aplicação web e os relatórios analíticos compartilhem da mesma fonte de dados viva e sincronizada em tempo real.
- **Segurança com Variáveis de Ambiente (`.env`):** Isolamento de credenciais sensíveis (host, portas, senhas de banco) por meio da biblioteca `dotenv`, seguindo as melhores práticas do manifesto *Twelve-Factor App*.
- **Atualização Automática no Power BI Service:** Publicação do painel no portal em nuvem da Microsoft com agendamento automático de recargas (*Scheduled Refresh*) via Gateway de Dados Local ou conexão direta na nuvem.
- **Integração de Gateway de Pagamento Online:** Implementação de pagamentos instantâneos via Pix através da API do Mercado Pago / EFI, diminuindo ainda mais o tempo de permanência no balcão físico.
- **Comunicação em Tempo Real:** Adoção de WebSockets (Socket.io) para avisar o cliente instantaneamente quando o seu pedido mudar de "Em Preparo" para "Pronto para Retirada".

---

## 3. IMPACTO DO PROJETO NA SOCIEDADE

### 3.1 - IMPACTO NO PEQUENO NEGÓCIO
A transformação digital promovida na Padaria Diniz gera impactos operacionais e estratégicos tangíveis:
- **Aumento no Faturamento e Ticket Médio:** A exposição atrativa das ofertas e a facilidade do "Peça e Retire" incentivam a compra planejada e de maior valor agregado.
- **Redução Significativa de Filas:** Os clientes agendados retiram seus pacotes prontos mediante apresentação do código, desafogando o atendimento presencial no horário de pico.
- **Gestão Baseada em Dados (*Data-Driven Business*):** O comerciante deixa de depender do "achismo" e passa a decidir seu cardápio, estoques perecíveis e promoções com base nas métricas do painel de Business Intelligence (margem real por produto e tempo de resposta da cozinha).

### 3.2 - IMPACTO NA INCLUSÃO DIGITAL E DISSEMINAÇÃO TECNOLÓGICA
Com mais de 19 milhões de micro e pequenas empresas no Brasil frequentemente desprovidas de suporte técnico qualificado, este projeto demonstra a viabilidade de digitalizar um comércio tradicional de bairro utilizando tecnologias modernas, acessíveis e de código aberto (*open-source*), servindo de modelo reprodutível para outros negócios regionais.

### 3.3 - IMPACTO NA ACESSIBILIDADE E INCLUSÃO SOCIAL
A aplicação das diretrizes WCAG garante a democratização do acesso às compras online para idosos e pessoas com deficiência visual ou motora da comunidade de Hortolândia, reafirmando o compromisso social da instituição de ensino e do comércio participante.

### 3.4 - IMPACTO EDUCACIONAL E ACADÊMICO
O projeto viabilizou aos acadêmicos do UNISAL a aplicação prática da metodologia *Project-Based Learning* (PBL), unindo Front-end responsivo, Engenharia de Software no Back-end, Modelagem de Banco de Dados Relacional, Cultura DevOps (nuvem e variáveis de ambiente) e Inteligência de Negócios (Power BI/DAX) em um caso de uso real e funcional.

### 3.5 - IMPACTO NA ECONOMIA LOCAL
A digitalização estimula a circulação de renda dentro do próprio Jardim Nova Europa em Hortolândia, gerando maior retenção de clientes na economia do bairro e servindo de referência de inovação para outros comerciantes do polo regional.
