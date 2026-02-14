const express = require('express');
const router = express.Router();
const db = require('../database/connection');

// GET /api/locacoes - Listar todas as locações
router.get('/', (req, res) => {
  try {
    const { status, cliente_id, search } = req.query;
    let sql = `
      SELECT l.*, 
        c.nome_fantasia as cliente_nome,
        e.codigo as equipamento_codigo, e.tipo as equipamento_tipo
      FROM locacoes l
      JOIN clientes c ON l.cliente_id = c.id
      JOIN equipamentos e ON l.equipamento_id = e.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += ' AND l.status = ?';
      params.push(status);
    }

    if (cliente_id) {
      sql += ' AND l.cliente_id = ?';
      params.push(cliente_id);
    }

    if (search) {
      sql += ` AND (l.codigo_contrato LIKE ? OR c.nome_fantasia LIKE ? OR e.codigo LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY l.data_inicio DESC';

    const locacoes = db.prepare(sql).all(...params);
    res.json(locacoes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/locacoes/:id - Buscar locação por ID
router.get('/:id', (req, res) => {
  try {
    const locacao = db.prepare(`
      SELECT l.*, 
        c.nome_fantasia as cliente_nome, c.razao_social as cliente_razao, c.cnpj as cliente_cnpj,
        e.codigo as equipamento_codigo, e.tipo as equipamento_tipo, e.descricao as equipamento_descricao
      FROM locacoes l
      JOIN clientes c ON l.cliente_id = c.id
      JOIN equipamentos e ON l.equipamento_id = e.id
      WHERE l.id = ?
    `).get(req.params.id);

    if (!locacao) {
      return res.status(404).json({ error: 'Locação não encontrada' });
    }

    res.json(locacao);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/locacoes - Criar nova locação
router.post('/', (req, res) => {
  try {
    const {
      codigo_contrato, cliente_id, equipamento_id, data_inicio, data_previsao_fim,
      valor_diaria, garantia_tipo, garantia_valor, local_entrega, observacoes
    } = req.body;

    // Verificar se equipamento está disponível
    const equipamento = db.prepare('SELECT status FROM equipamentos WHERE id = ?').get(equipamento_id);
    if (!equipamento) {
      return res.status(400).json({ error: 'Equipamento não encontrado' });
    }
    if (equipamento.status !== 'DISPONIVEL') {
      return res.status(400).json({ error: 'Equipamento não está disponível para locação' });
    }

    // Calcular valor total (previsão)
    const dias = Math.ceil((new Date(data_previsao_fim) - new Date(data_inicio)) / (1000 * 60 * 60 * 24));
    const valor_total = dias * valor_diaria;

    const result = db.prepare(`
      INSERT INTO locacoes (
        codigo_contrato, cliente_id, equipamento_id, data_inicio, data_previsao_fim,
        valor_diaria, valor_total, garantia_tipo, garantia_valor, local_entrega, observacoes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      codigo_contrato, cliente_id, equipamento_id, data_inicio, data_previsao_fim,
      valor_diaria, valor_total, garantia_tipo, garantia_valor, local_entrega, observacoes
    );

    // Atualizar status do equipamento
    db.prepare(`
      UPDATE equipamentos SET status = 'LOCADO', cliente_atual_id = ? WHERE id = ?
    `).run(cliente_id, equipamento_id);

    res.status(201).json({
      id: result.lastInsertRowid,
      message: 'Locação criada com sucesso'
    });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      res.status(400).json({ error: 'Código de contrato já existe' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// PUT /api/locacoes/:id - Atualizar locação
router.put('/:id', (req, res) => {
  try {
    const {
      codigo_contrato, data_inicio, data_previsao_fim, data_fim,
      valor_diaria, garantia_tipo, garantia_valor, local_entrega, observacoes, status
    } = req.body;

    // Recalcular valor total se necessário
    let valor_total = null;
    if (data_fim) {
      const dias = Math.ceil((new Date(data_fim) - new Date(data_inicio)) / (1000 * 60 * 60 * 24));
      valor_total = dias * valor_diaria;
    }

    const result = db.prepare(`
      UPDATE locacoes SET
        codigo_contrato = ?, data_inicio = ?, data_previsao_fim = ?, data_fim = ?,
        valor_diaria = ?, valor_total = COALESCE(?, valor_total),
        garantia_tipo = ?, garantia_valor = ?, local_entrega = ?, observacoes = ?, status = ?
      WHERE id = ?
    `).run(
      codigo_contrato, data_inicio, data_previsao_fim, data_fim,
      valor_diaria, valor_total,
      garantia_tipo, garantia_valor, local_entrega, observacoes, status,
      req.params.id
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Locação não encontrada' });
    }

    res.json({ message: 'Locação atualizada com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/locacoes/:id/finalizar - Finalizar locação
router.put('/:id/finalizar', (req, res) => {
  try {
    const { data_fim } = req.body;

    const locacao = db.prepare('SELECT * FROM locacoes WHERE id = ?').get(req.params.id);
    if (!locacao) {
      return res.status(404).json({ error: 'Locação não encontrada' });
    }

    // Calcular valor final
    const dias = Math.ceil((new Date(data_fim) - new Date(locacao.data_inicio)) / (1000 * 60 * 60 * 24));
    const valor_total = dias * locacao.valor_diaria;

    // Atualizar locação
    db.prepare(`
      UPDATE locacoes SET status = 'FINALIZADA', data_fim = ?, valor_total = ? WHERE id = ?
    `).run(data_fim, valor_total, req.params.id);

    // Liberar equipamento
    db.prepare(`
      UPDATE equipamentos SET status = 'DISPONIVEL', cliente_atual_id = NULL WHERE id = ?
    `).run(locacao.equipamento_id);

    res.json({ message: 'Locação finalizada com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/locacoes/:id - Remover locação
router.delete('/:id', (req, res) => {
  try {
    const locacao = db.prepare('SELECT * FROM locacoes WHERE id = ?').get(req.params.id);
    if (!locacao) {
      return res.status(404).json({ error: 'Locação não encontrada' });
    }

    // Se locação estava ativa, liberar equipamento
    if (locacao.status === 'ATIVA') {
      db.prepare(`
        UPDATE equipamentos SET status = 'DISPONIVEL', cliente_atual_id = NULL WHERE id = ?
      `).run(locacao.equipamento_id);
    }

    const result = db.prepare('DELETE FROM locacoes WHERE id = ?').run(req.params.id);

    res.json({ message: 'Locação removida com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;