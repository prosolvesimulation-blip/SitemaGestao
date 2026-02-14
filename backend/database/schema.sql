-- Schema do Banco de Dados OFFCON
-- Sistema de Gestão Integrado

-- Tabela de Clientes
CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    razao_social TEXT NOT NULL,
    nome_fantasia TEXT,
    cnpj TEXT UNIQUE NOT NULL,
    email TEXT,
    telefone TEXT,
    endereco TEXT,
    cidade TEXT,
    estado TEXT,
    cep TEXT,
    segmento TEXT,
    contato_nome TEXT,
    contato_email TEXT,
    contato_telefone TEXT,
    observacoes TEXT,
    data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP,
    ativo INTEGER DEFAULT 1
);

-- Tabela de Equipamentos/Containers
CREATE TABLE IF NOT EXISTS equipamentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo TEXT UNIQUE NOT NULL,
    tipo TEXT NOT NULL, -- '10FT_DRY', '10FT_OPEN_TOP', '20FT_DRY', '20FT_OPEN_TOP', 'WASTE_SKIP', 'CAIXA_METALICA'
    descricao TEXT,
    fabricante TEXT,
    ano_fabricacao INTEGER,
    numero_serie TEXT,
    status TEXT DEFAULT 'DISPONIVEL', -- 'DISPONIVEL', 'LOCADO', 'MANUTENCAO', 'PROJETO', 'INATIVO'
    certificado_dnv TEXT,
    data_ultima_inspecao DATE,
    data_proxima_inspecao DATE,
    valor_compra REAL,
    valor_locacao_diaria REAL,
    localizacao_atual TEXT,
    cliente_atual_id INTEGER,
    observacoes TEXT,
    data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_atual_id) REFERENCES clientes(id)
);

-- Tabela de Projetos/Fabricação
CREATE TABLE IF NOT EXISTS projetos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo TEXT UNIQUE NOT NULL,
    cliente_id INTEGER NOT NULL,
    tipo_projeto TEXT NOT NULL, -- 'FABRICACAO', 'MODIFICACAO'
    descricao TEXT NOT NULL,
    status TEXT DEFAULT 'ORCAMENTO', -- 'ORCAMENTO', 'APROVADO', 'EM_EXECUCAO', 'CONCLUIDO', 'CANCELADO'
    data_inicio DATE,
    data_previsao_entrega DATE,
    data_entrega DATE,
    valor_total REAL,
    custo_estimado REAL,
    custo_real REAL,
    responsavel_id INTEGER,
    observacoes TEXT,
    data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id)
);

-- Tabela de Locações
CREATE TABLE IF NOT EXISTS locacoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo_contrato TEXT UNIQUE NOT NULL,
    cliente_id INTEGER NOT NULL,
    equipamento_id INTEGER NOT NULL,
    data_inicio DATE NOT NULL,
    data_previsao_fim DATE,
    data_fim DATE,
    valor_diaria REAL NOT NULL,
    valor_total REAL,
    garantia_tipo TEXT, -- 'DEPOSITO', 'FIANCA', 'SEGURO'
    garantia_valor REAL,
    status TEXT DEFAULT 'ATIVA', -- 'ATIVA', 'FINALIZADA', 'CANCELADA'
    local_entrega TEXT,
    observacoes TEXT,
    data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id),
    FOREIGN KEY (equipamento_id) REFERENCES equipamentos(id)
);

-- Tabela de Inspeções DNV
CREATE TABLE IF NOT EXISTS inspecoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipamento_id INTEGER NOT NULL,
    tipo_inspecao TEXT NOT NULL, -- 'PERIODICA', 'INICIAL', 'RENOVACAO'
    data_inspecao DATE NOT NULL,
    data_validade DATE NOT NULL,
    status TEXT DEFAULT 'AGENDADA', -- 'AGENDADA', 'REALIZADA', 'REPROVADA', 'APROVADA'
    inspetor_dnv TEXT,
    numero_relatorio TEXT,
    resultado TEXT, -- 'APROVADO', 'REPROVADO', 'APROVADO_COM_RESSALVAS'
    observacoes TEXT,
    custo REAL,
    data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (equipamento_id) REFERENCES equipamentos(id)
);

-- Tabela de Manutenções/Reparos
CREATE TABLE IF NOT EXISTS manutencoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipamento_id INTEGER NOT NULL,
    tipo_manutencao TEXT NOT NULL, -- 'PREVENTIVA', 'CORRETIVA', 'PREDITIVA', 'EMERGencial'
    data_inicio DATE,
    data_fim DATE,
    status TEXT DEFAULT 'AGENDADA', -- 'AGENDADA', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA'
    descricao_servico TEXT NOT NULL,
    mao_obra REAL,
    pecas_materiais REAL,
    custo_total REAL,
    responsavel TEXT,
    fornecedor_id INTEGER,
    garantia_dias INTEGER,
    observacoes TEXT,
    data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (equipamento_id) REFERENCES equipamentos(id)
);

