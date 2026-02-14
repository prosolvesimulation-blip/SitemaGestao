const db = require('./connection');
const fs = require('fs');
const path = require('path');

console.log('🔄 Inicializando banco de dados OFFCON...');

const executeSchemaFile = (schemaFile) => {
  const schemaPath = path.join(__dirname, schemaFile);
  const schema = fs.readFileSync(schemaPath, 'utf8');
  const statements = schema.split(';').filter((s) => s.trim());

  statements.forEach((statement) => {
    try {
      db.exec(statement);
    } catch (err) {
      console.error(`Erro ao executar statement em ${schemaFile}:`, err.message);
    }
  });
};

// Executar schema principal + planning
executeSchemaFile('schema.sql');
executeSchemaFile('schema_planning.sql');

console.log('✅ Schema criado com sucesso!');

// Inserir dados de exemplo
const seedData = () => {
  console.log('🌱 Inserindo dados de exemplo...');

  // Limpa dados existentes para tornar o seed idempotente
  const clearData = db.transaction(() => {
    db.prepare('DELETE FROM wbs_oc_links').run();
    db.prepare('DELETE FROM wbs_followups').run();
    db.prepare('DELETE FROM wbs_atividades').run();
    db.prepare('DELETE FROM itens_ordem_compra').run();
    db.prepare('DELETE FROM ordens_compra').run();
    db.prepare('DELETE FROM ordens_servico').run();
    db.prepare('DELETE FROM contas').run();
    db.prepare('DELETE FROM manutencoes').run();
    db.prepare('DELETE FROM inspecoes').run();
    db.prepare('DELETE FROM locacoes').run();
    db.prepare('DELETE FROM projetos').run();
    db.prepare('DELETE FROM equipamentos').run();
    db.prepare('DELETE FROM fornecedores').run();
    db.prepare('DELETE FROM clientes').run();
  });

  clearData();

  // Clientes
  const clientes = [
    ['Petrobras S.A.', 'Petrobras', '33.000.167/0001-01', 'contato@petrobras.com.br', '(21) 3456-7890', 'Av. Chile 65', 'Rio de Janeiro', 'RJ', '20035-900', 'Óleo e Gás', 'João Silva', 'joao.silva@petrobras.com.br', '(21) 99999-1111', 'Cliente principal do setor offshore'],
    ['MODEC do Brasil', 'MODEC', '03.734.276/0001-16', 'contato@modec.com', '(21) 3865-2000', 'Av. República do Chile 230', 'Rio de Janeiro', 'RJ', '20031-170', 'Óleo e Gás', 'Maria Santos', 'maria.santos@modec.com', '(21) 99999-2222', 'Operadora de FPSO'],
    ['Karoon Energy', 'Karoon', '12.345.678/0001-90', 'brasil@karoonenergy.com', '(21) 3500-4000', 'Praia de Botafogo 300', 'Rio de Janeiro', 'RJ', '22250-040', 'Óleo e Gás', 'Carlos Oliveira', 'carlos@karoon.com', '(21) 99999-3333', 'Operadora offshore'],
    ['Shell Brasil', 'Shell', '33.256.439/0001-39', 'contato@shell.com.br', '(21) 3802-6000', 'Av. Brigadero Trompowski 100', 'Rio de Janeiro', 'RJ', '20940-000', 'Óleo e Gás', 'Ana Costa', 'ana.costa@shell.com', '(21) 99999-4444', 'Multinacional do petróleo'],
    ['Equinor Brasil', 'Equinor', '14.459.923/0001-03', 'contato@equinor.com.br', '(21) 3500-5000', 'Av. Almirante Barroso 81', 'Rio de Janeiro', 'RJ', '20031-004', 'Óleo e Gás', 'Pedro Lima', 'pedro.lima@equinor.com', '(21) 99999-5555', 'Empresa norueguesa']
  ];

  const insertCliente = db.prepare(`
    INSERT INTO clientes (razao_social, nome_fantasia, cnpj, email, telefone, endereco, cidade, estado, cep, segmento, contato_nome, contato_email, contato_telefone, observacoes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  clientes.forEach(c => insertCliente.run(c));
  console.log('✅ 5 clientes inseridos');

  // Equipamentos
  const equipamentos = [
    ['CNT-001', '10FT_DRY', 'Container 10 pés Dry', 'OFFCON', 2022, 'SN2022001', 'DISPONIVEL', 'DNV-001-2022', '2024-01-15', '2025-01-15', 45000.00, 85.00, 'Fábrica Niterói', null, 'Container novo, certificado DNV 2.7.1'],
    ['CNT-002', '10FT_OPEN_TOP', 'Container 10 pés Open Top', 'OFFCON', 2022, 'SN2022002', 'LOCADO', 'DNV-002-2022', '2024-02-20', '2025-02-20', 52000.00, 95.00, 'Base Petrobras', 1, 'Em locação com Petrobras'],
    ['CNT-003', '20FT_DRY', 'Container 20 pés Dry', 'OFFCON', 2023, 'SN2023001', 'LOCADO', 'DNV-003-2023', '2024-03-10', '2025-03-10', 78000.00, 140.00, 'FPSO MODEC', 2, 'Locação longo prazo'],
    ['CNT-004', '20FT_OPEN_TOP', 'Container 20 pés Open Top', 'OFFCON', 2023, 'SN2023002', 'MANUTENCAO', 'DNV-004-2023', '2023-12-01', '2024-12-01', 85000.00, 160.00, 'Fábrica Niterói', null, 'Aguardando reparo estrutural'],
    ['CNT-005', 'WASTE_SKIP', 'Caçamba Waste Skip 1m³', 'OFFCON', 2023, 'SN2023003', 'DISPONIVEL', 'DNV-005-2023', '2024-05-15', '2025-05-15', 12500.00, 35.00, 'Fábrica Niterói', null, 'Disponível para locação'],
    ['CNT-006', '10FT_DRY', 'Container 10 pés Dry', 'OFFCON', 2021, 'SN2021001', 'LOCADO', 'DNV-006-2021', '2024-06-20', '2025-06-20', 42000.00, 80.00, 'Base Karoon', 3, 'Locação ativa'],
    ['CNT-007', '20FT_DRY', 'Container 20 pés Dry', 'OFFCON', 2024, 'SN2024001', 'DISPONIVEL', 'DNV-007-2024', '2024-08-01', '2025-08-01', 82000.00, 150.00, 'Fábrica Niterói', null, 'Container novo'],
    ['CNT-008', 'CAIXA_METALICA', 'Caixa Metálica Personalizada', 'OFFCON', 2023, 'SN2023004', 'PROJETO', 'DNV-008-2023', '2024-04-10', '2025-04-10', 15000.00, 45.00, 'Fábrica Niterói', null, 'Em projeto customizado']
  ];

  const insertEquipamento = db.prepare(`
    INSERT INTO equipamentos (codigo, tipo, descricao, fabricante, ano_fabricacao, numero_serie, status, certificado_dnv, data_ultima_inspecao, data_proxima_inspecao, valor_compra, valor_locacao_diaria, localizacao_atual, cliente_atual_id, observacoes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  equipamentos.forEach(e => insertEquipamento.run(e));
  console.log('✅ 8 equipamentos inseridos');

  // Locações
  const locacoes = [
    ['LOC-2024-001', 2, 2, '2024-01-10', '2025-01-10', null, 95.00, 34675.00, 'DEPOSITO', 5000.00, 'ATIVA', 'Base MODEC', 'Locação anual'],
    ['LOC-2024-002', 1, 3, '2024-02-15', '2024-08-15', null, 140.00, 25620.00, 'FIANCA', 0.00, 'ATIVA', 'Base Petrobras', 'Locação semestral'],
    ['LOC-2024-003', 3, 6, '2024-03-01', '2024-09-01', null, 80.00, 14560.00, 'DEPOSITO', 3000.00, 'ATIVA', 'Base Karoon', 'Locação semestral'],
    ['LOC-2023-001', 1, 2, '2023-06-01', '2023-12-01', '2023-12-01', 95.00, 17350.00, 'DEPOSITO', 5000.00, 'FINALIZADA', 'Base MODEC', 'Locação finalizada'],
    ['LOC-2023-002', 4, 4, '2023-08-15', '2024-02-15', '2024-02-15', 160.00, 29280.00, 'SEGURO', 0.00, 'FINALIZADA', 'Base Shell', 'Locação finalizada']
  ];

  const insertLocacao = db.prepare(`
    INSERT INTO locacoes (codigo_contrato, cliente_id, equipamento_id, data_inicio, data_previsao_fim, data_fim, valor_diaria, valor_total, garantia_tipo, garantia_valor, status, local_entrega, observacoes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  locacoes.forEach(l => insertLocacao.run(l));
  console.log('✅ 5 locações inseridas');

  // Projetos
  const projetos = [
    ['PRJ-2024-001', 1, 'FABRICACAO', 'Container 10FT Dry Personalizado', 'EM_EXECUCAO', '2024-01-15', '2024-06-15', null, 65000.00, 48000.00, 35000.00, null, 'Projeto com pintura especial e adaptações'],
    ['PRJ-2024-002', 2, 'MODIFICACAO', 'Modificação Container 20FT', 'APROVADO', '2024-03-01', '2024-05-30', null, 45000.00, 32000.00, null, null, 'Incluir portas laterais e sistema de ventilação'],
    ['PRJ-2024-003', 3, 'FABRICACAO', 'Container 10FT Open Top para Químicos', 'ORCAMENTO', null, null, null, 78000.00, 55000.00, null, null, 'Orçamento em análise'],
    ['PRJ-2023-001', 4, 'FABRICACAO', 'Container 20FT Dry com Divisória', 'CONCLUIDO', '2023-05-01', '2023-08-01', '2023-08-05', 92000.00, 68000.00, 69500.00, null, 'Projeto entregue com sucesso'],
    ['PRJ-2023-002', 5, 'MODIFICACAO', 'Adaptação Waste Skip', 'CONCLUIDO', '2023-09-01', '2023-10-15', '2023-10-20', 25000.00, 18000.00, 19500.00, null, 'Projeto entregue']
  ];

  const insertProjeto = db.prepare(`
    INSERT INTO projetos (codigo, cliente_id, tipo_projeto, descricao, status, data_inicio, data_previsao_entrega, data_entrega, valor_total, custo_estimado, custo_real, responsavel_id, observacoes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  projetos.forEach(p => insertProjeto.run(p));
  console.log('✅ 5 projetos inseridos');

  // Inspeções
  const inspecoes = [
    [1, 'PERIODICA', '2024-01-15', '2025-01-15', 'APROVADA', 'João Inspetor DNV', 'RPT-2024-001', 'APROVADO', 'Container em perfeito estado', 2500.00],
    [2, 'PERIODICA', '2024-02-20', '2025-02-20', 'APROVADA', 'Maria Inspetora DNV', 'RPT-2024-002', 'APROVADO', 'Sem observações', 2500.00],
    [3, 'PERIODICA', '2024-03-10', '2025-03-10', 'APROVADA', 'Carlos Inspetor DNV', 'RPT-2024-003', 'APROVADO', 'Aprovado sem ressalvas', 2800.00],
    [4, 'PERIODICA', '2024-12-01', '2025-12-01', 'AGENDADA', 'TBD', null, null, 'Aguardando agendamento', null],
    [5, 'INICIAL', '2023-05-15', '2024-05-15', 'APROVADA', 'Ana Inspetora DNV', 'RPT-2023-005', 'APROVADO', 'Certificação inicial', 1500.00]
  ];

  const insertInspecao = db.prepare(`
    INSERT INTO inspecoes (equipamento_id, tipo_inspecao, data_inspecao, data_validade, status, inspetor_dnv, numero_relatorio, resultado, observacoes, custo)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  inspecoes.forEach(i => insertInspecao.run(i));
  console.log('✅ 5 inspeções inseridas');

  // Manutenções
  const manutencoes = [
    [4, 'CORRETIVA', '2024-11-01', null, 'EM_ANDAMENTO', 'Reparo estrutural lateral direita e substituição de componentes corroídos', 3500.00, 8500.00, 12000.00, 'Oficina OFFCON', null, 180, 'Previsão de conclusão: 15 dias'],
    [2, 'PREVENTIVA', '2024-02-15', '2024-02-15', 'CONCLUIDA', 'Inspeção e manutenção preventiva periódica', 450.00, 0.00, 450.00, 'Técnico José', null, 90, 'Manutenção preventiva realizada'],
    [6, 'PREVENTIVA', '2024-03-05', '2024-03-05', 'CONCLUIDA', 'Manutenção preventiva trimestral', 450.00, 0.00, 450.00, 'Técnico Paulo', null, 90, 'Sem observações'],
    [1, 'PREDITIVA', '2024-12-15', null, 'AGENDADA', 'Análise preditiva de componentes', 800.00, 0.00, 800.00, 'Técnico José', null, 90, 'Agendada para próxima semana']
  ];

  const insertManutencao = db.prepare(`
    INSERT INTO manutencoes (equipamento_id, tipo_manutencao, data_inicio, data_fim, status, descricao_servico, mao_obra, pecas_materiais, custo_total, responsavel, fornecedor_id, garantia_dias, observacoes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  manutencoes.forEach(m => insertManutencao.run(m));
  console.log('✅ 4 manutenções inseridas');

  // Contas Financeiras
  const contas = [
    ['RECEBER', 'LOCACAO', 'Locação CNT-002 - Janeiro/2024', 2, 'CLIENTE', 1, 'LOCACAO', 2945.00, '2024-01-10', '2024-01-20', '2024-01-18', 'PAGO', 'BOLETO', '001/2024', 'Pago pontualmente'],
    ['RECEBER', 'LOCACAO', 'Locação CNT-003 - Janeiro/2024', 1, 'CLIENTE', 2, 'LOCACAO', 4340.00, '2024-02-15', '2024-02-25', '2024-02-22', 'PAGO', 'BOLETO', '002/2024', 'Pago'],
    ['RECEBER', 'LOCACAO', 'Locação CNT-006 - Março/2024', 3, 'CLIENTE', 3, 'LOCACAO', 2480.00, '2024-03-01', '2024-03-10', null, 'PENDENTE', 'BOLETO', '003/2024', 'Aguardando pagamento'],
    ['RECEBER', 'PROJETO', 'Projeto PRJ-2024-001 - Parcela 1', 1, 'CLIENTE', 1, 'PROJETO', 32500.00, '2024-01-15', '2024-02-15', '2024-02-10', 'PAGO', 'TRANSFERENCIA', 'PJT-001/2024', 'Entrada do projeto'],
    ['PAGAR', 'FORNECEDOR', 'Aço estrutural - Projeto 001', null, 'FORNECEDOR', null, null, 18500.00, '2024-01-20', '2024-02-20', '2024-02-18', 'PAGO', 'TRANSFERENCIA', 'NF-1234', 'Material para projeto'],
    ['PAGAR', 'INSPECAO', 'Taxa DNV - Inspeção CNT-001', null, 'FORNECEDOR', null, null, 2500.00, '2024-01-15', '2024-02-15', '2024-02-10', 'PAGO', 'BOLETO', 'NF-DNV-001', 'Taxa de certificação'],
    ['PAGAR', 'MANUTENCAO', 'Peças manutenção CNT-004', null, 'FORNECEDOR', null, null, 8500.00, '2024-11-01', '2024-12-01', null, 'PENDENTE', 'BOLETO', 'NF-5678', 'Aguardando pagamento']
  ];

  const insertConta = db.prepare(`
    INSERT INTO contas (tipo, categoria, descricao, entidade_id, entidade_tipo, referencia_id, referencia_tipo, valor, data_emissao, data_vencimento, data_pagamento, status, forma_pagamento, numero_documento, observacoes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  contas.forEach(c => insertConta.run(c));
  console.log('✅ 7 contas financeiras inseridas');

  // Fornecedores
  const fornecedores = [
    ['Aços Niterói Ltda', 'Aços Niterói', '12.345.678/0001-11', 'vendas@acosniteroi.com', '(21) 2717-1234', 'Rua da Fábrica 100', 'Niterói', 'RJ', '24000-000', 'Materiais', 5, 'Fornecedor principal de aço'],
    ['DNV Brasil', 'DNV', '03.485.957/0001-20', 'contato@dnv.com', '(21) 3863-3000', 'Av. Rio Branco 1', 'Rio de Janeiro', 'RJ', '20090-003', 'Certificação', 5, 'Certificadora oficial'],
    ['Pinturas Industriais RJ', 'Pinturas RJ', '23.456.789/0001-22', 'contato@pinturasrj.com', '(21) 2612-5678', 'Rua das Pinturas 50', 'Niterói', 'RJ', '24000-100', 'Serviços', 4, 'Pintura industrial'],
    ['Mecânica Offshore Ltda', 'Mec Offshore', '34.567.890/0001-33', 'contato@mecoffshore.com', '(21) 2723-9012', 'Av. Industrial 200', 'Niterói', 'RJ', '24000-200', 'Serviços', 4, 'Serviços mecânicos']
  ];

  const insertFornecedor = db.prepare(`
    INSERT INTO fornecedores (razao_social, nome_fantasia, cnpj, email, telefone, endereco, cidade, estado, cep, segmento, avaliacao, observacoes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  fornecedores.forEach(f => insertFornecedor.run(f));
  console.log('✅ 4 fornecedores inseridos');

  console.log('\n🎉 Banco de dados populado com sucesso!');
  console.log('📊 Total de registros:');
  console.log(`   - Clientes: ${db.prepare('SELECT COUNT(*) as count FROM clientes').get().count}`);
  console.log(`   - Equipamentos: ${db.prepare('SELECT COUNT(*) as count FROM equipamentos').get().count}`);
  console.log(`   - Locações: ${db.prepare('SELECT COUNT(*) as count FROM locacoes').get().count}`);
  console.log(`   - Projetos: ${db.prepare('SELECT COUNT(*) as count FROM projetos').get().count}`);
  console.log(`   - Inspeções: ${db.prepare('SELECT COUNT(*) as count FROM inspecoes').get().count}`);
  console.log(`   - Manutenções: ${db.prepare('SELECT COUNT(*) as count FROM manutencoes').get().count}`);
  console.log(`   - Contas: ${db.prepare('SELECT COUNT(*) as count FROM contas').get().count}`);
  console.log(`   - Fornecedores: ${db.prepare('SELECT COUNT(*) as count FROM fornecedores').get().count}`);
};

seedData();

module.exports = { seedData };
