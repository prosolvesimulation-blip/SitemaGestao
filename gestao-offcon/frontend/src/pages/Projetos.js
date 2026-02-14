import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FaPlus, FaProjectDiagram } from 'react-icons/fa';
import DataTable from '../components/common/DataTable';
import { getProjetos } from '../services/api';

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
      case 'ORCAMENTO':
        return 'rgba(100, 116, 139, 0.1)';
      case 'APROVADO':
        return 'rgba(59, 130, 246, 0.1)';
      case 'EM_EXECUCAO':
        return 'rgba(245, 158, 11, 0.1)';
      case 'CONCLUIDO':
        return 'rgba(16, 185, 129, 0.1)';
      default:
        return 'rgba(100, 116, 139, 0.1)';
    }
  }};
  color: ${(props) => {
    switch (props.status) {
      case 'ORCAMENTO':
        return 'var(--secondary)';
      case 'APROVADO':
        return 'var(--info)';
      case 'EM_EXECUCAO':
        return 'var(--warning)';
      case 'CONCLUIDO':
        return 'var(--success)';
      default:
        return 'var(--secondary)';
    }
  }};
`;

const Projetos = ({ onPathChange }) => {
  const [projetos, setProjetos] = useState([]);

  useEffect(() => {
    onPathChange && onPathChange('/projetos');
    loadProjetos();
  }, []);

  const loadProjetos = async () => {
    try {
      const response = await getProjetos();
      setProjetos(response.data);
    } catch (error) {
      console.error('Erro ao carregar projetos:', error);
    }
  };

  const columns = [
    { key: 'codigo', title: 'Código' },
    { key: 'cliente_nome', title: 'Cliente' },
    { key: 'descricao', title: 'Descrição' },
    { key: 'tipo_projeto', title: 'Tipo' },
    {
      key: 'status',
      title: 'Status',
      render: (value) => <StatusBadge status={value}>{value}</StatusBadge>,
    },
    {
      key: 'valor_total',
      title: 'Valor Total',
      render: (value) => value ? `R$ ${value.toLocaleString('pt-BR')}` : '-',
    },
    {
      key: 'data_previsao_entrega',
      title: 'Previsão Entrega',
      render: (value) => value ? new Date(value).toLocaleDateString('pt-BR') : '-',
    },
  ];

  return (
    <Container>
      <Header>
        <Title>Gestão de Projetos</Title>
        <Button>
          <FaPlus /> Novo Projeto
        </Button>
      </Header>

      <DataTable
        columns={columns}
        data={projetos}
        emptyMessage="Nenhum projeto encontrado"
      />
    </Container>
  );
};

export default Projetos;