const express = require('express');
const router = express.Router();
const db = require('../database/connection');

// GET /api/financeiro/resumo - Resumo financeiro
router.get('/resumo', (req, res) => {
  try {
    const { periodo } = req.query;
    let dateFilter = '';
    
    if (periodo === 'mes') {
      dateFilter = `AND strftime('%Y-%m', data_vencimento) = strftime('%Y-%m', 'now')`;
    } else if (periodo === 'ano') {
      dateFilter = `AND strftime('%Y', data_vencimento) = strftime('%Y', 'now')`;
    }

    // Contas a receber
    const contasReceber = db.prepare(`
      SELECT 
        SUM(CASE WHEN status = 'PENDENTE' THEN valor ELSE 0 END) as pendente,
        SUM(CASE WHEN status = 'PAGO' THEN valor ELSE 0 END) as recebido,
        SUM(CASE WHEN status = 'ATRASADO' THEN valor ELSE 0 END) as atrasado,
        COUNT(CASE WHEN status = 'PENDENTE' THEN 1 END) as qtd_pendente,
        COUNT(CASE WHEN status = 'PAGO' THEN 1 END) as qtd_recebido
      FROM contas 
      WHERE tipo = 'RECEBER' ${dateFilter}
    `).get();

    // Contas a pagar
    const contasPagar = db.prepare(`
      SELECT 
        SUM(CASE WHEN status = 'PENDENTE' THEN valor ELSE 0 END) as pendente,
        SUM(CASE WHEN status = 'PAGO' THEN valor ELSE 0 END) as pago,
        SUM(CASE WHEN status = 'ATRASADO' THEN valor ELSE 0 END) as atrasado,
        COUNT(CASE WHEN status = 'PENDENTE' THEN 1 END) as qtd_pendente,
        COUNT(CASE WHEN status = 'PAGO' THEN 1 END) as qtd_pago
      FROM contas 
      WHERE tipo = 'PAGAR' ${dateFilter}
    `).get();

    // Por categoria
    const porCategoria = db.prepare(`
      SELECT categoria, tipo, SUM(valor) as total, COUNT(*) as quantidade
      FROM contas 
      WHERE status = 'PAGO' ${dateFilter}
      GROUP BY categoria, tipo
      ORDER BY total DESC
    `).all();

    // Fluxo mensal (últimos 6 meses)
    const fluxoMensal = db.prepare(`
      SELECT 
        strftime('%Y-%m', data_pagamento) as mes,
        SUM(CASE WHEN tipo = 'RECEBER' THEN valor ELSE 0 END) as receitas,
        SUM(CASE WHEN tipo = 'PAGAR' THEN valor ELSE 0 END) as despesas
      FROM contas 
      WHERE status = 'PAGO'
      AND data_pagamento >= date('now', '-6 months')
      GROUP BY strftime('%Y-%m', data_pagamento)
      ORDER BY mes
    `).all();

    res.json({
      contasReceber: {
        pendente: contasReceber.pendente || 0,
        recebido: contasReceber.recebido || 0,
        atrasado: contasReceber.atrasado || 0,
        qtdPendente: contasReceber.qtd_pendente || 0,
        qtdRecebido: contasReceber.qtd_recebido || 0
      },
      contasPagar: {
        pendente: contasPagar.pendente || 0,
        pago: contasPagar.pago || 0,
        atrasado: contasPagar.atrasado || 0,
        qtdPendente: contasPagar.qtd_pendente || 0,
        qtdPago: contasPagar.qtd_pago || 0
      },
      saldo: (contasReceber.recebido || 0) - (contasPagar.pago || 0),
      porCategoria,
      fluxoMensal
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/financeiro/contas - Listar contas
router.get('/contas', (req, res) => {
  try {
    const { tipo, status, categoria, search } = req.query;
    let sql = `
      SELECT c.*, 
        CASE 
          WHEN c.entidade_tipo = 'CLIENTE' THEN cl.nome_fantasia
          WHEN c.entidade_tipo = 'FORNECEDOR' THEN f.nome_fantasia
          ELSE NULL
        END as entidade_nome
      FROM contas c
      LEFT JOIN clientes cl ON c.entidade_id = cl.id AND c.entidade_tipo = 'CLIENTE'
      LEFT JOIN fornecedores f ON c.entidade_id = f.id AND c.entidade_tipo = 'FORNECEDOR'
      WHERE 1=1
    `;
    const params = [];

    if (tipo) {
      sql += ' AND c.tipo = ?';
      params.push(tipo);
    }

    if (status) {
      sql += ' AND c.status = ?';
      params.push(status);
    }

    if (categoria) {
      sql += ' AND c.categoria = ?';
      params.push(categoria);
    }

    if (search) {
      sql += ` AND (c.descricao LIKE ? OR c.numero_documento LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY c.data_vencimento DESC';

    const contas = db.prepare(sql).all(...params);
    res.json(contas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/financeiro/contas/:id - Buscar conta por ID
router.get('/contas/:id', (req, res) => {
  try {
    const conta = db.prepare(`
      SELECT c.*, 
        CASE 
          WHEN c.entidade_tipo = 'CLIENTE' THEN cl.nome_fantasia
          WHEN c.entidade_tipo = 'FORNECEDOR' THEN f.nome_fantasia
          ELSE NULL
        END as entidade_nome
      FROM contas c
      LEFT JOIN clientes cl ON c.entidade_id = cl.id AND c.entidade_tipo = 'CLIENTE'
      LEFT JOIN fornecedores f ON c.entidade_id = f.id AND c.entidade_tipo = 'FORNECEDOR'
      WHERE c.id = ?
    `).get(req.params.id);

    if (!conta) {
      return res.status(404).json({ error: 'Conta não encontrada' });
    }

    res.json(conta);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/financeiro/contas - Criar nova conta
router.post('/contas', (req, res) => {
  try {
    const {
      tipo, categoria, descricao, entidade_id, entidade_tipo,
      referencia_id, referencia_tipo, valor, data_vencimento,
      forma_pagamento, numero_documento, observacoes
    } = req.body;

    const result = db.prepare(`
      INSERT INTO contas (
        tipo, categoria, descricao, entidade_id, entidade_tipo,
        referencia_id, referencia_tipo, valor, data_vencimento,
        forma_pagamento, numero_documento, observacoes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      tipo, categoria, descricao, entidade_id, entidade_tipo,
      referencia_id, referencia_tipo, valor, data_vencimento,
      forma_pagamento, numero_documento, observacoes
    );

    res.status(201).json({
      id: result.lastInsertRowid,
      message: 'Conta criada com sucesso'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/financeiro/contas/:id - Atualizar conta
router.put('/contas/:id', (req, res) => {
  try {
    const {
      tipo, categoria, descricao, entidade_id, entidade_tipo,
      valor, data_vencimento, forma_pagamento, numero_documento, observacoes
    } = req.body;

    const result = db.prepare(`
      UPDATE contas SET
        tipo = ?, categoria = ?, descricao = ?, entidade_id = ?, entidade_tipo = ?,
        valor = ?, data_vencimento = ?, forma_pagamento = ?, numero_documento = ?, observacoes = ?
      WHERE id = ? AND status = 'PENDENTE'
    `).run(
      tipo, categoria, descricao, entidade_id, entidade_tipo,
      valor, data_vencimento, forma_pagamento, numero_documento, observacoes,
      req.params.id
    );

    if (result.changes === 0) {
      return res.status(400).json({ error: 'Conta não encontrada ou já paga' });
    }

    res.json({ message: 'Conta atualizada com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/financeiro/contas/:id/pagar - Registrar pagamento
router.put('/contas/:id/pagar', (req, res) => {
  try {
    const { data_pagamento, forma_pagamento } = req.body;

    const result = db.prepare(`
      UPDATE contas SET
        status = 'PAGO',
        data_pagamento = ?,
        forma_pagamento = COALESCE(?, forma_pagamento)
      WHERE id = ? AND status = 'PENDENTE'
    `).run(data_pagamento || new Date().toISOString().split('T')[0], forma_pagamento, req.params.id);

    if (result.changes === 0) {
      return res.status(400).json({ error: 'Conta não encontrada ou já paga' });
    }

    res.json({ message: 'Pagamento registrado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/financeiro/contas/:id - Remover conta
router.delete('/contas/:id', (req, res) => {
  try {
    const result = db.prepare(`DELETE FROM contas WHERE id = ? AND status = 'PENDENTE'`).run(req.params.id);

    if (result.changes === 0) {
      return res.status(400).json({ error: 'Conta não encontrada ou já paga' });
    }

    res.json({ message: 'Conta removida com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/financeiro/fornecedores - Listar fornecedores
router.get('/fornecedores', (req, res) => {
  try {
    const { search, ativo } = req.query;
    let sql = 'SELECT * FROM fornecedores WHERE 1=1';
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

    const fornecedores = db.prepare(sql).all(...params);
    res.json(fornecedores);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/financeiro/fornecedores - Criar fornecedor
router.post('/fornecedores', (req, res) => {
  try {
    const {
      razao_social, nome_fantasia, cnpj, email, telefone,
      endereco, cidade, estado, cep, segmento, observacoes
    } = req.body;

    const result = db.prepare(`
      INSERT INTO fornecedores (
        razao_social, nome_fantasia, cnpj, email, telefone,
        endereco, cidade, estado, cep, segmento, observacoes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      razao_social, nome_fantasia, cnpj, email, telefone,
      endereco, cidade, estado, cep, segmento, observacoes
    );

    res.status(201).json({
      id: result.lastInsertRowid,
      message: 'Fornecedor criado com sucesso'
    });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      res.status(400).json({ error: 'CNPJ já cadastrado' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// PUT /api/financeiro/fornecedores/:id - Atualizar fornecedor
router.put('/fornecedores/:id', (req, res) => {
  try {
    const {
      razao_social, nome_fantasia, cnpj, email, telefone,
      endereco, cidade, estado, cep, segmento, observacoes, ativo
    } = req.body;

    const result = db.prepare(`
      UPDATE fornecedores SET
        razao_social = ?, nome_fantasia = ?, cnpj = ?, email = ?, telefone = ?,
        endereco = ?, cidade = ?, estado = ?, cep = ?, segmento = ?, observacoes = ?, ativo = ?
      WHERE id = ?
    `).run(
      razao_social, nome_fantasia, cnpj, email, telefone,
      endereco, cidade, estado, cep, segmento, observacoes, ativo,
      req.params.id
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Fornecedor não encontrado' });
    }

    res.json({ message: 'Fornecedor atualizado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
