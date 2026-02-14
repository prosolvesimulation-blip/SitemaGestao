# 🏗️ Sistema de Gestão OFFCON

Sistema de gestão integrado completo para a **OFFCON - Containers Offshore**, empresa especializada em fabricação, locação, inspeção e manutenção de containers offshore certificados DNV.

## 🚀 Tecnologias Utilizadas

### Backend
- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **SQLite (better-sqlite3)** - Banco de dados
- **CORS** - Middleware para cross-origin
- **Helmet** - Segurança HTTP
- **Morgan** - Logger de requisições

### Frontend
- **React 18** - Biblioteca UI
- **React Router** - Navegação
- **Styled Components** - Estilização CSS-in-JS
- **Recharts** - Gráficos e visualizações
- **Axios** - Cliente HTTP
- **React Icons** - Ícones

## 📁 Estrutura do Projeto

```
gestao-offcon/
├── backend/
│   ├── database/
│   │   ├── connection.js      # Conexão SQLite
│   │   ├── schema.sql         # Estrutura do banco
│   │   └── seed.js            # Dados iniciais
│   ├── routes/
│   │   ├── dashboard.js       # API Dashboard
│   │   ├── clientes.js        # API Clientes
│   │   ├── equipamentos.js    # API Equipamentos
│   │   ├── locacoes.js        # API Locações
│   │   ├── projetos.js        # API Projetos
│   │   ├── inspecoes.js       # API Inspeções
│   │   ├── manutencoes.js     # API Manutenções
│   │   ├── financeiro.js      # API Financeiro
│   │   ├── relatorios.js      # API Relatórios
│   │   ├── compras.js         # API Compras (OC)
│   │   ├── ordens_servico.js  # API Ordens de Serviço (OS)
│   │   ├── planning.js        # API Planning/WBS/Gantt
│   │   └── ai.js              # API Assistente IA
│   ├── server.js              # Servidor Express
│   ├── package.json
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/        # Componentes reutilizáveis
│   │   │   │   ├── Layout.js
│   │   │   │   ├── Sidebar.js
│   │   │   │   ├── Header.js
│   │   │   │   ├── KPICard.js
│   │   │   │   ├── AlertCard.js
│   │   │   │   └── DataTable.js
│   │   │   └── modulos/       # Componentes de módulos
│   │   ├── pages/             # Páginas
│   │   │   ├── Dashboard.js
│   │   │   ├── Clientes.js
│   │   │   ├── Equipamentos.js
│   │   │   ├── Locacoes.js
│   │   │   ├── Projetos.js
│   │   │   ├── Inspecoes.js
│   │   │   ├── Manutencoes.js
│   │   │   ├── Financeiro.js
│   │   │   └── Relatorios.js
│   │   ├── services/
│   │   │   └── api.js         # Serviço de API
│   │   ├── contexts/
│   │   │   └── AppContext.js  # Contexto global
│   │   ├── styles/
│   │   │   └── global.css     # Estilos globais
│   │   ├── App.js
│   │   └── index.js
│   ├── public/
│   └── package.json
└── README.md
```

## 🛠️ Módulos do Sistema

### 1. 📊 Dashboard
- KPIs principais em tempo real
- Gráficos de desempenho
- Alertas automáticos
- Visão geral da operação

### 2. 👥 Gestão de Clientes (CRM)
- Cadastro completo de clientes
- Histórico de locações
- Projetos associados
- Contas financeiras

### 3. 📦 Gestão de Equipamentos
- Controle de containers
- Status em tempo real
- Histórico de inspeções
- Rastreamento de localização

### 4. 🤝 Gestão de Locações
- Contratos de locação
- Controle de disponibilidade
- Cálculo automático de valores
- Renovações e devoluções

### 5. 🔧 Gestão de Projetos
- Projetos customizados
- Acompanhamento de fabricação
- Controle de custos
- Gestão de prazos

### 6. ✅ Gestão de Inspeções DNV
- Agendamento de inspeções
- Controle de certificações
- Alertas de vencimento
- Histórico DNV

### 7. 🔨 Gestão de Manutenções
- Ordens de serviço
- Manutenções preventivas
- Controle de custos
- Garantias

### 8. 💰 Gestão Financeira
- Contas a pagar/receber
- Fluxo de caixa
- Faturamento
- Relatórios financeiros

### 9. 📈 Relatórios e Analytics
- Ocupação de equipamentos
- Análise de clientes
- Custos de manutenção
- Rentabilidade de projetos

### 10. 🧠 Assistente IA
- Chat com provedores externos (BYOK)
- Sugestão/execução assistida de operações
- Análise de imagens/documentos

