const express = require('express');
const router = express.Router();
const db = require('../database/connection');

// GET /api/inspecoes - Listar todas as inspeções
router.get('/', (req, res) => {
  try {
    const { status, equipamento_id, vencendo } = req.query;
    let sql = `
      SELECT i.*, e.codigo as equipamento_codigo, e.tipo as equipamento_tipo
      FROM inspecoes i
      JOIN equipamentos e ON i.equipamento_id = e.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += ' AND i.status = ?';
      params.push(status);
    }

    if (equipamento_id) {
      sql += ' AND i.equipamento_id = ?';
      params.push(equipamento_id);
    }

    if (vencendo === '30') {
      sql += ` AND i.data_validade BETWEEN date('now') AND date('now', '+30 days')`;
    }

    sql += ' ORDER BY i.data_validade';

    const inspecoes = db.prepare(sql).all(...params);
    res.json(inspecoes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/inspecoes/:id - Buscar inspeção por ID
router.get('/:id', (req, res) => {
  try {
    const inspecao = db.prepare(`
      SELECT i.*, e.codigo as equipamento_codigo, e.tipo as equipamento_tipo, e.descricao as equipamento_descricao
      FROM inspecoes i
      JOIN equipamentos e ON i.equipamento_id = e.id
      WHERE i.id = ?
    `).get(req.params.id);

    if (!inspecao) {
      return res.status(404).json({ error: 'Inspeção não encontrada' });
    }

    res.json(inspecao);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/inspecoes - Criar nova inspeção
router.post('/', (req, res) => {
  try {
    const {
      equipamento_id, tipo_inspecao, data_inspecao, data_validade,
      inspetor_dnv, numero_relatorio, resultado, observacoes, custo
    } = req.body;

    const result = db.prepare(`
      INSERT INTO inspecoes (
        equipamento_id, tipo_inspecao, data_inspecao, data_validade,
        inspetor_dnv, numero_relatorio, resultado, observacoes, custo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      equipamento_id, tipo_inspecao, data_inspecao, data_validade,
      inspetor_dnv, numero_relatorio, resultado, observacoes, custo
    );

    // Atualizar datas de inspeção do equipamento
    if (resultado === 'APROVADO') {
      db.prepare(`
        UPDATE equipamentos SET 
          data_ultima_inspecao = ?, 
          data_proxima_inspecao = ?,
          status = CASE WHEN status = 'MANUTENCAO' THEN 'DISPONIVEL' ELSE status END
        WHERE id = ?
      `).run(data_inspecao, data_validade, equipamento_id);
    }

    res.status(201).json({
      id: result.lastInsertRowid,
      message: 'Inspeção cadastrada com sucesso'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/inspecoes/:id - Atualizar inspeção
router.put('/:id', (req, res) => {
  try {
    const {
      tipo_inspecao, data_inspecao, data_validade, status,
      inspetor_dnv, numero_relatorio, resultado, observacoes, custo
    } = req.body;

    const inspecao = db.prepare('SELECT equipamento_id FROM inspecoes WHERE id = ?').get(req.params.id);
    if (!inspecao) {
      return res.status(404).json({ error: 'Inspeção não encontrada' });
    }

    const result = db.prepare(`
      UPDATE inspecoes SET
        tipo_inspecao = ?, data_inspecao = ?, data_validade = ?, status = ?,
        inspetor_dnv = ?, numero_relatorio = ?, resultado = ?, observacoes = ?, custo = ?
      WHERE id = ?
    `).run(
      tipo_inspecao, data_inspecao, data_validade, status,
      inspetor_dnv, numero_relatorio, resultado, observacoes, custo,
      req.params.id
    );

    // Atualizar equipamento se inspeção foi aprovada
    if (resultado === 'APROVADO' && status === 'REALIZADA') {
      db.prepare(`
        UPDATE equipamentos SET 
          data_ultima_inspecao = ?, 
          data_proxima_inspecao = ?
        WHERE id = ?
      `).run(data_inspecao, data_validade, inspecao.equipamento_id);
    }

    res.json({ message: 'Inspeção atualizada com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/inspecoes/:id - Remover inspeção
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM inspecoes WHERE id = ?').run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Inspeção não encontrada' });
    }

    res.json({ message: 'Inspeção removida com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;