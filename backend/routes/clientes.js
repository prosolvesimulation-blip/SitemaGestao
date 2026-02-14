const express = require('express');
const router = express.Router();
const db = require('../database/connection');

// GET /api/clientes - Listar todos os clientes
router.get('/', (req, res) => {
  try {
    const { ativo, search } = req.query;
    let sql = 'SELECT * FROM clientes WHERE 1=1';
    const params = [];

    if (ativo !== undefined) {
      sql += ' AND ativo = ?';
      params.push(ativo);
    }

    if (search) {
      sql += ` AND (razao_social LIKE ? OR nome_fantasia LIKE ? OR cnpj LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY razao_social';

    const clientes = db.prepare(sql).all(...params);
    res.json(clientes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/clientes/:id - Buscar cliente por ID
router.get('/:id', (req, res) => {
  try {
    const cliente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(req.params.id);
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    // Buscar locações do cliente
    const locacoes = db.prepare(`
      SELECT l.*, e.codigo as equipamento_codigo, e.tipo as equipamento_tipo
      FROM locacoes l
      JOIN equipamentos e ON l.equipamento_id = e.id
      WHERE l.cliente_id = ?
      ORDER BY l.data_inicio DESC
    `).all(req.params.id);

    // Buscar projetos do cliente
    const projetos = db.prepare(`
      SELECT * FROM projetos WHERE cliente_id = ? ORDER BY data_inicio DESC
    `).all(req.params.id);

    // Buscar contas do cliente
    const contas = db.prepare(`
      SELECT * FROM contas 
      WHERE entidade_id = ? AND entidade_tipo = 'CLIENTE'
      ORDER BY data_vencimento DESC
    `).all(req.params.id);

    res.json({
      ...cliente,
      locacoes,
      projetos,
      contas
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/clientes - Criar novo cliente
router.post('/', (req, res) => {
  try {
    const {
      razao_social, nome_fantasia, cnpj, email, telefone,
      endereco, cidade, estado, cep, segmento,
      contato_nome, contato_email, contato_telefone, observacoes
    } = req.body;

    const result = db.prepare(`
      INSERT INTO clientes (
        razao_social, nome_fantasia, cnpj, email, telefone,
        endereco, cidade, estado, cep, segmento,
        contato_nome, contato_email, contato_telefone, observacoes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      razao_social, nome_fantasia, cnpj, email, telefone,
      endereco, cidade, estado, cep, segmento,
      contato_nome, contato_email, contato_telefone, observacoes
    );

    res.status(201).json({
      id: result.lastInsertRowid,
      message: 'Cliente criado com sucesso'
    });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      res.status(400).json({ error: 'CNPJ já cadastrado' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// PUT /api/clientes/:id - Atualizar cliente
router.put('/:id', (req, res) => {
  try {
    const {
      razao_social, nome_fantasia, cnpj, email, telefone,
      endereco, cidade, estado, cep, segmento,
      contato_nome, contato_email, contato_telefone, observacoes, ativo
    } = req.body;

    const result = db.prepare(`
      UPDATE clientes SET
        razao_social = ?, nome_fantasia = ?, cnpj = ?, email = ?, telefone = ?,
        endereco = ?, cidade = ?, estado = ?, cep = ?, segmento = ?,
        contato_nome = ?, contato_email = ?, contato_telefone = ?, observacoes = ?, ativo = ?
      WHERE id = ?
    `).run(
      razao_social, nome_fantasia, cnpj, email, telefone,
      endereco, cidade, estado, cep, segmento,
      contato_nome, contato_email, contato_telefone, observacoes, ativo,
      req.params.id
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    res.json({ message: 'Cliente atualizado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/clientes/:id - Remover cliente
router.delete('/:id', (req, res) => {
  try {
    // Verificar se cliente tem locações ou projetos
    const locacoes = db.prepare('SELECT COUNT(*) as count FROM locacoes WHERE cliente_id = ?').get(req.params.id);
    const projetos = db.prepare('SELECT COUNT(*) as count FROM projetos WHERE cliente_id = ?').get(req.params.id);

    if (locacoes.count > 0 || projetos.count > 0) {
      return res.status(400).json({
        error: 'Não é possível excluir cliente com locações ou projetos associados'
      });
    }

    const result = db.prepare('DELETE FROM clientes WHERE id = ?').run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    res.json({ message: 'Cliente removido com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;