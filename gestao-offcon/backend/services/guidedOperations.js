// Service for Guided AI Operations by Table
// Centralizes table definitions, field schemas, and operation-specific prompts

const TABLES = {
  clientes: {
    name: 'Clientes',
    icon: '👥',
    description: 'Gestão de clientes e CRM',
    table: 'clientes',
    module: 'clientes',
    fields: {
      razao_social: { type: 'string', required: true, label: 'Razão Social', example: 'Empresa S.A.' },
      cnpj: { type: 'string', required: true, label: 'CNPJ', example: '33.000.167/0001-01' },
      nome_fantasia: { type: 'string', required: false, label: 'Nome Fantasia', example: 'Nome comercial' },
      email: { type: 'string', required: false, label: 'E-mail' },
      telefone: { type: 'string', required: false, label: 'Telefone', example: '(21) 99999-8888' },
      endereco: { type: 'string', required: false, label: 'Endereço' },
      cidade: { type: 'string', required: false, label: 'Cidade' },
      estado: { type: 'string', required: false, label: 'Estado', example: 'RJ' },
      cep: { type: 'string', required: false, label: 'CEP' },
      segmento: { type: 'string', required: false, label: 'Segmento', example: 'Óleo e Gás' },
      contato_nome: { type: 'string', required: false, label: 'Nome do Contato' },
      contato_email: { type: 'string', required: false, label: 'E-mail do Contato' },
      contato_telefone: { type: 'string', required: false, label: 'Telefone do Contato' },
      observacoes: { type: 'string', required: false, label: 'Observações' },
      ativo: { type: 'integer', required: false, label: 'Ativo', enum: [0, 1], default: 1 }
    },
    searchFields: ['razao_social', 'nome_fantasia', 'cnpj']
  },

  equipamentos: {
    name: 'Equipamentos',
    icon: '📦',
    description: 'Controle de containers e equipamentos',
    table: 'equipamentos',
    module: 'equipamentos',
    fields: {
      codigo: { type: 'string', required: true, label: 'Código', example: 'CNT-001' },
      tipo: {
        type: 'string',
        required: true,
        label: 'Tipo',
        enum: ['10FT_DRY', '10FT_OPEN_TOP', '20FT_DRY', '20FT_OPEN_TOP', 'WASTE_SKIP', 'CAIXA_METALICA']
      },
      descricao: { type: 'string', required: false, label: 'Descrição' },
      fabricante: { type: 'string', required: false, label: 'Fabricante' },
      ano_fabricacao: { type: 'integer', required: false, label: 'Ano de Fabricação', example: 2020 },
      numero_serie: { type: 'string', required: false, label: 'Número de Série' },
      status: {
        type: 'string',
        required: false,
        label: 'Status',
        enum: ['DISPONIVEL', 'LOCADO', 'MANUTENCAO', 'PROJETO', 'INATIVO'],
        default: 'DISPONIVEL'
      },
      certificado_dnv: { type: 'string', required: false, label: 'Certificado DNV' },
      data_ultima_inspecao: { type: 'string', required: false, label: 'Data Última Inspeção' },
      data_proxima_inspecao: { type: 'string', required: false, label: 'Data Próxima Inspeção' },
      valor_compra: { type: 'number', required: false, label: 'Valor de Compra', example: 15000.00 },
      valor_locacao_diaria: { type: 'number', required: false, label: 'Valor Locação Diária', example: 150.00 },
      localizacao_atual: { type: 'string', required: false, label: 'Localização Atual' },
      observacoes: { type: 'string', required: false, label: 'Observações' }
    },
    searchFields: ['codigo', 'tipo', 'descricao']
  },

  locacoes: {
    name: 'Locações',
    icon: '📝',
    description: 'Contratos de locação de equipamentos',
    table: 'locacoes',
    module: 'locacoes',
    fields: {
      codigo_contrato: { type: 'string', required: true, label: 'Código do Contrato', example: 'LOC-2024-001' },
      cliente_id: { type: 'reference', required: true, label: 'Cliente', reference: 'clientes', example: 'Nome do cliente' },
      equipamento_id: { type: 'reference', required: true, label: 'Equipamento', reference: 'equipamentos', example: 'Código do equipamento' },
      data_inicio: { type: 'string', required: true, label: 'Data de Início', example: '2024-01-01' },
      valor_diaria: { type: 'number', required: true, label: 'Valor Diária', example: 95.00 },
      data_previsao_fim: { type: 'string', required: false, label: 'Previsão de Término' },
      data_fim: { type: 'string', required: false, label: 'Data de Término' },
      valor_total: { type: 'number', required: false, label: 'Valor Total' },
      garantia_tipo: { type: 'string', required: false, label: 'Tipo de Garantia', enum: ['DEPOSITO', 'FIANCA', 'SEGURO'] },
      garantia_valor: { type: 'number', required: false, label: 'Valor da Garantia' },
      status: { type: 'string', required: false, label: 'Status', enum: ['ATIVA', 'FINALIZADA', 'CANCELADA'], default: 'ATIVA' },
      local_entrega: { type: 'string', required: false, label: 'Local de Entrega' },
      observacoes: { type: 'string', required: false, label: 'Observações' }
    },
    searchFields: ['codigo_contrato']
  },

  projetos: {
    name: 'Projetos',
    icon: '🏗️',
    description: 'Projetos de fabricação e modificação',
    table: 'projetos',
    module: 'projetos',
    fields: {
      codigo: { type: 'string', required: true, label: 'Código do Projeto', example: 'PRJ-2024-001' },
      cliente_id: { type: 'reference', required: true, label: 'Cliente', reference: 'clientes', example: 'Nome do cliente' },
      tipo_projeto: { type: 'string', required: true, label: 'Tipo de Projeto', enum: ['FABRICACAO', 'MODIFICACAO'] },
      descricao: { type: 'string', required: true, label: 'Descrição' },
      status: {
        type: 'string',
        required: false,
        label: 'Status',
        enum: ['ORCAMENTO', 'APROVADO', 'EM_EXECUCAO', 'CONCLUIDO', 'CANCELADO'],
        default: 'ORCAMENTO'
      },
      data_inicio: { type: 'string', required: false, label: 'Data de Início' },
      data_previsao_entrega: { type: 'string', required: false, label: 'Previsão de Entrega' },
      data_entrega: { type: 'string', required: false, label: 'Data de Entrega' },
      valor_total: { type: 'number', required: false, label: 'Valor Total' },
      custo_estimado: { type: 'number', required: false, label: 'Custo Estimado' },
      custo_real: { type: 'number', required: false, label: 'Custo Real' },
      responsavel_id: { type: 'integer', required: false, label: 'ID do Responsável' },
      observacoes: { type: 'string', required: false, label: 'Observações' }
    },
    searchFields: ['codigo', 'descricao']
  },

  inspecoes: {
    name: 'Inspeções',
    icon: '🔍',
    description: 'Inspeções DNV de equipamentos',
    table: 'inspecoes',
    module: 'inspecoes',
    fields: {
      equipamento_id: { type: 'reference', required: true, label: 'Equipamento', reference: 'equipamentos', example: 'Código do equipamento' },
      tipo_inspecao: {
        type: 'string',
        required: true,
        label: 'Tipo de Inspeção',
        enum: ['PERIODICA', 'INICIAL', 'REPARO', 'CERTIFICACAO']
      },
      data_inspecao: { type: 'string', required: true, label: 'Data da Inspeção', example: '2024-01-01' },
      data_validade: { type: 'string', required: true, label: 'Data de Validade', example: '2025-01-01' },
      inspetor_dnv: { type: 'string', required: false, label: 'Inspetor DNV' },
      numero_relatorio: { type: 'string', required: false, label: 'Número do Relatório' },
      resultado: { type: 'string', required: false, label: 'Resultado', enum: ['APROVADO', 'REPROVADO', 'CONDICIONAL'] },
      status: { type: 'string', required: false, label: 'Status', enum: ['AGENDADA', 'REALIZADA', 'CANCELADA'], default: 'AGENDADA' },
      custo: { type: 'number', required: false, label: 'Custo' },
      observacoes: { type: 'string', required: false, label: 'Observações' }
    },
    searchFields: ['numero_relatorio', 'inspetor_dnv']
  },

  manutencoes: {
    name: 'Manutenções',
    icon: '🔧',
    description: 'Ordens de serviço e manutenções',
    table: 'manutencoes',
    module: 'manutencoes',
    fields: {
      equipamento_id: { type: 'reference', required: true, label: 'Equipamento', reference: 'equipamentos', example: 'Código do equipamento' },
      tipo_manutencao: {
        type: 'string',
        required: true,
        label: 'Tipo de Manutenção',
        enum: ['PREVENTIVA', 'CORRETIVA', 'EMERGENCIAL']
      },
      data_inicio: { type: 'string', required: true, label: 'Data de Início', example: '2024-01-01' },
      descricao_servico: { type: 'string', required: true, label: 'Descrição do Serviço' },
      data_fim: { type: 'string', required: false, label: 'Data de Término' },
      status: {
        type: 'string',
        required: false,
        label: 'Status',
        enum: ['AGENDADA', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA'],
        default: 'AGENDADA'
      },
      mao_obra: { type: 'number', required: false, label: 'Custo Mão de Obra' },
      pecas_materiais: { type: 'number', required: false, label: 'Custo Peças/Materiais' },
      custo_total: { type: 'number', required: false, label: 'Custo Total' },
      responsavel: { type: 'string', required: false, label: 'Responsável' },
      garantia_dias: { type: 'integer', required: false, label: 'Dias de Garantia' },
      observacoes: { type: 'string', required: false, label: 'Observações' }
    },
    searchFields: ['descricao_servico', 'responsavel']
  },

  financeiro: {
    name: 'Financeiro',
    icon: '💰',
    description: 'Contas a pagar e receber',
    table: 'contas',
    module: 'financeiro',
    fields: {
      tipo: { type: 'string', required: true, label: 'Tipo', enum: ['RECEBER', 'PAGAR'] },
      categoria: {
        type: 'string',
        required: true,
        label: 'Categoria',
        enum: ['LOCACAO', 'PROJETO', 'MANUTENCAO', 'INSPECAO', 'FORNECEDOR', 'OUTROS']
      },
      descricao: { type: 'string', required: true, label: 'Descrição' },
      valor: { type: 'number', required: true, label: 'Valor', example: 1500.00 },
      entidade_id: { type: 'reference', required: false, label: 'Entidade', reference: 'clientes', example: 'Nome do cliente' },
      entidade_tipo: { type: 'string', required: false, label: 'Tipo de Entidade', enum: ['CLIENTE', 'FORNECEDOR'] },
      data_emissao: { type: 'string', required: false, label: 'Data de Emissão' },
      data_vencimento: { type: 'string', required: false, label: 'Data de Vencimento' },
      data_pagamento: { type: 'string', required: false, label: 'Data de Pagamento' },
      status: { type: 'string', required: false, label: 'Status', enum: ['PENDENTE', 'PAGO', 'ATRASADO', 'CANCELADO'], default: 'PENDENTE' },
      forma_pagamento: { type: 'string', required: false, label: 'Forma de Pagamento' },
      numero_documento: { type: 'string', required: false, label: 'Número do Documento' },
      observacoes: { type: 'string', required: false, label: 'Observações' }
    },
    searchFields: ['descricao', 'numero_documento']
  }
};

const OPERATIONS = {
  INSERT: {
    name: 'Cadastrar',
    icon: '➕',
    color: '#10b981',
    confirmRequired: true,
    promptTemplate: `Você é um assistente de cadastro do sistema OFFCON.
O usuário quer CADASTRAR um novo registro na tabela {{table}}.

{{fieldsDescription}}

FORMATO DE RESPOSTA (JSON estrito):
{
  "action": "INSERT",
  "module": "{{module}}",
  "table": "{{tableName}}",
  "data": {
    // campos com valores extraídos da mensagem do usuário
  },
  "confirmation_message": "Descrição clara do que será cadastrado",
  "requires_confirmation": true
}

REGRAS:
1. Extraia APENAS os dados mencionados pelo usuário
2. Use valores padrão quando apropriado
3. Para datas, use formato YYYY-MM-DD
4. Para valores monetários, use números (ex: 1500.50)
5. Campos marcados como referência podem usar o nome (será convertido para ID automaticamente)

Mensagem do usuário: "{{userMessage}}"`
  },

  UPDATE: {
    name: 'Atualizar',
    icon: '✏️',
    color: '#3b82f6',
    confirmRequired: true,
    promptTemplate: `Você é um assistente de atualização do sistema OFFCON.
O usuário quer ATUALIZAR um registro existente na tabela {{table}}.

{{fieldsDescription}}

{{contextData}}

FORMATO DE RESPOSTA (JSON estrito):
{
  "action": "UPDATE",
  "module": "{{module}}",
  "table": "{{tableName}}",
  "data": {
    // APENAS os campos que devem ser alterados
  },
  "where": {
    // condição para identificar o registro (id, codigo, nome, etc)
  },
  "confirmation_message": "Descrição clara da alteração",
  "requires_confirmation": true
}

REGRAS:
1. Inclua em "data" APENAS os campos que devem ser alterados
2. Inclua em "where" campos para identificar o registro correto
3. Use os dados do CONTEXTO ATUAL para encontrar o registro
4. Se o registro não existir no contexto, indique no confirmation_message

Mensagem do usuário: "{{userMessage}}"`
  },

  QUERY: {
    name: 'Buscar',
    icon: '🔍',
    color: '#6b7280',
    confirmRequired: false,
    promptTemplate: `Você é um assistente de busca do sistema OFFCON.
O usuário quer BUSCAR registros na tabela {{table}}.

{{fieldsDescription}}

{{contextData}}

FORMATO DE RESPOSTA (JSON estrito):
{
  "action": "QUERY",
  "module": "{{module}}",
  "table": "{{tableName}}",
  "where": {
    // filtros de busca (opcional, deixe vazio para listar todos)
  },
  "limit": 50,
  "confirmation_message": "Descrição da busca realizada",
  "requires_confirmation": false
}

REGRAS:
1. Interprete o que o usuário quer buscar
2. Use filtros quando o usuário especificar critérios
3. Deixe "where" vazio se o usuário quer listar todos

Mensagem do usuário: "{{userMessage}}"`
  },

  DELETE: {
    name: 'Deletar',
    icon: '🗑️',
    color: '#ef4444',
    confirmRequired: true,
    promptTemplate: `Você é um assistente de exclusão do sistema OFFCON.
O usuário quer DELETAR um registro da tabela {{table}}.

⚠️ ATENÇÃO: Esta é uma operação DESTRUTIVA e irreversível.

{{fieldsDescription}}

{{contextData}}

FORMATO DE RESPOSTA (JSON estrito):
{
  "action": "DELETE",
  "module": "{{module}}",
  "table": "{{tableName}}",
  "where": {
    // condição para identificar o registro a ser excluído
  },
  "confirmation_message": "⚠️ ATENÇÃO: Descrição clara do que será EXCLUÍDO PERMANENTEMENTE",
  "requires_confirmation": true
}

REGRAS:
1. SEMPRE exija confirmação para exclusões
2. Seja EXTREMAMENTE cuidadoso na identificação do registro
3. Inclua avisos claros na mensagem de confirmação
4. Use os dados do CONTEXTO para verificar se o registro existe

Mensagem do usuário: "{{userMessage}}"`
  }
};

class GuidedOperationsService {

  /**
   * Retorna lista de tabelas disponíveis
   */
  getTables() {
    return Object.entries(TABLES).map(([key, table]) => ({
      id: key,
      name: table.name,
      icon: table.icon,
      description: table.description
    }));
  }

  /**
   * Retorna lista de operações disponíveis
   */
  getOperations() {
    return Object.entries(OPERATIONS).map(([key, op]) => ({
      id: key,
      name: op.name,
      icon: op.icon,
      color: op.color,
      confirmRequired: op.confirmRequired
    }));
  }

  /**
   * Retorna configuração de uma tabela específica
   */
  getTableConfig(tableId) {
    const table = TABLES[tableId];
    if (!table) return null;

    const requiredFields = [];
    const optionalFields = [];

    for (const [fieldName, fieldDef] of Object.entries(table.fields)) {
      const fieldInfo = {
        name: fieldName,
        label: fieldDef.label,
        type: fieldDef.type,
        required: fieldDef.required,
        pattern: fieldDef.pattern,
        example: fieldDef.example,
        enum: fieldDef.enum,
        default: fieldDef.default
      };

      if (fieldDef.required) {
        requiredFields.push(fieldInfo);
      } else {
        optionalFields.push(fieldInfo);
      }
    }

    return {
      id: tableId,
      name: table.name,
      icon: table.icon,
      description: table.description,
      tableName: table.table,
      module: table.module,
      requiredFields,
      optionalFields,
      searchFields: table.searchFields
    };
  }

  /**
   * Gera descrição de campos para o prompt
   */
  generateFieldsDescription(tableId, operation) {
    const table = TABLES[tableId];
    if (!table) return '';

    let description = 'CAMPOS DISPONÍVEIS:\n\n';
    description += '## Obrigatórios:\n';

    for (const [name, field] of Object.entries(table.fields)) {
      if (field.required) {
        description += `- ${name} (${field.type}): ${field.label}`;
        if (field.pattern) description += ` [formato: ${field.pattern}]`;
        if (field.enum) description += ` [valores: ${field.enum.join(', ')}]`;
        if (field.example) description += ` (ex: ${field.example})`;
        description += '\n';
      }
    }

    description += '\n## Opcionais:\n';
    for (const [name, field] of Object.entries(table.fields)) {
      if (!field.required) {
        description += `- ${name} (${field.type}): ${field.label}`;
        if (field.pattern) description += ` [formato: ${field.pattern}]`;
        if (field.enum) description += ` [valores: ${field.enum.join(', ')}]`;
        if (field.example) description += ` (ex: ${field.example})`;
        if (field.default !== undefined) description += ` [padrão: ${field.default}]`;
        description += '\n';
      }
    }

    return description;
  }

  /**
   * Gera o prompt completo para uma operação
   */
  buildPrompt(tableId, operationId, userMessage, contextData = null) {
    const table = TABLES[tableId];
    const operation = OPERATIONS[operationId];

    if (!table || !operation) {
      throw new Error(`Tabela '${tableId}' ou operação '${operationId}' não encontrada`);
    }

    let prompt = operation.promptTemplate;

    // Substitui variáveis
    prompt = prompt.replace(/{{table}}/g, table.name);
    prompt = prompt.replace(/{{tableName}}/g, table.table);
    prompt = prompt.replace(/{{module}}/g, table.module);
    prompt = prompt.replace(/{{userMessage}}/g, userMessage);
    prompt = prompt.replace(/{{fieldsDescription}}/g, this.generateFieldsDescription(tableId, operationId));

    // Adiciona contexto se disponível
    if (contextData) {
      const contextStr = `CONTEXTO ATUAL (registros existentes no banco):\n${JSON.stringify(contextData, null, 2)}`;
      prompt = prompt.replace(/{{contextData}}/g, contextStr);
    } else {
      prompt = prompt.replace(/{{contextData}}/g, '');
    }

    return prompt;
  }

  /**
   * Valida se uma operação requer confirmação
   */
  requiresConfirmation(operationId) {
    const operation = OPERATIONS[operationId];
    return operation ? operation.confirmRequired : true;
  }

  /**
   * Retorna o schema de uma tabela para validação
   */
  getTableSchema(tableId) {
    const table = TABLES[tableId];
    if (!table) return null;

    const required = [];
    const fields = {};

    for (const [name, field] of Object.entries(table.fields)) {
      if (field.required) {
        required.push(name);
      }
      fields[name] = {
        type: field.type === 'reference' ? 'integer' : field.type,
        required: field.required,
        enum: field.enum,
        reference: field.type === 'reference' ? field.reference : null
      };
    }

    return { required, fields };
  }
}

module.exports = {
  GuidedOperationsService,
  TABLES,
  OPERATIONS
};
