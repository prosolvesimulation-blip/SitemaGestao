import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import {
  deleteOrdemCompra,
  getOrdensCompra,
  updateStatusOrdemCompra,
} from '../services/api';
import {
  FaCheck,
  FaEdit,
  FaEye,
  FaPlus,
  FaSearch,
  FaTimes,
  FaTrash,
  FaTruck,
} from 'react-icons/fa';
import { toast } from 'react-toastify';

const Container = styled.div`
  padding: 2rem;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  gap: 1rem;
  flex-wrap: wrap;
`;

const Title = styled.h1`
  color: #2c3e50;
  font-size: 1.8rem;
`;

const Actions = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
`;

const Button = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.8rem 1.5rem;
  background-color: ${(props) => (props.secondary ? '#95a5a6' : '#3498db')};
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s;

  &:hover {
    background-color: ${(props) => (props.secondary ? '#7f8c8d' : '#2980b9')};
    transform: translateY(-2px);
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const Th = styled.th`
  background-color: #f8f9fa;
  color: #2c3e50;
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  border-bottom: 2px solid #e9ecef;
`;

const Td = styled.td`
  padding: 1rem;
  border-bottom: 1px solid #e9ecef;
  color: #34495e;
  vertical-align: middle;
`;

const StatusBadge = styled.span`
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 500;

  ${(props) => {
    switch (props.status) {
      case 'PENDENTE':
        return 'background-color: #fff3cd; color: #856404;';
      case 'APROVADA':
        return 'background-color: #cce5ff; color: #004085;';
      case 'RECEBIDA':
        return 'background-color: #d4edda; color: #155724;';
      case 'CANCELADA':
        return 'background-color: #f8d7da; color: #721c24;';
      default:
        return 'background-color: #e2e3e5; color: #383d41;';
    }
  }}
`;

const ActionRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-wrap: wrap;
`;

const ActionButton = styled.button`
  background: none;
  border: none;
  color: ${(props) => props.color || '#95a5a6'};
  cursor: pointer;
  padding: 0.35rem;
  border-radius: 4px;
  transition: all 0.2s;

  &:hover {
    color: ${(props) => props.hoverColor || '#34495e'};
    background: #f1f5f9;
  }
`;

const FormInput = styled.input`
  padding: 0.8rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  width: 300px;
`;

const PurchaseOrders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await getOrdensCompra();
      setOrders(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Erro ao carregar ordens de compra:', error);
      toast.error('Erro ao carregar ordens de compra');
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return orders.filter((order) => {
      const matchesSearch =
        order.fornecedor_nome?.toLowerCase().includes(term) || String(order.id).includes(searchTerm);
      const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, statusFilter]);

  const formatCurrency = (value) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      await updateStatusOrdemCompra(id, status);
      toast.success('Status atualizado com sucesso');
      loadOrders();
    } catch (error) {
      console.error('Erro ao atualizar status da ordem:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  const handleDelete = async (order) => {
    if (order.status !== 'PENDENTE') {
      toast.info('Somente ordens pendentes podem ser excluídas');
      return;
    }

    if (!window.confirm(`Deseja excluir a ordem #${order.id}?`)) return;

    try {
      await deleteOrdemCompra(order.id);
      toast.success('Ordem excluída com sucesso');
      loadOrders();
    } catch (error) {
      console.error('Erro ao excluir ordem:', error);
      toast.error('Erro ao excluir ordem');
    }
  };

  return (
    <Container>
      <Header>
        <Title>Ordens de Compra</Title>
        <Actions>
          <div style={{ position: 'relative' }}>
            <FormInput
              type="text"
              placeholder="Buscar por fornecedor ou ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <FaSearch style={{ position: 'absolute', right: '10px', top: '12px', color: '#95a5a6' }} />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '0.8rem', border: '1px solid #ddd', borderRadius: '4px' }}
          >
            <option value="ALL">Todos status</option>
            <option value="PENDENTE">Pendente</option>
            <option value="APROVADA">Aprovada</option>
            <option value="RECEBIDA">Recebida</option>
            <option value="CANCELADA">Cancelada</option>
          </select>

          <Button onClick={() => navigate('/compras/nova')}>
            <FaPlus /> Nova Ordem
          </Button>
        </Actions>
      </Header>

      {loading ? (
        <p>Carregando...</p>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>ID</Th>
              <Th>Fornecedor</Th>
              <Th>Emissão</Th>
              <Th>Previsão</Th>
              <Th>Valor Total</Th>
              <Th>Status</Th>
              <Th>Ações</Th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((order) => (
              <tr key={order.id}>
                <Td>#{order.id}</Td>
                <Td>{order.fornecedor_nome}</Td>
                <Td>{formatDate(order.data_emissao)}</Td>
                <Td>{formatDate(order.data_previsao_entrega)}</Td>
                <Td>{formatCurrency(order.valor_total)}</Td>
                <Td>
                  <StatusBadge status={order.status}>{order.status}</StatusBadge>
                </Td>
                <Td>
                  <ActionRow>
                    <ActionButton
                      color="#3498db"
                      hoverColor="#2980b9"
                      title="Visualizar detalhes"
                      onClick={() => navigate(`/compras/${order.id}`)}
                    >
                      <FaEye />
                    </ActionButton>

                    {order.status === 'PENDENTE' && (
                      <>
                        <ActionButton
                          color="#16a34a"
                          hoverColor="#15803d"
                          title="Aprovar"
                          onClick={() => handleStatusUpdate(order.id, 'APROVADA')}
                        >
                          <FaCheck />
                        </ActionButton>
                        <ActionButton
                          color="#d97706"
                          hoverColor="#b45309"
                          title="Editar"
                          onClick={() => navigate(`/compras/editar/${order.id}`)}
                        >
                          <FaEdit />
                        </ActionButton>
                        <ActionButton
                          color="#dc2626"
                          hoverColor="#b91c1c"
                          title="Cancelar"
                          onClick={() => handleStatusUpdate(order.id, 'CANCELADA')}
                        >
                          <FaTimes />
                        </ActionButton>
                        <ActionButton
                          color="#b91c1c"
                          hoverColor="#7f1d1d"
                          title="Excluir"
                          onClick={() => handleDelete(order)}
                        >
                          <FaTrash />
                        </ActionButton>
                      </>
                    )}

                    {order.status === 'APROVADA' && (
                      <>
                        <ActionButton
                          color="#0f766e"
                          hoverColor="#115e59"
                          title="Marcar como recebida"
                          onClick={() => handleStatusUpdate(order.id, 'RECEBIDA')}
                        >
                          <FaTruck />
                        </ActionButton>
                        <ActionButton
                          color="#dc2626"
                          hoverColor="#b91c1c"
                          title="Cancelar"
                          onClick={() => handleStatusUpdate(order.id, 'CANCELADA')}
                        >
                          <FaTimes />
                        </ActionButton>
                      </>
                    )}
                  </ActionRow>
                </Td>
              </tr>
            ))}
            {filteredOrders.length === 0 && (
              <tr>
                <Td colSpan="7" style={{ textAlign: 'center' }}>
                  Nenhuma ordem de compra encontrada.
                </Td>
              </tr>
            )}
          </tbody>
        </Table>
      )}
    </Container>
  );
};

export default PurchaseOrders;
