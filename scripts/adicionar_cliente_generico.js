const axios = require('axios');

// Dados do cliente genérico
const clienteGenerico = {
  razao_social: 'Empresa Cliente Genérica S.A.',
  nome_fantasia: 'Cliente Genérico',
  cnpj: '12.345.678/0001-90',
  email: 'contato@clientegenerico.com.br',
  telefone: '(11) 3456-7890',
  endereco: 'Rua das Empresas, 123',
  cidade: 'São Paulo',
  estado: 'SP',
  cep: '01234-567',
  segmento: 'Serviços',
  contato_nome: 'João Silva',
  contato_email: 'joao.silva@clientegenerico.com.br',
  contato_telefone: '(11) 98765-4321',
  observacoes: 'Cliente genérico adicionado para testes do sistema',
  ativo: 1
};

async function adicionarCliente() {
  try {
    console.log('Adicionando cliente genérico...');
    
    // Fazer a requisição para a API
    const response = await axios.post('https://sistemaoffcon.onrender.com/api/clientes', clienteGenerico, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000
    });

    console.log('✅ Cliente adicionado com sucesso!');
    console.log('ID do cliente:', response.data.id);
    console.log('Mensagem:', response.data.message);
    console.log('\nDados do cliente:');
    console.log('Razão Social:', clienteGenerico.razao_social);
    console.log('Nome Fantasia:', clienteGenerico.nome_fantasia);
    console.log('CNPJ:', clienteGenerico.cnpj);
    console.log('E-mail:', clienteGenerico.email);
    console.log('Telefone:', clienteGenerico.telefone);
    
  } catch (error) {
    console.error('❌ Erro ao adicionar cliente:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Erro:', error.response.data);
    } else if (error.request) {
      console.error('Sem resposta do servidor');
    } else {
      console.error('Erro:', error.message);
    }
  }
}

// Executar a função
adicionarCliente();
