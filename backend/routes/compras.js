const express = require('express');
const router = express.Router();
const db = require('../database/connection');

const parseItems = (itens = []) => {
    if (!Array.isArray(itens) || itens.length === 0) return null;

    const normalized = itens.map((item) => {
        const descricao = String(item.descricao || '').trim();
        const quantidade = Number(item.quantidade);
        const valor_unitario = Number(item.valor_unitario);

        if (!descricao || !Number.isFinite(quantidade) || quantidade <= 0 || !Number.isFinite(valor_unitario) || valor_unitario < 0) {
            return null;
        }

        return {
            descricao,
            quantidade,
            valor_unitario,
            valor_total: quantidade * valor_unitario,
        };
    });

    if (normalized.some((item) => item === null)) return null;
    return normalized;
};

// Listar todas as ordens de compra
router.get('/', (req, res) => {
    try {
        const query = `
            SELECT 
                oc.*, 
                f.razao_social as fornecedor_nome 
            FROM ordens_compra oc
            LEFT JOIN fornecedores f ON oc.fornecedor_id = f.id
            ORDER BY oc.data_emissao DESC
        `;
        const ordens = db.prepare(query).all();
        res.json(ordens);
    } catch (error) {
        console.error('Erro ao listar ordens de compra:', error);
        res.status(500).json({ error: 'Erro ao listar ordens de compra' });
    }
});

// Listar fornecedores para compras
router.get('/fornecedores', (req, res) => {
    try {
        const fornecedores = db.prepare(`
            SELECT id, razao_social, nome_fantasia, cnpj, email, telefone
            FROM fornecedores
            WHERE ativo = 1
            ORDER BY razao_social
        `).all();
        res.json(fornecedores);
    } catch (error) {
        console.error('Erro ao listar fornecedores:', error);
        res.status(500).json({ error: 'Erro ao listar fornecedores' });
    }
});

// Obter detalhes de uma ordem de compra
router.get('/:id', (req, res) => {
    try {
        const { id } = req.params;

        const ordemQuery = `
            SELECT 
                oc.*, 
                f.razao_social as fornecedor_nome, 
                f.cnpj, 
                f.email, 
                f.telefone
            FROM ordens_compra oc
            LEFT JOIN fornecedores f ON oc.fornecedor_id = f.id
            WHERE oc.id = ?
        `;
        const ordem = db.prepare(ordemQuery).get(id);

        if (!ordem) {
            return res.status(404).json({ error: 'Ordem de compra não encontrada' });
        }

        const itensQuery = `SELECT * FROM itens_ordem_compra WHERE ordem_compra_id = ?`;
        const itens = db.prepare(itensQuery).all(id);

        res.json({ ...ordem, itens });
    } catch (error) {
        console.error('Erro ao obter ordem de compra:', error);
        res.status(500).json({ error: 'Erro ao obter ordem de compra' });
    }
});

// Criar nova ordem de compra
router.post('/', (req, res) => {
    try {
        const { fornecedor_id, data_previsao_entrega, observacoes, itens } = req.body;
        const parsedFornecedorId = Number(fornecedor_id);
        const parsedItens = parseItems(itens);

        if (!Number.isInteger(parsedFornecedorId) || parsedFornecedorId <= 0 || !parsedItens) {
            return res.status(400).json({ error: 'Fornecedor e itens válidos são obrigatórios' });
        }

        const fornecedor = db.prepare('SELECT id FROM fornecedores WHERE id = ?').get(parsedFornecedorId);
        if (!fornecedor) {
            return res.status(404).json({ error: 'Fornecedor não encontrado' });
        }

        const valor_total = parsedItens.reduce((acc, item) => acc + item.valor_total, 0);

        const insertOrdem = db.prepare(`
            INSERT INTO ordens_compra (fornecedor_id, data_previsao_entrega, valor_total, observacoes)
            VALUES (?, ?, ?, ?)
        `);

        const insertItem = db.prepare(`
            INSERT INTO itens_ordem_compra (ordem_compra_id, descricao, quantidade, valor_unitario, valor_total)
            VALUES (?, ?, ?, ?, ?)
        `);

        // Transaction to ensure data integrity
        const transaction = db.transaction(() => {
            const info = insertOrdem.run(parsedFornecedorId, data_previsao_entrega, valor_total, observacoes || '');
            const ordemId = info.lastInsertRowid;

            for (const item of parsedItens) {
                insertItem.run(
                    ordemId,
                    item.descricao,
                    item.quantidade,
                    item.valor_unitario,
                    item.valor_total
                );
            }
            return ordemId;
        });

        const novoId = transaction();
        res.status(201).json({ id: novoId, message: 'Ordem de compra criada com sucesso' });

    } catch (error) {
        console.error('Erro ao criar ordem de compra:', error);
        res.status(500).json({ error: 'Erro ao criar ordem de compra' });
    }
});

