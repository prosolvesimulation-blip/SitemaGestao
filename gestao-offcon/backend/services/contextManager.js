// Gerenciador de contexto avançado - para criação e atualização de dados
const db = require('../database/connection');

class ContextManager {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 300000; // 5 minutos de cache
  }

  // Retorna contexto detalhado baseado na mensagem do usuário
  async buildContext(userMessage) {
    const context = {
      timestamp: new Date().toISOString(),
      references: [],
      records: {} // Armazena registros específicos para atualização
    };

    try {
      // Detecta se a mensagem parece ser uma atualização
      const isUpdateOperation = this.isUpdateOperation(userMessage);
      
      if (isUpdateOperation) {
        // Para operações de atualização, busca registros específicos
        context.records = await this.getRecordsForUpdate(userMessage);
      }
      
      // Sempre inclui referências básicas
      context.references = await this.getBasicReferences();
    } catch (error) {
      console.error('Erro ao construir contexto:', error);
    }

    return context;
  }

  // Detecta se a operação é de atualização
  isUpdateOperation(message) {
    const updateKeywords = [
      'atualizar', 'alterar', 'modificar', 'trocar', 'mudar', 'editar',
      'trocar', 'corrigir', 'ajustar', 'retificar', 'substituir',
      'mudança', 'alteração', 'atualização', 'update'
    ];
    
    const lowerMessage = message.toLowerCase();
    return updateKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  // Busca registros específicos para operações de atualização
  async getRecordsForUpdate(userMessage) {
    const records = {};
    
    // Extrai possíveis identificadores da mensagem
    const identifiers = this.extractIdentifiers(userMessage);
    
    // Busca clientes
    if (identifiers.clientes.length > 0) {
      records.clientes = [];
      for (const identifier of identifiers.clientes) {
        const cliente = db.prepare(`
          SELECT * FROM clientes WHERE 
          razao_social LIKE ? OR nome_fantasia LIKE ? OR cnpj LIKE ?
        `).get(`%${identifier}%`, `%${identifier}%`, `%${identifier}%`);
        
        if (cliente) {
          records.clientes.push(cliente);
        }
      }
    }
    
    // Busca equipamentos
    if (identifiers.equipamentos.length > 0) {
      records.equipamentos = [];
      for (const identifier of identifiers.equipamentos) {
        const equipamento = db.prepare(`
          SELECT * FROM equipamentos WHERE 
          codigo LIKE ? OR descricao LIKE ? OR tipo LIKE ?
        `).get(`%${identifier}%`, `%${identifier}%`, `%${identifier}%`);
        
        if (equipamento) {
          records.equipamentos.push(equipamento);
        }
      }
    }
    
    // Busca locações
    if (identifiers.locacoes.length > 0) {
      records.locacoes = [];
      for (const identifier of identifiers.locacoes) {
        const locacao = db.prepare(`
          SELECT l.*, c.razao_social as cliente_nome, e.codigo as equipamento_codigo
          FROM locacoes l
          LEFT JOIN clientes c ON l.cliente_id = c.id
          LEFT JOIN equipamentos e ON l.equipamento_id = e.id
          WHERE l.codigo_contrato LIKE ? OR l.id = ?
        `).get(`%${identifier}%`, parseInt(identifier) || -1);
        
        if (locacao) {
          records.locacoes.push(locacao);
        }
      }
    }
    
    // Busca projetos
    if (identifiers.projetos.length > 0) {
      records.projetos = [];
      for (const identifier of identifiers.projetos) {
        const projeto = db.prepare(`
          SELECT p.*, c.razao_social as cliente_nome
          FROM projetos p
          LEFT JOIN clientes c ON p.cliente_id = c.id
          WHERE p.codigo LIKE ? OR p.id = ?
        `).get(`%${identifier}%`, parseInt(identifier) || -1);
        
        if (projeto) {
          records.projetos.push(projeto);
        }
      }
    }
    
    return records;
  }

  // Extrai identificadores relevantes da mensagem
  extractIdentifiers(message) {
    const identifiers = {
      clientes: [],
      equipamentos: [],
      locacoes: [],
      projetos: []
    };
    
    const lowerMessage = message.toLowerCase();
    
    // Extrai possíveis nomes de clientes
    const clientePatterns = [
      /(?:cliente|empresa)\s+([^\s,]+)/gi,
      /(?:como|do|para)\s+([^\s,]+)(?:\s+s\/)?/gi,
      /([^\s,]+)(?:\s+foi|,)/gi
    ];
    
    for (const pattern of clientePatterns) {
      let match;
      while ((match = pattern.exec(lowerMessage)) !== null) {
        const candidate = match[1].replace(/[.!?]/g, '');
        if (candidate.length > 2 && !/\d/.test(candidate)) {
          identifiers.clientes.push(candidate);
        }
      }
    }
    
    // Extrai códigos de equipamentos (geralmente contêm números ou prefixos como CNT)
    const equipamentoPatterns = [
      /(CNT-\d+)/gi,
      /([A-Z]{2,}-?\d+)/gi,
      /(\d{2}FT)/gi,
      /container\s+([A-Z\d-]+)/gi
    ];
    
    for (const pattern of equipamentoPatterns) {
      let match;
      while ((match = pattern.exec(lowerMessage)) !== null) {
        identifiers.equipamentos.push(match[1]);
      }
    }
    
    // Extrai códigos de locações
    const locacaoPatterns = [
      /(LOC-\d+)/gi,
      /(LC-\d+)/gi,
      /locação\s+(LC?\d+-?\d*)/gi
    ];
    
    for (const pattern of locacaoPatterns) {
      let match;
      while ((match = pattern.exec(lowerMessage)) !== null) {
        identifiers.locacoes.push(match[1]);
      }
    }
    
    // Extrai códigos de projetos
    const projetoPatterns = [
      /(PRJ-\d+)/gi,
      /(PROJ-\d+)/gi,
      /projeto\s+(PR?J?\d+-?\d*)/gi
    ];
    
    for (const pattern of projetoPatterns) {
      let match;
      while ((match = pattern.exec(lowerMessage)) !== null) {
        identifiers.projetos.push(match[1]);
      }
    }
    
    // Remove duplicatas
    identifiers.clientes = [...new Set(identifiers.clientes)];
    identifiers.equipamentos = [...new Set(identifiers.equipamentos)];
    identifiers.locacoes = [...new Set(identifiers.locacoes)];
    identifiers.projetos = [...new Set(identifiers.projetos)];
    
    return identifiers;
  }

  // Busca referências básicas (clientes e equipamentos)
  async getBasicReferences() {
    const cacheKey = 'basic_references';
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const references = [];

    // Busca clientes
    const clientes = db.prepare(`
      SELECT id, razao_social, nome_fantasia, cnpj
      FROM clientes
      WHERE ativo = 1
      ORDER BY razao_social
    `).all();

    clientes.forEach(c => {
      references.push({
        type: 'cliente',
        id: c.id,
        identifiers: [c.razao_social, c.nome_fantasia, c.cnpj].filter(Boolean)
      });
    });

    // Busca equipamentos
    const equipamentos = db.prepare(`
      SELECT id, codigo, tipo, descricao
      FROM equipamentos
      ORDER BY codigo
    `).all();

    equipamentos.forEach(e => {
      references.push({
        type: 'equipamento',
        id: e.id,
        identifiers: [e.codigo, e.descricao, e.tipo].filter(Boolean)
      });
    });

    this.cache.set(cacheKey, references);
    setTimeout(() => this.cache.delete(cacheKey), this.cacheTTL);

    return references;
  }

  // Gera prompt de contexto detalhado
  generateContextPrompt(context) {
    const parts = [];
    parts.push('=== CONTEXTO DO SISTEMA ===');
    parts.push('');

    // Adiciona registros específicos para atualização
    if (context.records && Object.keys(context.records).length > 0) {
      parts.push('REGISTROS PARA ATUALIZAÇÃO:');
      
      for (const [table, records] of Object.entries(context.records)) {
        if (records && records.length > 0) {
          parts.push(`\n${this.getTableDisplayName(table)} (${records.length}):`);
          
          for (const record of records) {
            parts.push(`  ID: ${record.id}`);
            
            // Mostra campos relevantes dependendo da tabela
            switch (table) {
              case 'clientes':
                parts.push(`    Razão Social: ${record.razao_social}`);
                parts.push(`    Nome Fantasia: ${record.nome_fantasia || 'N/A'}`);
                parts.push(`    CNPJ: ${record.cnpj}`);
                parts.push(`    Telefone: ${record.telefone || 'N/A'}`);
                parts.push(`    Email: ${record.email || 'N/A'}`);
                break;
                
              case 'equipamentos':
                parts.push(`    Código: ${record.codigo}`);
                parts.push(`    Tipo: ${record.tipo}`);
                parts.push(`    Descrição: ${record.descricao || 'N/A'}`);
                parts.push(`    Status: ${record.status}`);
                parts.push(`    Valor Locação Diária: ${record.valor_locacao_diaria || 'N/A'}`);
                break;
                
              case 'locacoes':
                parts.push(`    Código Contrato: ${record.codigo_contrato}`);
                parts.push(`    Cliente: ${record.cliente_nome || record.cliente_id}`);
                parts.push(`    Equipamento: ${record.equipamento_codigo || record.equipamento_id}`);
                parts.push(`    Status: ${record.status}`);
                parts.push(`    Valor Diária: ${record.valor_diaria}`);
                break;
                
              case 'projetos':
                parts.push(`    Código: ${record.codigo}`);
                parts.push(`    Cliente: ${record.cliente_nome || record.cliente_id}`);
                parts.push(`    Descrição: ${record.descricao}`);
                parts.push(`    Status: ${record.status}`);
                parts.push(`    Valor Total: ${record.valor_total}`);
                break;
            }
            
            parts.push(''); // Linha em branco após cada registro
          }
        }
      }
      
      parts.push('Se o usuário quiser atualizar um desses registros, use os dados acima como base.');
      parts.push('');
    }

    // Adiciona referências gerais
    if (context.references && context.references.length > 0) {
      parts.push('=== REGISTROS EXISTENTES ===');
      
      // Agrupa por tipo
      const clientes = context.references.filter(r => r.type === 'cliente');
      const equipamentos = context.references.filter(r => r.type === 'equipamento');

      if (clientes.length > 0) {
        parts.push(`Clientes (${clientes.length}):`);
        clientes.slice(0, 10).forEach(c => {
          parts.push(`  ID ${c.id}: ${c.identifiers[0]}`);
        });
        if (clientes.length > 10) parts.push(`  ... e mais ${clientes.length - 10}`);
        parts.push('');
      }

      if (equipamentos.length > 0) {
        parts.push(`Equipamentos (${equipamentos.length}):`);
        equipamentos.slice(0, 10).forEach(e => {
          parts.push(`  ID ${e.id}: ${e.identifiers[0]}`);
        });
        if (equipamentos.length > 10) parts.push(`  ... e mais ${equipamentos.length - 10}`);
        parts.push('');
      }

      parts.push('Use os IDs acima quando o usuário mencionar registros existentes.');
      parts.push('');
    }

    return parts.join('\n');
  }

  // Obtém nome amigável para a tabela
  getTableDisplayName(tableName) {
    const names = {
      'clientes': 'Clientes',
      'equipamentos': 'Equipamentos',
      'locacoes': 'Locações',
      'projetos': 'Projetos',
      'inspecoes': 'Inspeções',
      'manutencoes': 'Manutenções',
      'contas': 'Contas',
      'fornecedores': 'Fornecedores'
    };
    
    return names[tableName] || tableName;
  }

  // Resolve nome/código para ID
  resolveId(nome, type, context) {
    if (!context.references) return null;

    const search = nome.toLowerCase();

    const match = context.references.find(ref => {
      if (type && ref.type !== type) return false;
      return ref.identifiers.some(id =>
        id.toString().toLowerCase().includes(search) ||
        search.includes(id.toString().toLowerCase())
      );
    });

    return match ? match.id : null;
  }
}

module.exports = { ContextManager };