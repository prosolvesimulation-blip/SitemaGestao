// Adaptadores para múltiplos provedores de IA (Bring Your Own Key)
const OpenAI = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');

class AIProviderFactory {
  constructor() {
    this.providers = {
      openai: new OpenAIAdapter(),
      gemini: new GeminiAdapter(),
      anthropic: new AnthropicAdapter(),
      azure: new AzureOpenAIAdapter(),
      groq: new GroqAdapter(),
      nvidia: new NVIDIAAdapter()
    };
  }

  getProvider(providerName) {
    const provider = this.providers[providerName.toLowerCase()];
    if (!provider) {
      throw new Error(`Provedor '${providerName}' não suportado. Provedores disponíveis: ${Object.keys(this.providers).join(', ')}`);
    }
    return provider;
  }

  async processMessage(providerName, apiKey, message, options = {}) {
    const provider = this.getProvider(providerName);
    return await provider.processMessage(apiKey, message, options);
  }

  async processImage(providerName, apiKey, imageBase64, mimeType, prompt, options = {}) {
    const provider = this.getProvider(providerName);
    return await provider.processImage(apiKey, imageBase64, mimeType, prompt, options);
  }

  validateApiKey(providerName, apiKey) {
    const provider = this.getProvider(providerName);
    return provider.validateApiKey(apiKey);
  }

  getSupportedModels(providerName) {
    const provider = this.getProvider(providerName);
    return provider.getSupportedModels();
  }
}

