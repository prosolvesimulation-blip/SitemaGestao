import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Interceptor para tratamento de erros
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Dashboard
export const getDashboardKPIs = () => api.get('/dashboard/kpis');
export const getDashboardCharts = () => api.get('/dashboard/charts');
export const getDashboardAlerts = () => api.get('/dashboard/alerts');

// Clientes
export const getClientes = (params) => api.get('/clientes', { params });
export const getCliente = (id) => api.get(`/clientes/${id}`);
export const createCliente = (data) => api.post('/clientes', data);
export const updateCliente = (id, data) => api.put(`/clientes/${id}`, data);
export const deleteCliente = (id) => api.delete(`/clientes/${id}`);

// Equipamentos
export const getEquipamentos = (params) => api.get('/equipamentos', { params });
export const getEquipamento = (id) => api.get(`/equipamentos/${id}`);
export const createEquipamento = (data) => api.post('/equipamentos', data);
export const updateEquipamento = (id, data) => api.put(`/equipamentos/${id}`, data);
export const deleteEquipamento = (id) => api.delete(`/equipamentos/${id}`);

// Locações
export const getLocacoes = (params) => api.get('/locacoes', { params });
export const getLocacao = (id) => api.get(`/locacoes/${id}`);
export const createLocacao = (data) => api.post('/locacoes', data);
export const updateLocacao = (id, data) => api.put(`/locacoes/${id}`, data);
export const finalizarLocacao = (id, data) => api.put(`/locacoes/${id}/finalizar`, data);
export const deleteLocacao = (id) => api.delete(`/locacoes/${id}`);

// Projetos
export const getProjetos = (params) => api.get('/projetos', { params });
export const getProjeto = (id) => api.get(`/projetos/${id}`);
export const createProjeto = (data) => api.post('/projetos', data);
export const updateProjeto = (id, data) => api.put(`/projetos/${id}`, data);
export const aprovarProjeto = (id) => api.put(`/projetos/${id}/aprovar`);
export const iniciarProjeto = (id, data) => api.put(`/projetos/${id}/iniciar`, data);
export const concluirProjeto = (id, data) => api.put(`/projetos/${id}/concluir`, data);
export const deleteProjeto = (id) => api.delete(`/projetos/${id}`);

// Inspeções
export const getInspecoes = (params) => api.get('/inspecoes', { params });
export const getInspecao = (id) => api.get(`/inspecoes/${id}`);
export const createInspecao = (data) => api.post('/inspecoes', data);
export const updateInspecao = (id, data) => api.put(`/inspecoes/${id}`, data);
export const deleteInspecao = (id) => api.delete(`/inspecoes/${id}`);

// Manutenções
export const getManutencoes = (params) => api.get('/manutencoes', { params });
export const getManutencao = (id) => api.get(`/manutencoes/${id}`);
export const createManutencao = (data) => api.post('/manutencoes', data);
export const updateManutencao = (id, data) => api.put(`/manutencoes/${id}`, data);
export const iniciarManutencao = (id) => api.put(`/manutencoes/${id}/iniciar`);
export const concluirManutencao = (id, data) => api.put(`/manutencoes/${id}/concluir`, data);
export const deleteManutencao = (id) => api.delete(`/manutencoes/${id}`);

// Financeiro
export const getResumoFinanceiro = (params) => api.get('/financeiro/resumo', { params });
export const getContas = (params) => api.get('/financeiro/contas', { params });
export const getConta = (id) => api.get(`/financeiro/contas/${id}`);
export const createConta = (data) => api.post('/financeiro/contas', data);
export const updateConta = (id, data) => api.put(`/financeiro/contas/${id}`, data);
export const pagarConta = (id, data) => api.put(`/financeiro/contas/${id}/pagar`, data);
export const deleteConta = (id) => api.delete(`/financeiro/contas/${id}`);

// Fornecedores
export const getFornecedores = (params) => api.get('/financeiro/fornecedores', { params });
export const createFornecedor = (data) => api.post('/financeiro/fornecedores', data);
export const updateFornecedor = (id, data) => api.put(`/financeiro/fornecedores/${id}`, data);

// Relatórios
export const getRelatorioOcupacao = (params) => api.get('/relatorios/ocupacao', { params });
export const getRelatorioClientes = () => api.get('/relatorios/clientes');
export const getRelatorioManutencoes = (params) => api.get('/relatorios/manutencoes', { params });
export const getRelatorioProjetos = () => api.get('/relatorios/projetos');
export const getRelatorioInspecoes = () => api.get('/relatorios/inspecoes');

export default api;