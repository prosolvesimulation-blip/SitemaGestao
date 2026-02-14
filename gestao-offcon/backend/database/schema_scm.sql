-- Schema do Módulo SCM (Supply Chain Management)
-- Baseado na planilha SCM - Offcon.xlsm

-- Tabela de Fornecedores (expandida com campos SCM)
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS tipo_fornecedor TEXT;
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS categoria TEXT; -- '1-Calibração', '2-Conexões', '3-Consumíveis', etc
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS banco TEXT;
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS agencia TEXT;
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS conta TEXT;
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS contato_nome TEXT;
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS qualificacao TEXT DEFAULT 'NÃO AVALIADO'; -- 'QUALIFICADO', 'QUALIFICADO_COM_RESTRICAO', 'NAO_RECOMENDADO', 'DESQUALIFICADO'
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS pontuacao_entrega REAL;
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS pontuacao_certificado REAL;
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS pontuacao_media REAL;
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS total_ocs INTEGER DEFAULT 0;
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS ocs_no_prazo INTEGER DEFAULT 0;
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS certificados_no_prazo INTEGER DEFAULT 0;
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS percentual_entrega REAL;
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS percentual_certificado REAL;
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS data_ultima_avaliacao DATE;
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS observacoes_qualificacao TEXT;

-- Tabela de Ordens de Compra (OC)
CREATE TABLE IF NOT EXISTS ordens_compra (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero_oc TEXT UNIQUE NOT NULL, -- Ex: "OC 1475.25"
    fornecedor_id INTEGER NOT NULL,
    data_emissao DATE NOT NULL,
    data_entrega_esperada DATE,
    numero_os TEXT, -- Referência à OS
    numero_rm INTEGER, -- Referência à RM
    numero_cci INTEGER, -- Referência à CCI
    status TEXT DEFAULT 'ABERTA', -- 'ABERTA', 'ATENDIDA', 'ATRASADA', 'CANCELADA', 'FECHADA'
    valor_total REAL,
    quantidade_itens INTEGER DEFAULT 0,
    quantidade_atendida INTEGER DEFAULT 0,
    percentual_atendido REAL DEFAULT 0,
    quantidade_nao_conforme INTEGER DEFAULT 0,
    percentual_nao_conforme REAL DEFAULT 0,
    certificado_entregue INTEGER DEFAULT 0, -- 0=Não, 1=Sim
    data_certificado_entrega DATE,
    prazo_pagamento TEXT, -- 'A_VISTA', '15DD', '28DD', '30DD', '45DD', etc
    condicoes_especiais TEXT,
    observacoes TEXT,
    caminho_pasta TEXT, -- Caminho para pasta do projeto no servidor
    data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id)
);

-- Tabela de Itens da Ordem de Compra
CREATE TABLE IF NOT EXISTS oc_itens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ordem_compra_id INTEGER NOT NULL,
    numero_item INTEGER NOT NULL,
    descricao TEXT NOT NULL,
    quantidade_solicitada REAL NOT NULL,
    quantidade_atendida REAL DEFAULT 0,
    unidade TEXT, -- 'Kg', 'Pç', 'GL', 'Diária', 'Mês', 'Horas', 'Cj', 'Unid.', etc
    valor_unitario REAL,
    valor_total REAL,
    status TEXT DEFAULT 'PENDENTE', -- 'PENDENTE', 'ATENDIDO', 'PARCIAL', 'NÃO CONFORME'
    data_entrega DATE,
    certificado_necessario INTEGER DEFAULT 0,
    certificado_entregue INTEGER DEFAULT 0,
    observacoes TEXT,
    FOREIGN KEY (ordem_compra_id) REFERENCES ordens_compra(id) ON DELETE CASCADE
);

-- Tabela de Requisições de Material (RM)
CREATE TABLE IF NOT EXISTS requisicoes_material (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero_rm TEXT UNIQUE NOT NULL, -- Ex: "RM 100.25"
    data_abertura DATE NOT NULL,
    solicitante TEXT,
    departamento TEXT,
    descricao TEXT NOT NULL,
    prioridade TEXT DEFAULT 'NORMAL', -- 'BAIXA', 'NORMAL', 'ALTA', 'URGENTE'
    status TEXT DEFAULT 'ABERTA', -- 'ABERTA', 'EM_ATENDIMENTO', 'FECHADA', 'CANCELADA'
    quantidade_itens INTEGER DEFAULT 0,
    quantidade_atendida INTEGER DEFAULT 0,
    percentual_atendido REAL DEFAULT 0,
    data_fechamento DATE,
    ordem_compra_id INTEGER, -- OC que atendeu a RM
    observacoes TEXT,
    data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ordem_compra_id) REFERENCES ordens_compra(id)
);

