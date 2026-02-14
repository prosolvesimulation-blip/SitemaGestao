import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  createOrdemCompra,
  getFornecedoresCompra,
  getOrdemCompra,
  updateOrdemCompra,
} from '../services/api';
import { FaSave, FaArrowLeft, FaPlus, FaTrash, FaEdit } from 'react-icons/fa';
import { toast } from 'react-toastify';

const Container = styled.div`
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 0.75rem;
`;

const Title = styled.h1`
  color: #2c3e50;
  font-size: 1.8rem;
`;

const Button = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.8rem 1.5rem;
  background-color: ${(props) => (props.secondary ? '#95a5a6' : '#2ecc71')};
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s;

  &:hover {
    background-color: ${(props) => (props.secondary ? '#7f8c8d' : '#27ae60')};
    transform: translateY(-2px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const Form = styled.form`
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const FormGroup = styled.div`
  margin-bottom: 1.5rem;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  color: #2c3e50;
  font-weight: 500;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.8rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  &:focus {
    outline: none;
    border-color: #3498db;
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 0.8rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  background-color: white;
  &:focus {
    outline: none;
    border-color: #3498db;
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 0.8rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  min-height: 100px;
  resize: vertical;
  &:focus {
    outline: none;
    border-color: #3498db;
  }
`;

const SectionTitle = styled.h3`
  margin-top: 2rem;
  margin-bottom: 1rem;
  color: #2c3e50;
  border-bottom: 1px solid #eee;
  padding-bottom: 0.5rem;
`;

const ItemsTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 1rem;
`;

const Th = styled.th`
  text-align: left;
  padding: 0.5rem;
  background-color: #f8f9fa;
  border-bottom: 1px solid #ddd;
`;

const Td = styled.td`
  padding: 0.5rem;
  border-bottom: 1px solid #eee;
`;

const IconButton = styled.button`
  background: none;
  border: none;
  color: #e74c3c;
  cursor: pointer;
  padding: 0.25rem;
  &:hover {
    color: #c0392b;
  }
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const TotalDisplay = styled.div`
  text-align: right;
  font-size: 1.2rem;
  font-weight: bold;
  margin-top: 1rem;
  color: #2c3e50;
`;

const PurchaseOrderForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const isEditMode = location.pathname.includes('/compras/editar/');
  const isViewMode = Boolean(id) && !isEditMode;
  const isCreateMode = !id;

  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [orderStatus, setOrderStatus] = useState(null);
  const [formData, setFormData] = useState({
    fornecedor_id: '',
    data_previsao_entrega: '',
    observacoes: '',
  });
  const [items, setItems] = useState([{ descricao: '', quantidade: 1, valor_unitario: 0 }]);

  useEffect(() => {
    loadData();
  }, [id, isEditMode]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [suppliersResponse, orderResponse] = await Promise.all([
        getFornecedoresCompra(),
        id ? getOrdemCompra(id) : Promise.resolve(null),
      ]);

      setSuppliers(Array.isArray(suppliersResponse.data) ? suppliersResponse.data : []);

      if (orderResponse?.data) {
        const order = orderResponse.data;
        setOrderStatus(order.status || null);
        setFormData({
          fornecedor_id: String(order.fornecedor_id || ''),
          data_previsao_entrega: order.data_previsao_entrega || '',
          observacoes: order.observacoes || '',
        });

        setItems(
          Array.isArray(order.itens) && order.itens.length > 0
            ? order.itens.map((item) => ({
                descricao: item.descricao || '',
                quantidade: item.quantidade || 1,
                valor_unitario: item.valor_unitario || 0,
              }))
            : [{ descricao: '', quantidade: 1, valor_unitario: 0 }]
        );
      }
    } catch (error) {
      console.error('Erro ao carregar dados da ordem de compra:', error);
      toast.error('Erro ao carregar dados da ordem de compra');
      navigate('/compras');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { descricao: '', quantidade: 1, valor_unitario: 0 }]);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const calculateTotal = () =>
    items.reduce((acc, item) => acc + parseFloat(item.quantidade || 0) * parseFloat(item.valor_unitario || 0), 0);

  const isReadOnly = isViewMode || (isEditMode && orderStatus !== null && orderStatus !== 'PENDENTE');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isReadOnly) return;

    setSubmitting(true);
    try {
      const payload = { ...formData, itens: items };

      if (isEditMode && id) {
        await updateOrdemCompra(id, payload);
        toast.success('Ordem de compra atualizada com sucesso!');
      } else {
        await createOrdemCompra(payload);
        toast.success('Ordem de compra criada com sucesso!');
      }

      navigate('/compras');
    } catch (error) {
      console.error('Erro ao salvar ordem de compra:', error);
      toast.error('Erro ao salvar ordem de compra');
    } finally {
      setSubmitting(false);
    }
  };

  const getTitle = () => {
    if (isCreateMode) return 'Nova Ordem de Compra';
    if (isEditMode) return `Editar Ordem de Compra #${id}`;
    return `Ordem de Compra #${id}`;
  };

  if (loading) {
    return (
      <Container>
        <p>Carregando...</p>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>{getTitle()}</Title>
        <HeaderActions>
          {isViewMode && (
            <Button type="button" onClick={() => navigate(`/compras/editar/${id}`)}>
              <FaEdit /> Editar
            </Button>
          )}
          <Button secondary onClick={() => navigate('/compras')}>
            <FaArrowLeft /> Voltar
          </Button>
        </HeaderActions>
      </Header>

      <Form onSubmit={handleSubmit}>
        {isEditMode && isReadOnly && (
          <div
            style={{
              marginBottom: '1rem',
              padding: '0.75rem 1rem',
              borderRadius: '6px',
              background: '#fef3c7',
              color: '#92400e',
              border: '1px solid #f59e0b',
            }}
          >
            Esta ordem não pode ser editada porque está com status <strong>{orderStatus}</strong>.
          </div>
        )}

        <FormGroup>
          <Label>Fornecedor</Label>
          <Select
            name="fornecedor_id"
            value={formData.fornecedor_id}
            onChange={handleInputChange}
            disabled={isReadOnly}
            required
          >
            <option value="">Selecione um fornecedor</option>
            {suppliers.map((sup) => (
              <option key={sup.id} value={sup.id}>
                {sup.razao_social}
              </option>
            ))}
          </Select>
        </FormGroup>

        <FormGroup>
          <Label>Previsão de Entrega</Label>
          <Input
            type="date"
            name="data_previsao_entrega"
            value={formData.data_previsao_entrega}
            onChange={handleInputChange}
            disabled={isReadOnly}
          />
        </FormGroup>

        <FormGroup>
          <Label>Observações</Label>
          <TextArea
            name="observacoes"
            value={formData.observacoes}
            onChange={handleInputChange}
            disabled={isReadOnly}
          />
        </FormGroup>

        <SectionTitle>Itens</SectionTitle>
        <ItemsTable>
          <thead>
            <tr>
              <Th style={{ width: '40%' }}>Descrição</Th>
              <Th style={{ width: '15%' }}>Qtd</Th>
              <Th style={{ width: '20%' }}>Valor Unit. (R$)</Th>
              <Th style={{ width: '20%' }}>Subtotal (R$)</Th>
              <Th style={{ width: '5%' }} />
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index}>
                <Td>
                  <Input
                    type="text"
                    value={item.descricao}
                    onChange={(e) => handleItemChange(index, 'descricao', e.target.value)}
                    disabled={isReadOnly}
                    required
                    placeholder="Item..."
                  />
                </Td>
                <Td>
                  <Input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={item.quantidade}
                    onChange={(e) => handleItemChange(index, 'quantidade', e.target.value)}
                    disabled={isReadOnly}
                    required
                  />
                </Td>
                <Td>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.valor_unitario}
                    onChange={(e) => handleItemChange(index, 'valor_unitario', e.target.value)}
                    disabled={isReadOnly}
                    required
                  />
                </Td>
                <Td>
                  {(parseFloat(item.quantidade || 0) * parseFloat(item.valor_unitario || 0)).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </Td>
                <Td>
                  <IconButton type="button" onClick={() => removeItem(index)} disabled={isReadOnly}>
                    <FaTrash />
                  </IconButton>
                </Td>
              </tr>
            ))}
          </tbody>
        </ItemsTable>

        {!isReadOnly && (
          <Button type="button" secondary onClick={addItem} style={{ marginBottom: '1rem' }}>
            <FaPlus /> Adicionar Item
          </Button>
        )}

        <TotalDisplay>
          Total: {calculateTotal().toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </TotalDisplay>

        {!isReadOnly && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
            <Button type="submit" disabled={submitting}>
              <FaSave /> {submitting ? 'Salvando...' : 'Salvar Ordem de Compra'}
            </Button>
          </div>
        )}
      </Form>
    </Container>
  );
};

export default PurchaseOrderForm;
