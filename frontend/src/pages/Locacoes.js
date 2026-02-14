import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FaPlus, FaHandshake } from 'react-icons/fa';
import DataTable from '../components/common/DataTable';
import { getLocacoes } from '../services/api';

const Container = styled.div`
  padding: 0;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
`;

const Title = styled.h1`
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text);
  margin: 0;
`;

const Button = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  
  &:hover {
    background: var(--primary-dark);
  }
`;

const StatusBadge = styled.span`
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${(props) =>
    props.status === 'ATIVA'
      ? 'rgba(16, 185, 129, 0.1)'
      : 'rgba(100, 116, 139, 0.1)'};
  color: ${(props) =>
    props.status === 'ATIVA' ? 'var(--success)' : 'var(--secondary)'};
`;

const Locacoes = ({ onPathChange }) => {
  const [locacoes, setLocacoes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    onPathChange && onPathChange('/locacoes');
    loadLocacoes();
  }, []);

  const loadLocacoes = async () => {
    try {
      setLoading(true);
      const response = await getLocacoes();
      setLocacoes(response.data);
    } catch (error) {
      console.error('Erro ao carregar locações:', error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { key: 'codigo_contrato', title: 'Contrato' },
    { key: 'cliente_nome', title: 'Cliente' },
    { key: 'equipamento_codigo', title: 'Equipamento' },
    {
      key: 'data_inicio',
      title: 'Início',
      render: (value) => new Date(value).toLocaleDateString('pt-BR'),
    },
    {
      key: 'data_previsao_fim',
      title: 'Previsão Fim',
      render: (value) => value ? new Date(value).toLocaleDateString('pt-BR') : '-',
    },
    {
      key: 'valor_diaria',
      title: 'Valor/Dia',
      render: (value) => `R$ ${value.toFixed(2)}`,
    },
    {
      key: 'status',
      title: 'Status',
      render: (value) => <StatusBadge status={value}>{value}</StatusBadge>,
    },
  ];

  return (
    <Container>
      <Header>
        <Title>Gestão de Locações</Title>
        <Button>
          <FaPlus /> Nova Locação
        </Button>
      </Header>

      <DataTable
        columns={columns}
        data={locacoes}
        emptyMessage="Nenhuma locação encontrada"
      />
    </Container>
  );
};

export default Locacoes;