// OpenAI (GPT-4, GPT-4V, GPT-3.5)
class OpenAIAdapter {
  async processMessage(apiKey, message, options = {}) {
    const openai = new OpenAI({ apiKey });

    const model = options.model || 'gpt-4';
    const temperature = options.temperature || 0.1;
    const maxTokens = options.maxTokens || 2000;

    try {
      const response = await openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: options.systemPrompt || '' },
          { role: 'user', content: message }
        ],
        temperature,
        max_tokens: maxTokens,
        response_format: options.jsonMode ? { type: 'json_object' } : undefined
      });

      return {
        success: true,
        content: response.choices[0].message.content,
        usage: response.usage,
        model: response.model,
        provider: 'openai'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        provider: 'openai'
      };
    }
  }

  async processImage(apiKey, imageBase64, mimeType, prompt, options = {}) {
    const openai = new OpenAI({ apiKey });

    const model = options.model || 'gpt-4-vision-preview';
    const maxTokens = options.maxTokens || 2000;

    try {
      const response = await openai.chat.completions.create({
        model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${imageBase64}`,
                  detail: options.detail || 'auto'
                }
              }
            ]
          }
        ],
        max_tokens: maxTokens
      });

      return {
        success: true,
        content: response.choices[0].message.content,
        usage: response.usage,
        model: response.model,
        provider: 'openai'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        provider: 'openai'
      };
    }
  }

  validateApiKey(apiKey) {
    return apiKey && apiKey.startsWith('sk-') && apiKey.length > 20;
  }

  getSupportedModels() {
    return [
      { id: 'gpt-4', name: 'GPT-4', description: 'Melhor para tarefas complexas' },
      { id: 'gpt-4-turbo-preview', name: 'GPT-4 Turbo', description: 'Mais rápido e atualizado' },
      { id: 'gpt-4-vision-preview', name: 'GPT-4 Vision', description: 'Análise de imagens' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Rápido e econômico' }
    ];
  }
}

// Google Gemini
class GeminiAdapter {
  async processMessage(apiKey, message, options = {}) {
    const genAI = new GoogleGenerativeAI(apiKey);

    const modelName = options.model || 'gemini-pro';
    const model = genAI.getGenerativeModel({ model: modelName });

    try {
      const result = await model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [
              { text: options.systemPrompt || '' },
              { text: message }
            ]
          }
        ],
        generationConfig: {
          temperature: options.temperature || 0.1,
          maxOutputTokens: options.maxTokens || 2000
        }
      });

      return {
        success: true,
        content: result.response.text(),
        usage: result.response.usageMetadata,
        model: modelName,
        provider: 'gemini'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        provider: 'gemini'
      };
    }
  }

  async processImage(apiKey, imageBase64, mimeType, prompt, options = {}) {
    const genAI = new GoogleGenerativeAI(apiKey);

    const modelName = options.model || 'gemini-pro-vision';
    const model = genAI.getGenerativeModel({ model: modelName });

    try {
      const result = await model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType,
                  data: imageBase64
                }
              }
            ]
          }
        ]
      });

      return {
        success: true,
        content: result.response.text(),
        usage: result.response.usageMetadata,
        model: modelName,
        provider: 'gemini'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        provider: 'gemini'
      };
    }
  }

  validateApiKey(apiKey) {
    return apiKey && apiKey.length > 30;
  }

  getSupportedModels() {
    return [
      { id: 'gemini-pro', name: 'Gemini Pro', description: 'Modelo principal do Gemini' },
      { id: 'gemini-pro-vision', name: 'Gemini Pro Vision', description: 'Análise de imagens' },
      { id: 'gemini-ultra', name: 'Gemini Ultra', description: 'Modelo mais poderoso' }
    ];
  }
}

// Anthropic Claude
class AnthropicAdapter {
  async processMessage(apiKey, message, options = {}) {
    const model = options.model || 'claude-3-opus-20240229';

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model,
          max_tokens: options.maxTokens || 2000,
          temperature: options.temperature || 0.1,
          system: options.systemPrompt || '',
          messages: [
            { role: 'user', content: message }
          ]
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Erro na API Anthropic');
      }

      return {
        success: true,
        content: data.content[0].text,
        usage: data.usage,
        model: data.model,
        provider: 'anthropic'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        provider: 'anthropic'
      };
    }
  }

  async processImage(apiKey, imageBase64, mimeType, prompt, options = {}) {
    const model = options.model || 'claude-3-opus-20240229';

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model,
          max_tokens: options.maxTokens || 2000,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: mimeType,
                    data: imageBase64
                  }
                }
              ]
            }
          ]
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Erro na API Anthropic');
      }

      return {
        success: true,
        content: data.content[0].text,
        usage: data.usage,
        model: data.model,
        provider: 'anthropic'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        provider: 'anthropic'
      };
    }
  }

  validateApiKey(apiKey) {
    return apiKey && apiKey.startsWith('sk-ant');
  }

  getSupportedModels() {
    return [
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Modelo mais poderoso' },
      { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', description: 'Balanço entre velocidade e qualidade' },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', description: 'Mais rápido e econômico' }
    ];
  }
}

// Azure OpenAI
class AzureOpenAIAdapter {
  async processMessage(apiKey, message, options = {}) {
    const endpoint = options.endpoint || process.env.AZURE_OPENAI_ENDPOINT;
    const deployment = options.deployment || process.env.AZURE_OPENAI_DEPLOYMENT;

    try {
      const response = await fetch(`${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=2024-02-01`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: options.systemPrompt || '' },
            { role: 'user', content: message }
          ],
          temperature: options.temperature || 0.1,
          max_tokens: options.maxTokens || 2000
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Erro na API Azure OpenAI');
      }

      return {
        success: true,
        content: data.choices[0].message.content,
        usage: data.usage,
        model: deployment,
        provider: 'azure'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        provider: 'azure'
      };
    }
  }

  async processImage(apiKey, imageBase64, mimeType, prompt, options = {}) {
    const endpoint = options.endpoint || process.env.AZURE_OPENAI_ENDPOINT;
    const deployment = options.deployment || process.env.AZURE_OPENAI_DEPLOYMENT;

    try {
      const response = await fetch(`${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=2024-02-01`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${mimeType};base64,${imageBase64}`
                  }
                }
              ]
            }
          ],
          max_tokens: options.maxTokens || 2000
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Erro na API Azure OpenAI');
      }

      return {
        success: true,
        content: data.choices[0].message.content,
        usage: data.usage,
        model: deployment,
        provider: 'azure'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        provider: 'azure'
      };
    }
  }

  validateApiKey(apiKey) {
    return apiKey && apiKey.length > 20;
  }

  getSupportedModels() {
    return [
      { id: 'gpt-4', name: 'Azure GPT-4', description: 'GPT-4 hospedado no Azure' },
      { id: 'gpt-4-vision', name: 'Azure GPT-4 Vision', description: 'GPT-4 com visão no Azure' },
      { id: 'gpt-35-turbo', name: 'Azure GPT-3.5 Turbo', description: 'GPT-3.5 no Azure' }
    ];
  }
}