### 11. 🗓️ Planejamento (WBS/Gantt)
- Estrutura analítica por Ordem de Serviço
- Follow-ups, links com OC/OS e visão Gantt
- Importação em lote via IA

### 12. 🛒 Compras e Ordens de Serviço
- Gestão de ordens de compra com itens
- Gestão de ordens de serviço e integração com planejamento

## 🚀 Como Executar

### Pré-requisitos
- Node.js (versão 18+)
- npm ou yarn

### Backend

```bash
# Acesse a pasta do backend
cd gestao-offcon/backend

# Instale as dependências
npm install

# Configure o banco de dados (cria e popula com dados de exemplo)
npm run seed

# Inicie o servidor
npm run dev
```

O servidor estará disponível em `http://localhost:3001`

### Frontend

```bash
# Acesse a pasta do frontend
cd gestao-offcon/frontend

# Instale as dependências
npm install

# Inicie a aplicação
npm start
```

A aplicação estará disponível em `http://localhost:3000`

## 📊 Dados de Exemplo

O sistema já vem com dados de exemplo para teste:

- **5 Clientes**: Petrobras, MODEC, Karoon, Shell, Equinor
- **8 Equipamentos**: Containers 10FT/20FT, Waste Skips
- **5 Locações**: Contratos ativos e finalizados
- **5 Projetos**: Orçamentos e execuções
- **5 Inspeções**: Certificações DNV
- **4 Manutenções**: Ordens de serviço
- **7 Contas**: Financeiro (receber/pagar)
- **4 Fornecedores**: Parceiros cadastrados

## 🔌 API Endpoints

### Dashboard
- `GET /api/dashboard/kpis` - KPIs principais
- `GET /api/dashboard/charts` - Dados para gráficos
- `GET /api/dashboard/alerts` - Alertas do sistema

### Clientes
- `GET /api/clientes` - Listar clientes
- `POST /api/clientes` - Criar cliente
- `PUT /api/clientes/:id` - Atualizar cliente
- `DELETE /api/clientes/:id` - Remover cliente

### Equipamentos
- `GET /api/equipamentos` - Listar equipamentos
- `POST /api/equipamentos` - Cadastrar equipamento
- `PUT /api/equipamentos/:id` - Atualizar equipamento
- `DELETE /api/equipamentos/:id` - Remover equipamento

### Locações
- `GET /api/locacoes` - Listar locações
- `POST /api/locacoes` - Criar locação
- `PUT /api/locacoes/:id` - Atualizar locação
- `PUT /api/locacoes/:id/finalizar` - Finalizar locação
- `DELETE /api/locacoes/:id` - Remover locação

### E muito mais...

## 🎨 Design System

### Cores
- **Primary**: #1e3a8a (Azul OFFCON)
- **Success**: #10b981 (Verde)
- **Warning**: #f59e0b (Laranja)
- **Danger**: #ef4444 (Vermelho)
- **Info**: #3b82f6 (Azul claro)

### Tipografia
- Fonte: Inter
- Tamanhos: 0.75rem a 1.75rem
- Pesos: 400 (regular) a 700 (bold)

## 📝 Funcionalidades Principais

✅ Dashboard com KPIs e gráficos interativos  
✅ CRUD completo para todos os módulos  
✅ Sistema de alertas e notificações  
✅ Relatórios avançados com filtros  
✅ Controle financeiro integrado  
✅ Gestão de certificações DNV  
✅ Rastreamento de equipamentos  
✅ Interface responsiva  
✅ Design moderno e intuitivo  

## 🔒 Segurança

- Helmet para headers HTTP seguros
- CORS configurado
- Validação de dados
- Prevenção contra SQL Injection (prepared statements)

## 📱 Responsividade

O sistema é totalmente responsivo e funciona em:
- Desktop
- Tablets
- Smartphones

## 🔄 Próximas Melhorias

- [ ] Autenticação JWT
- [ ] Controle de permissões (RBAC)
- [ ] Exportação de relatórios (PDF/Excel)
- [ ] Dashboard personalizável
- [ ] Notificações por e-mail
- [ ] App mobile
- [ ] Integração com ERP
- [ ] API para terceiros

## 📄 Licença

Este projeto é proprietário da OFFCON Containers Offshore.

## 👥 Contato

**OFFCON Containers Offshore**  
📍 Niterói, RJ - Brasil  
📧 comercial@offcon.com.br  
🌐 www.offcon.com.br

---

Desenvolvido com ❤️ para a OFFCON
