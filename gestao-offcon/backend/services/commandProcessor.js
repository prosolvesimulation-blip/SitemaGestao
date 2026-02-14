// Processador de comandos JSON da IA para ações no banco de dados
const db = require('../database/connection');

class CommandProcessor {
  constructor() {
    // Ações válidas: INSERT, UPDATE, DELETE, QUERY
    this.validActions = ['INSERT', 'UPDATE', 'DELETE', 'QUERY'];
    this.validTables = [
      'clientes', 'equipamentos', 'locacoes', 'projetos',
      'inspecoes', 'manutencoes', 'contas', 'fornecedores'
    ];

    // Definição de esquemas para validação
    this.schemaDefinitions = {
      clientes: {
        required: ['razao_social', 'cnpj'],
        fields: {
          razao_social: { type: 'string', required: true },
          nome_fantasia: { type: 'string' },
          cnpj: { type: 'string' },
          email: { type: 'string' },
          telefone: { type: 'string' },
          endereco: { type: 'string' },
          cidade: { type: 'string' },
          estado: { type: 'string' },
          cep: { type: 'string' },
          segmento: { type: 'string' },
          contato_nome: { type: 'string' },
          contato_email: { type: 'string' },
          contato_telefone: { type: 'string' },
          observacoes: { type: 'string' },
          ativo: { type: 'integer', enum: [0, 1] }
        }
      },
      equipamentos: {
        required: ['codigo', 'tipo'],
        fields: {
          codigo: { type: 'string', required: true },
          tipo: { type: 'string', enum: ['10FT_DRY', '10FT_OPEN_TOP', '20FT_DRY', '20FT_OPEN_TOP', 'WASTE_SKIP', 'CAIXA_METALICA'], required: true },
          descricao: { type: 'string' },
          fabricante: { type: 'string' },
          ano_fabricacao: { type: 'integer' },
          numero_serie: { type: 'string' },
          status: { type: 'string', enum: ['DISPONIVEL', 'LOCADO', 'MANUTENCAO', 'PROJETO', 'INATIVO'] },
          certificado_dnv: { type: 'string' },
          data_ultima_inspecao: { type: 'string' },
          data_proxima_inspecao: { type: 'string' },
          valor_compra: { type: 'number' },
          valor_locacao_diaria: { type: 'number' },
          localizacao_atual: { type: 'string' },
          cliente_atual_id: { type: 'integer', reference: 'clientes' },
          observacoes: { type: 'string' }
        }
      },
      locacoes: {
        required: ['codigo_contrato', 'cliente_id', 'equipamento_id', 'data_inicio', 'valor_diaria'],
        fields: {
          codigo_contrato: { type: 'string', required: true },
          cliente_id: { type: 'integer', reference: 'clientes', required: true },
          equipamento_id: { type: 'integer', reference: 'equipamentos', required: true },
          data_inicio: { type: 'string', required: true },
          data_previsao_fim: { type: 'string' },
          data_fim: { type: 'string' },
          valor_diaria: { type: 'number', required: true },
          valor_total: { type: 'number' },
          garantia_tipo: { type: 'string', enum: ['DEPOSITO', 'FIANCA', 'SEGURO'] },
          garantia_valor: { type: 'number' },
          status: { type: 'string', enum: ['ATIVA', 'FINALIZADA', 'CANCELADA'] },
          local_entrega: { type: 'string' },
          observacoes: { type: 'string' }
        }
      },
      projetos: {
        required: ['codigo', 'cliente_id', 'tipo_projeto', 'descricao'],
        fields: {
          codigo: { type: 'string', required: true },
          cliente_id: { type: 'integer', reference: 'clientes', required: true },
          tipo_projeto: { type: 'string', enum: ['FABRICACAO', 'MODIFICACAO'], required: true },
          descricao: { type: 'string', required: true },
          status: { type: 'string', enum: ['ORCAMENTO', 'APROVADO', 'EM_EXECUCAO', 'CONCLUIDO', 'CANCELADO'] },
          data_inicio: { type: 'string' },
          data_previsao_entrega: { type: 'string' },
          data_entrega: { type: 'string' },
          valor_total: { type: 'number' },
          custo_estimado: { type: 'number' },
          custo_real: { type: 'number' },
          responsavel_id: { type: 'integer' },
          observacoes: { type: 'string' }
        }
      },
      contas: {
        required: ['tipo', 'categoria', 'descricao', 'valor'],
        fields: {
          tipo: { type: 'string', enum: ['RECEBER', 'PAGAR'], required: true },
          categoria: { type: 'string', enum: ['LOCACAO', 'PROJETO', 'MANUTENCAO', 'INSPECAO', 'FORNECEDOR', 'OUTROS'], required: true },
          descricao: { type: 'string', required: true },
          entidade_id: { type: 'integer', reference: ['clientes', 'fornecedores'] },
          entidade_tipo: { type: 'string', enum: ['CLIENTE', 'FORNECEDOR'] },
          referencia_id: { type: 'integer' },
          referencia_tipo: { type: 'string' },
          valor: { type: 'number', required: true },
          data_emissao: { type: 'string' },
          data_vencimento: { type: 'string' },
          data_pagamento: { type: 'string' },
          status: { type: 'string', enum: ['PENDENTE', 'PAGO', 'ATRASADO', 'CANCELADO'] },
          forma_pagamento: { type: 'string' },
          numero_documento: { type: 'string' },
          observacoes: { type: 'string' }
        }
      },
      inspecoes: {
        required: ['equipamento_id', 'tipo_inspecao', 'data_inspecao', 'data_validade'],
        fields: {
          equipamento_id: { type: 'integer', reference: 'equipamentos', required: true },
          tipo_inspecao: { type: 'string', enum: ['PERIODICA', 'INICIAL', 'REPARO', 'CERTIFICACAO'], required: true },
          data_inspecao: { type: 'string', required: true },
          data_validade: { type: 'string', required: true },
          inspetor_dnv: { type: 'string' },
          numero_relatorio: { type: 'string' },
          resultado: { type: 'string', enum: ['APROVADO', 'REPROVADO', 'CONDICIONAL'] },
          status: { type: 'string', enum: ['AGENDADA', 'REALIZADA', 'CANCELADA'] },
          custo: { type: 'number' },
          observacoes: { type: 'string' }
        }
      },
      manutencoes: {
        required: ['equipamento_id', 'tipo_manutencao', 'data_inicio', 'descricao_servico'],
        fields: {
          equipamento_id: { type: 'integer', reference: 'equipamentos', required: true },
          tipo_manutencao: { type: 'string', enum: ['PREVENTIVA', 'CORRETIVA', 'EMERGENCIAL'], required: true },
          data_inicio: { type: 'string', required: true },
          descricao_servico: { type: 'string', required: true },
          data_fim: { type: 'string' },
          status: { type: 'string', enum: ['AGENDADA', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA'] },
          mao_obra: { type: 'number' },
          pecas_materiais: { type: 'number' },
          custo_total: { type: 'number' },
          responsavel: { type: 'string' },
          garantia_dias: { type: 'integer' },
          observacoes: { type: 'string' }
        }
      }
    };
  }

  async processCommand(jsonCommand) {
    try {
      // Parse se for string
      const command = typeof jsonCommand === 'string' ? JSON.parse(jsonCommand) : jsonCommand;

      // Validações básicas
      if (!command.action || !this.validActions.includes(command.action.toUpperCase())) {
        return {
          success: false,
          error: `Ação '${command.action}' não é válida. Ações válidas: ${this.validActions.join(', ')}`
        };
      }

      if (command.action.toUpperCase() !== 'ANALISE_IMAGEM' &&
        !this.validTables.includes(command.table)) {
        return {
          success: false,
          error: `Tabela '${command.table}' não é válida. Tabelas válidas: ${this.validTables.join(', ')}`
        };
      }

      // Resolve IDs de referência antes de validar
      await this.resolveReferences(command);

      // Validação de esquema
      const validation = this.validateSchema(command.table, command.data);
      if (!validation.valid) {
        return {
          success: false,
          error: `Dados inválidos: ${validation.error}`
        };
      }

      switch (command.action.toUpperCase()) {
        case 'INSERT':
          return await this.executeInsert(command);
        case 'UPDATE':
          return await this.executeUpdate(command);
        case 'DELETE':
          return await this.executeDelete(command);
        case 'QUERY':
          return await this.executeQuery(command);
        default:
          return {
            success: false,
            error: `Ação '${command.action}' não permitida. Use INSERT, UPDATE, DELETE ou QUERY.`
          };
      }
    } catch (error) {
      if (error instanceof SyntaxError) {
        return {
          success: false,
          error: `Erro de sintaxe no JSON: ${error.message}`
        };
      }
      return {
        success: false,
        error: `Erro ao processar comando: ${error.message}`
      };
    }
  }

  // Validação de esquema baseada na definição
  validateSchema(table, data) {
    const schema = this.schemaDefinitions[table];
    if (!schema) {
      return { valid: true }; // Não há esquema definido para esta tabela
    }

    /* 
    // Verifica campos obrigatórios - DESATIVADO PARA FLEXIBILIDADE
    for (const field of schema.required) {
      if (!(field in data)) {
        return {
          valid: false,
          error: `Campo obrigatório '${field}' não fornecido`
        };
      }
    }
    */

    // Validação de campos individuais
    for (const [fieldName, fieldDef] of Object.entries(schema.fields)) {
      if (fieldName in data) {
        const value = data[fieldName];
        const validationResult = this.validateField(value, fieldDef, fieldName);

        if (!validationResult.valid) {
          return validationResult;
        }
      }
    }

    return { valid: true };
  }

  // Validação individual de campo
  validateField(value, fieldDef, fieldName) {
    // Verifica tipo
    if (fieldDef.type) {
      let isValidType = false;

      switch (fieldDef.type) {
        case 'string':
          isValidType = typeof value === 'string';
          break;
        case 'integer':
          isValidType = Number.isInteger(value);
          break;
        case 'number':
          isValidType = typeof value === 'number' && !isNaN(value);
          break;
        case 'date':
          isValidType = typeof value === 'string' && !isNaN(Date.parse(value));
          break;
      }

      if (!isValidType) {
        return {
          valid: false,
          error: `Campo '${fieldName}' deve ser do tipo ${fieldDef.type}, mas recebeu: ${typeof value}`
        };
      }
    }

    /*
    // Verifica enumeração - DESABILITADO
    if (fieldDef.enum && !fieldDef.enum.includes(value)) {
      return {
        valid: false,
        error: `Valor inválido para '${fieldName}'. Valores permitidos: ${fieldDef.enum.join(', ')}`
      };
    }

    // Verifica padrão regex - DESABILITADO
    if (fieldDef.pattern && typeof value === 'string' && !fieldDef.pattern.test(value)) {
      return {
        valid: false,
        error: `Formato inválido para '${fieldName}': ${value}`
      };
    }
    */

    return { valid: true };
  }

  // Resolve IDs de referência em campos relacionais
  async resolveReferences(command) {
    const schema = this.schemaDefinitions[command.table];
    if (!schema) return;

    for (const [fieldName, fieldDef] of Object.entries(schema.fields)) {
      if (fieldDef.reference && command.data[fieldName] && typeof command.data[fieldName] === 'string') {
        // Se o campo for uma string mas deveria ser um ID, tenta resolver
        let resolvedId = null;

        if (Array.isArray(fieldDef.reference)) {
          // Campo pode referenciar múltiplas tabelas
          for (const table of fieldDef.reference) {
            resolvedId = await this.resolveIdByName(command.data[fieldName], table);
            if (resolvedId) break;
          }
        } else {
          // Campo referencia uma única tabela
          resolvedId = await this.resolveIdByName(command.data[fieldName], fieldDef.reference);
        }

        if (resolvedId) {
          command.data[fieldName] = resolvedId;
        }
      }
    }
  }

  // Resolve ID por nome em uma tabela específica
  async resolveIdByName(name, table) {
    if (!name || typeof name !== 'string') return null;

    // Remove caracteres especiais para busca mais ampla
    const cleanName = name.replace(/[^\w\s]/gi, '%');

    switch (table) {
      case 'clientes':
        const cliente = db.prepare(`
          SELECT id FROM clientes 
          WHERE razao_social LIKE ? OR nome_fantasia LIKE ? OR cnpj LIKE ?
          LIMIT 1
        `).get(`%${cleanName}%`, `%${cleanName}%`, `%${cleanName}%`);
        return cliente?.id || null;

      case 'equipamentos':
        const equipamento = db.prepare(`
          SELECT id FROM equipamentos 
          WHERE codigo LIKE ? OR descricao LIKE ?
          LIMIT 1
        `).get(`%${cleanName}%`, `%${cleanName}%`);
        return equipamento?.id || null;

      case 'fornecedores':
        const fornecedor = db.prepare(`
          SELECT id FROM fornecedores 
          WHERE razao_social LIKE ? OR nome_fantasia LIKE ?
          LIMIT 1
        `).get(`%${cleanName}%`, `%${cleanName}%`);
        return fornecedor?.id || null;

      default:
        return null;
    }
  }

  async executeInsert(command) {
    try {
      const { table, data } = command;

      // Adiciona timestamps
      if (!data.data_cadastro) {
        data.data_cadastro = new Date().toISOString();
      }

      const columns = Object.keys(data);
      const placeholders = columns.map(() => '?').join(', ');
      const values = Object.values(data);

      const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;

      const result = db.prepare(sql).run(...values);

      return {
        success: true,
        message: `Registro inserido com sucesso na tabela ${table}`,
        id: result.lastInsertRowid,
        table,
        data
      };
    } catch (error) {
      return {
        success: false,
        error: `Erro ao inserir: ${error.message}`
      };
    }
  }

  async executeUpdate(command) {
    try {
      const { table, data, where } = command;

      if (!where || Object.keys(where).length === 0) {
        return {
          success: false,
          error: 'Condição WHERE é obrigatória para UPDATE'
        };
      }

      // Se WHERE contém campos que são strings mas deveriam ser IDs, resolve-os
      for (const [key, value] of Object.entries(where)) {
        const schema = this.schemaDefinitions[table];
        if (schema && schema.fields[key] && schema.fields[key].reference && typeof value === 'string') {
          const resolvedId = await this.resolveIdByName(value, schema.fields[key].reference);
          if (resolvedId) {
            where[key] = resolvedId;
          }
        }
      }

      const setClause = Object.keys(data).map(col => `${col} = ?`).join(', ');
      const whereClause = Object.keys(where).map(col => `${col} = ?`).join(' AND ');

      const values = [...Object.values(data), ...Object.values(where)];

      const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;

      const result = db.prepare(sql).run(...values);

      if (result.changes === 0) {
        return {
          success: false,
          error: 'Nenhum registro encontrado para atualizar'
        };
      }

      return {
        success: true,
        message: `${result.changes} registro(s) atualizado(s) na tabela ${table}`,
        changes: result.changes,
        table,
        data,
        where
      };
    } catch (error) {
      return {
        success: false,
        error: `Erro ao atualizar: ${error.message}`
      };
    }
  }

  async executeDelete(command) {
    try {
      const { table, where } = command;

      if (!where || Object.keys(where).length === 0) {
        return {
          success: false,
          error: 'Condição WHERE é obrigatória para DELETE'
        };
      }

      const whereClause = Object.keys(where).map(col => `${col} = ?`).join(' AND ');
      const values = Object.values(where);

      const sql = `DELETE FROM ${table} WHERE ${whereClause}`;

      const result = db.prepare(sql).run(...values);

      if (result.changes === 0) {
        return {
          success: false,
          error: 'Nenhum registro encontrado para remover'
        };
      }

      return {
        success: true,
        message: `${result.changes} registro(s) removido(s) da tabela ${table}`,
        changes: result.changes,
        table,
        where
      };
    } catch (error) {
      return {
        success: false,
        error: `Erro ao remover: ${error.message}`
      };
    }
  }

  async executeQuery(command) {
    try {
      const { table, where, limit = 100 } = command;

      let sql = `SELECT * FROM ${table}`;
      let values = [];

      if (where && Object.keys(where).length > 0) {
        const whereClause = Object.keys(where).map(col => `${col} LIKE ?`).join(' AND ');
        sql += ` WHERE ${whereClause}`;
        values = Object.values(where).map(v => `%${v}%`);
      }

      sql += ` LIMIT ${limit}`;

      const results = db.prepare(sql).all(...values);

      return {
        success: true,
        message: `${results.length} registro(s) encontrado(s)`,
        count: results.length,
        data: results,
        table
      };
    } catch (error) {
      return {
        success: false,
        error: `Erro na consulta: ${error.message}`
      };
    }
  }

  async processImageAnalysis(command) {
    // Processa análise de imagem e sugere ação
    const { suggested_action, extracted_data } = command;

    if (suggested_action) {
      // Executa a ação sugerida
      return await this.processCommand(suggested_action);
    }

    return {
      success: true,
      message: 'Análise de imagem processada',
      extracted_data,
      requires_confirmation: true
    };
  }

  // Métodos auxiliares para resolver IDs baseados em nomes
  async resolveClienteId(nome) {
    const result = db.prepare(`
      SELECT id FROM clientes
      WHERE razao_social LIKE ? OR nome_fantasia LIKE ?
      LIMIT 1
    `).get(`%${nome}%`, `%${nome}%`);

    return result?.id || null;
  }

  async resolveEquipamentoId(codigo) {
    const result = db.prepare(`
      SELECT id FROM equipamentos
      WHERE codigo = ? OR codigo LIKE ?
      LIMIT 1
    `).get(codigo, `%${codigo}%`);

    return result?.id || null;
  }

  // Valida dados antes de inserir
  validateData(table, data) {
    const validations = {
      // Validações específicas removidas a pedido do usuário
    };

    const validation = validations[table];
    if (!validation) return { valid: true };

    // Verifica campos obrigatórios
    for (const field of validation.required) {
      if (!data[field]) {
        return {
          valid: false,
          error: `Campo obrigatório '${field}' não fornecido`
        };
      }
    }

    // Validações específicas
    for (const [field, validator] of Object.entries(validation)) {
      if (field !== 'required' && data[field]) {
        if (!validator(data[field])) {
          return {
            valid: false,
            error: `Valor inválido para o campo '${field}'`
          };
        }
      }
    }

    return { valid: true };
  }
}

module.exports = { CommandProcessor };