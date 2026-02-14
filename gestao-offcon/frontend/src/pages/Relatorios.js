import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FaFileAlt, FaChartBar } from 'react-icons/fa';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  getRelatorioOcupacao,
  getRelatorioClientes,
  getRelatorioManutencoes,
} from '../services/api';

const Container = styled.div`
  padding: 0;
`;

const Header = styled.div`
  margin-bottom: 1.5rem;
`;

const Title = styled.h1`
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text);
  margin: 0;
`;

const Tabs = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  border-bottom: 2px solid var(--border);
`;

const Tab = styled.button`
  padding: 0.75rem 1.5rem;
  background: none;
  border: none;
  font-weight: 500;
  color: ${(props) => (props.active ? 'var(--primary)' : 'var(--text-secondary)')};
  border-bottom: 2px solid ${(props) => (props.active ? 'var(--primary)' : 'transparent')};
  cursor: pointer;
  margin-bottom: -2px;
  
  &:hover {
    color: var(--primary);
  }
`;

const Section = styled.div`
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 1.5rem;
`;

const SectionTitle = styled.h2`
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 1rem;
`;

const ChartContainer = styled.div`
  height: 400px;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const Th = styled.th`
  padding: 0.75rem;
  text-align: left;
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  color: var(--text-secondary);
  border-bottom: 2px solid var(--border);
`;

const Td = styled.td`
  padding: 0.75rem;
  border-bottom: 1px solid var(--border);
  font-size: 0.875rem;
`;

const Relatorios = ({ onPathChange }) => {
  const [activeTab, setActiveTab] = useState('ocupacao');
  const [ocupacaoData, setOcupacaoData] = useState(null);
  const [clientesData, setClientesData] = useState(null);
  const [manutencoesData, setManutencoesData] = useState(null);

  useEffect(() => {
    onPathChange && onPathChange('/relatorios');
    loadRelatoriosData();
  }, []);

  const loadRelatoriosData = async () => {
    try {
      const [ocupacaoRes, clientesRes, manutencoesRes] = await Promise.all([
        getRelatorioOcupacao(),
        getRelatorioClientes(),
        getRelatorioManutencoes(),
      ]);
      setOcupacaoData(ocupacaoRes.data);
      setClientesData(clientesRes.data);
      setManutencoesData(manutencoesRes.data);
    } catch (error) {
      console.error('Erro ao carregar relatórios:', error);
    }
  };

  const renderOcupacaoTab = () => (
    <>
      <Section>
        <SectionTitle>Ocupação por Tipo de Equipamento</SectionTitle>
        <ChartContainer>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ocupacaoData?.ocupacao || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="tipo" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="total_equipamentos" fill="#1e3a8a" name="Total" />
              <Bar dataKey="locados" fill="#10b981" name="Locados" />
              <Bar dataKey="em_manutencao" fill="#f59e0b" name="Em Manutenção" />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </Section>

      <Section>
        <SectionTitle>Receita por Tipo de Equipamento</SectionTitle>
        <Table>
          <thead>
            <tr>
              <Th>Tipo</Th>
              <Th>Total Locações</Th>
              <Th>Receita Total</Th>
              <Th>Média Diária</Th>
            </tr>
          </thead>
          <tbody>
            {(ocupacaoData?.receitaPorTipo || []).map((item, index) => (
              <tr key={index}>
                <Td>{item.tipo}</Td>
                <Td>{item.total_locacoes}</Td>
                <Td>R$ {item.receita_total?.toLocaleString('pt-BR')}</Td>
                <Td>R$ {item.media_diaria}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Section>
    </>
  );

  const renderClientesTab = () => (
    <Section>
      <SectionTitle>Top Clientes por Receita</SectionTitle>
      <Table>
        <thead>
          <tr>
            <Th>Cliente</Th>
            <Th>Locações</Th>
            <Th>Projetos</Th>
            <Th>Receita Total</Th>
          </tr>
        </thead>
        <tbody>
          {(clientesData?.topClientes || []).map((cliente) => (
            <tr key={cliente.id}>
              <Td>{cliente.nome_fantasia}</Td>
              <Td>{cliente.total_locacoes}</Td>
              <Td>{cliente.total_projetos}</Td>
              <Td>R$ {cliente.receita_total?.toLocaleString('pt-BR') || 0}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Section>
  );

  const renderManutencoesTab = () => (
    <Section>
      <SectionTitle>Custos de Manutenção por Equipamento</SectionTitle>
      <Table>
        <thead>
          <tr>
            <Th>Equipamento</Th>
            <Th>Tipo</Th>
            <Th>Total Manutenções</Th>
            <Th>Custo Total</Th>
            <Th>Custo Médio</Th>
          </tr>
        </thead>
        <tbody>
          {(manutencoesData?.custosPorEquipamento || []).map((item, index) => (
            <tr key={index}>
              <Td>{item.codigo}</Td>
              <Td>{item.tipo}</Td>
              <Td>{item.total_manutencoes}</Td>
              <Td>R$ {item.custo_total?.toLocaleString('pt-BR')}</Td>
              <Td>R$ {item.custo_medio}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Section>
  );

  return (
    <Container>
      <Header>
        <Title>Relatórios e Analytics</Title>
      </Header>

      <Tabs>
        <Tab active={activeTab === 'ocupacao'} onClick={() => setActiveTab('ocupacao')}>
          Ocupação
        </Tab>
        <Tab active={activeTab === 'clientes'} onClick={() => setActiveTab('clientes')}>
          Clientes
        </Tab>
        <Tab active={activeTab === 'manutencoes'} onClick={() => setActiveTab('manutencoes')}>
          Manutenções
        </Tab>
      </Tabs>

      {activeTab === 'ocupacao' && renderOcupacaoTab()}
      {activeTab === 'clientes' && renderClientesTab()}
      {activeTab === 'manutencoes' && renderManutencoesTab()}
    </Container>
  );
};

export default Relatorios;