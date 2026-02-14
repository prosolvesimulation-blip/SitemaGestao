import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FaPlus, FaSearch } from 'react-icons/fa';
import DataTable from '../components/common/DataTable';
import {
  getEquipamentos,
  createEquipamento,
  updateEquipamento,
  deleteEquipamento,
} from '../services/api';

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

const Filters = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
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
      case 'DISPONIVEL':
        return 'rgba(16, 185, 129, 0.1)';
      case 'LOCADO':
        return 'rgba(59, 130, 246, 0.1)';
      case 'MANUTENCAO':
        return 'rgba(245, 158, 11, 0.1)';
      case 'PROJETO':
        return 'rgba(139, 92, 246, 0.1)';
      default:
        return 'rgba(100, 116, 139, 0.1)';
    }
  }};
  color: ${(props) => {
    switch (props.status) {
      case 'DISPONIVEL':
        return 'var(--success)';
      case 'LOCADO':
        return 'var(--info)';
      case 'MANUTENCAO':
        return 'var(--warning)';
      case 'PROJETO':
        return '#8b5cf6';
      default:
        return 'var(--secondary)';
    }
  }};
`;

const Equipamentos = ({ onPathChange }) => {
  const [equipamentos, setEquipamentos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    onPathChange && onPathChange('/equipamentos');
    loadEquipamentos();
  }, []);

  const loadEquipamentos = async () => {
    try {
      setLoading(true);
      const response = await getEquipamentos();
      setEquipamentos(response.data);
    } catch (error) {
      console.error('Erro ao carregar equipamentos:', error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { key: 'codigo', title: 'Código' },
    { key: 'tipo', title: 'Tipo' },
    { key: 'descricao', title: 'Descrição' },
    {
      key: 'status',
      title: 'Status',
      render: (value) => <StatusBadge status={value}>{value}</StatusBadge>,
    },
    { key: 'localizacao_atual', title: 'Localização' },
    { key: 'cliente_nome', title: 'Cliente Atual' },
    {
      key: 'valor_locacao_diaria',
      title: 'Valor/Dia',
      render: (value) => value ? `R$ ${value.toFixed(2)}` : '-',
    },
    {
      key: 'data_proxima_inspecao',
      title: 'Próx. Inspeção',
      render: (value) => value ? new Date(value).toLocaleDateString('pt-BR') : '-',
    },
  ];

  return (
    <Container>
      <Header>
        <Title>Gestão de Equipamentos</Title>
        <Filters>
          <Button>
            <FaPlus /> Novo Equipamento
          </Button>
        </Filters>
      </Header>

      <DataTable
        columns={columns}
        data={equipamentos}
        emptyMessage="Nenhum equipamento encontrado"
      />
    </Container>
  );
};

export default Equipamentos;