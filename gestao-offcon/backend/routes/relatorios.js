const express = require('express');
const router = express.Router();
const db = require('../database/connection');

// GET /api/relatorios/ocupacao - Relatório de ocupação de equipamentos
router.get('/ocupacao', (req, res) => {
  try {
    const { dataInicio, dataFim } = req.query;
    
    // Taxa de ocupação por período
    const ocupacao = db.prepare(`
      SELECT 
        e.tipo,
        COUNT(DISTINCT e.id) as total_equipamentos,
        COUNT(DISTINCT CASE WHEN e.status = 'LOCADO' THEN e.id END) as locados,
        COUNT(DISTINCT CASE WHEN e.status = 'DISPONIVEL' THEN e.id END) as disponiveis,
        COUNT(DISTINCT CASE WHEN e.status = 'MANUTENCAO' THEN e.id END) em_manutencao,
        ROUND(
          COUNT(DISTINCT CASE WHEN e.status = 'LOCADO' THEN e.id END) * 100.0 / 
          COUNT(DISTINCT e.id), 2
        ) as taxa_ocupacao
      FROM equipamentos e
      WHERE e.status != 'INATIVO'
      GROUP BY e.tipo
    `).all();

    // Receita por tipo de equipamento
    const receitaPorTipo = db.prepare(`
      SELECT 
        e.tipo,
        SUM(l.valor_total) as receita_total,
        COUNT(l.id) as total_locacoes,
        ROUND(AVG(l.valor_diaria), 2) as media_diaria
      FROM locacoes l
      JOIN equipamentos e ON l.equipamento_id = e.id
      WHERE l.status = 'FINALIZADA' OR l.status = 'ATIVA'
      ${dataInicio ? "AND l.data_inicio >= ?" : ''}
      ${dataFim ? "AND l.data_inicio <= ?" : ''}
      GROUP BY e.tipo
    `).all(...(dataInicio ? [dataInicio] : []), ...(dataFim ? [dataFim] : []));

    res.json({
      ocupacao,
      receitaPorTipo,
      periodo: { dataInicio, dataFim }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/relatorios/clientes - Relatório de clientes
router.get('/clientes', (req, res) => {
  try {
    // Top clientes por receita
    const topClientes = db.prepare(`
      SELECT 
        c.id,
        c.nome_fantasia,
        c.razao_social,
        COUNT(DISTINCT l.id) as total_locacoes,
        SUM(l.valor_total) as total_locacoes_valor,
        COUNT(DISTINCT p.id) as total_projetos,
        SUM(p.valor_total) as total_projetos_valor,
        (SUM(l.valor_total) + SUM(p.valor_total)) as receita_total
      FROM clientes c
      LEFT JOIN locacoes l ON c.id = l.cliente_id AND (l.status = 'ATIVA' OR l.status = 'FINALIZADA')
      LEFT JOIN projetos p ON c.id = p.cliente_id AND (p.status = 'EM_EXECUCAO' OR p.status = 'CONCLUIDO')
      WHERE c.ativo = 1
      GROUP BY c.id
      ORDER BY receita_total DESC
    `).all();

    // Clientes com equipamentos locados atualmente
    const clientesAtivos = db.prepare(`
      SELECT 
        c.id,
        c.nome_fantasia,
        COUNT(l.id) as equipamentos_locados,
        SUM(l.valor_diaria) as valor_diario,
        MIN(l.data_previsao_fim) as primeira_devolucao
      FROM clientes c
      JOIN locacoes l ON c.id = l.cliente_id AND l.status = 'ATIVA'
      GROUP BY c.id
      ORDER BY equipamentos_locados DESC
    `).all();

    res.json({
      topClientes,
      clientesAtivos
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/relatorios/manutencoes - Relatório de manutenções
router.get('/manutencoes', (req, res) => {
  try {
    const { ano } = req.query;
    const yearFilter = ano ? `AND strftime('%Y', data_inicio) = '${ano}'` : '';

    // Custos de manutenção por equipamento
    const custosPorEquipamento = db.prepare(`
      SELECT 
        e.codigo,
        e.tipo,
        COUNT(m.id) as total_manutencoes,
        SUM(m.custo_total) as custo_total,
        ROUND(AVG(m.custo_total), 2) as custo_medio,
        SUM(m.mao_obra) as total_mao_obra,
        SUM(m.pecas_materiais) as total_pecas
      FROM manutencoes m
      JOIN equipamentos e ON m.equipamento_id = e.id
      WHERE m.status = 'CONCLUIDA' ${yearFilter}
      GROUP BY e.id
      ORDER BY custo_total DESC
    `).all();

    // Manutenções por tipo
    const porTipo = db.prepare(`
      SELECT 
        tipo_manutencao,
        COUNT(*) as quantidade,
        SUM(custo_total) as custo_total,
        ROUND(AVG(julianday(data_fim) - julianday(data_inicio)), 1) as duracao_media_dias
      FROM manutencoes
      WHERE status = 'CONCLUIDA' ${yearFilter}
      GROUP BY tipo_manutencao
    `).all();

    // Tempo médio de manutenção por mês
    const tempoPorMes = db.prepare(`
      SELECT 
        strftime('%Y-%m', data_inicio) as mes,
        COUNT(*) as quantidade,
        ROUND(AVG(julianday(data_fim) - julianday(data_inicio)), 1) as duracao_media
      FROM manutencoes
      WHERE status = 'CONCLUIDA' ${yearFilter}
      GROUP BY strftime('%Y-%m', data_inicio)
      ORDER BY mes
    `).all();

    res.json({
      custosPorEquipamento,
      porTipo,
      tempoPorMes,
      ano: ano || new Date().getFullYear()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/relatorios/projetos - Relatório de projetos
router.get('/projetos', (req, res) => {
  try {
    // Projetos por status
    const porStatus = db.prepare(`
      SELECT 
        status,
        COUNT(*) as quantidade,
        SUM(valor_total) as valor_total,
        SUM(custo_real) as custo_real,
        ROUND(AVG(
          CASE 
            WHEN data_entrega IS NOT NULL THEN julianday(data_entrega) - julianday(data_inicio)
            WHEN data_previsao_entrega IS NOT NULL THEN julianday(data_previsao_entrega) - julianday(data_inicio)
            ELSE NULL
          END
        ), 1) as duracao_media_dias
      FROM projetos
      GROUP BY status
    `).all();

    // Projetos concluídos - rentabilidade
    const rentabilidade = db.prepare(`
      SELECT 
        p.codigo,
        c.nome_fantasia as cliente,
        p.descricao,
        p.valor_total,
        p.custo_real,
        (p.valor_total - p.custo_real) as lucro,
        ROUND((p.valor_total - p.custo_real) * 100.0 / p.valor_total, 2) as margem_lucro,
        (julianday(p.data_entrega) - julianday(p.data_inicio)) as duracao_dias,
        (julianday(p.data_entrega) - julianday(p.data_previsao_entrega)) as atraso_dias
      FROM projetos p
      JOIN clientes c ON p.cliente_id = c.id
      WHERE p.status = 'CONCLUIDO'
      ORDER BY p.data_entrega DESC
    `).all();

    // Projetos em execução - acompanhamento
    const emExecucao = db.prepare(`
      SELECT 
        p.codigo,
        c.nome_fantasia as cliente,
        p.descricao,
        p.valor_total,
        p.custo_estimado,
        p.custo_real,
        p.data_inicio,
        p.data_previsao_entrega,
        (julianday('now') - julianday(p.data_inicio)) as dias_em_execucao,
        (julianday(p.data_previsao_entrega) - julianday('now')) as dias_restantes,
        ROUND(COALESCE(p.custo_real, 0) * 100.0 / p.custo_estimado, 2) as percentual_custo
      FROM projetos p
      JOIN clientes c ON p.cliente_id = c.id
      WHERE p.status = 'EM_EXECUCAO'
      ORDER BY p.data_previsao_entrega
    `).all();

    res.json({
      porStatus,
      rentabilidade,
      emExecucao
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/relatorios/inspecoes - Relatório de inspeções
router.get('/inspecoes', (req, res) => {
  try {
    // Inspeções por período
    const porPeriodo = db.prepare(`
      SELECT 
        strftime('%Y-%m', data_inspecao) as mes,
        COUNT(*) as total,
        SUM(CASE WHEN resultado = 'APROVADO' THEN 1 ELSE 0 END) as aprovadas,
        SUM(CASE WHEN resultado = 'REPROVADO' THEN 1 ELSE 0 END) as reprovadas,
        SUM(CASE WHEN resultado = 'APROVADO_COM_RESSALVAS' THEN 1 ELSE 0 END) as aprovadas_ressalvas,
        SUM(custo) as custo_total
      FROM inspecoes
      WHERE status = 'REALIZADA' OR status = 'APROVADA'
      AND data_inspecao >= date('now', '-12 months')
      GROUP BY strftime('%Y-%m', data_inspecao)
      ORDER BY mes
    `).all();

    // Equipamentos com inspeção vencendo
    const vencendo = db.prepare(`
      SELECT 
        e.codigo,
        e.tipo,
        i.data_validade,
        (julianday(i.data_validade) - julianday('now')) as dias_restantes,
        c.nome_fantasia as cliente_atual
      FROM inspecoes i
      JOIN equipamentos e ON i.equipamento_id = e.id
      LEFT JOIN clientes c ON e.cliente_atual_id = c.id
      WHERE i.data_validade BETWEEN date('now') AND date('now', '+90 days')
      AND i.status = 'APROVADA'
      ORDER BY i.data_validade
    `).all();

    // Histórico de custos com DNV
    const custosDNV = db.prepare(`
      SELECT 
        strftime('%Y', data_inspecao) as ano,
        COUNT(*) as total_inspecoes,
        SUM(custo) as custo_total,
        ROUND(AVG(custo), 2) as custo_medio
      FROM inspecoes
      WHERE status = 'REALIZADA' OR status = 'APROVADA'
      GROUP BY strftime('%Y', data_inspecao)
      ORDER BY ano DESC
    `).all();

    res.json({
      porPeriodo,
      vencendo,
      custosDNV
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;