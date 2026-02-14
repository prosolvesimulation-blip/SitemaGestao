const express = require('express');
const router = express.Router();
const db = require('../database/connection');

// GET /api/dashboard/kpis - KPIs principais
router.get('/kpis', (req, res) => {
  try {
    // Total de equipamentos
    const totalEquipamentos = db.prepare('SELECT COUNT(*) as total FROM equipamentos').get();
    
    // Equipamentos por status
    const equipamentosPorStatus = db.prepare(`
      SELECT status, COUNT(*) as quantidade 
      FROM equipamentos 
      GROUP BY status
    `).all();
    
    // Locações ativas
    const locacoesAtivas = db.prepare(`
      SELECT COUNT(*) as total, SUM(valor_total) as valor_total 
      FROM locacoes 
      WHERE status = 'ATIVA'
    `).get();
    
    // Receitas do mês
    const receitasMes = db.prepare(`
      SELECT SUM(valor) as total 
      FROM contas 
      WHERE tipo = 'RECEBER' 
      AND strftime('%Y-%m', data_pagamento) = strftime('%Y-%m', 'now')
      AND status = 'PAGO'
    `).get();
    
    // Contas a receber pendentes
    const contasReceber = db.prepare(`
      SELECT SUM(valor) as total, COUNT(*) as quantidade 
      FROM contas 
      WHERE tipo = 'RECEBER' AND status = 'PENDENTE'
    `).get();
    
    // Contas a pagar pendentes
    const contasPagar = db.prepare(`
      SELECT SUM(valor) as total, COUNT(*) as quantidade 
      FROM contas 
      WHERE tipo = 'PAGAR' AND status = 'PENDENTE'
    `).get();
    
    // Projetos em execução
    const projetosExecucao = db.prepare(`
      SELECT COUNT(*) as total, SUM(valor_total) as valor_total 
      FROM projetos 
      WHERE status = 'EM_EXECUCAO'
    `).get();
    
    // Inspeções vencendo em 30 dias
    const inspecoesVencendo = db.prepare(`
      SELECT COUNT(*) as total 
      FROM inspecoes 
      WHERE data_validade BETWEEN date('now') AND date('now', '+30 days')
      AND status = 'APROVADA'
    `).get();
    
    // Manutenções em andamento
    const manutencoesAndamento = db.prepare(`
      SELECT COUNT(*) as total, SUM(custo_total) as custo_total 
      FROM manutencoes 
      WHERE status = 'EM_ANDAMENTO'
    `).get();

    res.json({
      totalEquipamentos: totalEquipamentos.total,
      equipamentosPorStatus,
      locacoesAtivas: {
        quantidade: locacoesAtivas.total || 0,
        valor: locacoesAtivas.valor_total || 0
      },
      receitasMes: receitasMes.total || 0,
      contasReceber: {
        quantidade: contasReceber.quantidade || 0,
        valor: contasReceber.total || 0
      },
      contasPagar: {
        quantidade: contasPagar.quantidade || 0,
        valor: contasPagar.total || 0
      },
      projetosExecucao: {
        quantidade: projetosExecucao.total || 0,
        valor: projetosExecucao.valor_total || 0
      },
      inspecoesVencendo30Dias: inspecoesVencendo.total || 0,
      manutencoesAndamento: {
        quantidade: manutencoesAndamento.total || 0,
        custo: manutencoesAndamento.custo_total || 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/dashboard/charts - Dados para gráficos
router.get('/charts', (req, res) => {
  try {
    // Equipamentos por tipo
    const equipamentosPorTipo = db.prepare(`
      SELECT tipo, COUNT(*) as quantidade 
      FROM equipamentos 
      GROUP BY tipo
      ORDER BY quantidade DESC
    `).all();
    
    // Receitas últimos 6 meses
    const receitas6Meses = db.prepare(`
      SELECT 
        strftime('%Y-%m', data_pagamento) as mes,
        SUM(valor) as total
      FROM contas 
      WHERE tipo = 'RECEBER' 
      AND status = 'PAGO'
      AND data_pagamento >= date('now', '-6 months')
      GROUP BY strftime('%Y-%m', data_pagamento)
      ORDER BY mes
    `).all();
    
    // Projetos por status
    const projetosPorStatus = db.prepare(`
      SELECT status, COUNT(*) as quantidade, SUM(valor_total) as valor
      FROM projetos 
      GROUP BY status
    `).all();
    
    // Locações por mês (últimos 6 meses)
    const locacoesPorMes = db.prepare(`
      SELECT 
        strftime('%Y-%m', data_inicio) as mes,
        COUNT(*) as quantidade,
        SUM(valor_total) as valor
      FROM locacoes 
      WHERE data_inicio >= date('now', '-6 months')
      GROUP BY strftime('%Y-%m', data_inicio)
      ORDER BY mes
    `).all();
    
    // Status das contas
    const statusContas = db.prepare(`
      SELECT tipo, status, COUNT(*) as quantidade, SUM(valor) as valor
      FROM contas 
      GROUP BY tipo, status
    `).all();

    res.json({
      equipamentosPorTipo,
      receitas6Meses,
      projetosPorStatus,
      locacoesPorMes,
      statusContas
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/dashboard/alerts - Alertas do sistema
router.get('/alerts', (req, res) => {
  try {
    const alerts = [];
    
    // Inspeções vencendo em 30 dias
    const inspecoesVencendo = db.prepare(`
      SELECT e.codigo, e.tipo, i.data_validade,
        julianday(i.data_validade) - julianday('now') as dias_restantes
      FROM inspecoes i
      JOIN equipamentos e ON i.equipamento_id = e.id
      WHERE i.data_validade BETWEEN date('now') AND date('now', '+30 days')
      AND i.status = 'APROVADA'
      ORDER BY i.data_validade
    `).all();
    
    inspecoesVencendo.forEach(i => {
      alerts.push({
        tipo: 'warning',
        categoria: 'Inspeção',
        mensagem: `Inspeção do ${i.codigo} vence em ${Math.ceil(i.dias_restantes)} dias`,
        data: i.data_validade
      });
    });
    
    // Contas a receber atrasadas
    const contasAtrasadas = db.prepare(`
      SELECT c.descricao, c.valor, c.data_vencimento,
        julianday('now') - julianday(c.data_vencimento) as dias_atraso,
        cl.nome_fantasia as cliente
      FROM contas c
      LEFT JOIN clientes cl ON c.entidade_id = cl.id
      WHERE c.tipo = 'RECEBER' 
      AND c.status = 'PENDENTE'
      AND c.data_vencimento < date('now')
    `).all();
    
    contasAtrasadas.forEach(c => {
      alerts.push({
        tipo: 'danger',
        categoria: 'Financeiro',
        mensagem: `Conta a receber atrasada: ${c.descricao} - ${c.cliente || 'N/A'} (${Math.ceil(c.dias_atraso)} dias)`,
        valor: c.valor,
        data: c.data_vencimento
      });
    });
    
    // Manutenções agendadas para hoje
    const manutencoesHoje = db.prepare(`
      SELECT e.codigo, m.descricao_servico
      FROM manutencoes m
      JOIN equipamentos e ON m.equipamento_id = e.id
      WHERE m.data_inicio = date('now')
      AND m.status = 'AGENDADA'
    `).all();
    
    manutencoesHoje.forEach(m => {
      alerts.push({
        tipo: 'info',
        categoria: 'Manutenção',
        mensagem: `Manutenção agendada hoje: ${m.codigo} - ${m.descricao_servico}`,
        data: new Date().toISOString().split('T')[0]
      });
    });

    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;