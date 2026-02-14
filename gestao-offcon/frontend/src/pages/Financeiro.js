import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FaChartLine, FaMoneyBillWave } from 'react-icons/fa';
import KPICard from '../components/common/KPICard';
import { getResumoFinanceiro, getContas } from '../services/api';

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

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
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

const StatusBadge = styled.span`
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${(props) =>
    props.status === 'PAGO'
      ? 'rgba(16, 185, 129, 0.1)'
      : props.status === 'PENDENTE'
      ? 'rgba(245, 158, 11, 0.1)'
      : 'rgba(239, 68, 68, 0.1)'};
  color: ${(props) =>
    props.status === 'PAGO'
      ? 'var(--success)'
      : props.status === 'PENDENTE'
      ? 'var(--warning)'
      : 'var(--danger)'};
`;

const Financeiro = ({ onPathChange }) => {
  const [resumo, setResumo] = useState(null);
  const [contas, setContas] = useState([]);

  useEffect(() => {
    onPathChange && onPathChange('/financeiro');
    loadFinanceiroData();
  }, []);

  const loadFinanceiroData = async () => {
    try {
      const [resumoRes, contasRes] = await Promise.all([
        getResumoFinanceiro(),
        getContas(),
      ]);
      setResumo(resumoRes.data);
      setContas(contasRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados financeiros:', error);
    }
  };

  return (
    <Container>
      <Header>
        <Title>Gestão Financeira</Title>
      </Header>

      <Grid>
        <KPICard
          icon={FaMoneyBillWave}
          label="Contas a Receber"
          value={resumo?.contasReceber?.valor || 0}
          color="#7c3aed"
        />
        <KPICard
          icon={FaMoneyBillWave}
          label="Contas a Pagar"
          value={resumo?.contasPagar?.valor || 0}
          color="#dc2626"
        />
        <KPICard
          icon={FaChartLine}
          label="Saldo"
          value={resumo?.saldo || 0}
          color={resumo?.saldo >= 0 ? '#059669' : '#dc2626'}
        />
        <KPICard
          icon={FaMoneyBillWave}
          label="Recebido"
          value={resumo?.contasReceber?.recebido || 0}
          color="#10b981"
        />
      </Grid>

      <Section>
        <SectionTitle>Contas Financeiras</SectionTitle>
        <Table>
          <thead>
            <tr>
              <Th>Tipo</Th>
              <Th>Categoria</Th>
              <Th>Descrição</Th>
              <Th>Valor</Th>
              <Th>Vencimento</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {contas.slice(0, 10).map((conta) => (
              <tr key={conta.id}>
                <Td>{conta.tipo}</Td>
                <Td>{conta.categoria}</Td>
                <Td>{conta.descricao}</Td>
                <Td>R$ {conta.valor.toFixed(2)}</Td>
                <Td>{new Date(conta.data_vencimento).toLocaleDateString('pt-BR')}</Td>
                <Td>
                  <StatusBadge status={conta.status}>{conta.status}</StatusBadge>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Section>
    </Container>
  );
};

export default Financeiro;