// Groq (Inferência ultrarrápida com LPU)
class GroqAdapter {
  async processMessage(apiKey, message, options = {}) {
    const model = options.model || 'llama-3.3-70b-versatile';
    const temperature = options.temperature || 0.1;
    const maxTokens = options.maxTokens || 2000;

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: options.systemPrompt || '' },
            { role: 'user', content: message }
          ],
          temperature,
          max_tokens: maxTokens,
          response_format: options.jsonMode ? { type: 'json_object' } : undefined
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Erro na API Groq');
      }

      return {
        success: true,
        content: data.choices[0].message.content,
        usage: data.usage,
        model: data.model,
        provider: 'groq'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        provider: 'groq'
      };
    }
  }

  async processImage(apiKey, imageBase64, mimeType, prompt, options = {}) {
    // Groq agora usa modelos Llama 4 para visão
    const model = options.model || 'meta-llama/llama-4-scout-17b-16e-instruct';
    const maxTokens = options.maxTokens || 2000;

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${mimeType};base64,${imageBase64}`,
                    detail: options.detail || 'auto'
                  }
                }
              ]
            }
          ],
          max_tokens: maxTokens
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Erro na API Groq Vision');
      }

      return {
        success: true,
        content: data.choices[0].message.content,
        usage: data.usage,
        model: data.model,
        provider: 'groq'
      };
    } catch (error) {
      console.error('GroqAdapter Error:', error.message);
      return {
        success: false,
        error: error.message,
        provider: 'groq'
      };
    }
  }

  validateApiKey(apiKey) {
    return apiKey && apiKey.startsWith('gsk_') && apiKey.length > 20;
  }

  getSupportedModels() {
    return [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', description: '280 t/s - Melhor qualidade geral' },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', description: '560 t/s - Ultra rápido e barato' },
      { id: 'meta-llama/llama-4-scout-17b-16e-instruct', name: 'Llama 4 Scout (Vision)', description: '750 t/s - Rápido, eficiente e multimodal' },
      { id: 'meta-llama/llama-4-maverick-17b-128e-instruct', name: 'Llama 4 Maverick (Vision)', description: '600 t/s - Modelo mais recente e multimodal' },
      { id: 'groq/compound', name: 'Groq Compound', description: 'Sistema agentic com ferramentas' }
    ];
  }
}

// NVIDIA NIM / Moonshot
class NVIDIAAdapter {
  async processMessage(apiKey, message, options = {}) {
    // Definir modelo padrão se não fornecido
    const model = options.model || 'moonshotai/kimi-k2.5';
    // Temperatura padrão sugerida 1.0 para este modelo
    const temperature = options.temperature !== undefined ? options.temperature : 1.0;
    const maxTokens = options.maxTokens || 16384;

    try {
      const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: options.systemPrompt || '' },
            { role: 'user', content: message }
          ],
          max_tokens: maxTokens,
          temperature,
          top_p: 1.0,
          stream: false // Para compatibilidade com o backend atual que espera resposta completa
        })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Erro NVIDIA:', JSON.stringify(data));
        throw new Error(data.error?.message || data.detail || 'Erro desconhecido na API NVIDIA');
      }

      // Tratamento robusto da resposta
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('Formato de resposta inesperado da NVIDIA');
      }

      return {
        success: true,
        content: content,
        usage: data.usage || {},
        model: data.model || model,
        provider: 'nvidia'
      };
    } catch (error) {
      console.error('Erro no processamento NVIDIA:', error);
      return {
        success: false,
        error: error.message,
        provider: 'nvidia'
      };
    }
  }

  async processImage(apiKey, imageBase64, mimeType, prompt, options = {}) {
    // Suporte a visão pode ser adicionado futuramente
    // Alguns modelos da NVIDIA suportam, mas requer verificar a compatibilidade
    return {
      success: false,
      error: 'Análise de imagem não suportada neste provedor atualmente.',
      provider: 'nvidia'
    };
  }

  validateApiKey(apiKey) {
    // Chaves NVIDIA geralmente começam com nvapi-
    return apiKey && (apiKey.startsWith('nvapi-') || apiKey.length > 30);
  }

  getSupportedModels() {
    return [
      { id: 'moonshotai/kimi-k2.5', name: 'Kimi k2.5 (Moonshot)', description: 'Modelo avançado de Raciocínio (Thinking)' },
      { id: 'meta/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', description: 'Meta Llama via NVIDIA NIM' },
      { id: 'mistralai/mixtral-8x22b-instruct-v0.1', name: 'Mixtral 8x22B', description: 'Modelo MoE via NVIDIA' }
    ];
  }
}

module.exports = { AIProviderFactory, OpenAIAdapter, GeminiAdapter, AnthropicAdapter, AzureOpenAIAdapter, GroqAdapter, NVIDIAAdapter };