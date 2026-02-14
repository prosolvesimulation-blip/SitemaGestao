const express = require('express');
const router = express.Router();
const db = require('../database/connection');

// ========== AI INTEGRATION ==========
const VALID_STATUS = new Set(['pendente', 'em_andamento', 'concluido', 'cancelado']);
const VALID_TIPO = new Set(['entrega', 'marco', 'resumo']);

const normalizeStatus = (value, fallback = 'pendente') => {
  const status = String(value ?? fallback).toLowerCase();
  return VALID_STATUS.has(status) ? status : fallback;
};

const normalizeTipo = (value, fallback = 'entrega') => {
  const tipo = String(value ?? fallback).toLowerCase();
  return VALID_TIPO.has(tipo) ? tipo : fallback;
};

// Bulk Import WBS Data
router.post('/ai/import', (req, res) => {
  try {
    const { os_id, clearExisting, activities } = req.body;

    if (!os_id) {
      return res.status(400).json({ error: 'ID da Ordem de Serviço (os_id) é obrigatório' });
    }

    if (!activities || !Array.isArray(activities)) {
      return res.status(400).json({ error: 'Lista de atividades é obrigatória' });
    }

    const insertActivity = db.prepare(`
      INSERT INTO wbs_atividades (os_id, codigo, descricao, data_inicio, data_fim, status, progresso, parent_id, responsavel, tipo, ordem)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction(() => {
      if (clearExisting) {
        db.prepare('DELETE FROM wbs_atividades WHERE os_id = ?').run(os_id);
      }

      const codeToId = {};

      // Pass 1: Insert activities
      for (const act of activities) {
        const info = insertActivity.run(
          os_id,
          act.codigo,
          act.descricao,
          act.data_inicio || null,
          act.data_fim || null,
          act.status || 'pendente',
          act.progresso || 0,
          null,
          act.responsavel || null,
          act.tipo || 'entrega',
          act.ordem || 0
        );
        codeToId[act.codigo] = info.lastInsertRowid;
      }

      // Pass 2: Link parents
      const updateParent = db.prepare('UPDATE wbs_atividades SET parent_id = ? WHERE id = ?');

      for (const act of activities) {
        if (act.parent_codigo) {
          const parentId = codeToId[act.parent_codigo];
          if (parentId) {
            updateParent.run(parentId, codeToId[act.codigo]);
          }
        }
      }
    });

    transaction();
    res.json({ message: 'Importação concluída com sucesso', count: activities.length });
  } catch (error) {
    console.error('Erro na importação AI:', error);
    res.status(500).json({ error: error.message });
  }
});

// AI Schedule Update (incremental upsert/delete)
router.post('/ai/update', (req, res) => {
  try {
    const {
      os_id,
      activities = [],
      remove_codes = [],
      delete_missing = false
    } = req.body;

    if (!os_id) {
      return res.status(400).json({ error: 'ID da Ordem de Serviço (os_id) é obrigatório' });
    }

    if (!Array.isArray(activities)) {
      return res.status(400).json({ error: 'Campo activities deve ser uma lista' });
    }

    if (!Array.isArray(remove_codes)) {
      return res.status(400).json({ error: 'Campo remove_codes deve ser uma lista' });
    }

    const os = db.prepare('SELECT id FROM ordens_servico WHERE id = ?').get(os_id);
    if (!os) {
      return res.status(404).json({ error: 'Ordem de Serviço não encontrada' });
    }

    const duplicatedCodes = activities
      .map((a) => a?.codigo)
      .filter(Boolean)
      .filter((codigo, idx, arr) => arr.indexOf(codigo) !== idx);
    if (duplicatedCodes.length > 0) {
      return res.status(400).json({ error: `Códigos duplicados no payload: ${[...new Set(duplicatedCodes)].join(', ')}` });
    }

    const existingRows = db.prepare('SELECT * FROM wbs_atividades WHERE os_id = ?').all(os_id);
    const existingByCode = new Map(existingRows.map((row) => [row.codigo, row]));
    const codeToId = new Map(existingRows.map((row) => [row.codigo, row.id]));

    const insertActivity = db.prepare(`
      INSERT INTO wbs_atividades (os_id, codigo, descricao, data_inicio, data_fim, status, progresso, parent_id, responsavel, tipo, ordem)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const updateActivity = db.prepare(`
      UPDATE wbs_atividades
      SET descricao = ?, data_inicio = ?, data_fim = ?, status = ?, progresso = ?, responsavel = ?, tipo = ?, ordem = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    const updateParent = db.prepare('UPDATE wbs_atividades SET parent_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');

    const stats = {
      created: 0,
      updated: 0,
      deleted: 0,
      parentLinked: 0
    };

    const toDeleteIds = new Set();

    const transaction = db.transaction(() => {
      // Upsert by codigo
      for (const raw of activities) {
        const codigo = String(raw?.codigo || '').trim();
        if (!codigo) {
          throw new Error('Cada atividade precisa de codigo');
        }

        const incoming = {
          descricao: raw?.descricao,
          data_inicio: raw?.data_inicio,
          data_fim: raw?.data_fim,
          status: raw?.status,
          progresso: raw?.progresso,
          responsavel: raw?.responsavel,
          tipo: raw?.tipo,
          ordem: raw?.ordem
        };

        const existing = existingByCode.get(codigo);
        if (existing) {
          const descricao = incoming.descricao ?? existing.descricao;
          const data_inicio = incoming.data_inicio !== undefined ? incoming.data_inicio : existing.data_inicio;
          const data_fim = incoming.data_fim !== undefined ? incoming.data_fim : existing.data_fim;
          const status = normalizeStatus(incoming.status, existing.status || 'pendente');
          const progresso = incoming.progresso !== undefined ? Number(incoming.progresso) : Number(existing.progresso || 0);
          const responsavel = incoming.responsavel !== undefined ? incoming.responsavel : existing.responsavel;
          const tipo = normalizeTipo(incoming.tipo, existing.tipo || 'entrega');
          const ordem = incoming.ordem !== undefined ? Number(incoming.ordem || 0) : Number(existing.ordem || 0);

          updateActivity.run(
            descricao,
            data_inicio || null,
            data_fim || null,
            status,
            Number.isFinite(progresso) ? Math.max(0, Math.min(100, progresso)) : 0,
            responsavel || null,
            tipo,
            Number.isFinite(ordem) ? ordem : 0,
            existing.id
          );
          stats.updated += 1;
        } else {
          const info = insertActivity.run(
            os_id,
            codigo,
            incoming.descricao || codigo,
            incoming.data_inicio || null,
            incoming.data_fim || null,
            normalizeStatus(incoming.status),
            Number.isFinite(Number(incoming.progresso)) ? Math.max(0, Math.min(100, Number(incoming.progresso))) : 0,
            null,
            incoming.responsavel || null,
            normalizeTipo(incoming.tipo),
            Number.isFinite(Number(incoming.ordem)) ? Number(incoming.ordem) : 0
          );
          codeToId.set(codigo, info.lastInsertRowid);
          stats.created += 1;
        }
      }

      // Refresh map after upsert
      const refreshedRows = db.prepare('SELECT * FROM wbs_atividades WHERE os_id = ?').all(os_id);
      const refreshedByCode = new Map(refreshedRows.map((row) => [row.codigo, row]));
      refreshedRows.forEach((row) => codeToId.set(row.codigo, row.id));

      // Parent linking based on parent_codigo if provided
      for (const raw of activities) {
        if (!Object.prototype.hasOwnProperty.call(raw, 'parent_codigo')) continue;
        const codigo = String(raw?.codigo || '').trim();
        if (!codigo) continue;

        const self = refreshedByCode.get(codigo);
        if (!self) continue;

        let parentId = null;
        if (raw.parent_codigo) {
          parentId = codeToId.get(raw.parent_codigo) || null;
          if (!parentId) {
            throw new Error(`parent_codigo não encontrado: ${raw.parent_codigo} (filho ${codigo})`);
          }
        }

        updateParent.run(parentId, self.id);
        stats.parentLinked += 1;
      }

      // Explicit deletions by codigo
      for (const code of remove_codes) {
        const row = refreshedByCode.get(code);
        if (row) toDeleteIds.add(row.id);
      }

      // Optional deletions: remove everything not present in activities list
      if (delete_missing) {
        const keepCodes = new Set(activities.map((a) => a?.codigo).filter(Boolean));
        for (const row of refreshedRows) {
          if (!keepCodes.has(row.codigo)) {
            toDeleteIds.add(row.id);
          }
        }
      }

      for (const id of toDeleteIds) {
        deleteActivityRecursive(id);
        stats.deleted += 1;
      }
    });

    transaction();

    res.json({
      success: true,
      message: 'Atualização de cronograma concluída com sucesso',
      os_id,
      stats,
      received: {
        activities: activities.length,
        remove_codes: remove_codes.length,
        delete_missing
      }
    });
  } catch (error) {
    console.error('Erro na atualização AI do cronograma:', error);
    res.status(500).json({ error: error.message });
  }
});

// Apply Standard Planning Template based on Cronograma.xlsx
router.post('/standard-template/:os_id', (req, res) => {
  try {
    const { os_id } = req.params;

    // Check if OS exists
    const os = db.prepare('SELECT * FROM ordens_servico WHERE id = ?').get(os_id);
    if (!os) return res.status(404).json({ error: 'Ordem de Serviço não encontrada' });

    const template = [
      { codigo: '1', descricao: 'Recebimento PO', duration: 0 },
      { codigo: '2', descricao: 'Recebimento Materiais', duration: 7 },
      { codigo: '3', descricao: 'Montagem/Soldagem', duration: 5 },
      { codigo: '4', descricao: 'Inspeção dimensional 3D', duration: 1 },
      { codigo: '5', descricao: 'ENDs, TH', duration: 1 },
      { codigo: '6', descricao: 'Decapagem e Passivação', duration: 1 },
      { codigo: '7', descricao: 'Pintura', duration: 0 },
      { codigo: '8', descricao: 'Embalagem e entrega', duration: 1 },
    ];

    const insertActivity = db.prepare(`
      INSERT INTO wbs_atividades (os_id, codigo, descricao, data_inicio, data_fim, status, progresso, tipo, ordem)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction(() => {
      // Optional: Clear existing planning for this OS to avoid duplicates/confusion
      db.prepare('DELETE FROM wbs_atividades WHERE os_id = ?').run(os_id);

      let currentDate = new Date(); // Start from today

      template.forEach((item, index) => {
        const start = new Date(currentDate);
        currentDate.setDate(currentDate.getDate() + item.duration);
        const end = new Date(currentDate);

        insertActivity.run(
          os_id,
          item.codigo,
          item.descricao,
          start.toISOString().split('T')[0],
          end.toISOString().split('T')[0],
          'pendente',
          0,
          item.duration === 0 ? 'marco' : 'entrega',
          index + 1
        );
      });
    });

    transaction();
    res.json({ message: 'Cronograma padrão gerado com sucesso' });
  } catch (error) {
    console.error('Erro ao gerar cronograma padrão:', error);
    res.status(500).json({ error: error.message });
  }
});


// ========== WBS ATIVIDADES ==========

// Get all WBS activities with hierarchical structure
router.get('/wbs', (req, res) => {
  try {
    const { os_id } = req.query;
    if (!os_id) return res.status(400).json({ error: 'os_id é obrigatório' });

    const query = `
      SELECT a.*, 
        GROUP_CONCAT(DISTINCT o.oc_id) as linked_ocs,
        GROUP_CONCAT(DISTINCT o.os_id) as linked_oss
      FROM wbs_atividades a
      LEFT JOIN wbs_oc_links o ON a.id = o.wbs_id
      WHERE a.os_id = ?
      GROUP BY a.id
      ORDER BY COALESCE(a.ordem, 0), a.codigo, a.id
    `;

    console.log(`GET /wbs?os_id=${os_id} (Number: ${Number(os_id)})`);
    const rows = db.prepare(query).all(Number(os_id));
    console.log(`Found ${rows.length} rows for OS ${os_id}`);

    const buildHierarchy = (items, parentId = null) => {
      return items
        .filter(item => item.parent_id === parentId)
        .map(item => ({
          ...item,
          children: buildHierarchy(items, item.id),
          linkedOCs: item.linked_ocs ? item.linked_ocs.split(',').filter(Boolean) : [],
          linkedOSs: item.linked_oss ? item.linked_oss.split(',').filter(Boolean) : []
        }));
    };

    const hierarchical = buildHierarchy(rows);
    res.json(hierarchical);
  } catch (error) {
    console.error('Error fetching WBS:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single WBS activity
router.get('/wbs/:id', (req, res) => {
  try {
    const { id } = req.params;
    const row = db.prepare('SELECT * FROM wbs_atividades WHERE id = ?').get(id);

    if (!row) {
      return res.status(404).json({ error: 'Atividade não encontrada' });
    }
    res.json(row);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper: Update Parent Dates
const updateParentDates = (parentId) => {
  if (!parentId) return;

  const children = db.prepare('SELECT data_inicio, data_fim FROM wbs_atividades WHERE parent_id = ?').all(parentId);

  if (children.length === 0) return;

  const startDates = children.filter(c => c.data_inicio).map(c => new Date(c.data_inicio));
  const endDates = children.filter(c => c.data_fim).map(c => new Date(c.data_fim));

  if (startDates.length === 0 && endDates.length === 0) return;

  const minStart = startDates.length > 0 ? new Date(Math.min(...startDates)) : null;
  const maxEnd = endDates.length > 0 ? new Date(Math.max(...endDates)) : null;

  db.prepare('UPDATE wbs_atividades SET data_inicio = ?, data_fim = ? WHERE id = ?')
    .run(
      minStart ? minStart.toISOString().split('T')[0] : null,
      maxEnd ? maxEnd.toISOString().split('T')[0] : null,
      parentId
    );

  // Recursive up
  const parentRow = db.prepare('SELECT parent_id FROM wbs_atividades WHERE id = ?').get(parentId);
  if (parentRow && parentRow.parent_id) {
    updateParentDates(parentRow.parent_id);
  }
};

// Create new WBS activity
router.post('/wbs', (req, res) => {
  try {
    const { os_id, codigo, descricao, data_inicio, data_fim, status, progresso, parent_id, responsavel, tipo, ordem } = req.body;

    if (!os_id) return res.status(400).json({ error: 'os_id é obrigatório' });

    const info = db.prepare(`
      INSERT INTO wbs_atividades (os_id, codigo, descricao, data_inicio, data_fim, status, progresso, parent_id, responsavel, tipo, ordem)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(os_id, codigo, descricao, data_inicio, data_fim, status || 'pendente', progresso || 0, parent_id, responsavel, tipo, ordem);

    if (parent_id) {
      updateParentDates(parent_id);
    }

    res.json({ id: info.lastInsertRowid, message: 'Atividade criada com sucesso' });
  } catch (error) {
    console.error('Error creating WBS:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update WBS activity
router.put('/wbs/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { codigo, descricao, data_inicio, data_fim, status, progresso, responsavel, tipo, ordem } = req.body;

    const currentRow = db.prepare('SELECT parent_id FROM wbs_atividades WHERE id = ?').get(id);
    if (!currentRow) return res.status(404).json({ error: 'Atividade não encontrada' });

    db.prepare(`
      UPDATE wbs_atividades 
      SET codigo = ?, descricao = ?, data_inicio = ?, data_fim = ?, status = ?, progresso = ?, responsavel = ?, tipo = ?, ordem = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(codigo, descricao, data_inicio, data_fim, status, progresso, responsavel, tipo, ordem, id);

    if (currentRow.parent_id) {
      updateParentDates(currentRow.parent_id);
    }

    res.json({ message: 'Atividade atualizada com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper: Delete Recursive
const deleteActivityRecursive = (id) => {
  const children = db.prepare('SELECT id FROM wbs_atividades WHERE parent_id = ?').all(id);
  for (const child of children) {
    deleteActivityRecursive(child.id);
  }
  db.prepare('DELETE FROM wbs_followups WHERE wbs_id = ?').run(id);
  db.prepare('DELETE FROM wbs_oc_links WHERE wbs_id = ?').run(id);
  db.prepare('DELETE FROM wbs_atividades WHERE id = ?').run(id);
};

// Delete WBS activity
router.delete('/wbs/:id', (req, res) => {
  try {
    const { id } = req.params;
    const currentRow = db.prepare('SELECT parent_id FROM wbs_atividades WHERE id = ?').get(id);

    if (!currentRow) return res.status(404).json({ error: 'Atividade não encontrada' });

    const transaction = db.transaction(() => {
      deleteActivityRecursive(id);
    });
    transaction();

    if (currentRow.parent_id) {
      updateParentDates(currentRow.parent_id);
    }

    res.json({ message: 'Atividade excluída com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== FOLLOW-UPS ==========

router.get('/wbs/:id/followups', (req, res) => {
  try {
    const { id } = req.params;
    const rows = db.prepare('SELECT * FROM wbs_followups WHERE wbs_id = ? ORDER BY data DESC').all(id);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/wbs/:id/followups', (req, res) => {
  try {
    const { id } = req.params;
    const { data, descricao, responsavel, status } = req.body;
    const info = db.prepare('INSERT INTO wbs_followups (wbs_id, data, descricao, responsavel, status) VALUES (?, ?, ?, ?, ?)').run(id, data, descricao, responsavel, status || 'pendente');
    res.json({ id: info.lastInsertRowid, message: 'Follow-up criado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/followups/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { data, descricao, responsavel, status } = req.body;
    db.prepare('UPDATE wbs_followups SET data = ?, descricao = ?, responsavel = ?, status = ? WHERE id = ?').run(data, descricao, responsavel, status, id);
    res.json({ message: 'Follow-up atualizado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/followups/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM wbs_followups WHERE id = ?').run(id);
    res.json({ message: 'Follow-up excluído com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== OC/OS LINKS ==========

router.get('/wbs/:id/links', (req, res) => {
  try {
    const { id } = req.params;
    const rows = db.prepare('SELECT * FROM wbs_oc_links WHERE wbs_id = ?').all(id);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/wbs/:id/links/oc', (req, res) => {
  try {
    const { id } = req.params;
    const { oc_id } = req.body;
    db.prepare('INSERT INTO wbs_oc_links (wbs_id, oc_id) VALUES (?, ?)').run(id, oc_id);
    res.json({ message: 'OC vinculada com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/wbs/:id/links/os', (req, res) => {
  try {
    const { id } = req.params;
    const { os_id } = req.body;
    db.prepare('INSERT INTO wbs_oc_links (wbs_id, os_id) VALUES (?, ?)').run(id, os_id);
    res.json({ message: 'OS vinculada com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/wbs/:wbsId/links/:linkId', (req, res) => {
  try {
    const { linkId } = req.params;
    db.prepare('DELETE FROM wbs_oc_links WHERE id = ?').run(linkId);
    res.json({ message: 'Link removido com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== GANTT DATA ==========
router.get('/gantt', (req, res) => {
  try {
    const { os_id, startDate, endDate } = req.query;
    if (!os_id) return res.status(400).json({ error: 'os_id é obrigatório' });

    let query = `
            SELECT a.*, 
            GROUP_CONCAT(DISTINCT o.oc_id) as linked_ocs,
            GROUP_CONCAT(DISTINCT o.os_id) as linked_oss
            FROM wbs_atividades a
            LEFT JOIN wbs_oc_links o ON a.id = o.wbs_id
            WHERE a.os_id = ? AND (a.data_inicio IS NOT NULL OR a.data_fim IS NOT NULL)
        `;

    const params = [os_id];
    if (startDate) {
      query += ' AND (a.data_fim >= ? OR a.data_inicio >= ?)';
      params.push(startDate, startDate);
    }
    if (endDate) {
      query += ' AND (a.data_inicio <= ? OR a.data_fim <= ?)';
      params.push(endDate, endDate);
    }

    query += ' GROUP BY a.id ORDER BY a.data_inicio, COALESCE(a.ordem, 0), a.id';

    const rows = db.prepare(query).all(...params);

    const ganttData = rows.map(row => ({
      id: row.id,
      code: row.codigo,
      name: row.descricao,
      start: row.data_inicio,
      end: row.data_fim,
      progress: row.progresso || 0,
      status: row.status,
      type: row.tipo,
      parentId: row.parent_id,
      linkedOCs: row.linked_ocs ? row.linked_ocs.split(',').filter(Boolean) : [],
      linkedOSs: row.linked_oss ? row.linked_oss.split(',').filter(Boolean) : []
    }));

    res.json(ganttData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/gantt/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { start, end, progress } = req.body;

    const currentRow = db.prepare('SELECT parent_id FROM wbs_atividades WHERE id = ?').get(id);
    if (!currentRow) return res.status(404).json({ error: 'Atividade não encontrada' });

    db.prepare('UPDATE wbs_atividades SET data_inicio = ?, data_fim = ?, progresso = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(start, end, progress, id);

    if (currentRow.parent_id) {
      updateParentDates(currentRow.parent_id);
    }
    res.json({ message: 'Atividade atualizada com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== DASHBOARD ==========
router.get('/hoje', (req, res) => {
  try {
    const { os_id } = req.query;
    const today = new Date().toISOString().split('T')[0];

    let query = `
            SELECT a.*, f.id as followup_id, f.data as followup_data, f.descricao as followup_descricao, f.status as followup_status
            FROM wbs_atividades a
            LEFT JOIN wbs_followups f ON a.id = f.wbs_id AND f.data = ?
            WHERE ((a.data_inicio <= ? AND a.data_fim >= ?) OR f.data = ?)
        `;

    const params = [today, today, today, today];

    if (os_id) {
      query += ' AND a.os_id = ?';
      params.push(os_id);
    }

    query += ' ORDER BY a.codigo';
    const rows = db.prepare(query).all(...params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/stats', (req, res) => {
  try {
    const total = db.prepare('SELECT COUNT(*) as count FROM wbs_atividades').get();
    const byStatus = db.prepare('SELECT status, COUNT(*) as count FROM wbs_atividades GROUP BY status').all();
    const overdue = db.prepare('SELECT COUNT(*) as count FROM wbs_atividades WHERE data_fim < date("now") AND status != "concluido"').get();
    const thisWeek = db.prepare('SELECT COUNT(*) as count FROM wbs_atividades WHERE data_inicio <= date("now", "+7 days") AND data_fim >= date("now")').get();

    res.json({
      total: total.count,
      byStatus: byStatus,
      overdue: overdue.count,
      thisWeek: thisWeek.count
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/available-os', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT
        os.id,
        os.numero,
        os.status,
        os.data_emissao,
        os.data_previsao_conclusao,
        os.valor_total,
        c.razao_social AS cliente_nome
      FROM ordens_servico os
      LEFT JOIN clientes c ON c.id = os.cliente_id
      ORDER BY os.numero DESC
    `).all();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/available-oc', (req, res) => {
  try {
    const rows = db.prepare('SELECT id, data_emissao as numero, fornecedor_id as fornecedor, status FROM ordens_compra ORDER BY id DESC').all();
    // Adjusted query to match schema (ordens_compra has id, fornecedor_id, not 'numero', 'fornecedor' field)
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