-- Tabela de Contas Financeiras
CREATE TABLE IF NOT EXISTS contas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT NOT NULL, -- 'RECEBER', 'PAGAR'
    categoria TEXT NOT NULL, -- 'LOCACAO', 'PROJETO', 'MANUTENCAO', 'INSPECAO', 'FORNECEDOR', 'OUTROS'
    descricao TEXT NOT NULL,
    entidade_id INTEGER, -- cliente_id ou fornecedor_id
    entidade_tipo TEXT, -- 'CLIENTE', 'FORNECEDOR'
    referencia_id INTEGER, -- locacao_id, projeto_id, etc
    referencia_tipo TEXT,
    valor REAL NOT NULL,
    data_emissao DATE DEFAULT CURRENT_DATE,
    data_vencimento DATE,
    data_pagamento DATE,
    status TEXT DEFAULT 'PENDENTE', -- 'PENDENTE', 'PAGO', 'ATRASADO', 'CANCELADO'
    forma_pagamento TEXT,
    numero_documento TEXT,
    observacoes TEXT,
    data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Fornecedores
CREATE TABLE IF NOT EXISTS fornecedores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    razao_social TEXT NOT NULL,
    nome_fantasia TEXT,
    cnpj TEXT UNIQUE,
    email TEXT,
    telefone TEXT,
    endereco TEXT,
    cidade TEXT,
    estado TEXT,
    cep TEXT,
    segmento TEXT,
    avaliacao INTEGER,
    observacoes TEXT,
    data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP,
    ativo INTEGER DEFAULT 1
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_equipamentos_status ON equipamentos(status);
CREATE INDEX IF NOT EXISTS idx_equipamentos_tipo ON equipamentos(tipo);
CREATE INDEX IF NOT EXISTS idx_locacoes_cliente ON locacoes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_locacoes_status ON locacoes(status);
CREATE INDEX IF NOT EXISTS idx_contas_status ON contas(status);
CREATE INDEX IF NOT EXISTS idx_contas_vencimento ON contas(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_inspecoes_validade ON inspecoes(data_validade);
CREATE INDEX IF NOT EXISTS idx_manutencoes_equipamento ON manutencoes(equipamento_id);

-- Tabela de Ordens de Compra
CREATE TABLE IF NOT EXISTS ordens_compra (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fornecedor_id INTEGER NOT NULL,
    data_emissao DATE DEFAULT CURRENT_DATE,
    data_previsao_entrega DATE,
    status TEXT DEFAULT 'PENDENTE', -- 'PENDENTE', 'APROVADA', 'RECEBIDA', 'CANCELADA'
    valor_total REAL DEFAULT 0,
    observacoes TEXT,
    data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id)
);

-- Tabela de Itens da Ordem de Compra
CREATE TABLE IF NOT EXISTS itens_ordem_compra (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ordem_compra_id INTEGER NOT NULL,
    descricao TEXT NOT NULL,
    quantidade REAL NOT NULL,
    valor_unitario REAL NOT NULL,
    valor_total REAL NOT NULL,
    data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ordem_compra_id) REFERENCES ordens_compra(id) ON DELETE CASCADE
);

-- Tabela de Ordens de Serviço (OS)
CREATE TABLE IF NOT EXISTS ordens_servico (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero TEXT UNIQUE NOT NULL,
    cliente_id INTEGER NOT NULL,
    status TEXT DEFAULT 'PENDENTE', -- 'PENDENTE', 'APROVADA', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA'
    data_emissao DATE DEFAULT CURRENT_DATE,
    data_previsao_conclusao DATE,
    valor_total REAL DEFAULT 0,
    observacoes TEXT,
    data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id)
);

-- Índices para Ordens de Compra
CREATE INDEX IF NOT EXISTS idx_ordens_compra_fornecedor ON ordens_compra(fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_ordens_compra_status ON ordens_compra(status);
CREATE INDEX IF NOT EXISTS idx_itens_ordem_compra_ordem ON itens_ordem_compra(ordem_compra_id);
CREATE INDEX IF NOT EXISTS idx_ordens_servico_cliente ON ordens_servico(cliente_id);
CREATE INDEX IF NOT EXISTS idx_ordens_servico_numero ON ordens_servico(numero);