-- Tabela de Itens da RM
CREATE TABLE IF NOT EXISTS rm_itens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    requisicao_id INTEGER NOT NULL,
    numero_item INTEGER NOT NULL,
    descricao TEXT NOT NULL,
    quantidade_solicitada REAL NOT NULL,
    quantidade_atendida REAL DEFAULT 0,
    unidade TEXT,
    status TEXT DEFAULT 'PENDENTE', -- 'PENDENTE', 'ATENDIDO', 'PARCIAL'
    observacoes TEXT,
    FOREIGN KEY (requisicao_id) REFERENCES requisicoes_material(id) ON DELETE CASCADE
);

-- Tabela de Controle de Compras Internas (CCI)
CREATE TABLE IF NOT EXISTS compras_internas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero_cci TEXT UNIQUE NOT NULL, -- Ex: "CCI 1.25"
    data_abertura DATE NOT NULL,
    descricao TEXT NOT NULL,
    status TEXT DEFAULT 'ABERTA', -- 'ABERTA', 'FECHADA', 'CANCELADA'
    departamento TEXT,
    responsavel TEXT,
    valor_total REAL,
    ordem_compra_id INTEGER, -- OC que atendeu a CCI
    observacoes TEXT,
    data_fechamento DATE,
    data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ordem_compra_id) REFERENCES ordens_compra(id)
);

-- Tabela de Tipos de Fornecedores/Categorias (referência)
CREATE TABLE IF NOT EXISTS tipo_fornecedor (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo TEXT UNIQUE NOT NULL, -- '1', '2', '3', etc
    nome TEXT NOT NULL, -- 'Calibração', 'Conexões', 'Consumíveis', etc
    descricao TEXT,
    requisitos_certificado TEXT,
    observacoes TEXT
);

-- Inserir tipos de fornecedores padrão
INSERT OR IGNORE INTO tipo_fornecedor (codigo, nome, descricao, requisitos_certificado) VALUES
('1', 'Calibração', 'Serviços de calibração de equipamentos', 'Fornecer certificados via Rastreamento'),
('2', 'Conexões', 'Tubos, conexões e acessórios', 'Certificado de conformidade'),
('3', 'Consumíveis', 'Materiais de consumo geral', 'Todo material deve ser inspecionado'),
('4', 'Diversos', 'Produtos diversos', 'Fornecer certificados via Rastreamento'),
('5', 'Ensaios, Tratamento Térmico e Pintura', 'Serviços de acabamento', 'Sempre que houver revisão técnica'),
('6', 'Fixadores', 'Parafusos, porcas e fixadores', 'O certificado deve conter lote'),
('7', 'Galvanização', 'Serviços de galvanização', 'Fornecer certificados via Rastreamento'),
('8', 'Grade de Piso', 'Componentes estruturais', 'Fornecer certificados via Rastreamento'),
('9', 'Juntas', 'Juntas e vedantes', 'Fornecer certificados via Rastreamento'),
('10', 'Perfis', 'Perfis metálicos', 'Certificado de conformidade'),
('11', 'Tubos', 'Tubos diversos', 'Certificado de conformidade'),
('12', 'Usinagem', 'Serviços de usinagem', 'Fornecer certificados via Rastreamento'),
('13', 'Aluguel Equipamentos', 'Locação de equipamentos', 'Fornecer certificados via Rastreamento'),
('14', 'Chapas', 'Chapas metálicas', 'Certificado de conformidade');

-- Tabela de Follow-up/Andamento das OCs
CREATE TABLE IF NOT EXISTS oc_followup (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ordem_compra_id INTEGER NOT NULL,
    data_acao DATE NOT NULL,
    tipo_acao TEXT NOT NULL, -- 'CONTATO', 'EMAIL', 'VISITA', 'RECLAMACAO', 'LEMBRETE'
    descricao TEXT NOT NULL,
    responsavel TEXT,
    resultado TEXT,
    proxima_acao DATE,
    observacoes TEXT,
    data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ordem_compra_id) REFERENCES ordens_compra(id) ON DELETE CASCADE
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_oc_fornecedor ON ordens_compra(fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_oc_status ON ordens_compra(status);
CREATE INDEX IF NOT EXISTS idx_oc_data ON ordens_compra(data_emissao);
CREATE INDEX IF NOT EXISTS idx_rm_status ON requisicoes_material(status);
CREATE INDEX IF NOT EXISTS idx_cci_status ON compras_internas(status);
CREATE INDEX IF NOT EXISTS idx_oc_itens_oc ON oc_itens(ordem_compra_id);
CREATE INDEX IF NOT EXISTS idx_fornecedor_qualificacao ON fornecedores(qualificacao);
