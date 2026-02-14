const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { AIProviderFactory } = require('../services/aiProviders');
const { CommandProcessor } = require('../services/commandProcessor');
const { ContextManager } = require('../services/contextManager');
const { GuidedOperationsService } = require('../services/guidedOperations');
const SYSTEM_PROMPTS = require('../services/prompts');
const db = require('../database/connection');

// Configuração do multer para upload de imagens
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não suportado. Use JPEG, PNG, WebP ou AVIF'));
    }
  }
});

const aiFactory = new AIProviderFactory();
const commandProcessor = new CommandProcessor();
const contextManager = new ContextManager();
const guidedOps = new GuidedOperationsService();
const GROQ_KEY_PATHS = [
  path.resolve(__dirname, '../../groq.txt'),
  path.resolve(__dirname, '../../resources/groq.txt')
];

let cachedGroqKey = null;
let cachedGroqReadAt = 0;

const extractJsonFromText = (content) => {
  const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/{[\s\S]*}/);
  return (jsonMatch && (jsonMatch[1] || jsonMatch[0])) || content;
};

const getGroqKeyFromFile = () => {
  const now = Date.now();
  if (now - cachedGroqReadAt < 60000) {
    return cachedGroqKey;
  }

  cachedGroqReadAt = now;
  cachedGroqKey = null;

  try {
    for (const filePath of GROQ_KEY_PATHS) {
      if (!fs.existsSync(filePath)) continue;

      const raw = fs.readFileSync(filePath, 'utf8');
      const firstValidLine = raw
        .split(/\r?\n/)
        .map(line => line.trim())
        .find(line => line && !line.startsWith('#'));

      if (!firstValidLine) continue;

      // Aceita formato:
      // 1) gsk_xxx
      // 2) GROQ_API_KEY=gsk_xxx
      const normalizedValue = firstValidLine.includes('=')
        ? firstValidLine.split('=').slice(1).join('=').trim().replace(/^['"]|['"]$/g, '')
        : firstValidLine;

      if (normalizedValue) {
        cachedGroqKey = normalizedValue;
        break;
      }
    }
  } catch (error) {
    console.warn(`Não foi possível ler chave Groq em arquivo:`, error.message);
  }

  return cachedGroqKey;
};

const getServerApiKey = (provider) => {
  const normalizedProvider = String(provider || '').toLowerCase();
  if (normalizedProvider !== 'groq') return null;
  return process.env.GROQ_API_KEY || process.env.GROQ_APIKEY || getGroqKeyFromFile() || null;
};

const resolveAIConfig = (payload = {}) => {
  const provider = String(payload.provider || 'groq').toLowerCase();
  const apiKey = (payload.apiKey && String(payload.apiKey).trim()) || getServerApiKey(provider);
  return {
    provider,
    apiKey,
    model: payload.model
  };
};

const callPlanningUpdate = async (payload) => {
  const port = process.env.PORT || 3001;
  const response = await fetch(`http://127.0.0.1:${port}/api/planning/ai/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || data.message || 'Falha ao atualizar planejamento');
  }
  return data;
};

const getPlanningWbsRows = (osId) => {
  const rows = db.prepare(`
    SELECT
      a.id,
      a.codigo,
      a.descricao,
      a.status,
      a.progresso,
      a.data_inicio,
      a.data_fim,
      a.responsavel,
      a.tipo,
      a.ordem,
      p.codigo AS parent_codigo
    FROM wbs_atividades a
    LEFT JOIN wbs_atividades p ON p.id = a.parent_id
    WHERE a.os_id = ?
    ORDER BY COALESCE(a.ordem, 0), a.codigo, a.id
  `).all(Number(osId));

  return rows;
};

const buildPlanningSystemPrompt = (os, wbsRows) => {
  const wbsContext = wbsRows.length
    ? wbsRows.map((r) => {
      const parentPart = r.parent_codigo ? ` | parent_codigo=${r.parent_codigo}` : '';
      return `- codigo=${r.codigo}${parentPart} | descricao=${r.descricao || ''} | status=${r.status || 'pendente'} | progresso=${r.progresso || 0} | inicio=${r.data_inicio || ''} | fim=${r.data_fim || ''} | responsavel=${r.responsavel || ''} | tipo=${r.tipo || 'entrega'} | ordem=${r.ordem || 0}`;
    }).join('\n')
    : '- (sem atividades)';

  return `Você é um assistente especialista em planejamento (WBS) do OFFCON.
Sua saída deve ser JSON estrito para atualizar cronograma via /api/planning/ai/update.

OS alvo:
- os_id: ${os.id}
- numero: ${os.numero || ''}
- status: ${os.status || ''}
- cliente: ${os.cliente_nome || ''}

WBS atual da OS:
${wbsContext}

Regras obrigatórias:
1. Retorne APENAS JSON válido (sem markdown, sem texto fora do JSON).
2. O JSON final deve ter EXATAMENTE esta estrutura:
{
  "os_id": ${os.id},
  "activities": [
    {
      "codigo": "string obrigatório",
      "descricao": "string opcional",
      "parent_codigo": "string|null opcional",
      "data_inicio": "YYYY-MM-DD|null opcional",
      "data_fim": "YYYY-MM-DD|null opcional",
      "status": "pendente|em_andamento|concluido|cancelado opcional",
      "progresso": "0-100 opcional",
      "responsavel": "string|null opcional",
      "tipo": "entrega|marco|resumo opcional",
      "ordem": "number opcional"
    }
  ],
  "remove_codes": [],
  "delete_missing": false,
  "summary": "resumo curto do que será alterado"
}
3. Sempre preserve os códigos corretos da WBS existente quando o usuário referenciar item como "3.2", "1.4", etc.
4. Se o usuário pedir ajuste em um item específico, envie apenas as atividades necessárias para esse ajuste (modo incremental).
5. Não invente dados além do pedido do usuário.
6. Nunca mude o os_id da OS alvo.
7. Se o usuário pedir remoção, use remove_codes.
8. Use delete_missing=true somente se o usuário pedir sincronização completa.
`;
};

const normalizePlanningCommand = (raw, osId) => {
  const source = raw?.payload && typeof raw.payload === 'object' ? raw.payload : raw;
  const activities = Array.isArray(source?.activities) ? source.activities : [];
  const removeCodes = Array.isArray(source?.remove_codes) ? source.remove_codes.filter(Boolean) : [];
  const deleteMissing = Boolean(source?.delete_missing);

  const normalizedActivities = activities
    .filter(activity => activity && activity.codigo)
    .map((activity) => ({
      codigo: String(activity.codigo).trim(),
      descricao: activity.descricao,
      parent_codigo: Object.prototype.hasOwnProperty.call(activity, 'parent_codigo') ? activity.parent_codigo : undefined,
      data_inicio: Object.prototype.hasOwnProperty.call(activity, 'data_inicio') ? activity.data_inicio : undefined,
      data_fim: Object.prototype.hasOwnProperty.call(activity, 'data_fim') ? activity.data_fim : undefined,
      status: activity.status,
      progresso: activity.progresso,
      responsavel: Object.prototype.hasOwnProperty.call(activity, 'responsavel') ? activity.responsavel : undefined,
      tipo: activity.tipo,
      ordem: activity.ordem
    }));

  return {
    os_id: Number(osId),
    activities: normalizedActivities,
    remove_codes: removeCodes,
    delete_missing: deleteMissing,
    summary: source?.summary || 'Atualização de planejamento gerada pelo assistente'
  };
};

// POST /api/ai/chat - Processa mensagens de texto
router.post('/chat', async (req, res) => {
  try {
    const {
      message,
      provider = 'groq',
      model,
      module: targetModule,
      history = []
    } = req.body;
    const aiConfig = resolveAIConfig({ provider, apiKey: req.body.apiKey, model });

    if (!message) {
      return res.status(400).json({ error: 'Mensagem é obrigatória' });
    }

    if (!aiConfig.apiKey) {
      return res.status(400).json({ error: 'API Key ausente. Para Groq, configure GROQ_API_KEY ou o arquivo groq.txt no diretório do projeto.' });
    }

    // Valida API key
    const isValidKey = aiFactory.validateApiKey(aiConfig.provider, aiConfig.apiKey);
    if (!isValidKey) {
      return res.status(400).json({ error: 'API Key inválida' });
    }

    // Busca contexto atual do banco de dados
    console.log('🔄 Buscando contexto do banco de dados...');
    const context = await contextManager.buildContext(message);
    const contextPrompt = contextManager.generateContextPrompt(context);

    // Monta o prompt com contexto do módulo
    let systemPrompt = SYSTEM_PROMPTS.BASE;
    if (targetModule && SYSTEM_PROMPTS[targetModule.toUpperCase()]) {
      systemPrompt += '\n\n' + SYSTEM_PROMPTS[targetModule.toUpperCase()];
    }

    // Adiciona contexto do banco de dados
    systemPrompt += '\n\n' + contextPrompt;

    // Adiciona contexto de módulos disponíveis
    systemPrompt += `

MÓDULOS DISPONÍVEIS:
- clientes: Gestão de clientes e fornecedores
- equipamentos: Controle de containers e equipamentos
- locacoes: Contratos de locação
- projetos: Projetos de fabricação
- financeiro: Contas a pagar/receber
- inspecoes: Inspeções DNV
- manutencoes: Ordens de serviço

Determine automaticamente qual módulo usar baseado na solicitação do usuário.`;

    // Processa com a IA
    const aiResponse = await aiFactory.processMessage(aiConfig.provider, aiConfig.apiKey, message, {
      model: aiConfig.model,
      systemPrompt,
      temperature: 0.1,
      jsonMode: true
    });

    if (!aiResponse.success) {
      return res.status(500).json({
        error: 'Erro na IA',
        details: aiResponse.error,
        provider: aiResponse.provider
      });
    }

    // Tenta fazer parse do JSON
    let command;
    try {
      // Extrai JSON se estiver em markdown
      command = JSON.parse(extractJsonFromText(aiResponse.content));
    } catch (e) {
      return res.json({
        success: false,
        error: 'Resposta da IA não é um JSON válido',
        rawResponse: aiResponse.content,
        provider: aiResponse.provider,
        usage: aiResponse.usage
      });
    }

    // Se não requer confirmação, executa imediatamente
    if (command.requires_confirmation === false && command.action !== 'QUERY') {
      const result = await commandProcessor.processCommand(command);

      return res.json({
        success: result.success,
        message: result.message || command.confirmation_message,
        command,
        result,
        context: {
          clientes_count: context.records?.clientes?.length || 0,
          equipamentos_count: context.records?.equipamentos?.length || 0,
          locacoes_count: context.records?.locacoes?.length || 0
        },
        provider: aiResponse.provider,
        usage: aiResponse.usage,
        autoExecuted: true
      });
    }

    // Retorna comando para confirmação do usuário
    res.json({
      success: true,
      command,
      message: command.confirmation_message || 'Ação requer confirmação',
      requiresConfirmation: command.requires_confirmation !== false,
      context: {
        clientes_count: context.records?.clientes?.length || 0,
        equipamentos_count: context.records?.equipamentos?.length || 0,
        locacoes_count: context.records?.locacoes?.length || 0
      },
      provider: aiResponse.provider,
      usage: aiResponse.usage
    });

  } catch (error) {
    console.error('Erro no chat IA:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai/execute - Executa comando confirmado
router.post('/execute', async (req, res) => {
  try {
    const { command } = req.body;

    if (!command) {
      return res.status(400).json({ error: 'Comando é obrigatório' });
    }

    // Suporte a múltiplos comandos (Bulk Actions)
    const commands = Array.isArray(command) ? command : [command];
    const results = [];

    for (const cmd of commands) {
      let result;

      if (String(cmd?.action || '').toUpperCase() === 'PLANNING_UPDATE') {
        try {
          const planningPayload = normalizePlanningCommand(cmd?.payload || cmd, cmd?.payload?.os_id || cmd?.os_id);
          const planningResult = await callPlanningUpdate(planningPayload);
          result = {
            success: true,
            message: planningResult.message || 'Atualização de planejamento executada',
            planning: planningResult
          };
        } catch (error) {
          result = {
            success: false,
            error: error.message,
            message: 'Falha ao executar atualização de planejamento'
          };
        }
      } else {
        result = await commandProcessor.processCommand(cmd);
      }

      results.push({
        command: cmd,
        success: result.success,
        message: result.message,
        error: result.error,
        result
      });
    }

    const allSuccessful = results.every(r => r.success);
    const successCount = results.filter(r => r.success).length;

    res.json({
      success: allSuccessful,
      message: Array.isArray(command)
        ? `${successCount} de ${results.length} ações processadas com sucesso.`
        : results[0].message,
      results,
      result: !allSuccessful ? { error: results.find(r => !r.success)?.error || 'Erro desconhecido' } : results[0].result,
      command
    });

  } catch (error) {
    console.error('Erro ao executar comando:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai/analyze-image - Analisa imagem/documento
router.post('/analyze-image', upload.single('image'), async (req, res) => {
  try {
    const {
      provider = 'groq',
      model,
      prompt = 'Analise esta imagem e identifique qualquer documento ou informação relevante para o sistema de gestão.',
      context = ''
    } = req.body;
    const aiConfig = resolveAIConfig({ provider, apiKey: req.body.apiKey, model });

    if (!req.file) {
      return res.status(400).json({ error: 'Imagem é obrigatória' });
    }

    if (!aiConfig.apiKey) {
      return res.status(400).json({ error: 'API Key ausente. Para Groq, configure GROQ_API_KEY ou groq.txt.' });
    }

    // Converte imagem para base64
    const imageBase64 = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype;

    console.log(`📸 Analisando imagem: ${req.file.originalname} (${mimeType})`);
    console.log(`🤖 Provedor: ${aiConfig.provider}, Modelo: ${aiConfig.model}`);

    // Busca detalhes da tabela se fornecida para melhorar o prompt
    let tableContext = '';
    if (req.body.table) {
      const tableConfig = guidedOps.getTableConfig(req.body.table);
      if (tableConfig) {
        tableContext = `\n--- ESQUEMA DA TABELA DE DESTINO SUGERIDA ---\n` +
          `Nome Humano: ${tableConfig.name}\n` +
          `Identificador Técnico: ${req.body.table}\n` +
          `Campos Disponíveis para Mapeamento:\n` +
          tableConfig.requiredFields.map(f => `  * Key: "${f.name}" (${f.label})`).join('\n') + '\n' +
          tableConfig.optionalFields.map(f => `  * Key: "${f.name}" (${f.label})`).join('\n') +
          `\nInstrução: Use essas Keys no objeto "suggested_action.data". Se encontrar dados que não se encaixam nessas Keys, coloque-os apenas em "extracted_data".\n`;
      }
    }

    // Monta prompt completo
    const fullPrompt = `${SYSTEM_PROMPTS.ANALISE_IMAGEM}\n\nContexto da Tabela: ${tableContext}\n\nContexto adicional: ${context}\n\n${prompt}`;

    console.log(`🧠 Prompt de análise enriquecido com esquema da tabela ${req.body.table || 'N/A'}`);

    // Processa com a IA
    const isValidKey = aiFactory.validateApiKey(aiConfig.provider, aiConfig.apiKey);
    if (!isValidKey) {
      return res.status(400).json({ error: 'API Key inválida' });
    }

    const aiResponse = await aiFactory.processImage(aiConfig.provider, aiConfig.apiKey, imageBase64, mimeType, fullPrompt, {
      model: aiConfig.model // Se model for null, o adapter deve usar seu default
    });

    if (!aiResponse.success) {
      console.error(`❌ Erro no adapter ${aiConfig.provider}:`, aiResponse.error);
      return res.status(500).json({
        error: 'Erro na análise de imagem',
        details: aiResponse.error
      });
    }

    console.log(`📡 Resposta bruta da IA:\n${aiResponse.content}`);

    // Tenta extrair JSON
    let analysis;
    try {
      analysis = JSON.parse(extractJsonFromText(aiResponse.content));
    } catch (e) {
      // Se não for JSON, retorna texto bruto
      analysis = {
        raw_analysis: aiResponse.content,
        document_type: 'DESCONHECIDO'
      };
    }

    res.json({
      success: true,
      analysis,
      imageInfo: {
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size
      },
      provider: aiResponse.provider,
      usage: aiResponse.usage
    });

  } catch (error) {
    console.error('Erro na análise de imagem:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/ai/providers - Lista provedores disponíveis
router.get('/providers', (req, res) => {
  const hasServerGroqKey = Boolean(getServerApiKey('groq'));
  const providers = {
    openai: {
      name: 'OpenAI',
      description: 'GPT-4, GPT-4V, GPT-3.5',
      models: aiFactory.getProvider('openai').getSupportedModels(),
      requiresApiKey: true,
      apiKeyFormat: 'sk-...',
      supportsImages: true
    },
    gemini: {
      name: 'Google Gemini',
      description: 'Gemini Pro, Gemini Ultra',
      models: aiFactory.getProvider('gemini').getSupportedModels(),
      requiresApiKey: true,
      apiKeyFormat: 'Chave da API Google AI',
      supportsImages: true
    },
    anthropic: {
      name: 'Anthropic Claude',
      description: 'Claude 3 Opus, Sonnet, Haiku',
      models: aiFactory.getProvider('anthropic').getSupportedModels(),
      requiresApiKey: true,
      apiKeyFormat: 'sk-ant-...',
      supportsImages: true
    },
    azure: {
      name: 'Azure OpenAI',
      description: 'GPT-4 no Azure',
      models: aiFactory.getProvider('azure').getSupportedModels(),
      requiresApiKey: true,
      apiKeyFormat: 'API Key do Azure',
      requiresEndpoint: true,
      supportsImages: true
    },
    groq: {
      name: 'Groq',
      description: 'Inferência ultrarrápida com LPU',
      models: aiFactory.getProvider('groq').getSupportedModels(),
      requiresApiKey: !hasServerGroqKey,
      serverSideKeyAvailable: hasServerGroqKey,
      apiKeyFormat: 'gsk_...',
      supportsImages: true,
      highlights: [
        '⚡ Até 1000 tokens/segundo',
        '💰 89% mais barato',
        '🦙 Llama 3.3 70B, GPT OSS',
        '🔥 Compatível OpenAI'
      ]
    }
  };

  res.json({ providers });
});

// GET /api/ai/config-status - status de configuração do servidor
router.get('/config-status', (req, res) => {
  const hasServerGroqKey = Boolean(getServerApiKey('groq'));
  res.json({
    defaultProvider: 'groq',
    defaultModelByProvider: {
      groq: 'llama-3.3-70b-versatile'
    },
    serverSideKeys: {
      groq: hasServerGroqKey
    }
  });
});

// GET /api/ai/modules - Lista módulos disponíveis
router.get('/modules', (req, res) => {
  const modules = [
    { id: 'clientes', name: 'Clientes', description: 'Gestão de clientes e CRM' },
    { id: 'equipamentos', name: 'Equipamentos', description: 'Controle de containers' },
    { id: 'locacoes', name: 'Locações', description: 'Contratos de locação' },
    { id: 'projetos', name: 'Projetos', description: 'Projetos de fabricação' },
    { id: 'financeiro', name: 'Financeiro', description: 'Contas e fluxo de caixa' },
    { id: 'inspecoes', name: 'Inspeções', description: 'Inspeções DNV' },
    { id: 'manutencoes', name: 'Manutenções', description: 'Ordens de serviço' }
  ];

  res.json({ modules });
});

// POST /api/ai/validate-key - Valida uma API key
router.post('/validate-key', async (req, res) => {
  try {
    const { provider, apiKey } = req.body;

    if (!provider || !apiKey) {
      return res.status(400).json({ error: 'Provedor e API Key são obrigatórios' });
    }

    const isValid = aiFactory.validateApiKey(provider, apiKey);

    if (!isValid) {
      return res.json({ valid: false, error: 'API Key em formato inválido' });
    }

    // Tenta fazer uma chamada de teste
    const testResponse = await aiFactory.processMessage(provider, apiKey, 'Teste de conexão', {
      temperature: 0
    });

    res.json({
      valid: testResponse.success,
      provider,
      error: testResponse.success ? null : testResponse.error
    });

  } catch (error) {
    res.status(500).json({ valid: false, error: error.message });
  }
});

// ================================
// GUIDED OPERATIONS API
// ================================

// GET /api/ai/guided-tables - Lista tabelas disponíveis para operações guiadas
router.get('/guided-tables', (req, res) => {
  const tables = guidedOps.getTables();
  res.json({ tables });
});

// GET /api/ai/guided-operations - Lista operações disponíveis
router.get('/guided-operations', (req, res) => {
  const operations = guidedOps.getOperations();
  res.json({ operations });
});

// GET /api/ai/guided-config/:table - Retorna configuração de uma tabela
router.get('/guided-config/:table', (req, res) => {
  const config = guidedOps.getTableConfig(req.params.table);
  if (!config) {
    return res.status(404).json({ error: 'Tabela não encontrada' });
  }
  res.json({ config });
});

// POST /api/ai/guided-chat - Processa mensagem com operação guiada
router.post('/guided-chat', async (req, res) => {
  try {
    const {
      message,
      table,
      operation,
      provider = 'groq',
      model
    } = req.body;
    const aiConfig = resolveAIConfig({ provider, apiKey: req.body.apiKey, model });

    if (!message) {
      return res.status(400).json({ error: 'Mensagem é obrigatória' });
    }

    if (!table) {
      return res.status(400).json({ error: 'Tabela é obrigatória para operação guiada' });
    }

    if (!operation) {
      return res.status(400).json({ error: 'Operação é obrigatória para operação guiada' });
    }

    if (!aiConfig.apiKey) {
      return res.status(400).json({ error: 'API Key ausente. Para Groq, configure GROQ_API_KEY ou groq.txt.' });
    }

    // Valida API key
    const isValidKey = aiFactory.validateApiKey(aiConfig.provider, aiConfig.apiKey);
    if (!isValidKey) {
      return res.status(400).json({ error: 'API Key inválida' });
    }

    // Busca contexto do banco de dados para a tabela específica
    console.log(`🎯 Operação guiada: ${operation} em ${table}`);
    const context = await contextManager.buildContext(message);

    // Monta o prompt específico para a operação guiada
    const systemPrompt = guidedOps.buildPrompt(table, operation, message, context.records?.[table] || null);

    // Processa com a IA
    const aiResponse = await aiFactory.processMessage(aiConfig.provider, aiConfig.apiKey, message, {
      model: aiConfig.model,
      systemPrompt,
      temperature: 0.1,
      jsonMode: true
    });

    if (!aiResponse.success) {
      return res.status(500).json({
        error: 'Erro na IA',
        details: aiResponse.error,
        provider: aiResponse.provider
      });
    }

    // Tenta fazer parse do JSON
    let command;
    try {
      command = JSON.parse(extractJsonFromText(aiResponse.content));
    } catch (e) {
      return res.json({
        success: false,
        error: 'Resposta da IA não é um JSON válido',
        rawResponse: aiResponse.content,
        provider: aiResponse.provider,
        usage: aiResponse.usage
      });
    }

    // Se não requer confirmação (ex: QUERY), executa imediatamente
    if (!guidedOps.requiresConfirmation(operation)) {
      const result = await commandProcessor.processCommand(command);

      return res.json({
        success: result.success,
        message: result.message || command.confirmation_message,
        command,
        result,
        context: {
          table,
          operation,
          records_count: result.data?.length || 0
        },
        provider: aiResponse.provider,
        usage: aiResponse.usage,
        autoExecuted: true
      });
    }

    // Retorna comando para confirmação do usuário
    res.json({
      success: true,
      command,
      message: command.confirmation_message || 'Ação requer confirmação',
      requiresConfirmation: true,
      context: {
        table,
        operation
      },
      provider: aiResponse.provider,
      usage: aiResponse.usage
    });

  } catch (error) {
    console.error('Erro no guided-chat:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai/planning-chat - Chat de planejamento com contexto WBS completo da OS
router.post('/planning-chat', async (req, res) => {
  try {
    const {
      message,
      os_id,
      provider = 'groq',
      model
    } = req.body;
    const aiConfig = resolveAIConfig({ provider, apiKey: req.body.apiKey, model });

    if (!message) {
      return res.status(400).json({ error: 'Mensagem é obrigatória' });
    }

    if (!os_id) {
      return res.status(400).json({ error: 'os_id é obrigatório para modo de planejamento' });
    }

    if (!aiConfig.apiKey) {
      return res.status(400).json({ error: 'API Key ausente. Para Groq, configure GROQ_API_KEY ou groq.txt.' });
    }

    const isValidKey = aiFactory.validateApiKey(aiConfig.provider, aiConfig.apiKey);
    if (!isValidKey) {
      return res.status(400).json({ error: 'API Key inválida' });
    }

    const os = db.prepare(`
      SELECT
        os.id,
        os.numero,
        os.status,
        os.data_emissao,
        os.data_previsao_conclusao,
        c.razao_social AS cliente_nome
      FROM ordens_servico os
      LEFT JOIN clientes c ON c.id = os.cliente_id
      WHERE os.id = ?
    `).get(Number(os_id));

    if (!os) {
      return res.status(404).json({ error: 'OS não encontrada' });
    }

    const wbsRows = getPlanningWbsRows(Number(os_id));
    const systemPrompt = buildPlanningSystemPrompt(os, wbsRows);

    const aiResponse = await aiFactory.processMessage(aiConfig.provider, aiConfig.apiKey, message, {
      model: aiConfig.model,
      systemPrompt,
      temperature: 0.05,
      jsonMode: true
    });

    if (!aiResponse.success) {
      return res.status(500).json({
        error: 'Erro na IA',
        details: aiResponse.error,
        provider: aiResponse.provider
      });
    }

    let payload;
    try {
      const parsed = JSON.parse(extractJsonFromText(aiResponse.content));
      payload = normalizePlanningCommand(parsed, Number(os_id));
    } catch (error) {
      return res.json({
        success: false,
        error: 'Resposta da IA não é um JSON válido para planejamento',
        rawResponse: aiResponse.content,
        provider: aiResponse.provider,
        usage: aiResponse.usage
      });
    }

    const command = {
      action: 'PLANNING_UPDATE',
      module: 'planning',
      table: 'wbs_atividades',
      payload,
      confirmation_message: payload.summary || `Atualizar planejamento da OS ${os.numero || os.id}`,
      requires_confirmation: true
    };

    return res.json({
      success: true,
      message: command.confirmation_message,
      command,
      payload,
      os: {
        id: os.id,
        numero: os.numero,
        cliente_nome: os.cliente_nome
      },
      context: {
        wbs_count: wbsRows.length
      },
      requiresConfirmation: true,
      provider: aiResponse.provider,
      usage: aiResponse.usage
    });
  } catch (error) {
    console.error('Erro no planning-chat:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
