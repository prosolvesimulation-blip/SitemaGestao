const express = require('express');
const router = express.Router();
const db = require('../database/connection');

// List all Service Orders
router.get('/', (req, res) => {
    try {
        const rows = db.prepare(`
      SELECT os.*, c.razao_social as cliente_nome
      FROM ordens_servico os
      JOIN clientes c ON os.cliente_id = c.id
      ORDER BY os.numero DESC
    `).all();
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Service Order Stats
router.get('/stats', (req, res) => {
    try {
        const stats = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status IN ('PENDENTE', 'APROVADA', 'EM_ANDAMENTO') THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'CONCLUIDA' THEN 1 ELSE 0 END) as completed,
        SUM(valor_total) as total_value
      FROM ordens_servico
    `).get();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single Service Order
router.get('/:id', (req, res) => {
    try {
        const { id } = req.params;
        const row = db.prepare(`
      SELECT os.*, c.razao_social as cliente_nome
      FROM ordens_servico os
      JOIN clientes c ON os.cliente_id = c.id
      WHERE os.id = ?
    `).get(id);

        if (!row) return res.status(404).json({ error: 'OS não encontrada' });
        res.json(row);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create Service Order
router.post('/', (req, res) => {
    try {
        const { numero, cliente_id, status, data_previsao_conclusao, valor_total, observacoes } = req.body;
        const info = db.prepare(`
      INSERT INTO ordens_servico (numero, cliente_id, status, data_previsao_conclusao, valor_total, observacoes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(numero, cliente_id, status || 'PENDENTE', data_previsao_conclusao, valor_total || 0, observacoes);

        res.json({ id: info.lastInsertRowid, message: 'OS criada com sucesso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update Service Order
router.put('/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { numero, cliente_id, status, data_previsao_conclusao, valor_total, observacoes } = req.body;

        db.prepare(`
      UPDATE ordens_servico
      SET numero = ?, cliente_id = ?, status = ?, data_previsao_conclusao = ?, valor_total = ?, observacoes = ?
      WHERE id = ?
    `).run(numero, cliente_id, status, data_previsao_conclusao, valor_total, observacoes, id);

        res.json({ message: 'OS atualizada com sucesso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete Service Order
router.delete('/:id', (req, res) => {
    try {
        const { id } = req.params;
        db.prepare('DELETE FROM ordens_servico WHERE id = ?').run(id);
        res.json({ message: 'OS excluída com sucesso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
