import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import {
  FaBox,
  FaHandshake,
  FaMoneyBillWave,
  FaExclamationTriangle,
  FaProjectDiagram,
  FaTools,
  FaClipboardCheck,
} from 'react-icons/fa';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer,
} from 'recharts';
import KPICard from '../components/common/KPICard';
import AlertCard from '../components/common/AlertCard';
import { getDashboardKPIs, getDashboardCharts, getDashboardAlerts } from '../services/api';

const Container = styled.div`
  padding: 0;
`;

const Section = styled.div`
  margin-bottom: 2rem;
`;

const SectionTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 1rem;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const ChartsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1.5rem;
`;

const ChartCard = styled.div`
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const ChartTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 1rem;
`;

const AlertsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const Loading = styled.div`
  text-align: center;
  padding: 3rem;
  color: var(--text-secondary);
`;

const COLORS = ['#1e3a8a', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'];

const Dashboard = ({ onPathChange }) => {
  const [kpis, setKpis] = useState(null);
  const [charts, setCharts] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    onPathChange && onPathChange('/');
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [kpisRes, chartsRes, alertsRes] = await Promise.all([
        getDashboardKPIs(),
        getDashboardCharts(),
        getDashboardAlerts(),
      ]);
      setKpis(kpisRes.data);
      setCharts(chartsRes.data);
      setAlerts(alertsRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading>Carregando dashboard...</Loading>;
  }

  return (
    <Container>
      <Section>
        <SectionTitle>Indicadores Principais</SectionTitle>
        <Grid>
          <KPICard
            icon={FaBox}
            label="Total de Equipamentos"
            value={kpis?.totalEquipamentos || 0}
            color="#1e3a8a"
          />
          <KPICard
            icon={FaHandshake}
            label="Locações Ativas"
            value={kpis?.locacoesAtivas?.quantidade || 0}
            color="#10b981"
            trend={`R$ ${(kpis?.locacoesAtivas?.valor || 0).toLocaleString('pt-BR')}`}
          />
          <KPICard
            icon={FaMoneyBillWave}
            label="Receitas do Mês"
            value={kpis?.receitasMes || 0}
            color="#059669"
          />
          <KPICard
            icon={FaProjectDiagram}
            label="Projetos em Execução"
            value={kpis?.projetosExecucao?.quantidade || 0}
            color="#f59e0b"
          />
          <KPICard
            icon={FaTools}
            label="Manutenções em Andamento"
            value={kpis?.manutencoesAndamento?.quantidade || 0}
            color="#dc2626"
          />
          <KPICard
            icon={FaClipboardCheck}
            label="Inspeções Vencendo (30d)"
            value={kpis?.inspecoesVencendo30Dias || 0}
            color="#d97706"
          />
          <KPICard
            icon={FaMoneyBillWave}
            label="Contas a Receber"
            value={kpis?.contasReceber?.valor || 0}
            color="#7c3aed"
            trend={`${kpis?.contasReceber?.quantidade || 0} pendente(s)`}
          />
          <KPICard
            icon={FaMoneyBillWave}
            label="Contas a Pagar"
            value={kpis?.contasPagar?.valor || 0}
            color="#dc2626"
            trend={`${kpis?.contasPagar?.quantidade || 0} pendente(s)`}
          />
        </Grid>
      </Section>

      {alerts.length > 0 && (
        <Section>
          <SectionTitle>Alertas do Sistema</SectionTitle>
          <AlertsContainer>
            {alerts.slice(0, 5).map((alert, index) => (
              <AlertCard
                key={index}
                type={alert.tipo}
                title={alert.categoria}
                message={alert.mensagem}
                data={alert.data}
                valor={alert.valor}
              />
            ))}
          </AlertsContainer>
        </Section>
      )}

      <Section>
        <SectionTitle>Gráficos e Análises</SectionTitle>
        <ChartsGrid>
          <ChartCard>
            <ChartTitle>Equipamentos por Tipo</ChartTitle>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={charts?.equipamentosPorTipo || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="tipo" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="quantidade" fill="#1e3a8a" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard>
            <ChartTitle>Status dos Equipamentos</ChartTitle>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={kpis?.equipamentosPorStatus || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ status, quantidade }) => `${status}: ${quantidade}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="quantidade"
                  nameKey="status"
                >
                  {(kpis?.equipamentosPorStatus || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard>
            <ChartTitle>Receitas (Últimos 6 Meses)</ChartTitle>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={charts?.receitas6Meses || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip formatter={(value) => `R$ ${value?.toLocaleString('pt-BR')}`} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Receitas"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard>
            <ChartTitle>Projetos por Status</ChartTitle>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={charts?.projetosPorStatus || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="quantidade" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </ChartsGrid>
      </Section>
    </Container>
  );
};

export default Dashboard;