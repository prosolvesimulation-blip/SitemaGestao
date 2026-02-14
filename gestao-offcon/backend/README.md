# Sistema de Gestão OFFCON - Backend

Sistema backend em Node.js com SQLite para gestão integrada da OFFCON Containers Offshore.

## Módulos

1. **Dashboard** - KPIs e visão geral
2. **Clientes** - Gestão de clientes (CRM)
3. **Equipamentos** - Controle de containers
4. **Locações** - Gestão de contratos de locação
5. **Projetos** - Projetos customizados de fabricação
6. **Inspeções** - Inspeções periódicas DNV
7. **Manutenções** - Ordens de serviço
8. **Financeiro** - Faturamento e contas
9. **Relatórios** - Analytics e relatórios

## Instalação

```bash
npm install
npm run seed  # Criar banco de dados com dados de exemplo
npm run dev   # Iniciar em modo desenvolvimento
```

## API Endpoints

### Dashboard
- `GET /api/dashboard/kpis` - KPIs principais
- `GET /api/dashboard/charts` - Dados para gráficos

### Clientes
- `GET /api/clientes` - Listar clientes
- `POST /api/clientes` - Criar cliente
- `PUT /api/clientes/:id` - Atualizar cliente
- `DELETE /api/clientes/:id` - Remover cliente

### Equipamentos
- `GET /api/equipamentos` - Listar equipamentos
- `POST /api/equipamentos` - Cadastrar equipamento
- `PUT /api/equipamentos/:id` - Atualizar equipamento

### Locações
- `GET /api/locacoes` - Listar locações
- `POST /api/locacoes` - Criar contrato
- `PUT /api/locacoes/:id/finalizar` - Finalizar locação

### E mais...