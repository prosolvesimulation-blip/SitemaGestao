-- ============================================
-- ESQUEMA DE BANCO DE DADOS - MÓDULO SCM OFFCON
-- Supply Chain Management - Gestão de Suprimentos
-- ============================================

-- ============================================
-- 1. TABELAS DE CADASTRO BÁSICO
-- ============================================

-- Tipos de Fornecedor (CAD_CO)
CREATE TABLE tipos_fornecedor (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(10) NOT NULL UNIQUE, -- 1, 2, 3, ..., 11
    nome VARCHAR(100) NOT NULL, -- Calibração, Conexões, Consumíveis, etc.
    descricao TEXT,
    requisitos_certificados TEXT[], -- Array de requisitos
    obrigatorio_iso BOOLEAN DEFAULT FALSE,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Prazos de Pagamento (CAD_CO)
CREATE TABLE prazos_pagamento (
    id SERIAL PRIMARY KEY,
    descricao VARCHAR(100) NOT NULL, -- "à vista", "15dd", "28dd"
    dias INTEGER, -- Quantidade de dias
    ativo BOOLEAN DEFAULT TRUE
);

-- Unidades de Medida (CAD_CO)
CREATE TABLE unidades_medida (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE, -- "Kg", "Pç", "GL 3,6L"
    descricao VARCHAR(100),
    ativo BOOLEAN DEFAULT TRUE
);

-- ============================================
-- 2. TABELA DE FORNECEDORES
-- ============================================

CREATE TABLE fornecedores (
    id SERIAL PRIMARY KEY,
    razao_social VARCHAR(255) NOT NULL,
    nome_fantasia VARCHAR(255),
    cnpj VARCHAR(18) UNIQUE NOT NULL,
    
    -- Endereço
    endereco VARCHAR(255),
    cidade VARCHAR(100),
    estado VARCHAR(2),
    cep VARCHAR(10),
    
    -- Contato
    email VARCHAR(255),
    telefone VARCHAR(20),
    
    -- Dados Bancários
    banco VARCHAR(100),
    agencia VARCHAR(20),
    conta VARCHAR(30),
    
    -- Contato Principal
    contato_nome VARCHAR(100),
    contato_email VARCHAR(255),
    contato_telefone VARCHAR(20),
    
    -- Tipo e Qualificação
    tipo_fornecedor_id INTEGER REFERENCES tipos_fornecedor(id),
    
    -- Campos de Qualificação (CAD_ME)
    pontuacao_ficha_avaliacao DECIMAL(3,2), -- 0-10
    pontuacao_prazo_entrega DECIMAL(3,2),
    pontuacao_entrega_certificado DECIMAL(3,2),
    pontuacao_media DECIMAL(3,2),
    qualificacao VARCHAR(50), -- 'Qualificado', 'Qualificado com restrição', etc.
    
    -- Status
    status VARCHAR(20) DEFAULT 'ativo', -- ativo, inativo, suspenso
    observacoes TEXT,
    
    -- Controle
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    updated_by INTEGER
);

-- ============================================
-- 3. TABELAS DE REQUISIÇÃO E CONTROLE
-- ============================================

-- Requisições de Material (RM) (CONTROLE_RM)
CREATE TABLE requisicoes_material (
    id SERIAL PRIMARY KEY,
    numero_rm VARCHAR(20) NOT NULL UNIQUE, -- "RM 100.25"
    data_abertura DATE NOT NULL,
    solicitante_id INTEGER, -- Referência ao usuário
    
    -- Dados
    quantidade_itens INTEGER DEFAULT 0,
    quantidade_atendida INTEGER DEFAULT 0,
    
    -- Status
    status VARCHAR(20) DEFAULT 'aberta', -- aberta, parcial, fechada
    fechada BOOLEAN DEFAULT FALSE,
    
    -- Ordens de Compra vinculadas
    ordens_compra INTEGER[], -- Array de IDs das OCs
    
    -- Observações
    observacao TEXT,
    origem VARCHAR(50), -- "Internet", etc.
    
    -- Controle
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Controle de Compras Interno (CCI) (CONTROLE_CCI)
CREATE TABLE controle_cci (
    id SERIAL PRIMARY KEY,
    numero_cci VARCHAR(20) NOT NULL UNIQUE, -- "CCI 1.25"
    data_abertura DATE,
    
    -- Descrição
    descricao TEXT, -- "Reforma base Renova", "Estoque Agosto/25"
    
    -- Status
    status VARCHAR(20) DEFAULT 'aberto', -- aberto, fechado
    fechado BOOLEAN DEFAULT FALSE,
    data_fechamento DATE,
    
    -- Controle
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 4. TABELAS DE ORDEM DE COMPRA
-- ============================================

-- Ordens de Compra (NEGOCIAÇÕES + Ordem de compra)
CREATE TABLE ordens_compra (
    id SERIAL PRIMARY KEY,
    numero_oc INTEGER NOT NULL UNIQUE, -- 1475, 1476, etc.
    numero_oc_completo VARCHAR(20), -- "1475.25"
    
    -- Datas
    data_emissao DATE NOT NULL,
    ano INTEGER,
    sequencial_ano INTEGER, -- 25 (de 2025)
    
    -- Referências
    numero_os VARCHAR(20), -- "OS 418.25"
    numero_rm VARCHAR(20), -- "RM 313.26"
    numero_cci VARCHAR(20), -- "CCI 1.25"
    
    -- Fornecedor
    fornecedor_id INTEGER NOT NULL REFERENCES fornecedores(id),
    
    -- Dados da OC
    valor_total DECIMAL(15,2),
    quantidade_itens INTEGER DEFAULT 0,
    quantidade_itens_atendidos INTEGER DEFAULT 0,
    
    -- Percentuais
    percentual_atendido DECIMAL(5,4), -- 0-1 (1 = 100%)
    quantidade_nao_conforme INTEGER DEFAULT 0,
    percentual_nao_conforme DECIMAL(5,4),
    
    -- Prazos
    prazo_entrega DATE,
    data_recebimento DATE,
    data_entrega_certificado DATE,
    
    -- Status
    status VARCHAR(30) DEFAULT 'andamento', -- andamento, entregue, atrasada, cancelada
    
    -- Controle de Conformidade
    atendimento VARCHAR(50), -- "Atendido", "Atendido com Restrição", "Atendido com Atraso", "Não Atendido"
    
    -- Campos de análise temporal
    mes INTEGER,
    ano_oc INTEGER,
    
    -- Observações
    observacoes TEXT,
    
    -- Controle
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    updated_by INTEGER
);

-- Itens da Ordem de Compra
CREATE TABLE ordens_compra_itens (
    id SERIAL PRIMARY KEY,
    ordem_compra_id INTEGER NOT NULL REFERENCES ordens_compra(id) ON DELETE CASCADE,
    
    -- Dados do Item
    numero_item INTEGER, -- 1, 2, 3...
    descricao TEXT,
    quantidade DECIMAL(10,3),
    unidade_id INTEGER REFERENCES unidades_medida(id),
    valor_unitario DECIMAL(12,2),
    valor_total DECIMAL(15,2),
    
    -- Status do Item
    status VARCHAR(20) DEFAULT 'pendente', -- pendente, atendido, parcial, nao_conforme
    quantidade_atendida DECIMAL(10,3) DEFAULT 0,
    
    -- Certificados
    certificado_requerido BOOLEAN DEFAULT FALSE,
    certificado_entregue BOOLEAN DEFAULT FALSE,
    
    -- Controle
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 5. TABELAS DE HISTÓRICO E AUDITORIA
-- ============================================

-- Histórico de Negociações (importado do Excel)
CREATE TABLE historico_negociacoes (
    id SERIAL PRIMARY KEY,
    
    -- Referências
    ordem_compra_id INTEGER REFERENCES ordens_compra(id),
    fornecedor_id INTEGER REFERENCES fornecedores(id),
    
    -- Dados históricos
    data_negociacao DATE,
    numero_oc INTEGER,
    numero_os VARCHAR(20),
    numero_rm VARCHAR(20),
    numero_cci VARCHAR(20),
    
    -- Valores
    valor DECIMAL(15,2),
    quantidade_itens INTEGER,
    quantidade_itens_atendidos INTEGER,
    percentual_atendido DECIMAL(5,4),
    
    -- Não conformidade
    quantidade_nao_conforme INTEGER,
    percentual_nao_conforme DECIMAL(5,4),
    
    -- Prazos
    prazo_entrega DATE,
    data_recebimento DATE,
    data_entrega_certificado DATE,
    
    -- Análise temporal
    mes INTEGER,
    ano INTEGER,
    
    -- Dados importados
    dados_originais JSONB,
    
    -- Controle
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 6. TABELAS DE INDICADORES E RELATÓRIOS
-- ============================================

-- Indicadores Mensais (ANALISE + INDICADORES)
CREATE TABLE indicadores_mensais (
    id SERIAL PRIMARY KEY,
    ano INTEGER NOT NULL,
    mes INTEGER NOT NULL,
    
    -- Dados
    total_oc INTEGER DEFAULT 0,
    total_entregue INTEGER DEFAULT 0,
    taxa_entrega_no_prazo DECIMAL(5,4), -- 0-1
    taxa_certificado_no_prazo DECIMAL(5,4),
    
    -- Meta
    meta_entrega DECIMAL(5,4) DEFAULT 0.9, -- 90%
    meta_certificado DECIMAL(5,4) DEFAULT 0.9,
    
    -- Análise
    analise TEXT,
    causas TEXT,
    acao TEXT,
    prazo_acao DATE,
    resultado_acao TEXT,
    
    -- Status
    dentro_da_meta BOOLEAN,
    meta_comprometida BOOLEAN,
    tomar_acao BOOLEAN,
    
    -- Controle
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(ano, mes)
);

-- Performance de Fornecedores (REL_LIBERADAS)
CREATE TABLE performance_fornecedores (
    id SERIAL PRIMARY KEY,
    fornecedor_id INTEGER NOT NULL REFERENCES fornecedores(id),
    
    -- Período
    ano INTEGER NOT NULL,
    mes INTEGER, -- NULL para acumulado anual
    
    -- Métricas
    total_ocs INTEGER DEFAULT 0,
    ocs_entregues_no_prazo INTEGER DEFAULT 0,
    percentual_entrega_no_prazo DECIMAL(5,4),
    certificados_entregues_no_prazo INTEGER DEFAULT 0,
    percentual_certificados_no_prazo DECIMAL(5,4),
    
    -- Controle
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(fornecedor_id, ano, mes)
);

-- ============================================
-- 7. TABELAS AUXILIARES
-- ============================================

-- Configurações do Sistema
CREATE TABLE configuracoes_scm (
    id SERIAL PRIMARY KEY,
    chave VARCHAR(100) NOT NULL UNIQUE,
    valor TEXT,
    descricao TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Log de Alterações (Auditoria)
CREATE TABLE log_alteracoes (
    id SERIAL PRIMARY KEY,
    tabela VARCHAR(50) NOT NULL,
    registro_id INTEGER NOT NULL,
    acao VARCHAR(20) NOT NULL, -- INSERT, UPDATE, DELETE
    dados_anteriores JSONB,
    dados_novos JSONB,
    usuario_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX idx_fornecedores_cnpj ON fornecedores(cnpj);
CREATE INDEX idx_fornecedores_tipo ON fornecedores(tipo_fornecedor_id);
CREATE INDEX idx_fornecedores_qualificacao ON fornecedores(qualificacao);

CREATE INDEX idx_oc_numero ON ordens_compra(numero_oc);
CREATE INDEX idx_oc_fornecedor ON ordens_compra(fornecedor_id);
CREATE INDEX idx_oc_data ON ordens_compra(data_emissao);
CREATE INDEX idx_oc_status ON ordens_compra(status);
CREATE INDEX idx_oc_ano_mes ON ordens_compra(ano_oc, mes);

CREATE INDEX idx_rm_numero ON requisicoes_material(numero_rm);
CREATE INDEX idx_rm_status ON requisicoes_material(status);

CREATE INDEX idx_cci_numero ON controle_cci(numero_cci);

CREATE INDEX idx_performance_fornecedor ON performance_fornecedores(fornecedor_id, ano);
CREATE INDEX idx_indicadores_ano_mes ON indicadores_mensais(ano, mes);

-- ============================================
-- VIEWS (VISÕES) ÚTEIS
-- ============================================

-- View: Dashboard de Indicadores
CREATE VIEW v_dashboard AS
SELECT 
    ano,
    SUM(total_oc) as total_ocs,
    SUM(total_entregue) as total_entregues,
    AVG(taxa_entrega_no_prazo) as media_taxa_entrega,
    AVG(taxa_certificado_no_prazo) as media_taxa_certificado
FROM indicadores_mensais
GROUP BY ano;

-- View: OCs Atrasadas
CREATE VIEW v_ocs_atrasadas AS
SELECT 
    oc.*,
    f.razao_social as fornecedor_nome,
    f.cnpj as fornecedor_cnpj,
    CURRENT_DATE - oc.prazo_entrega as dias_atraso
FROM ordens_compra oc
JOIN fornecedores f ON oc.fornecedor_id = f.id
WHERE oc.status = 'atrasada'
   OR (oc.prazo_entrega < CURRENT_DATE AND oc.status NOT IN ('entregue', 'cancelada'));

-- View: Fornecedores Qualificados
CREATE VIEW v_fornecedores_qualificados AS
SELECT 
    f.*,
    tf.nome as tipo_fornecedor_nome,
    pf.percentual_entrega_no_prazo as performance_entrega
FROM fornecedores f
LEFT JOIN tipos_fornecedor tf ON f.tipo_fornecedor_id = tf.id
LEFT JOIN performance_fornecedores pf ON f.id = pf.fornecedor_id AND pf.mes IS NULL
WHERE f.qualificacao IN ('Qualificado', 'Qualificado com restrição')
  AND f.status = 'ativo';

-- View: Follow-up de Entregas
CREATE VIEW v_follow_up AS
SELECT 
    oc.id,
    oc.numero_oc,
    oc.numero_oc_completo,
    f.razao_social as fornecedor,
    oc.prazo_entrega,
    oc.data_recebimento,
    oc.status,
    oc.quantidade_itens,
    oc.quantidade_itens_atendidos,
    oc.percentual_atendido,
    CASE 
        WHEN oc.prazo_entrega < CURRENT_DATE AND oc.status NOT IN ('entregue', 'cancelada') THEN 'ATRASADA'
        WHEN oc.prazo_entrega <= CURRENT_DATE + INTERVAL '3 days' AND oc.status NOT IN ('entregue', 'cancelada') THEN 'URGENTE'
        ELSE 'NO_PRAZO'
    END as situacao
FROM ordens_compra oc
JOIN fornecedores f ON oc.fornecedor_id = f.id
WHERE oc.status NOT IN ('entregue', 'cancelada');

-- ============================================
-- FUNÇÕES E TRIGGERS
-- ============================================

-- Trigger: Atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger em todas as tabelas principais
CREATE TRIGGER update_fornecedores_updated_at BEFORE UPDATE ON fornecedores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_oc_updated_at BEFORE UPDATE ON ordens_compra
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rm_updated_at BEFORE UPDATE ON requisicoes_material
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cci_updated_at BEFORE UPDATE ON controle_cci
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função: Calcular pontuação média do fornecedor
CREATE OR REPLACE FUNCTION calcular_pontuacao_fornecedor(p_fornecedor_id INTEGER)
RETURNS TABLE (
    pontuacao_media DECIMAL(3,2),
    qualificacao VARCHAR(50)
) AS $$
DECLARE
    v_media DECIMAL(3,2);
BEGIN
    SELECT 
        (COALESCE(AVG(pontuacao_ficha_avaliacao), 0) + 
         COALESCE(AVG(pontuacao_prazo_entrega), 0) + 
         COALESCE(AVG(pontuacao_entrega_certificado), 0)) / 3
    INTO v_media
    FROM fornecedores
    WHERE id = p_fornecedor_id;
    
    RETURN QUERY SELECT 
        v_media,
        CASE 
            WHEN v_media >= 8.00 THEN 'Qualificado'
            WHEN v_media >= 6.00 THEN 'Qualificado com restrição'
            WHEN v_media >= 4.00 THEN 'Não recomendado'
            ELSE 'Desqualificado'
        END;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- DADOS INICIAIS (SEED)
-- ============================================

INSERT INTO tipos_fornecedor (codigo, nome, obrigatorio_iso) VALUES
('1', 'Calibração', true),
('2', 'Conexões', true),
('3', 'Consumíveis', false),
('4', 'Diversos', false),
('5', 'Ensaios, tratamento térmico, análise química', true),
('6', 'Fixadores', false),
('7', 'Galvanização', false),
('8', 'Grade de Piso', false),
('9', 'Juntas', false),
('10', 'Perfis', true),
('11', 'Tubos', true);

INSERT INTO prazos_pagamento (descricao, dias) VALUES
('à vista', 0),
('15dd', 15),
('28dd', 28),
('30dd', 30),
('45dd', 45),
('Dinheiro na coleta', 0),
('50 % entrada + balanço em 28dd', 28),
('Conforme observação acima', NULL),
('50 % entrada + balanço ao término da fabricação', NULL),
('30 / 45 / 60 dias', NULL),
('Parcelado em 10x sem juros no boleto', NULL);

INSERT INTO unidades_medida (codigo, descricao) VALUES
('Kg', 'Quilograma'),
('Pç', 'Peça'),
('GL 3,6L', 'Galão 3,6 litros'),
('Diária', 'Diária'),
('GL 5L', 'Galão 5 litros'),
('Cj', 'Conjunto'),
('M', 'Metro'),
('Unid.', 'Unidade'),
('GL 3,2L', 'Galão 3,2 litros'),
('Litro', 'Litro'),
('Pares', 'Pares');

INSERT INTO configuracoes_scm (chave, valor, descricao) VALUES
('meta_entrega_prazo', '0.9', 'Meta de entrega no prazo (90%)'),
('meta_certificado_prazo', '0.9', 'Meta de entrega de certificados (90%)'),
('pontuacao_minima_qualificado', '8.0', 'Pontuação mínima para qualificado'),
('pontuacao_minima_restricao', '6.0', 'Pontuação mínima para qualificado com restrição'),
('pontuacao_minima_nao_recomendado', '4.0', 'Pontuação mínima para não recomendado');

-- ============================================
-- FIM DO ESQUEMA
-- ============================================
