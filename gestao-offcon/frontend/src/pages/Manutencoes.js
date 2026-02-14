import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FaPlus, FaTools } from 'react-icons/fa';
import DataTable from '../components/common/DataTable';
import { getManutencoes } from '../services/api';

const Container = styled.div`
  padding: 0;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
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
  background: ${(props) => {
    switch (props.status) {
      case 'CONCLUIDA':
        return 'rgba(16, 185, 129, 0.1)';
      case 'EM_ANDAMENTO':
        return 'rgba(245, 158, 11, 0.1)';
      case 'AGENDADA':
        return 'rgba(59, 130, 246, 0.1)';
      default:
        return 'rgba(100, 116, 139, 0.1)';
    }
  }};
  color: ${(props) => {
    switch (props.status) {
      case 'CONCLUIDA':
        return 'var(--success)';
      case 'EM_ANDAMENTO':
        return 'var(--warning)';
      case 'AGENDADA':
        return 'var(--info)';
      default:
        return 'var(--secondary)';
    }
  }};
`;

const Manutencoes = ({ onPathChange }) => {
  const [manutencoes, setManutencoes] = useState([]);

  useEffect(() => {
    onPathChange && onPathChange('/manutencoes');
    loadManutencoes();
  }, []);

  const loadManutencoes = async () => {
    try {
      const response = await getManutencoes();
      setManutencoes(response.data);
    } catch (error) {
      console.error('Erro ao carregar manutenções:', error);
    }
  };

  const columns = [
    { key: 'equipamento_codigo', title: 'Equipamento' },
    { key: 'tipo_manutencao', title: 'Tipo' },
    { key: 'descricao_servico', title: 'Descrição' },
    {
      key: 'data_inicio',
      title: 'Data Início',
      render: (value) => value ? new Date(value).toLocaleDateString('pt-BR') : '-',
    },
    {
      key: 'data_fim',
      title: 'Data Fim',
      render: (value) => value ? new Date(value).toLocaleDateString('pt-BR') : '-',
    },
    {
      key: 'status',
      title: 'Status',
      render: (value) => <StatusBadge status={value}>{value}</StatusBadge>,
    },
    {
      key: 'custo_total',
      title: 'Custo Total',
      render: (value) => value ? `R$ ${value.toFixed(2)}` : '-',
    },
    { key: 'responsavel', title: 'Responsável' },
  ];

  return (
    <Container>
      <Header>
        <Title>Gestão de Manutenções</Title>
        <Button>
          <FaPlus /> Nova Manutenção
        </Button>
      </Header>

      <DataTable
        columns={columns}
        data={manutencoes}
        emptyMessage="Nenhuma manutenção encontrada"
      />
    </Container>
  );
};

export default Manutencoes;