const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { AIProviderFactory } = require('../services/aiProviders');
const { CommandProcessor } = require('../services/commandProcessor');
const { ContextManager } = require('../services/contextManager');
const { GuidedOperationsService } = require('../services/guidedOperations');
const SYSTEM_PROMPTS = require('../services/prompts');

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

// POST /api/ai/chat - Processa mensagens de texto
router.post('/chat', async (req, res) => {
  try {
    const {
      message,
      provider = 'openai',
      apiKey,
      model,
      module: targetModule,
      history = []
    } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Mensagem é obrigatória' });
    }

    if (!apiKey) {
      return res.status(400).json({ error: 'API Key é obrigatória (Bring Your Own Key)' });
    }

    // Valida API key
    const isValidKey = aiFactory.validateApiKey(provider, apiKey);
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
    const aiResponse = await aiFactory.processMessage(provider, apiKey, message, {
      model,
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
      let content = aiResponse.content;
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/{[\s\S]*}/);
      if (jsonMatch) {
        content = jsonMatch[1] || jsonMatch[0];
      }
      command = JSON.parse(content);
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
      const result = await commandProcessor.processCommand(cmd);
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
      provider = 'openai',
      apiKey,
      model,
      prompt = 'Analise esta imagem e identifique qualquer documento ou informação relevante para o sistema de gestão.',
      context = ''
    } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'Imagem é obrigatória' });
    }

    if (!apiKey) {
      return res.status(400).json({ error: 'API Key é obrigatória' });
    }

    // Converte imagem para base64
    const imageBase64 = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype;

    console.log(`📸 Analisando imagem: ${req.file.originalname} (${mimeType})`);
    console.log(`🤖 Provedor: ${provider}, Modelo: ${model}`);

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
    const aiResponse = await aiFactory.processImage(provider, apiKey, imageBase64, mimeType, fullPrompt, {
      model: model // Se model for null, o adapter deve usar seu default
    });

    if (!aiResponse.success) {
      console.error(`❌ Erro no adapter ${provider}:`, aiResponse.error);
      return res.status(500).json({
        error: 'Erro na análise de imagem',
        details: aiResponse.error
      });
    }

    console.log(`📡 Resposta bruta da IA:\n${aiResponse.content}`);

    // Tenta extrair JSON
    let analysis;
    try {
      let content = aiResponse.content;
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/{[\s\S]*}/);
      if (jsonMatch) {
        content = jsonMatch[1] || jsonMatch[0];
      }
      analysis = JSON.parse(content);
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
      requiresApiKey: true,
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
      provider = 'openai',
      apiKey,
      model
    } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Mensagem é obrigatória' });
    }

    if (!table) {
      return res.status(400).json({ error: 'Tabela é obrigatória para operação guiada' });
    }

    if (!operation) {
      return res.status(400).json({ error: 'Operação é obrigatória para operação guiada' });
    }

    if (!apiKey) {
      return res.status(400).json({ error: 'API Key é obrigatória' });
    }

    // Valida API key
    const isValidKey = aiFactory.validateApiKey(provider, apiKey);
    if (!isValidKey) {
      return res.status(400).json({ error: 'API Key inválida' });
    }

    // Busca contexto do banco de dados para a tabela específica
    console.log(`🎯 Operação guiada: ${operation} em ${table}`);
    const context = await contextManager.buildContext(message);

    // Monta o prompt específico para a operação guiada
    const systemPrompt = guidedOps.buildPrompt(table, operation, message, context.records?.[table] || null);

    // Processa com a IA
    const aiResponse = await aiFactory.processMessage(provider, apiKey, message, {
      model,
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
      let content = aiResponse.content;
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/{[\s\S]*}/);
      if (jsonMatch) {
        content = jsonMatch[1] || jsonMatch[0];
      }
      command = JSON.parse(content);
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

module.exports = router;