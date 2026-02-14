-- WBS Atividades - Estrutura Analítica do Projeto
CREATE TABLE IF NOT EXISTS wbs_atividades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    os_id INTEGER REFERENCES ordens_servico(id) ON DELETE CASCADE,
    codigo TEXT NOT NULL, -- Removido UNIQUE pois códigos podem se repetir em OSs diferentes
    descricao TEXT NOT NULL,
    data_inicio DATE,
    data_fim DATE,
    status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluido', 'cancelado')),
    progresso INTEGER DEFAULT 0 CHECK (progresso >= 0 AND progresso <= 100),
    parent_id INTEGER REFERENCES wbs_atividades(id) ON DELETE CASCADE,
    responsavel TEXT,
    tipo TEXT CHECK (tipo IN ('entrega', 'marco', 'resumo')),
    ordem INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Follow-ups das atividades
CREATE TABLE IF NOT EXISTS wbs_followups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wbs_id INTEGER NOT NULL REFERENCES wbs_atividades(id) ON DELETE CASCADE,
    data DATE NOT NULL,
    descricao TEXT NOT NULL,
    responsavel TEXT,
    status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_analise', 'concluido')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Links entre WBS e OC/OS
CREATE TABLE IF NOT EXISTS wbs_oc_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wbs_id INTEGER NOT NULL REFERENCES wbs_atividades(id) ON DELETE CASCADE,
    oc_id INTEGER REFERENCES ordens_compra(id) ON DELETE CASCADE,
    os_id INTEGER REFERENCES ordens_servico(id) ON DELETE CASCADE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CHECK (
        (oc_id IS NOT NULL AND os_id IS NULL) OR
        (oc_id IS NULL AND os_id IS NOT NULL)
    )
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_wbs_parent ON wbs_atividades(parent_id);
CREATE INDEX IF NOT EXISTS idx_wbs_codigo ON wbs_atividades(codigo);
CREATE INDEX IF NOT EXISTS idx_wbs_data ON wbs_atividades(data_inicio, data_fim);
CREATE INDEX IF NOT EXISTS idx_wbs_status ON wbs_atividades(status);
CREATE INDEX IF NOT EXISTS idx_followups_wbs ON wbs_followups(wbs_id);
CREATE INDEX IF NOT EXISTS idx_followups_data ON wbs_followups(data);
CREATE INDEX IF NOT EXISTS idx_links_wbs ON wbs_oc_links(wbs_id);
CREATE INDEX IF NOT EXISTS idx_links_oc ON wbs_oc_links(oc_id);
CREATE INDEX IF NOT EXISTS idx_links_os ON wbs_oc_links(os_id);
