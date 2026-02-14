const express = require('express');
const router = express.Router();
const db = require('../database/connection');

// GET /api/projetos - Listar todos os projetos
router.get('/', (req, res) => {
  try {
    const { status, cliente_id, search } = req.query;
    let sql = `
      SELECT p.*, c.nome_fantasia as cliente_nome
      FROM projetos p
      JOIN clientes c ON p.cliente_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += ' AND p.status = ?';
      params.push(status);
    }

    if (cliente_id) {
      sql += ' AND p.cliente_id = ?';
      params.push(cliente_id);
    }

    if (search) {
      sql += ` AND (p.codigo LIKE ? OR p.descricao LIKE ? OR c.nome_fantasia LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY p.data_cadastro DESC';

    const projetos = db.prepare(sql).all(...params);
    res.json(projetos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/projetos/:id - Buscar projeto por ID
router.get('/:id', (req, res) => {
  try {
    const projeto = db.prepare(`
      SELECT p.*, c.nome_fantasia as cliente_nome, c.razao_social as cliente_razao
      FROM projetos p
      JOIN clientes c ON p.cliente_id = c.id
      WHERE p.id = ?
    `).get(req.params.id);

    if (!projeto) {
      return res.status(404).json({ error: 'Projeto não encontrado' });
    }

    res.json(projeto);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/projetos - Criar novo projeto
router.post('/', (req, res) => {
  try {
    const {
      codigo, cliente_id, tipo_projeto, descricao, data_inicio, data_previsao_entrega,
      valor_total, custo_estimado, responsavel_id, observacoes
    } = req.body;

    const result = db.prepare(`
      INSERT INTO projetos (
        codigo, cliente_id, tipo_projeto, descricao, data_inicio, data_previsao_entrega,
        valor_total, custo_estimado, responsavel_id, observacoes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      codigo, cliente_id, tipo_projeto, descricao, data_inicio, data_previsao_entrega,
      valor_total, custo_estimado, responsavel_id, observacoes
    );

    res.status(201).json({
      id: result.lastInsertRowid,
      message: 'Projeto criado com sucesso'
    });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      res.status(400).json({ error: 'Código de projeto já existe' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// PUT /api/projetos/:id - Atualizar projeto
router.put('/:id', (req, res) => {
  try {
    const {
      codigo, tipo_projeto, descricao, status, data_inicio, data_previsao_entrega, data_entrega,
      valor_total, custo_estimado, custo_real, responsavel_id, observacoes
    } = req.body;

    const result = db.prepare(`
      UPDATE projetos SET
        codigo = ?, tipo_projeto = ?, descricao = ?, status = ?, data_inicio = ?,
        data_previsao_entrega = ?, data_entrega = ?, valor_total = ?, custo_estimado = ?,
        custo_real = ?, responsavel_id = ?, observacoes = ?
      WHERE id = ?
    `).run(
      codigo, tipo_projeto, descricao, status, data_inicio, data_previsao_entrega, data_entrega,
      valor_total, custo_estimado, custo_real, responsavel_id, observacoes,
      req.params.id
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Projeto não encontrado' });
    }

    res.json({ message: 'Projeto atualizado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/projetos/:id/aprovar - Aprovar projeto
router.put('/:id/aprovar', (req, res) => {
  try {
    const result = db.prepare(`
      UPDATE projetos SET status = 'APROVADO' WHERE id = ? AND status = 'ORCAMENTO'
    `).run(req.params.id);

    if (result.changes === 0) {
      return res.status(400).json({ error: 'Projeto não encontrado ou já aprovado' });
    }

    res.json({ message: 'Projeto aprovado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/projetos/:id/iniciar - Iniciar execução do projeto
router.put('/:id/iniciar', (req, res) => {
  try {
    const { data_inicio } = req.body;
    
    const result = db.prepare(`
      UPDATE projetos SET status = 'EM_EXECUCAO', data_inicio = ? WHERE id = ? AND status = 'APROVADO'
    `).run(data_inicio || new Date().toISOString().split('T')[0], req.params.id);

    if (result.changes === 0) {
      return res.status(400).json({ error: 'Projeto não encontrado ou não está aprovado' });
    }

    res.json({ message: 'Projeto iniciado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/projetos/:id/concluir - Concluir projeto
router.put('/:id/concluir', (req, res) => {
  try {
    const { data_entrega, custo_real } = req.body;
    
    const result = db.prepare(`
      UPDATE projetos SET status = 'CONCLUIDO', data_entrega = ?, custo_real = ? 
      WHERE id = ? AND status = 'EM_EXECUCAO'
    `).run(data_entrega || new Date().toISOString().split('T')[0], custo_real, req.params.id);

    if (result.changes === 0) {
      return res.status(400).json({ error: 'Projeto não encontrado ou não está em execução' });
    }

    res.json({ message: 'Projeto concluído com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/projetos/:id - Remover projeto
router.delete('/:id', (req, res) => {
  try {
    const projeto = db.prepare('SELECT status FROM projetos WHERE id = ?').get(req.params.id);
    
    if (!projeto) {
      return res.status(404).json({ error: 'Projeto não encontrado' });
    }

    if (projeto.status === 'EM_EXECUCAO' || projeto.status === 'CONCLUIDO') {
      return res.status(400).json({ error: 'Não é possível excluir projeto em execução ou concluído' });
    }

    const result = db.prepare('DELETE FROM projetos WHERE id = ?').run(req.params.id);
    res.json({ message: 'Projeto removido com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;