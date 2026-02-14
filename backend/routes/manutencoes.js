const express = require('express');
const router = express.Router();
const db = require('../database/connection');

// GET /api/manutencoes - Listar todas as manutenções
router.get('/', (req, res) => {
  try {
    const { status, equipamento_id, tipo } = req.query;
    let sql = `
      SELECT m.*, e.codigo as equipamento_codigo, e.tipo as equipamento_tipo
      FROM manutencoes m
      JOIN equipamentos e ON m.equipamento_id = e.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += ' AND m.status = ?';
      params.push(status);
    }

    if (equipamento_id) {
      sql += ' AND m.equipamento_id = ?';
      params.push(equipamento_id);
    }

    if (tipo) {
      sql += ' AND m.tipo_manutencao = ?';
      params.push(tipo);
    }

    sql += ' ORDER BY m.data_inicio DESC';

    const manutencoes = db.prepare(sql).all(...params);
    res.json(manutencoes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/manutencoes/:id - Buscar manutenção por ID
router.get('/:id', (req, res) => {
  try {
    const manutencao = db.prepare(`
      SELECT m.*, e.codigo as equipamento_codigo, e.tipo as equipamento_tipo
      FROM manutencoes m
      JOIN equipamentos e ON m.equipamento_id = e.id
      WHERE m.id = ?
    `).get(req.params.id);

    if (!manutencao) {
      return res.status(404).json({ error: 'Manutenção não encontrada' });
    }

    res.json(manutencao);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/manutencoes - Criar nova manutenção
router.post('/', (req, res) => {
  try {
    const {
      equipamento_id, tipo_manutencao, data_inicio, descricao_servico,
      mao_obra, pecas_materiais, responsavel, garantia_dias, observacoes
    } = req.body;

    const custo_total = (mao_obra || 0) + (pecas_materiais || 0);

    const result = db.prepare(`
      INSERT INTO manutencoes (
        equipamento_id, tipo_manutencao, data_inicio, status, descricao_servico,
        mao_obra, pecas_materiais, custo_total, responsavel, garantia_dias, observacoes
      ) VALUES (?, ?, ?, 'AGENDADA', ?, ?, ?, ?, ?, ?, ?)
    `).run(
      equipamento_id, tipo_manutencao, data_inicio, descricao_servico,
      mao_obra, pecas_materiais, custo_total, responsavel, garantia_dias, observacoes
    );

    // Atualizar status do equipamento se for manutenção corretiva ou emergencial
    if (tipo_manutencao === 'CORRETIVA' || tipo_manutencao === 'EMERGencial') {
      db.prepare(`
        UPDATE equipamentos SET status = 'MANUTENCAO' WHERE id = ?
      `).run(equipamento_id);
    }

    res.status(201).json({
      id: result.lastInsertRowid,
      message: 'Manutenção cadastrada com sucesso'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/manutencoes/:id - Atualizar manutenção
router.put('/:id', (req, res) => {
  try {
    const {
      tipo_manutencao, data_inicio, data_fim, status, descricao_servico,
      mao_obra, pecas_materiais, responsavel, garantia_dias, observacoes
    } = req.body;

    const custo_total = (mao_obra || 0) + (pecas_materiais || 0);

    const manutencao = db.prepare('SELECT equipamento_id FROM manutencoes WHERE id = ?').get(req.params.id);
    if (!manutencao) {
      return res.status(404).json({ error: 'Manutenção não encontrada' });
    }

    const result = db.prepare(`
      UPDATE manutencoes SET
        tipo_manutencao = ?, data_inicio = ?, data_fim = ?, status = ?, descricao_servico = ?,
        mao_obra = ?, pecas_materiais = ?, custo_total = ?, responsavel = ?, garantia_dias = ?, observacoes = ?
      WHERE id = ?
    `).run(
      tipo_manutencao, data_inicio, data_fim, status, descricao_servico,
      mao_obra, pecas_materiais, custo_total, responsavel, garantia_dias, observacoes,
      req.params.id
    );

    // Atualizar status do equipamento quando manutenção é concluída
    if (status === 'CONCLUIDA') {
      db.prepare(`
        UPDATE equipamentos SET status = 'DISPONIVEL' WHERE id = ?
      `).run(manutencao.equipamento_id);
    }

    res.json({ message: 'Manutenção atualizada com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/manutencoes/:id/iniciar - Iniciar manutenção
router.put('/:id/iniciar', (req, res) => {
  try {
    const result = db.prepare(`
      UPDATE manutencoes SET status = 'EM_ANDAMENTO' WHERE id = ? AND status = 'AGENDADA'
    `).run(req.params.id);

    if (result.changes === 0) {
      return res.status(400).json({ error: 'Manutenção não encontrada ou já iniciada' });
    }

    res.json({ message: 'Manutenção iniciada com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/manutencoes/:id/concluir - Concluir manutenção
router.put('/:id/concluir', (req, res) => {
  try {
    const { data_fim, mao_obra, pecas_materiais } = req.body;
    const custo_total = (mao_obra || 0) + (pecas_materiais || 0);

    const manutencao = db.prepare('SELECT equipamento_id FROM manutencoes WHERE id = ?').get(req.params.id);
    if (!manutencao) {
      return res.status(404).json({ error: 'Manutenção não encontrada' });
    }

    const result = db.prepare(`
      UPDATE manutencoes SET 
        status = 'CONCLUIDA', 
        data_fim = ?, 
        mao_obra = ?, 
        pecas_materiais = ?, 
        custo_total = ?
      WHERE id = ? AND status = 'EM_ANDAMENTO'
    `).run(data_fim || new Date().toISOString().split('T')[0], mao_obra, pecas_materiais, custo_total, req.params.id);

    if (result.changes === 0) {
      return res.status(400).json({ error: 'Manutenção não está em andamento' });
    }

    // Liberar equipamento
    db.prepare(`
      UPDATE equipamentos SET status = 'DISPONIVEL' WHERE id = ?
    `).run(manutencao.equipamento_id);

    res.json({ message: 'Manutenção concluída com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/manutencoes/:id - Remover manutenção
router.delete('/:id', (req, res) => {
  try {
    const manutencao = db.prepare('SELECT equipamento_id, status FROM manutencoes WHERE id = ?').get(req.params.id);
    
    if (!manutencao) {
      return res.status(404).json({ error: 'Manutenção não encontrada' });
    }

    // Se manutenção estava em andamento, liberar equipamento
    if (manutencao.status === 'EM_ANDAMENTO') {
      db.prepare(`
        UPDATE equipamentos SET status = 'DISPONIVEL' WHERE id = ?
      `).run(manutencao.equipamento_id);
    }

    const result = db.prepare('DELETE FROM manutencoes WHERE id = ?').run(req.params.id);
    res.json({ message: 'Manutenção removida com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;