// Atualizar ordem de compra (apenas se PENDENTE)
router.put('/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { fornecedor_id, data_previsao_entrega, observacoes, itens } = req.body;
        const parsedFornecedorId = Number(fornecedor_id);
        const parsedItens = parseItems(itens);

        if (!Number.isInteger(parsedFornecedorId) || parsedFornecedorId <= 0 || !parsedItens) {
            return res.status(400).json({ error: 'Fornecedor e itens válidos são obrigatórios' });
        }

        const ordem = db.prepare('SELECT status FROM ordens_compra WHERE id = ?').get(id);
        if (!ordem) {
            return res.status(404).json({ error: 'Ordem de compra não encontrada' });
        }

        if (ordem.status !== 'PENDENTE') {
            return res.status(400).json({ error: 'Apenas ordens pendentes podem ser editadas' });
        }

        const fornecedor = db.prepare('SELECT id FROM fornecedores WHERE id = ?').get(parsedFornecedorId);
        if (!fornecedor) {
            return res.status(404).json({ error: 'Fornecedor não encontrado' });
        }

        const valor_total = parsedItens.reduce((acc, item) => acc + item.valor_total, 0);

        const updateOrdem = db.prepare(`
            UPDATE ordens_compra
            SET fornecedor_id = ?, data_previsao_entrega = ?, valor_total = ?, observacoes = ?
            WHERE id = ?
        `);

        const clearItens = db.prepare('DELETE FROM itens_ordem_compra WHERE ordem_compra_id = ?');
        const insertItem = db.prepare(`
            INSERT INTO itens_ordem_compra (ordem_compra_id, descricao, quantidade, valor_unitario, valor_total)
            VALUES (?, ?, ?, ?, ?)
        `);

        const transaction = db.transaction(() => {
            updateOrdem.run(parsedFornecedorId, data_previsao_entrega, valor_total, observacoes || '', id);
            clearItens.run(id);

            for (const item of parsedItens) {
                insertItem.run(
                    id,
                    item.descricao,
                    item.quantidade,
                    item.valor_unitario,
                    item.valor_total
                );
            }
        });

        transaction();
        res.json({ message: 'Ordem de compra atualizada com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar ordem de compra:', error);
        res.status(500).json({ error: 'Erro ao atualizar ordem de compra' });
    }
});

// Atualizar status da ordem
router.put('/:id/status', (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['PENDENTE', 'APROVADA', 'RECEBIDA', 'CANCELADA'].includes(status)) {
            return res.status(400).json({ error: 'Status inválido' });
        }

        const current = db.prepare('SELECT status FROM ordens_compra WHERE id = ?').get(id);
        if (!current) {
            return res.status(404).json({ error: 'Ordem de compra não encontrada' });
        }

        const allowedTransitions = {
            PENDENTE: ['PENDENTE', 'APROVADA', 'CANCELADA'],
            APROVADA: ['APROVADA', 'RECEBIDA', 'CANCELADA'],
            RECEBIDA: ['RECEBIDA'],
            CANCELADA: ['CANCELADA'],
        };

        if (!allowedTransitions[current.status]?.includes(status)) {
            return res.status(400).json({
                error: `Transição de status inválida: ${current.status} -> ${status}`,
            });
        }

        const update = db.prepare('UPDATE ordens_compra SET status = ? WHERE id = ?');
        const info = update.run(status, id);

        if (info.changes === 0) {
            return res.status(400).json({ error: 'Status não alterado' });
        }

        res.json({ message: 'Status atualizado com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar status:', error);
        res.status(500).json({ error: 'Erro ao atualizar status' });
    }
});

// Excluir ordem de compra (apenas se PENDENTE)
router.delete('/:id', (req, res) => {
    try {
        const { id } = req.params;

        const ordem = db.prepare('SELECT status FROM ordens_compra WHERE id = ?').get(id);

        if (!ordem) {
            return res.status(404).json({ error: 'Ordem de compra não encontrada' });
        }

        if (ordem.status !== 'PENDENTE') {
            return res.status(400).json({ error: 'Apenas ordens pendentes podem ser excluídas' });
        }

        // Cascading delete should handle items, but manual delete is safer if FK cascade isnt enabled
        db.prepare('DELETE FROM itens_ordem_compra WHERE ordem_compra_id = ?').run(id);
        db.prepare('DELETE FROM ordens_compra WHERE id = ?').run(id);

        res.json({ message: 'Ordem de compra excluída com sucesso' });

    } catch (error) {
        console.error('Erro ao excluir ordem de compra:', error);
        res.status(500).json({ error: 'Erro ao excluir ordem de compra. Verifique se existem itens associados.' });
    }
});

module.exports = router;
