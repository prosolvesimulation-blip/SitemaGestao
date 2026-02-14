import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FaPlus, FaClipboardCheck } from 'react-icons/fa';
import DataTable from '../components/common/DataTable';
import { getInspecoes } from '../services/api';

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
      case 'APROVADA':
      case 'REALIZADA':
        return 'rgba(16, 185, 129, 0.1)';
      case 'AGENDADA':
        return 'rgba(59, 130, 246, 0.1)';
      case 'REPROVADA':
        return 'rgba(239, 68, 68, 0.1)';
      default:
        return 'rgba(100, 116, 139, 0.1)';
    }
  }};
  color: ${(props) => {
    switch (props.status) {
      case 'APROVADA':
      case 'REALIZADA':
        return 'var(--success)';
      case 'AGENDADA':
        return 'var(--info)';
      case 'REPROVADA':
        return 'var(--danger)';
      default:
        return 'var(--secondary)';
    }
  }};
`;

const Inspecoes = ({ onPathChange }) => {
  const [inspecoes, setInspecoes] = useState([]);

  useEffect(() => {
    onPathChange && onPathChange('/inspecoes');
    loadInspecoes();
  }, []);

  const loadInspecoes = async () => {
    try {
      const response = await getInspecoes();
      setInspecoes(response.data);
    } catch (error) {
      console.error('Erro ao carregar inspeções:', error);
    }
  };

  const columns = [
    { key: 'equipamento_codigo', title: 'Equipamento' },
    { key: 'tipo_inspecao', title: 'Tipo' },
    {
      key: 'data_inspecao',
      title: 'Data Inspeção',
      render: (value) => new Date(value).toLocaleDateString('pt-BR'),
    },
    {
      key: 'data_validade',
      title: 'Validade',
      render: (value) => new Date(value).toLocaleDateString('pt-BR'),
    },
    {
      key: 'status',
      title: 'Status',
      render: (value) => <StatusBadge status={value}>{value}</StatusBadge>,
    },
    { key: 'inspetor_dnv', title: 'Inspetor' },
    { key: 'resultado', title: 'Resultado' },
    {
      key: 'custo',
      title: 'Custo',
      render: (value) => value ? `R$ ${value.toFixed(2)}` : '-',
    },
  ];

  return (
    <Container>
      <Header>
        <Title>Gestão de Inspeções DNV</Title>
        <Button>
          <FaPlus /> Nova Inspeção
        </Button>
      </Header>

      <DataTable
        columns={columns}
        data={inspecoes}
        emptyMessage="Nenhuma inspeção encontrada"
      />
    </Container>
  );
};

export default Inspecoes;