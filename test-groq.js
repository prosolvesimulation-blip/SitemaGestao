const API_KEY = process.env.GROQ_API_KEY || 'your-api-key-here';

async function testGroqConnection() {
  console.log('🧪 Testando conexão com Groq...\n');
  
  // Teste 1: Listar modelos
  console.log('Teste 1: Listando modelos disponíveis...');
  try {
    const modelsResponse = await fetch('https://api.groq.com/openai/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (modelsResponse.ok) {
      const models = await modelsResponse.json();
      console.log('✅ Conexão OK! Modelos disponíveis:', models.data.length);
      console.log('   Primeiros 3 modelos:');
      models.data.slice(0, 3).forEach(m => console.log(`   - ${m.id}`));
    } else {
      const error = await modelsResponse.json();
      console.log('❌ Erro ao listar modelos:', error.error?.message || error);
    }
  } catch (error) {
    console.log('❌ Erro de conexão:', error.message);
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Teste 2: Chat completion simples
  console.log('Teste 2: Testando chat completion...');
  try {
    const chatResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'Você é um assistente de teste.' },
          { role: 'user', content: 'Responda apenas: "Teste OK"' }
        ],
        temperature: 0,
        max_tokens: 50
      })
    });
    
    if (chatResponse.ok) {
      const result = await chatResponse.json();
      console.log('✅ Chat OK!');
      console.log('   Modelo:', result.model);
      console.log('   Resposta:', result.choices[0].message.content);
      console.log('   Tokens usados:', result.usage?.total_tokens);
      console.log('   Tempo de resposta:', chatResponse.headers.get('x-request-processing-time') || 'N/A');
    } else {
      const error = await chatResponse.json();
      console.log('❌ Erro no chat:', error.error?.message || JSON.stringify(error));
      console.log('   Status:', chatResponse.status);
    }
  } catch (error) {
    console.log('❌ Erro de conexão:', error.message);
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Teste 3: Validação da API key
  console.log('Teste 3: Validando formato da API key...');
  if (API_KEY.startsWith('gsk_') && API_KEY.length > 20) {
    console.log('✅ Formato da key está correto (gsk_...)');
    console.log('   Tamanho:', API_KEY.length, 'caracteres');
  } else {
    console.log('❌ Formato da key parece inválido');
  }
}

testGroqConnection();