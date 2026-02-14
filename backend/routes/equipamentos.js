const express = require('express');
const router = express.Router();
const db = require('../database/connection');

// GET /api/equipamentos - Listar todos os equipamentos
router.get('/', (req, res) => {
  try {
    const { status, tipo, search } = req.query;
    let sql = `
      SELECT e.*, c.nome_fantasia as cliente_nome
      FROM equipamentos e
      LEFT JOIN clientes c ON e.cliente_atual_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += ' AND e.status = ?';
      params.push(status);
    }

    if (tipo) {
      sql += ' AND e.tipo = ?';
      params.push(tipo);
    }

    if (search) {
      sql += ` AND (e.codigo LIKE ? OR e.descricao LIKE ? OR e.numero_serie LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY e.codigo';

    const equipamentos = db.prepare(sql).all(...params);
    res.json(equipamentos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/equipamentos/:id - Buscar equipamento por ID
router.get('/:id', (req, res) => {
  try {
    const equipamento = db.prepare(`
      SELECT e.*, c.nome_fantasia as cliente_nome
      FROM equipamentos e
      LEFT JOIN clientes c ON e.cliente_atual_id = c.id
      WHERE e.id = ?
    `).get(req.params.id);

    if (!equipamento) {
      return res.status(404).json({ error: 'Equipamento não encontrado' });
    }

    // Buscar histórico de locações
    const locacoes = db.prepare(`
      SELECT l.*, c.nome_fantasia as cliente_nome
      FROM locacoes l
      JOIN clientes c ON l.cliente_id = c.id
      WHERE l.equipamento_id = ?
      ORDER BY l.data_inicio DESC
    `).all(req.params.id);

    // Buscar histórico de inspeções
    const inspecoes = db.prepare(`
      SELECT * FROM inspecoes 
      WHERE equipamento_id = ? 
      ORDER BY data_inspecao DESC
    `).all(req.params.id);

    // Buscar histórico de manutenções
    const manutencoes = db.prepare(`
      SELECT * FROM manutencoes 
      WHERE equipamento_id = ? 
      ORDER BY data_inicio DESC
    `).all(req.params.id);

    res.json({
      ...equipamento,
      locacoes,
      inspecoes,
      manutencoes
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/equipamentos - Criar novo equipamento
router.post('/', (req, res) => {
  try {
    const {
      codigo, tipo, descricao, fabricante, ano_fabricacao, numero_serie,
      certificado_dnv, data_ultima_inspecao, data_proxima_inspecao,
      valor_compra, valor_locacao_diaria, localizacao_atual, observacoes
    } = req.body;

    const result = db.prepare(`
      INSERT INTO equipamentos (
        codigo, tipo, descricao, fabricante, ano_fabricacao, numero_serie,
        certificado_dnv, data_ultima_inspecao, data_proxima_inspecao,
        valor_compra, valor_locacao_diaria, localizacao_atual, observacoes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      codigo, tipo, descricao, fabricante, ano_fabricacao, numero_serie,
      certificado_dnv, data_ultima_inspecao, data_proxima_inspecao,
      valor_compra, valor_locacao_diaria, localizacao_atual, observacoes
    );

    res.status(201).json({
      id: result.lastInsertRowid,
      message: 'Equipamento cadastrado com sucesso'
    });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      res.status(400).json({ error: 'Código já cadastrado' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// PUT /api/equipamentos/:id - Atualizar equipamento
router.put('/:id', (req, res) => {
  try {
    const {
      codigo, tipo, descricao, fabricante, ano_fabricacao, numero_serie, status,
      certificado_dnv, data_ultima_inspecao, data_proxima_inspecao,
      valor_compra, valor_locacao_diaria, localizacao_atual, cliente_atual_id, observacoes
    } = req.body;

    const result = db.prepare(`
      UPDATE equipamentos SET
        codigo = ?, tipo = ?, descricao = ?, fabricante = ?, ano_fabricacao = ?, numero_serie = ?, status = ?,
        certificado_dnv = ?, data_ultima_inspecao = ?, data_proxima_inspecao = ?,
        valor_compra = ?, valor_locacao_diaria = ?, localizacao_atual = ?, cliente_atual_id = ?, observacoes = ?
      WHERE id = ?
    `).run(
      codigo, tipo, descricao, fabricante, ano_fabricacao, numero_serie, status,
      certificado_dnv, data_ultima_inspecao, data_proxima_inspecao,
      valor_compra, valor_locacao_diaria, localizacao_atual, cliente_atual_id, observacoes,
      req.params.id
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Equipamento não encontrado' });
    }

    res.json({ message: 'Equipamento atualizado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/equipamentos/:id - Remover equipamento
router.delete('/:id', (req, res) => {
  try {
    // Verificar se equipamento tem locações
    const locacoes = db.prepare('SELECT COUNT(*) as count FROM locacoes WHERE equipamento_id = ?').get(req.params.id);

    if (locacoes.count > 0) {
      return res.status(400).json({
        error: 'Não é possível excluir equipamento com histórico de locações'
      });
    }

    const result = db.prepare('DELETE FROM equipamentos WHERE id = ?').run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Equipamento não encontrado' });
    }

    res.json({ message: 'Equipamento removido com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;